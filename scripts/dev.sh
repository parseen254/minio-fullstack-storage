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
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start     Start development environment"
    echo "  stop      Stop development environment"
    echo "  restart   Restart development environment"
    echo "  logs      Show logs (follow mode)"
    echo "  build     Rebuild all services"
    echo "  clean     Clean up containers, networks, and volumes"
    echo "  status    Show status of all services"
    echo "  shell     Open shell in backend container"
    echo "  test      Run tests in backend"
    echo "  help      Show this help message"
    echo ""
}

start_dev() {
    echo -e "${GREEN}Starting development environment...${NC}"
    cd "$DOCKER_DIR"
    
    # Copy dev environment if .env doesn't exist
    if [ ! -f .env ]; then
        echo -e "${YELLOW}Creating .env from .env.dev template...${NC}"
        cp .env.dev .env
    fi
    
    docker-compose -f docker-compose.dev.yml up -d
    echo -e "${GREEN}Development environment started!${NC}"
    echo -e "${BLUE}Frontend: http://localhost:3000${NC}"
    echo -e "${BLUE}Backend: http://localhost:8080${NC}"
    echo -e "${BLUE}MinIO Console: http://localhost:9001${NC}"
    echo -e "${YELLOW}Default MinIO credentials: minioadmin/minioadmin123${NC}"
}

stop_dev() {
    echo -e "${YELLOW}Stopping development environment...${NC}"
    cd "$DOCKER_DIR"
    docker-compose -f docker-compose.dev.yml down
    echo -e "${GREEN}Development environment stopped!${NC}"
}

restart_dev() {
    echo -e "${YELLOW}Restarting development environment...${NC}"
    stop_dev
    start_dev
}

show_logs() {
    cd "$DOCKER_DIR"
    docker-compose -f docker-compose.dev.yml logs -f
}

build_dev() {
    echo -e "${YELLOW}Building development environment...${NC}"
    cd "$DOCKER_DIR"
    docker-compose -f docker-compose.dev.yml build --no-cache
    echo -e "${GREEN}Build completed!${NC}"
}

clean_dev() {
    echo -e "${RED}Cleaning up development environment...${NC}"
    cd "$DOCKER_DIR"
    docker-compose -f docker-compose.dev.yml down -v --remove-orphans
    docker system prune -f
    echo -e "${GREEN}Cleanup completed!${NC}"
}

show_status() {
    cd "$DOCKER_DIR"
    docker-compose -f docker-compose.dev.yml ps
}

open_shell() {
    cd "$DOCKER_DIR"
    docker-compose -f docker-compose.dev.yml exec backend sh
}

run_tests() {
    echo -e "${YELLOW}Running backend tests...${NC}"
    cd "$DOCKER_DIR"
    docker-compose -f docker-compose.dev.yml exec backend go test -v ./...
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
        show_logs
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
        open_shell
        ;;
    test)
        run_tests
        ;;
    help|*)
        print_help
        ;;
esac
