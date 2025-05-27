# Development Deployment Guide

This guide covers setting up the MinIO Fullstack Storage application for local development.

## Quick Setup

### Prerequisites
- Docker and Docker Compose
- Git
- VS Code (recommended) with the following extensions:
  - Go extension
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd minio-fullstack-storage

# Copy environment configuration
cp .env.example .env

# Start all services
docker-compose up -d
```

### 2. Initialize the Database

```bash
# Run database migrations
docker-compose exec backend go run cmd/migrate/main.go up

# (Optional) Seed test data
docker-compose exec backend go run cmd/seed/main.go
```

### 3. Verify Installation

Visit these URLs to verify everything is working:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080/api/health
- MinIO Console: http://localhost:9001 (admin/password123)

## Development Workflow

### Working with the Backend (Go)

#### Running Backend Locally
```bash
# Install dependencies
cd backend
go mod download

# Run database migrations
go run cmd/migrate/main.go up

# Start the server with hot reload
go run cmd/server/main.go
```

#### Backend Development Setup
```bash
# Install development tools
go install github.com/cosmtrek/air@latest  # Hot reload
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest  # Linting

# Run with hot reload
air
```

#### Running Tests
```bash
cd backend

# Run all tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Run specific test package
go test ./internal/handlers/...
```

### Working with the Frontend (Next.js)

#### Running Frontend Locally
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

#### Frontend Development Tools
```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Formatting
npm run format

# Build for production
npm run build
```

### Database Management

#### Connect to Database
```bash
# Using Docker
docker-compose exec postgres psql -U minio_user -d minio_storage

# Using local psql (if PostgreSQL installed locally)
psql -h localhost -p 5432 -U minio_user -d minio_storage
```

#### Database Migrations
```bash
# Create new migration
migrate create -ext sql -dir backend/migrations -seq add_new_table

# Apply migrations
docker-compose exec backend go run cmd/migrate/main.go up

# Rollback last migration
docker-compose exec backend go run cmd/migrate/main.go down
```

### MinIO Management

#### Access MinIO Console
- URL: http://localhost:9001
- Username: minioadmin
- Password: minioadmin

#### Using MinIO Client (mc)
```bash
# Configure mc alias
mc alias set local http://localhost:9000 minioadmin minioadmin

# List buckets
mc ls local

# Create bucket
mc mb local/new-bucket

# Upload file
mc cp file.txt local/minio-fullstack-storage/
```

## Development Configuration

### Environment Variables (.env)
```bash
# Database
DATABASE_URL=postgresql://minio_user:minio_password@localhost:5432/minio_storage?sslmode=disable
DB_HOST=localhost
DB_PORT=5432
DB_NAME=minio_storage
DB_USER=minio_user
DB_PASSWORD=minio_password

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=minio-fullstack-storage

# Backend
PORT=8080
GIN_MODE=debug
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRY=24h
CORS_ALLOWED_ORIGINS=http://localhost:3000

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf,text/plain

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_NAME="MinIO Storage App (Dev)"
```

### Docker Compose Services

The development setup includes:
- **backend**: Go API server (port 8080)
- **frontend**: Next.js application (port 3000)
- **postgres**: PostgreSQL database (port 5432)
- **minio**: MinIO object storage (port 9000, console 9001)

## IDE Setup

### VS Code Configuration

Create `.vscode/settings.json`:
```json
{
  "go.useLanguageServer": true,
  "go.formatTool": "goimports",
  "go.lintTool": "golangci-lint",
  "go.testFlags": ["-v"],
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "eslint.workingDirectories": ["frontend"],
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  }
}
```

Create `.vscode/launch.json` for debugging:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Backend",
      "type": "go",
      "request": "launch",
      "mode": "auto",
      "program": "${workspaceFolder}/backend/cmd/server/main.go",
      "env": {
        "GIN_MODE": "debug"
      },
      "args": []
    }
  ]
}
```

## Testing

### Backend Testing
```bash
cd backend

# Run unit tests
go test ./internal/...

# Run integration tests
go test ./tests/integration/...

# Run with race detection
go test -race ./...

# Generate test coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### Frontend Testing
```bash
cd frontend

# Run component tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run E2E tests (requires app running)
npm run test:e2e
```

## Debugging

### Backend Debugging
1. Set breakpoints in VS Code
2. Run the "Launch Backend" debug configuration
3. Make API requests to trigger breakpoints

### Frontend Debugging
1. Open browser dev tools
2. Use React Developer Tools extension
3. Set breakpoints in VS Code for SSR code

### Database Debugging
```bash
# View active connections
docker-compose exec postgres psql -U minio_user -d minio_storage -c "SELECT * FROM pg_stat_activity;"

# View slow queries
docker-compose exec postgres psql -U minio_user -d minio_storage -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

## Hot Reload Setup

### Backend Hot Reload (Air)
The `air` tool provides hot reload for Go applications:

Create `.air.toml`:
```toml
root = "."
testdata_dir = "testdata"
tmp_dir = "tmp"

[build]
  args_bin = []
  bin = "./tmp/main"
  cmd = "go build -o ./tmp/main ./cmd/server/main.go"
  delay = 1000
  exclude_dir = ["assets", "tmp", "vendor", "testdata", "frontend"]
  exclude_file = []
  exclude_regex = ["_test.go"]
  exclude_unchanged = false
  follow_symlink = false
  full_bin = ""
  include_dir = []
  include_ext = ["go", "tpl", "tmpl", "html"]
  kill_delay = "0s"
  log = "build-errors.log"
  send_interrupt = false
  stop_on_root = false

[color]
  app = ""
  build = "yellow"
  main = "magenta"
  runner = "green"
  watcher = "cyan"

[log]
  time = false

[misc]
  clean_on_exit = false
```

### Frontend Hot Reload
Next.js includes hot reload by default when running `npm run dev`.

## Common Development Issues

### Port Conflicts
```bash
# Check what's using a port
lsof -i :8080
netstat -tulpn | grep :8080

# Kill process using port
kill -9 $(lsof -t -i:8080)
```

### Database Connection Issues
```bash
# Reset database
docker-compose down -v
docker-compose up -d postgres
# Wait for PostgreSQL to start
docker-compose exec backend go run cmd/migrate/main.go up
```

### MinIO Issues
```bash
# Reset MinIO data
docker-compose down -v
docker-compose up -d minio
# Recreate bucket through console or mc
```

### Dependency Issues
```bash
# Backend
cd backend
go mod tidy
go mod verify

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## Performance Optimization for Development

### Database Performance
```bash
# Add to PostgreSQL configuration for development
echo "log_statement = 'all'" >> /var/lib/postgresql/data/postgresql.conf
echo "log_duration = on" >> /var/lib/postgresql/data/postgresql.conf
```

### Frontend Build Performance
```javascript
// next.config.js - Development optimizations
module.exports = {
  // Faster builds in development
  swcMinify: false,
  // Disable source maps in development if not needed
  productionBrowserSourceMaps: false,
}
```

## Next Steps

Once development environment is set up:
1. Review the [API documentation](../api/README.md)
2. Check the [frontend development guide](../development/frontend.md)
3. Review the [backend development guide](../development/backend.md)
4. Set up [testing](../testing/README.md)
