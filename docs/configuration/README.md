# Configuration Management

This document covers all aspects of configuration management for the MinIO Fullstack Storage System, including environment variables, deployment configurations, and best practices for different environments.

## 📋 Table of Contents
- [Environment Variables](#environment-variables)
- [Configuration Files](#configuration-files)
- [Environment-Specific Configs](#environment-specific-configs)
- [Secrets Management](#secrets-management)
- [Docker Configuration](#docker-configuration)
- [Kubernetes Configuration](#kubernetes-configuration)
- [Best Practices](#best-practices)

## 🔧 Environment Variables

### Backend Configuration

#### Core Application Settings
```bash
# Application
APP_NAME=minio-fullstack-storage
APP_VERSION=1.0.0
APP_ENV=development  # development, staging, production
SERVER_PORT=8080
SERVER_HOST=0.0.0.0

# Database/Storage
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY_ID=minio_access_key
MINIO_SECRET_ACCESS_KEY=minio_secret_key
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=uploads

# Authentication
JWT_SECRET_KEY=your-super-secret-jwt-key-here
JWT_EXPIRATION_HOURS=24
BCRYPT_COST=12

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=100
RATE_LIMIT_BURST=20

# File Upload
MAX_FILE_SIZE_MB=100
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,txt,mp4,mp3

# Logging
LOG_LEVEL=info  # debug, info, warn, error
LOG_FORMAT=json  # json, text
LOG_OUTPUT=stdout  # stdout, file, both
LOG_FILE_PATH=/var/log/minio-storage/app.log
```

#### Security Settings
```bash
# Security Headers
SECURITY_FRAME_DENY=true
SECURITY_CONTENT_TYPE_NO_SNIFF=true
SECURITY_BROWSER_XSS_FILTER=true
SECURITY_HSTS_MAX_AGE=31536000

# Session Security
SESSION_SECURE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=strict

# API Security
API_TIMEOUT_SECONDS=30
API_MAX_CONCURRENT_REQUESTS=1000
```

### Frontend Configuration

#### Next.js Environment Variables
```bash
# Application
NEXT_PUBLIC_APP_NAME=MinIO Storage
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_APP_URL=http://localhost:3000

# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_API_TIMEOUT=30000

# File Upload
NEXT_PUBLIC_MAX_FILE_SIZE=104857600  # 100MB in bytes
NEXT_PUBLIC_CHUNK_SIZE=1048576       # 1MB chunks
NEXT_PUBLIC_ALLOWED_FILE_TYPES=image/*,application/pdf,text/*,video/*,audio/*

# UI Configuration
NEXT_PUBLIC_ITEMS_PER_PAGE=20
NEXT_PUBLIC_DEFAULT_THEME=light
NEXT_PUBLIC_ENABLE_DARK_MODE=true

# Analytics (Optional)
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=
NEXT_PUBLIC_SENTRY_DSN=

# Build Configuration
NODE_ENV=development  # development, production
ANALYZE=false
```

## 📁 Configuration Files

### Backend Configuration Structure
```
backend/
├── config/
│   ├── config.go           # Main configuration struct
│   ├── database.go         # MinIO configuration
│   ├── server.go          # Server configuration
│   ├── auth.go            # Authentication configuration
│   └── logging.go         # Logging configuration
├── .env                   # Development environment
├── .env.example          # Environment template
├── .env.test             # Testing environment
└── .env.production       # Production environment (not tracked)
```

### Frontend Configuration Structure
```
frontend/
├── .env.local            # Local development (not tracked)
├── .env.development      # Development environment
├── .env.staging          # Staging environment
├── .env.production       # Production environment
├── .env.example          # Environment template
├── next.config.js        # Next.js configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

## 🏗️ Environment-Specific Configs

### Development Environment
```bash
# .env.development
APP_ENV=development
SERVER_PORT=8080
LOG_LEVEL=debug
LOG_FORMAT=text

# MinIO (local instance)
MINIO_ENDPOINT=localhost:9000
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=dev-uploads

# CORS (allow local frontend)
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Security (relaxed for development)
JWT_EXPIRATION_HOURS=72
SESSION_SECURE=false
```

### Staging Environment
```bash
# .env.staging
APP_ENV=staging
SERVER_PORT=8080
LOG_LEVEL=info
LOG_FORMAT=json

# MinIO (staging instance)
MINIO_ENDPOINT=minio-staging.example.com:9000
MINIO_USE_SSL=true
MINIO_BUCKET_NAME=staging-uploads

# CORS (staging frontend)
CORS_ALLOWED_ORIGINS=https://staging.example.com

# Security (production-like)
JWT_EXPIRATION_HOURS=24
SESSION_SECURE=true
```

### Production Environment
```bash
# .env.production
APP_ENV=production
SERVER_PORT=8080
LOG_LEVEL=warn
LOG_FORMAT=json
LOG_OUTPUT=file

# MinIO (production instance)
MINIO_ENDPOINT=minio.example.com:9000
MINIO_USE_SSL=true
MINIO_BUCKET_NAME=production-uploads

# CORS (production frontend)
CORS_ALLOWED_ORIGINS=https://example.com

# Security (strict)
JWT_EXPIRATION_HOURS=8
SESSION_SECURE=true
RATE_LIMIT_REQUESTS_PER_MINUTE=60
```

## 🔐 Secrets Management

### Development
For local development, use `.env` files (ensure they're in `.gitignore`):
```bash
# Create from template
cp .env.example .env
# Edit with your local values
nano .env
```

### Staging/Production

#### Using Docker Secrets
```yaml
# docker-compose.yml
services:
  backend:
    environment:
      - JWT_SECRET_KEY_FILE=/run/secrets/jwt_secret
      - MINIO_SECRET_ACCESS_KEY_FILE=/run/secrets/minio_secret
    secrets:
      - jwt_secret
      - minio_secret

secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  minio_secret:
    file: ./secrets/minio_secret.txt
```

#### Using Kubernetes Secrets
```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  jwt-secret: <base64-encoded-secret>
  minio-secret: <base64-encoded-secret>
```

#### Using External Secret Management
```bash
# AWS Systems Manager Parameter Store
aws ssm put-parameter \
  --name "/minio-storage/production/jwt-secret" \
  --value "your-secret-here" \
  --type "SecureString"

# HashiCorp Vault
vault kv put secret/minio-storage/production \
  jwt_secret="your-secret-here" \
  minio_secret="your-minio-secret"

# Azure Key Vault
az keyvault secret set \
  --vault-name "minio-storage-vault" \
  --name "jwt-secret" \
  --value "your-secret-here"
```

## 🐳 Docker Configuration

### Development Docker Compose
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  backend:
    environment:
      - APP_ENV=development
      - LOG_LEVEL=debug
      - MINIO_ENDPOINT=minio:9000
    env_file:
      - .env.development

  frontend:
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
    env_file:
      - .env.development
```

### Production Docker Compose
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  backend:
    environment:
      - APP_ENV=production
      - LOG_LEVEL=warn
    env_file:
      - .env.production
    secrets:
      - jwt_secret
      - minio_secret

  frontend:
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
```

## ☸️ Kubernetes Configuration

### ConfigMap for Non-Sensitive Data
```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  APP_ENV: "production"
  SERVER_PORT: "8080"
  LOG_LEVEL: "info"
  LOG_FORMAT: "json"
  MINIO_ENDPOINT: "minio:9000"
  MINIO_USE_SSL: "true"
  MINIO_BUCKET_NAME: "production-uploads"
```

### Secret for Sensitive Data
```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  JWT_SECRET_KEY: <base64-encoded>
  MINIO_ACCESS_KEY_ID: <base64-encoded>
  MINIO_SECRET_ACCESS_KEY: <base64-encoded>
```

### Deployment with Config
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  template:
    spec:
      containers:
      - name: backend
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
```

## 🎯 Best Practices

### 1. Environment Separation
- **Never share configs** between environments
- **Use environment-specific** variable names when needed
- **Validate configurations** on application startup
- **Document all variables** with examples

### 2. Security
- **Never commit secrets** to version control
- **Use strong, unique secrets** for each environment
- **Rotate secrets regularly** (every 90 days)
- **Implement least-privilege** access to configuration

### 3. Validation
```go
// Example configuration validation in Go
func ValidateConfig(cfg *Config) error {
    if cfg.JWTSecret == "" {
        return errors.New("JWT_SECRET_KEY is required")
    }
    if len(cfg.JWTSecret) < 32 {
        return errors.New("JWT_SECRET_KEY must be at least 32 characters")
    }
    if cfg.MinIOEndpoint == "" {
        return errors.New("MINIO_ENDPOINT is required")
    }
    return nil
}
```

### 4. Documentation
- **Document all environment variables** with purpose and examples
- **Provide .env.example** files with safe default values
- **Keep configuration documentation** up to date
- **Include validation rules** and constraints

### 5. Monitoring
- **Monitor configuration changes** in production
- **Alert on invalid configurations** during startup
- **Log configuration loading** (without sensitive values)
- **Track configuration drift** between environments

## 🔄 Configuration Loading Order

### Backend (Go)
1. Default values in code
2. Configuration file (if exists)
3. Environment variables
4. Command-line flags
5. External secrets (Vault, etc.)

### Frontend (Next.js)
1. Default values in code
2. .env.local (local development only)
3. .env.[environment]
4. .env
5. Process environment variables

## 🚨 Troubleshooting

### Common Issues

#### Missing Environment Variables
```bash
# Check if variables are loaded
printenv | grep MINIO
# Or in Go application
log.Printf("MinIO Endpoint: %s", os.Getenv("MINIO_ENDPOINT"))
```

#### Invalid Configuration Values
```bash
# Validate configuration before starting
go run cmd/validate-config/main.go

# Test MinIO connection
go run cmd/test-minio/main.go
```

#### Environment Loading Issues
```bash
# Check file permissions
ls -la .env*

# Verify file contents (careful with secrets!)
cat .env.example
```

#### Docker Configuration Issues
```bash
# Check environment in container
docker exec -it container_name printenv

# Test configuration loading
docker-compose config
```

For more troubleshooting, see [Troubleshooting Guide](./troubleshooting.md).
