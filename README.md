# MinIO Scalable Storage System

A production-ready, scalable storage system built with MinIO object storage, featuring a modern web interface and complete backend API. This system replaces traditional databases with MinIO for scalable, distributed storage.

## Architecture Overview

This system implements a microservices architecture with the following components:

- **Backend API**: Golang-based REST API using Gin framework
- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Storage**: MinIO object storage for all data persistence
- **Cache**: Redis for session management and caching
- **Message Queue**: NATS for asynchronous processing
- **Authentication**: JWT-based authentication system
- **Deployment**: Docker containers with Kubernetes orchestration

## Technology Stack

### Backend
- **Language**: Go 1.23+
- **Framework**: Gin HTTP router
- **Storage**: MinIO object storage
- **Authentication**: JWT with bcrypt password hashing
- **Cache**: Redis
- **Message Queue**: NATS
- **Configuration**: Environment variables

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React Query (TanStack Query)
- **HTTP Client**: Fetch API

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Kubernetes
- **Service Mesh**: Available for production deployments
- **Monitoring**: Prometheus and Grafana ready
- **CI/CD**: GitHub Actions pipeline

## Features

### Core Functionality
- User authentication and authorization
- User profile management
- Post creation and management
- File upload and storage
- RESTful API with proper error handling
- Pagination support for large datasets
- Role-based access control

### Storage Features
- Object-based storage using MinIO
- Bucket-based data organization
- Automatic bucket initialization
- File metadata management
- Content type detection
- ETags for data integrity

### Security Features
- JWT token-based authentication
- Password hashing with bcrypt
- CORS configuration
- Request validation
- Environment-based configuration
- Role-based endpoint protection

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Go 1.23+ (for local development)
- Node.js 18+ (for frontend development)

### Docker Setup (Recommended)

This project provides optimized Docker configurations for both development and production environments.

#### Development Environment

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd minio-fullstack-storage
   ```

2. **Start development environment**
   ```bash
   # Using the convenience script
   ./scripts/dev.sh start
   
   # Or manually with docker-compose
   cd docker
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:3000 (Next.js with hot reload)
   - Backend: http://localhost:8080 (Go with Air hot reload)
   - MinIO Console: http://localhost:9001 (admin: minioadmin/minioadmin123)

**Development Features:**
- Hot reload for both frontend and backend
- Volume mounts for instant code changes
- Debug-friendly logging
- Development-optimized images
- Auto-restart on file changes

#### Production Environment

1. **Setup production environment**
   ```bash
   # Create production environment file
   cp docker/.env.prod.template docker/.env.prod
   # Edit .env.prod with your production values
   ```

2. **Deploy to production**
   ```bash
   # Using the convenience script
   ./scripts/prod.sh deploy
   
   # Or manually
   cd docker
   docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
   ```

**Production Features:**
- Multi-stage builds for minimal image sizes
- Non-root user containers for security
- Health checks and restart policies
- Resource limits and logging
- Optimized layer caching
- Zero-downtime deployments

#### Management Scripts

**Development Script (`scripts/dev.sh`)**
```bash
./scripts/dev.sh start     # Start development environment
./scripts/dev.sh stop      # Stop development environment
./scripts/dev.sh restart   # Restart development environment
./scripts/dev.sh logs      # Show logs (follow mode)
./scripts/dev.sh build     # Rebuild all services
./scripts/dev.sh clean     # Clean up containers and volumes
./scripts/dev.sh status    # Show status of all services
./scripts/dev.sh shell     # Open shell in backend container
./scripts/dev.sh test      # Run backend tests
```

**Production Script (`scripts/prod.sh`)**
```bash
./scripts/prod.sh start     # Start production environment
./scripts/prod.sh stop      # Stop production environment
./scripts/prod.sh deploy    # Deploy with zero downtime
./scripts/prod.sh backup    # Backup all volumes
./scripts/prod.sh restore   # Restore from backup
./scripts/prod.sh health    # Check service health
./scripts/prod.sh scale     # Scale services
```

### Local Development Setup (Alternative)

If you prefer to run services locally without Docker:

1. **Start infrastructure services**
   ```bash
   cd docker
   docker-compose up -d minio redis nats
   ```

2. **Start the backend**
   ```bash
   cd backend
   go mod download
   go build -o bin/server ./cmd/server
   ./bin/server
   ```

3. **Start the frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Environment Variables

Create `.env` files in the respective directories:

