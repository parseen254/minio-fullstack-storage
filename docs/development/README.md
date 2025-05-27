# Development Guide

## Development Environment Setup

This guide covers setting up a local development environment for contributing to the MinIO Fullstack Storage System.

## Prerequisites

### Required Software
- **Git** 2.30+
- **Docker** 20.10+
- **Docker Compose** 2.0+
- **Node.js** 18.0+ (LTS recommended)
- **npm** 8.0+ or **yarn** 1.22+
- **Go** 1.21+
- **Make** (for build automation)

### Optional but Recommended
- **VS Code** with extensions:
  - Go extension
  - React/TypeScript extensions
  - Docker extension
  - REST Client extension
- **Postman** or **Insomnia** for API testing
- **Git GUI client** (GitKraken, SourceTree, etc.)

## Project Structure

```
minio-fullstack-storage/
├── backend/                 # Go backend API
│   ├── cmd/server/         # Main application entry
│   ├── internal/           # Internal packages
│   │   ├── api/           # HTTP handlers and routes
│   │   ├── auth/          # Authentication logic
│   │   ├── config/        # Configuration management
│   │   ├── models/        # Data models
│   │   └── services/      # Business logic
│   ├── docs/              # API documentation
│   └── Dockerfile
├── frontend/               # React/Next.js frontend
│   ├── src/
│   │   ├── app/           # Next.js app router pages
│   │   ├── components/    # React components
│   │   ├── lib/           # Utility libraries
│   │   ├── services/      # API client services
│   │   └── types/         # TypeScript type definitions
│   ├── public/            # Static assets
│   └── Dockerfile
├── k8s/                   # Kubernetes manifests
├── monitoring/            # Monitoring configuration
├── docs/                  # Documentation
└── docker-compose.yml     # Local development setup
```

## Development Workflow

### 1. Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd minio-fullstack-storage

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start MinIO for development
docker-compose up -d minio
```

### 2. Backend Development

```bash
# Navigate to backend directory
cd backend

# Install dependencies
go mod download

# Run tests
go test ./...

# Start development server with hot reload
go run cmd/server/main.go

# Or use air for hot reloading (install: go install github.com/cosmtrek/air@latest)
air
```

**Backend runs on:** http://localhost:8080

### 3. Frontend Development

```bash
# Navigate to frontend directory (in new terminal)
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Type checking
npm run type-check
```

**Frontend runs on:** http://localhost:3000

### 4. Full Stack Development

For full stack development, you can run everything with Docker Compose:

```bash
# Start all services in development mode
docker-compose -f docker-compose.dev.yml up

# Or start individual services
docker-compose up minio            # Storage only
docker-compose up backend          # Backend only
docker-compose up frontend         # Frontend only
```

## Code Standards

### Backend (Go)

**File Organization:**
- Use packages to organize related functionality
- Keep handlers thin, put business logic in services
- Models should only contain data structures and validation

**Naming Conventions:**
- Use PascalCase for exported functions/types
- Use camelCase for unexported functions/variables
- Use descriptive names (no abbreviations)

**Code Style:**
```go
// Good
func (s *StorageService) CreateUser(ctx context.Context, user *models.User) error {
    if err := s.validateUser(user); err != nil {
        return fmt.Errorf("validation failed: %w", err)
    }
    // Implementation...
}

// Bad
func (s *StorageService) Create(u *models.User) error {
    // Implementation...
}
```

**Error Handling:**
- Always wrap errors with context
- Use structured logging
- Return appropriate HTTP status codes

### Frontend (React/TypeScript)

**Component Organization:**
```tsx
// Good: Functional component with TypeScript
interface UserCardProps {
  user: User
  onEdit: (user: User) => void
}

export function UserCard({ user, onEdit }: UserCardProps) {
  return (
    <Card>
      <h3>{user.firstName} {user.lastName}</h3>
      <Button onClick={() => onEdit(user)}>Edit</Button>
    </Card>
  )
}
```

**Hooks and State Management:**
- Use React Query for server state
- Use custom hooks for reusable logic
- Keep components focused and small

**Styling:**
- Use Tailwind CSS for styling
- Follow component-based architecture
- Use CSS modules for component-specific styles

## Testing Strategy

### Backend Testing

```bash
# Unit tests
go test ./internal/services/...
go test ./internal/api/...

# Integration tests
go test ./internal/... -tags=integration

# Test coverage
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out
```

**Test Structure:**
```go
func TestStorageService_CreateUser(t *testing.T) {
    tests := []struct {
        name    string
        user    *models.User
        wantErr bool
    }{
        {
            name: "valid user",
            user: &models.User{
                Username: "testuser",
                Email:    "test@example.com",
            },
            wantErr: false,
        },
        // More test cases...
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Test implementation...
        })
    }
}
```

### Frontend Testing

```bash
# Unit tests
npm test

