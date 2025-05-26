#!/bin/bash

# Production Environment Management Script
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$PROJECT_ROOT/docker"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_help() {
    echo -e "${BLUE}Production Environment Management${NC}"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  start     Start production environment"
    echo "  stop      Stop production environment"
    echo "  restart   Restart production environment"
    echo "  logs      Show logs (follow mode)"
    echo "    logs [service]  Show logs for specific service"
    echo "  build     Rebuild all services"
    echo "  deploy    Deploy with zero downtime"
    echo "  status    Show status of all services"
    echo "  backup    Backup volumes"
    echo "  restore   Restore from backup"
    echo "    restore [backup_path]  Restore from specific backup"
    echo "  health    Check health of all services"
    echo "  scale     Scale services"
    echo "    scale [service] [count]  Scale specific service"
    echo "  help      Show this help message"
    echo ""
    echo "Available services: backend, frontend, minio, redis, nats"
    echo ""
    echo "Prerequisites:"
    echo "  - .env.prod file must exist (copy from .env.prod.template)"
    echo "  - Docker and Docker Compose must be installed"
    echo ""
}

check_env() {
    if [ ! -f "$DOCKER_DIR/.env.prod" ]; then
        echo -e "${RED}Error: .env.prod file not found!${NC}"
        echo -e "${YELLOW}Please create .env.prod from .env.prod.template${NC}"
        echo "cp $DOCKER_DIR/.env.prod.template $DOCKER_DIR/.env.prod"
        exit 1
    fi
}

start_prod() {
    echo -e "${GREEN}Starting production environment...${NC}"
    check_env
    cd "$DOCKER_DIR"
    
    # Build images first
    echo -e "${YELLOW}Building services...${NC}"
    docker compose -f docker-compose.prod.yml --env-file .env.prod build
    
    # Start services
    echo -e "${YELLOW}Starting services...${NC}"
    docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
    
    # Wait for services to be healthy
    echo -e "${YELLOW}Waiting for services to be ready...${NC}"
    sleep 15
    
    echo -e "${GREEN}Production environment started!${NC}"
    show_health
}

stop_prod() {
    echo -e "${YELLOW}Stopping production environment...${NC}"
    cd "$DOCKER_DIR"
    docker compose -f docker-compose.prod.yml --env-file .env.prod down
    echo -e "${GREEN}Production environment stopped!${NC}"
}

restart_prod() {
    echo -e "${YELLOW}Restarting production environment...${NC}"
    stop_prod
    start_prod
}

show_logs() {
    cd "$DOCKER_DIR"
    SERVICE=${2:-}
    if [ -n "$SERVICE" ]; then
        echo -e "${BLUE}Showing logs for service: $SERVICE${NC}"
        docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f "$SERVICE"
    else
        echo -e "${BLUE}Showing logs for all services${NC}"
        docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f
    fi
}

build_prod() {
    echo -e "${YELLOW}Building production environment...${NC}"
    check_env
    cd "$DOCKER_DIR"
    docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache
    echo -e "${GREEN}Build completed!${NC}"
}

create_backup() {
    echo -e "${BLUE}Creating quick backup before deployment...${NC}"
    BACKUP_DIR="$PROJECT_ROOT/backups/pre-deploy-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Export current container state
    docker compose -f docker-compose.prod.yml --env-file .env.prod config > "$BACKUP_DIR/docker-compose-state.yml"
    
    # Create metadata
    echo "Pre-deployment backup created on: $(date)" > "$BACKUP_DIR/backup_info.txt"
    echo "Git commit: $(git rev-parse HEAD 2>/dev/null || echo 'Unknown')" >> "$BACKUP_DIR/backup_info.txt"
    
    echo -e "${GREEN}Quick backup created: $BACKUP_DIR${NC}"
}

deploy_prod() {
    echo -e "${YELLOW}Deploying production environment with zero downtime...${NC}"
    check_env
    cd "$DOCKER_DIR"
    
    # Build new images
    echo -e "${YELLOW}Building new images...${NC}"
    docker compose -f docker-compose.prod.yml --env-file .env.prod build
    
    # Backup current state
    echo -e "${YELLOW}Creating backup...${NC}"
    create_backup
    
    # Rolling update - Backend
    echo -e "${YELLOW}Updating backend services...${NC}"
    docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps backend
    
    # Rolling update - Frontend
    echo -e "${YELLOW}Updating frontend services...${NC}"
    docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps frontend
    
    # Wait for services to stabilize
    echo -e "${YELLOW}Waiting for services to stabilize...${NC}"
    sleep 30
    
    echo -e "${GREEN}Deployment completed!${NC}"
    show_health
}

