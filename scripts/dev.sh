#!/bin/bash

# Development Environment Management Script
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
    echo -e "${BLUE}Development Environment Management${NC}"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  start     Start development environment"
    echo "  stop      Stop development environment"
    echo "  restart   Restart development environment"
    echo "  logs      Show logs (follow mode)"
    echo "    logs [service]  Show logs for specific service"
    echo "  build     Rebuild all services"
    echo "  clean     Clean up containers, networks, and volumes"
    echo "  status    Show status of all services"
    echo "  shell     Open shell in backend container"
    echo "    shell [service]  Open shell in specific service"
    echo "  test      Run tests in backend"
    echo "  health    Check health of all services"
    echo "  help      Show this help message"
    echo ""
    echo "Available services: backend, frontend, minio, redis, nats"
    echo ""
}

start_dev() {
    echo -e "${GREEN}Starting development environment...${NC}"
    cd "$DOCKER_DIR"
    
    # Copy dev environment if .env doesn't exist
    if [ ! -f .env ]; then
        echo -e "${YELLOW}Creating .env from .env.dev.template...${NC}"
        if [ -f .env.dev.template ]; then
            cp .env.dev.template .env
        else
            echo -e "${RED}Error: .env.dev.template not found!${NC}"
            exit 1
        fi
    fi
    
    # Build images first
    echo -e "${YELLOW}Building services...${NC}"
    docker compose -f docker-compose.dev.yml build
    
    # Start services
    echo -e "${YELLOW}Starting services...${NC}"
    docker compose -f docker-compose.dev.yml up -d
    
    # Wait for services to be healthy
    echo -e "${YELLOW}Waiting for services to be ready...${NC}"
    sleep 10
    
    # Check service health
    check_service_health
    
    echo -e "${GREEN}Development environment started!${NC}"
    echo ""
    echo -e "${BLUE}📱 Frontend: http://localhost:3000${NC}"
    echo -e "${BLUE}🔧 Backend API: http://localhost:8080${NC}"
    echo -e "${BLUE}🗃️  MinIO Console: http://localhost:9001${NC}"
    echo -e "${BLUE}📊 Redis: localhost:6379${NC}"
    echo -e "${BLUE}📡 NATS: localhost:4222 (Monitoring: http://localhost:8222)${NC}"
    echo ""
    echo -e "${YELLOW}Default MinIO credentials: minioadmin/minioadmin123${NC}"
    echo ""
    echo -e "${GREEN}Use './scripts/dev.sh logs' to view logs${NC}"
}

stop_dev() {
    echo -e "${YELLOW}Stopping development environment...${NC}"
    cd "$DOCKER_DIR"
    docker compose -f docker-compose.dev.yml down
    echo -e "${GREEN}Development environment stopped!${NC}"
}

restart_dev() {
    echo -e "${YELLOW}Restarting development environment...${NC}"
    stop_dev
    start_dev
}

show_logs() {
    cd "$DOCKER_DIR"
    SERVICE=${2:-}
    if [ -n "$SERVICE" ]; then
        echo -e "${BLUE}Showing logs for service: $SERVICE${NC}"
        docker compose -f docker-compose.dev.yml logs -f "$SERVICE"
    else
        echo -e "${BLUE}Showing logs for all services${NC}"
        docker compose -f docker-compose.dev.yml logs -f
    fi
}

build_dev() {
    echo -e "${YELLOW}Building development environment...${NC}"
    cd "$DOCKER_DIR"
    docker compose -f docker-compose.dev.yml build --no-cache
    echo -e "${GREEN}Build completed!${NC}"
}

clean_dev() {
    echo -e "${RED}Cleaning up development environment...${NC}"
    echo -e "${YELLOW}This will remove all containers, networks, and volumes${NC}"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd "$DOCKER_DIR"
        docker compose -f docker-compose.dev.yml down -v --remove-orphans
        docker system prune -f
        echo -e "${GREEN}Cleanup completed!${NC}"
    else
        echo -e "${YELLOW}Cleanup cancelled${NC}"
    fi
}

show_status() {
    echo -e "${BLUE}Development Environment Status${NC}"
    echo "================================="
    cd "$DOCKER_DIR"
    docker compose -f docker-compose.dev.yml ps
    echo ""
    echo -e "${BLUE}Service Health Check:${NC}"
    check_service_health
}

open_shell() {
    cd "$DOCKER_DIR"
    SERVICE=${2:-backend}
    echo -e "${BLUE}Opening shell in $SERVICE container...${NC}"
    docker compose -f docker-compose.dev.yml exec "$SERVICE" sh
}

run_tests() {
    echo -e "${YELLOW}Running backend tests...${NC}"
    cd "$DOCKER_DIR"
    if ! docker compose -f docker-compose.dev.yml ps | grep -q "backend.*Up"; then
        echo -e "${RED}Backend service is not running. Starting it first...${NC}"
        docker compose -f docker-compose.dev.yml up -d backend
        sleep 10
    fi
    docker compose -f docker-compose.dev.yml exec backend go test -v ./...
}

check_service_health() {
    echo -e "${BLUE}Checking service health...${NC}"
    
    # Check MinIO
    if curl -f -s http://localhost:9000/minio/health/live > /dev/null 2>&1; then
        echo -e "${GREEN}✓ MinIO: Healthy${NC}"
    else
        echo -e "${RED}✗ MinIO: Unhealthy${NC}"
    fi
    
    # Check Redis
    if docker compose -f docker-compose.dev.yml exec redis redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis: Healthy${NC}"
    else
        echo -e "${RED}✗ Redis: Unhealthy${NC}"
    fi
    
    # Check NATS
    if curl -f -s http://localhost:8222/ > /dev/null 2>&1; then
        echo -e "${GREEN}✓ NATS: Healthy${NC}"
    else
        echo -e "${RED}✗ NATS: Unhealthy${NC}"
    fi
    
    # Check Backend
    if curl -f -s http://localhost:8080/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend: Healthy${NC}"
    else
        echo -e "${RED}✗ Backend: Unhealthy${NC}"
    fi
    
    # Check Frontend
    if curl -f -s http://localhost:3000/ > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend: Healthy${NC}"
    else
        echo -e "${RED}✗ Frontend: Unhealthy${NC}"
    fi
}

check_health() {
    cd "$DOCKER_DIR"
    echo -e "${BLUE}Service Health Status${NC}"
    echo "====================="
    check_service_health
}

case "$1" in
    start)
        start_dev
        ;;
    stop)
        stop_dev
        ;;
    restart)
        restart_dev
        ;;
    logs)
        show_logs "$@"
        ;;
    build)
        build_dev
        ;;
    clean)
        clean_dev
        ;;
    status)
        show_status
        ;;
    shell)
        open_shell "$@"
        ;;
    test)
        run_tests
        ;;
    health)
        check_health
        ;;
    help|*)
        print_help
        ;;
esac
