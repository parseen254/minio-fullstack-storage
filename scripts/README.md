# MinIO Storage System - Scripts Documentation

This directory contains management scripts for the MinIO Storage System. All scripts have been updated to work with the current Docker setup using `docker compose` instead of the deprecated `docker-compose`.

## Available Scripts

### 🔧 Development Environment (`dev.sh`)

Manages the development environment with hot-reloading and development-friendly configurations.

```bash
# Start development environment
./scripts/dev.sh start

# Stop development environment
./scripts/dev.sh stop

# Restart development environment
./scripts/dev.sh restart

# View logs (all services)
./scripts/dev.sh logs

# View logs for specific service
./scripts/dev.sh logs backend
./scripts/dev.sh logs frontend
./scripts/dev.sh logs minio
./scripts/dev.sh logs redis
./scripts/dev.sh logs nats

# Rebuild all services
./scripts/dev.sh build

# Clean up (removes containers, networks, volumes)
./scripts/dev.sh clean

# Show status and health of all services
./scripts/dev.sh status

# Open shell in backend container
./scripts/dev.sh shell

# Open shell in specific service
./scripts/dev.sh shell frontend
./scripts/dev.sh shell minio

# Run backend tests
./scripts/dev.sh test

# Check health of all services
./scripts/dev.sh health

# Show help
./scripts/dev.sh help
```

**Development URLs:**
- 📱 Frontend: http://localhost:3000
- 🔧 Backend API: http://localhost:8080
- 🗃️ MinIO Console: http://localhost:9001
- 📊 Redis: localhost:6379
- 📡 NATS: localhost:4222 (Monitoring: http://localhost:8222)

**Default MinIO Credentials:**
- Username: `minioadmin`
- Password: `minioadmin123`

### 🚀 Production Environment (`prod.sh`)

Manages the production environment with optimized configurations, health checks, and deployment features.

```bash
# Start production environment
./scripts/prod.sh start

# Stop production environment
./scripts/prod.sh stop

# Restart production environment
./scripts/prod.sh restart

# View logs (all services)
./scripts/prod.sh logs

# View logs for specific service
./scripts/prod.sh logs backend
./scripts/prod.sh logs frontend

# Rebuild all services
./scripts/prod.sh build

# Deploy with zero downtime
./scripts/prod.sh deploy

# Show status and health of all services
./scripts/prod.sh status

# Backup production volumes
./scripts/prod.sh backup

# Restore from backup
./scripts/prod.sh restore /path/to/backup

# Check health of all services
./scripts/prod.sh health

# Scale services
./scripts/prod.sh scale backend 3
./scripts/prod.sh scale frontend 2

# Show help
./scripts/prod.sh help
```

**Prerequisites for Production:**
- Copy `.env.prod.template` to `.env.prod` and configure with production values
- Ensure Docker and Docker Compose are installed
- Configure proper SSL certificates and domain names

### 🧪 Integration Tests (`integration-test.sh`)

Comprehensive integration testing suite that tests all system components and their interactions.

```bash
# Run tests (requires running development environment)
./scripts/integration-test.sh

# Setup environment, run tests, and cleanup
./scripts/integration-test.sh --setup --cleanup

# Run tests with verbose output
./scripts/integration-test.sh --verbose

# Show help
./scripts/integration-test.sh --help
```

**Test Coverage:**
1. Health endpoints
2. Frontend availability
3. User registration and authentication
4. Protected endpoints (JWT authentication)
5. API route availability
6. CORS configuration
7. Infrastructure services (MinIO, Redis, NATS)
8. Basic performance testing

## Script Features

### ✨ Enhanced Functionality

All scripts now include:
- **Docker Compose v2**: Updated to use `docker compose` instead of deprecated `docker-compose`
- **Service Health Checks**: Automated health monitoring for all services
- **Improved Logging**: Service-specific log viewing with colored output
- **Interactive Confirmations**: Safety prompts for destructive operations
- **Better Error Handling**: Comprehensive error checking and user feedback
- **Environment Validation**: Automatic checks for required files and services

### 🔒 Production Features

The production script includes:
- **Zero-downtime Deployment**: Rolling updates without service interruption
- **Backup & Restore**: Automated volume backup and restoration
- **Service Scaling**: Dynamic scaling of frontend and backend services
- **Environment Validation**: Ensures `.env.prod` exists before operations
- **Resource Monitoring**: Health checks with detailed status reporting

### 🧪 Testing Features

The integration test script includes:
- **Environment Management**: Automatic setup and cleanup of test environment
- **Comprehensive Coverage**: Tests authentication, API endpoints, and infrastructure
- **Performance Testing**: Basic performance benchmarks
- **Detailed Reporting**: Color-coded test results with pass/fail counts

## Environment Files

### Development (`.env.dev.template`)
- Pre-configured for local development
- Debug logging enabled
- CORS enabled for frontend development
- Insecure settings appropriate for development

### Production (`.env.prod.template`)
- Production-ready configuration template
- Security-focused settings
- SSL and authentication configurations
- Performance optimizations

## Docker Services

### Development Environment
- **Frontend**: Next.js with hot-reloading
- **Backend**: Go API with air for hot-reloading
- **MinIO**: Object storage with development credentials
- **Redis**: Caching and session storage
- **NATS**: Message queue for async operations

### Production Environment
- **Frontend**: Optimized Next.js build
- **Backend**: Production Go binary
- **MinIO**: Multi-node setup with persistent storage
- **Redis**: Password-protected with persistence
- **NATS**: Clustered setup for high availability

## Troubleshooting

### Common Issues

1. **Services not starting**: Check if ports are already in use
   ```bash
   ./scripts/dev.sh health
   ```

2. **Permission errors**: Ensure scripts are executable
   ```bash
   chmod +x scripts/*.sh
   ```

3. **Environment file missing**: Copy from template
   ```bash
   cp docker/.env.dev.template docker/.env
   ```

4. **Docker daemon not running**: Start Docker service
   ```bash
   # On Linux
   sudo systemctl start docker
   
   # On macOS/Windows
   # Start Docker Desktop
   ```

### Logs and Debugging

- Use `./scripts/dev.sh logs` to view all service logs
- Use `./scripts/dev.sh logs [service]` for specific service logs
- Use `./scripts/dev.sh status` to check service health
- Use `./scripts/dev.sh shell [service]` to debug inside containers

## Deprecated Scripts

The following script has been removed as it was deprecated:
- `deploy.sh` - Functionality moved to `prod.sh deploy`

## Migration Notes

If you were using the old scripts:
- Replace `docker-compose` commands with `docker compose`
- Update any CI/CD pipelines to use the new script commands
- Review environment configurations for any changes
- Test the new scripts in a development environment first

## Contributing

When modifying scripts:
1. Test in development environment first
2. Ensure backward compatibility where possible
3. Update this documentation
4. Test with both fresh installations and existing setups
5. Verify all error paths and edge cases