show_status() {
    echo -e "${BLUE}Production Environment Status${NC}"
    echo "=================================="
    cd "$DOCKER_DIR"
    docker compose -f docker-compose.prod.yml --env-file .env.prod ps
    echo ""
    echo -e "${BLUE}Service Health Check:${NC}"
    show_health
}

backup_volumes() {
    echo -e "${YELLOW}Creating backup of production volumes...${NC}"
    BACKUP_DIR="$PROJECT_ROOT/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    cd "$DOCKER_DIR"
    
    # Backup MinIO data
    echo -e "${BLUE}Backing up MinIO data...${NC}"
    docker run --rm -v minio_data_prod:/data -v "$BACKUP_DIR":/backup alpine:latest tar czf /backup/minio_data.tar.gz -C /data .
    
    # Backup Redis data
    echo -e "${BLUE}Backing up Redis data...${NC}"
    docker run --rm -v redis_data_prod:/data -v "$BACKUP_DIR":/backup alpine:latest tar czf /backup/redis_data.tar.gz -C /data .
    
    # Create metadata file
    echo "Backup created on: $(date)" > "$BACKUP_DIR/backup_info.txt"
    echo "Production environment backup" >> "$BACKUP_DIR/backup_info.txt"
    
    echo -e "${GREEN}Backup completed: $BACKUP_DIR${NC}"
}

restore_backup() {
    if [ -z "$2" ]; then
        echo -e "${RED}Error: Please specify backup directory${NC}"
        echo "Usage: $0 restore /path/to/backup"
        exit 1
    fi
    
    BACKUP_DIR="$2"
    if [ ! -d "$BACKUP_DIR" ]; then
        echo -e "${RED}Error: Backup directory not found: $BACKUP_DIR${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Restoring from backup: $BACKUP_DIR${NC}"
    echo -e "${RED}Warning: This will overwrite current data!${NC}"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Stop services
        stop_prod
        
        # Restore volumes
        docker run --rm -v minio_data_prod:/data -v "$BACKUP_DIR":/backup alpine:latest tar xzf /backup/minio_data.tar.gz -C /data
        docker run --rm -v redis_data_prod:/data -v "$BACKUP_DIR":/backup alpine:latest tar xzf /backup/redis_data.tar.gz -C /data
        docker run --rm -v nats_data_prod:/data -v "$BACKUP_DIR":/backup alpine:latest tar xzf /backup/nats_data.tar.gz -C /data
        
        echo -e "${GREEN}Restore completed!${NC}"
        start_prod
    else
        echo -e "${YELLOW}Restore cancelled${NC}"
    fi
}

show_health() {
    echo -e "${BLUE}Checking service health...${NC}"
    cd "$DOCKER_DIR"
    
    # Check MinIO
    if curl -f -s http://localhost:9000/minio/health/live > /dev/null; then
        echo -e "${GREEN}✓ MinIO: Healthy${NC}"
    else
        echo -e "${RED}✗ MinIO: Unhealthy${NC}"
    fi
    
    # Check Backend
    if curl -f -s http://localhost:8080/health > /dev/null; then
        echo -e "${GREEN}✓ Backend: Healthy${NC}"
    else
        echo -e "${RED}✗ Backend: Unhealthy${NC}"
    fi
    
    # Check Frontend
    if curl -f -s http://localhost:3000/ > /dev/null; then
        echo -e "${GREEN}✓ Frontend: Healthy${NC}"
    else
        echo -e "${RED}✗ Frontend: Unhealthy${NC}"
    fi
    
    # Check Redis
    if docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T redis redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis: Healthy${NC}"
    else
        echo -e "${RED}✗ Redis: Unhealthy${NC}"
    fi
}

scale_services() {
    if [ -z "$2" ] || [ -z "$3" ]; then
        echo -e "${RED}Error: Please specify service and scale count${NC}"
        echo "Usage: $0 scale <service> <count>"
        echo "Services: backend, frontend"
        exit 1
    fi
    
    SERVICE="$2"
    COUNT="$3"
    
    echo -e "${YELLOW}Scaling $SERVICE to $COUNT instances...${NC}"
    cd "$DOCKER_DIR"
    docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --scale "$SERVICE=$COUNT"
    echo -e "${GREEN}Scaling completed!${NC}"
    show_status
}

case "$1" in
    start)
        start_prod
        ;;
    stop)
        stop_prod
        ;;
    restart)
        restart_prod
        ;;
    logs)
        show_logs "$@"
        ;;
    build)
        build_prod
        ;;
    deploy)
        deploy_prod
        ;;
    status)
        show_status
        ;;
    backup)
        backup_volumes
        ;;
    restore)
        restore_backup "$@"
        ;;
    health)
        show_health
        ;;
    scale)
        scale_services "$@"
        ;;
    help|*)
        print_help
        ;;
esac
