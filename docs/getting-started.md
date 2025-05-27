# Getting Started Guide

## Quick Start (5 Minutes)

This guide will help you get the MinIO Fullstack Storage System running locally in 5 minutes.

### Prerequisites

- Docker and Docker Compose
- Git
- Node.js 18+ (for frontend development)
- Go 1.21+ (for backend development)

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd minio-fullstack-storage
```

### Step 2: Start with Docker Compose

```bash
# Start all services (MinIO, Backend, Frontend)
docker-compose up -d

# Check if all services are running
docker-compose ps
```

### Step 3: Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **MinIO Console**: http://localhost:9001
- **API Documentation**: http://localhost:8080/swagger/index.html

### Step 4: Create Your First Account

1. Navigate to http://localhost:3000
2. Click "Sign Up" 
3. Create a new account
4. Login and start using the application

### Step 5: Upload Your First File

1. Go to the Files section
2. Click "Upload File"
3. Select a file and upload
4. View and manage your uploaded files

## Default Credentials

### MinIO Console
- **Username**: `minioadmin`
- **Password**: `minioadmin123`

### Application
Create your own account through the registration page.

## Next Steps

- [Development Setup](./deployment/development.md) - Set up local development
- [Architecture Overview](./architecture.md) - Understand the system architecture
- [API Documentation](./api/README.md) - Explore the API
- [Production Deployment](./deployment/production.md) - Deploy to production

## Troubleshooting

### Common Issues

**Services not starting:**
```bash
# Check logs
docker-compose logs

# Restart services
docker-compose down
docker-compose up -d
```

**Port conflicts:**
```bash
# Check what's using the ports
netstat -tulpn | grep :3000
netstat -tulpn | grep :8080
netstat -tulpn | grep :9000
```

**Database connection issues:**
```bash
# Check MinIO health
curl http://localhost:9000/minio/health/live
```

For more troubleshooting, see [Troubleshooting Guide](./admin/troubleshooting.md).

## System Requirements

### Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 10 GB free space
- **Network**: 1 Mbps

### Recommended for Production
- **CPU**: 4+ cores
- **RAM**: 8+ GB  
- **Storage**: 100+ GB SSD
- **Network**: 10+ Mbps

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │     MinIO       │
│   (Next.js)     │◄──►│     (Go)        │◄──►│   (Storage)     │
│   Port: 3000    │    │   Port: 8080    │    │   Port: 9000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

The system consists of three main components:
- **Frontend**: React/Next.js web application
- **Backend**: Go REST API server
- **Storage**: MinIO object storage

For detailed architecture information, see [Architecture Documentation](./architecture.md).
