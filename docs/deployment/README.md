# Deployment Guide

This guide covers different deployment strategies for the MinIO Fullstack Storage application.

## Table of Contents

- [Quick Start](#quick-start)
- [Deployment Options](#deployment-options)
- [Environment Configuration](#environment-configuration)
- [Prerequisites](#prerequisites)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Using Docker Compose (Recommended for Development)

1. Clone the repository and navigate to the project root
2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
3. Configure your environment variables in `.env`
4. Start the services:
   ```bash
   docker-compose up -d
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- MinIO Console: http://localhost:9001

## Deployment Options

### 1. Development Environment
- **Best for**: Local development and testing
- **Guide**: [Development Deployment](./development.md)
- **Requirements**: Docker, Docker Compose

### 2. Production Environment
- **Best for**: Production deployments with external infrastructure
- **Guide**: [Production Deployment](./production.md)
- **Requirements**: External PostgreSQL, MinIO, monitoring stack

### 3. Docker Deployment
- **Best for**: Containerized deployments
- **Guide**: [Docker Deployment](./docker.md)
- **Requirements**: Docker, Docker Compose

### 4. Kubernetes Deployment
- **Best for**: Orchestrated container deployments
- **Guide**: [Kubernetes Deployment](./kubernetes.md)
- **Requirements**: Kubernetes cluster, kubectl

## Environment Configuration

### Required Environment Variables

#### Backend Configuration
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/minio_storage
DB_HOST=localhost
DB_PORT=5432
DB_NAME=minio_storage
DB_USER=user
DB_PASSWORD=password

# MinIO Configuration
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=minio-fullstack-storage

# Server Configuration
PORT=8080
GIN_MODE=release
CORS_ALLOWED_ORIGINS=http://localhost:3000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRY=24h

# File Upload Limits
MAX_FILE_SIZE=10485760 # 10MB in bytes
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf,text/plain
```

#### Frontend Configuration
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_NAME="MinIO Storage App"
```

### Optional Configuration

#### Security
```bash
# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=100
RATE_LIMIT_BURST=200

# CORS
CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization
CORS_MAX_AGE=86400
```

#### Monitoring
```bash
# Metrics
METRICS_ENABLED=true
METRICS_PORT=9090

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## Prerequisites

### System Requirements
- **CPU**: 2+ cores
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 20GB minimum for system + data storage needs
- **Network**: Stable internet connection for external dependencies

### Software Requirements

#### For Docker Deployment
- Docker 20.0+
- Docker Compose 2.0+

#### For Native Deployment
- Go 1.21+
- Node.js 18+
- npm/yarn
- PostgreSQL 13+
- MinIO server

#### For Kubernetes Deployment
- Kubernetes 1.24+
- kubectl configured
- Helm 3.0+ (optional)

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check database connectivity
docker exec -it postgres-container psql -U user -d minio_storage -c "SELECT 1;"

# Check environment variables
echo $DATABASE_URL
```

#### 2. MinIO Connection Issues
```bash
# Check MinIO server status
curl http://localhost:9000/minio/health/live

# Verify credentials
mc alias set local http://localhost:9000 minioadmin minioadmin
mc ls local
```

#### 3. Frontend API Connection Issues
```bash
# Check backend API health
curl http://localhost:8080/api/health

# Verify CORS configuration
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://localhost:8080/api/health
```

#### 4. File Upload Issues
- Verify `MAX_FILE_SIZE` setting
- Check `ALLOWED_FILE_TYPES` configuration
- Ensure MinIO bucket exists and is accessible
- Verify disk space availability

### Getting Help

1. Check the [troubleshooting guide](../troubleshooting.md)
2. Review application logs:
   ```bash
   docker-compose logs backend
   docker-compose logs frontend
   ```
3. Check service status:
   ```bash
   docker-compose ps
   ```

## Next Steps

After successful deployment:
1. Configure monitoring: [Monitoring Guide](../monitoring/README.md)
2. Set up security: [Security Guide](../security/README.md)
3. Performance tuning: [Performance Guide](../performance/README.md)
4. Production checklist: [Production Checklist](../production/checklist.md)