**Backend (.env)**
```env
PORT=8080
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY_ID=minioadmin
MINIO_SECRET_ACCESS_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_REGION=us-east-1
REDIS_ADDR=localhost:6379
NATS_URL=nats://localhost:4222
JWT_SECRET=your-super-secret-jwt-key-here
USERS_BUCKET=users
POSTS_BUCKET=posts
FILES_BUCKET=files
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## API Documentation

### Authentication Endpoints

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/profile` - Get user profile (authenticated)

### User Management

- `GET /api/v1/users/` - List users (admin)
- `GET /api/v1/users/:id` - Get user by ID
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

### Post Management

- `POST /api/v1/posts/` - Create post
- `GET /api/v1/posts/` - List posts
- `GET /api/v1/posts/:id` - Get post by ID
- `PUT /api/v1/posts/:id` - Update post
- `DELETE /api/v1/posts/:id` - Delete post
- `GET /api/v1/posts/user/:userId` - Get user posts

### File Management

- `POST /api/v1/files/upload` - Upload file
- `GET /api/v1/files/:id` - Get file metadata
- `GET /api/v1/files/:id/download` - Download file
- `DELETE /api/v1/files/:id` - Delete file

## Deployment

### Docker Deployment

1. **Build images**
   ```bash
   # Backend
   docker build -t minio-storage/backend:latest ./backend
   
   # Frontend
   docker build -t minio-storage/frontend:latest ./frontend
   ```

2. **Deploy with Docker Compose**
   ```bash
   docker-compose -f docker/docker-compose.yml up -d
   ```

### Kubernetes Deployment

1. **Deploy infrastructure**
   ```bash
   kubectl apply -f k8s/base/infrastructure.yaml
   ```

2. **Deploy applications**
   ```bash
   kubectl apply -f k8s/base/applications.yaml
   ```

3. **Check deployment status**
   ```bash
   kubectl get pods -n minio-storage
   kubectl get services -n minio-storage
   ```

## Development

### Project Structure

```
minio-fullstack-storage/
├── backend/
│   ├── cmd/server/          # Application entry point
│   ├── internal/
│   │   ├── api/             # HTTP handlers and routes
│   │   ├── auth/            # Authentication logic
│   │   ├── config/          # Configuration management
│   │   ├── models/          # Data models
│   │   └── services/        # Business logic services
│   ├── pkg/                 # Public packages
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js app router
│   │   ├── components/      # React components
│   │   ├── lib/             # Utility functions
│   │   ├── services/        # API client services
│   │   └── types/           # TypeScript type definitions
│   └── Dockerfile
├── docker/
│   └── docker-compose.yml   # Development services
├── k8s/
│   └── base/                # Kubernetes manifests
└── scripts/                 # Utility scripts
```

### Backend Development

The backend follows a clean architecture pattern:

- **Handlers**: HTTP request/response handling
- **Services**: Business logic and data operations
- **Models**: Data structures and validation
- **Auth**: Authentication and authorization
- **Config**: Environment and configuration management

### Frontend Development

The frontend uses modern React patterns:

- **App Router**: Next.js 14 app router for routing
- **Components**: Reusable UI components with shadcn/ui
- **Services**: API client with proper error handling
- **Types**: TypeScript for type safety
- **Styling**: Tailwind CSS for responsive design

## Testing

### Backend Testing
```bash
cd backend
go test ./...
```

### Frontend Testing
```bash
cd frontend
npm test
```

### Integration Testing
```bash
# Run full stack tests
npm run test:e2e
```

## Monitoring and Observability

### Health Checks
- Backend: `GET /health`
- Frontend: Health checks via Kubernetes probes

### Metrics
- Prometheus metrics available on backend
- Grafana dashboards for visualization

### Logging
- Structured logging with JSON format
- Centralized log collection available

## Performance

### Scalability Features
- Horizontal scaling with Kubernetes
- Load balancing for high availability
- Connection pooling for database efficiency
- Caching layer with Redis

### Performance Optimizations
- MinIO distributed storage
- CDN-ready static asset serving
- Optimized Docker images
- Resource limits and requests

## Security

### Authentication
- JWT tokens with configurable expiration
- Secure password hashing with bcrypt
- Role-based access control

### Data Protection
- Environment variable configuration
- Secrets management in Kubernetes
- CORS protection
- Input validation and sanitization

### Network Security
- HTTPS/TLS ready configuration
- Network policies for Kubernetes
- Container security scanning

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API documentation

## Roadmap

### Phase 1 (Current)
- Core API functionality
- Basic frontend interface
- Docker deployment

### Phase 2
- Advanced monitoring
- Performance optimization
- Enhanced security features

### Phase 3
- Multi-tenancy support
- Advanced caching strategies
- Real-time features with WebSockets

---

Built with MinIO, Go, Next.js, and Kubernetes for modern cloud-native applications.