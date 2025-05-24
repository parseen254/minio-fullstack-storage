#!/bin/bash

# MinIO Storage System Deployment Script
set -e

echo "MinIO Scalable Storage System - Deployment Script"
echo "=================================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "Checking prerequisites..."

if ! command_exists docker; then
    echo "Error: Docker is not installed or not in PATH"
    exit 1
fi

if ! command_exists docker-compose; then
    echo "Error: Docker Compose is not installed or not in PATH"
    exit 1
fi

echo "Prerequisites check passed!"

# Set default values
ENVIRONMENT=${1:-development}
ACTION=${2:-start}

echo "Environment: $ENVIRONMENT"
echo "Action: $ACTION"

case $ACTION in
    "start")
        echo "Starting MinIO Storage System..."
        
        # Start infrastructure services
        echo "Starting infrastructure services (MinIO, Redis, NATS)..."
        cd docker
        docker-compose up -d
        
        echo "Waiting for services to be ready..."
        sleep 10
        
        # Check if services are running
        if docker-compose ps | grep -q "Up"; then
            echo "Infrastructure services started successfully!"
        else
            echo "Error: Some services failed to start"
            docker-compose logs
            exit 1
        fi
        
        echo "Infrastructure services available at:"
        echo "- MinIO Console: http://localhost:9001 (minioadmin/minioadmin)"
        echo "- Redis: localhost:6379"
        echo "- NATS: localhost:4222"
        
        cd ..
        
        # Build and start backend
        echo "Building and starting backend..."
        cd backend
        if [ ! -f bin/server ]; then
            echo "Building backend server..."
            go build -o bin/server ./cmd/server
        fi
        
        echo "Starting backend server in background..."
        nohup ./bin/server > ../logs/backend.log 2>&1 &
        echo $! > ../logs/backend.pid
        
        echo "Waiting for backend to start..."
        sleep 5
        
        # Check if backend is running
        if curl -s http://localhost:8080/health > /dev/null; then
            echo "Backend started successfully!"
            echo "Backend API available at: http://localhost:8080"
        else
            echo "Warning: Backend might not be running properly"
        fi
        
        cd ..
        
        # Start frontend
        echo "Starting frontend..."
        cd frontend
        if [ ! -d node_modules ]; then
            echo "Installing frontend dependencies..."
            npm install
        fi
        
        echo "Starting frontend development server in background..."
        nohup npm run dev > ../logs/frontend.log 2>&1 &
        echo $! > ../logs/frontend.pid
        
        echo "Waiting for frontend to start..."
        sleep 10
        
        echo "Frontend starting at: http://localhost:3000"
        
        cd ..
        
        echo ""
        echo "MinIO Storage System started successfully!"
        echo "========================================="
        echo "Services:"
        echo "- Frontend: http://localhost:3000"
        echo "- Backend API: http://localhost:8080"
        echo "- MinIO Console: http://localhost:9001"
        echo ""
        echo "Default credentials:"
        echo "- MinIO: minioadmin / minioadmin"
        echo ""
        echo "Logs are available in the 'logs' directory"
        echo "To stop the system, run: ./scripts/deploy.sh development stop"
        ;;
        
    "stop")
        echo "Stopping MinIO Storage System..."
        
        # Create logs directory if it doesn't exist
        mkdir -p logs
        
        # Stop frontend
        if [ -f logs/frontend.pid ]; then
            echo "Stopping frontend..."
            kill $(cat logs/frontend.pid) 2>/dev/null || true
            rm -f logs/frontend.pid
        fi
        
        # Stop backend
        if [ -f logs/backend.pid ]; then
            echo "Stopping backend..."
            kill $(cat logs/backend.pid) 2>/dev/null || true
            rm -f logs/backend.pid
        fi
        
        # Stop infrastructure services
        echo "Stopping infrastructure services..."
        cd docker
        docker-compose down
        cd ..
        
        echo "MinIO Storage System stopped successfully!"
        ;;
        
    "restart")
        echo "Restarting MinIO Storage System..."
        $0 $ENVIRONMENT stop
        sleep 5
        $0 $ENVIRONMENT start
        ;;
        
    "status")
        echo "Checking MinIO Storage System status..."
        
        # Check infrastructure services
        echo "Infrastructure services:"
        cd docker
        docker-compose ps
        cd ..
        
        # Check backend
        echo ""
        echo "Backend service:"
        if curl -s http://localhost:8080/health > /dev/null; then
            echo "✓ Backend is running (http://localhost:8080)"
        else
            echo "✗ Backend is not responding"
        fi
        
        # Check frontend
        echo "Frontend service:"
        if curl -s http://localhost:3000 > /dev/null; then
            echo "✓ Frontend is running (http://localhost:3000)"
        else
            echo "✗ Frontend is not responding"
        fi
        ;;
        
    "build")
        echo "Building MinIO Storage System..."
        
        # Build backend
        echo "Building backend..."
        cd backend
        go build -o bin/server ./cmd/server
        cd ..
        
        # Build frontend
        echo "Building frontend..."
        cd frontend
        if [ ! -d node_modules ]; then
            npm install
        fi
        npm run build
        cd ..
        
        # Build Docker images
        echo "Building Docker images..."
        docker build -t minio-storage/backend:latest ./backend
        docker build -t minio-storage/frontend:latest ./frontend
        
        echo "Build completed successfully!"
        ;;
        
    "logs")
        echo "Showing logs..."
        
        SERVICE=${3:-all}
        
        case $SERVICE in
            "backend")
                if [ -f logs/backend.log ]; then
                    tail -f logs/backend.log
                else
                    echo "Backend log file not found"
                fi
                ;;
            "frontend")
                if [ -f logs/frontend.log ]; then
                    tail -f logs/frontend.log
                else
                    echo "Frontend log file not found"
                fi
                ;;
            "infrastructure")
                cd docker
                docker-compose logs -f
                cd ..
                ;;
            "all"|*)
                echo "Available log files:"
                ls -la logs/ 2>/dev/null || echo "No log files found"
                echo ""
                echo "Usage: $0 $ENVIRONMENT logs [backend|frontend|infrastructure]"
                ;;
        esac
        ;;
        
    "test")
        echo "Running tests..."
        
        # Test backend
        echo "Testing backend..."
        cd backend
        go test ./...
        cd ..
        
        # Test API endpoints
        echo "Testing API endpoints..."
        if curl -s http://localhost:8080/health | grep -q "healthy"; then
            echo "✓ Health endpoint working"
        else
            echo "✗ Health endpoint not working"
        fi
        
        # Test frontend
        echo "Testing frontend..."
        cd frontend
        if [ -d node_modules ]; then
            npm test -- --passWithNoTests
        else
            echo "Frontend dependencies not installed"
        fi
        cd ..
        ;;
        
    *)
        echo "Usage: $0 [environment] [action]"
        echo ""
        echo "Environment: development (default)"
        echo ""
        echo "Actions:"
        echo "  start     - Start all services"
        echo "  stop      - Stop all services"
        echo "  restart   - Restart all services"
        echo "  status    - Check service status"
        echo "  build     - Build all components"
        echo "  logs      - Show logs [backend|frontend|infrastructure]"
        echo "  test      - Run tests"
        echo ""
        echo "Examples:"
        echo "  $0 development start"
        echo "  $0 development stop"
        echo "  $0 development logs backend"
        exit 1
        ;;
esac