# E2E tests (when implemented)
npm run test:e2e

# Type checking
npm run type-check
```

## API Development

### Adding New Endpoints

1. **Define the model** in `backend/internal/models/`
2. **Add service logic** in `backend/internal/services/`
3. **Create handler** in `backend/internal/api/`
4. **Add routes** in `backend/internal/api/routes.go`
5. **Update API documentation** with Swagger comments
6. **Add tests** for the new functionality
7. **Update frontend types** in `frontend/src/types/api.ts`
8. **Create frontend service** in `frontend/src/services/`

### Example: Adding a new endpoint

```go
// 1. Model (backend/internal/models/comment.go)
type Comment struct {
    ID     string `json:"id"`
    PostID string `json:"postId"`
    UserID string `json:"userId"`
    Text   string `json:"text"`
}

// 2. Service (backend/internal/services/storage.go)
func (s *StorageService) CreateComment(ctx context.Context, comment *models.Comment) error {
    // Implementation...
}

// 3. Handler (backend/internal/api/comment_handler.go)
func (h *CommentHandler) CreateComment(c *gin.Context) {
    // Implementation...
}

// 4. Routes (backend/internal/api/routes.go)
comments := protected.Group("/comments")
{
    comments.POST("/", commentHandler.CreateComment)
}
```

## Database Migrations

The system uses MinIO object storage instead of traditional databases. For data structure changes:

1. **Update models** in `backend/internal/models/`
2. **Add migration logic** in services if needed
3. **Update API documentation**
4. **Update frontend types**

## Environment Variables

### Backend Environment
```env
# Server Configuration
PORT=8080
GIN_MODE=debug

# MinIO Configuration
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_USE_SSL=false

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRATION=24h

# Database Configuration (MinIO Buckets)
USERS_BUCKET=users
POSTS_BUCKET=posts
FILES_BUCKET=files
```

### Frontend Environment
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_MINIO_ENDPOINT=localhost:9000
```

## Debugging

### Backend Debugging

**Using VS Code:**
1. Install Go extension
2. Set breakpoints in code
3. Press F5 or use "Run and Debug"

**Using Delve (command line):**
```bash
# Install delve
go install github.com/go-delve/delve/cmd/dlv@latest

# Start debugging
dlv debug cmd/server/main.go
```

**Logging:**
- Use structured logging with logrus/zap
- Log at appropriate levels (debug, info, warn, error)
- Include context in log messages

### Frontend Debugging

**Browser DevTools:**
- Use React Developer Tools extension
- Use Redux DevTools for state management
- Use Network tab for API debugging

**VS Code Debugging:**
```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Next.js debug",
  "program": "${workspaceFolder}/frontend/node_modules/.bin/next",
  "args": ["dev"],
  "console": "integratedTerminal"
}
```

## Performance Optimization

### Backend Performance
- Use connection pooling for external services
- Implement proper caching strategies
- Use goroutines for concurrent operations
- Profile with `go tool pprof`

### Frontend Performance
- Use React.memo for expensive components
- Implement proper loading states
- Use React Query for caching
- Optimize bundle size with code splitting

## Git Workflow

### Branch Naming
- `feature/feature-name` - New features
- `bugfix/bug-description` - Bug fixes
- `hotfix/critical-fix` - Critical production fixes
- `docs/documentation-update` - Documentation changes

### Commit Messages
Follow conventional commits:
```
feat: add user profile upload functionality
fix: resolve authentication token expiration issue
docs: update API documentation for file endpoints
test: add unit tests for user service
refactor: optimize file upload performance
```

### Pull Request Process
1. Create feature branch from main
2. Implement changes with tests
3. Update documentation if needed
4. Create pull request
5. Code review and approval
6. Merge to main

## Deployment

### Development Deployment
```bash
# Build and start all services
docker-compose up --build

# Or deploy to local Kubernetes
kubectl apply -k k8s/overlays/development/
```

### Production Deployment
See [Production Deployment Guide](../deployment/production.md)

## Getting Help

### Documentation
- [API Reference](../api/README.md)
- [Architecture Overview](../architecture.md)
- [Troubleshooting Guide](../admin/troubleshooting.md)

### Community
- GitHub Issues for bugs and feature requests
- GitHub Discussions for questions and ideas
- Code reviews for learning and improvement

### Tools and Resources
- [Go Documentation](https://golang.org/doc/)
- [React Documentation](https://reactjs.org/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [MinIO Documentation](https://docs.min.io/)
- [Docker Documentation](https://docs.docker.com/)

## Contributing

1. Read the [Getting Started Guide](../getting-started.md)
2. Set up your development environment
3. Pick an issue from GitHub Issues
4. Follow the development workflow
5. Submit a pull request

Happy coding! 🚀
