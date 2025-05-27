# Administrative Guide

Complete guide for system administrators managing the MinIO Fullstack Storage System.

## Overview

This guide covers administrative tasks including user management, system monitoring, backup procedures, and troubleshooting for production environments.

## Table of Contents

- [User Management](#user-management)
- [System Configuration](#system-configuration)
- [Storage Management](#storage-management)
- [Backup & Recovery](#backup--recovery)
- [Performance Monitoring](#performance-monitoring)
- [Security Management](#security-management)
- [Troubleshooting](#troubleshooting)

## User Management

### Admin User Creation

To create the first admin user, use the following process:

1. **Register a regular user** through the web interface
2. **Manually update the user role** in MinIO storage:
   ```bash
   # Connect to MinIO container
   docker exec -it minio-server sh
   
   # Use mc to update user role
   mc cp minio/users/{user-id}.json /tmp/user.json
   # Edit the file to change role to "admin"
   mc cp /tmp/user.json minio/users/{user-id}.json
   ```

3. **Using the API** (if you have admin access):
   ```bash
   curl -X PUT http://localhost:8080/api/v1/users/{user-id} \
     -H "Authorization: Bearer {admin-token}" \
     -H "Content-Type: application/json" \
     -d '{"role": "admin"}'
   ```

### User Role Management

Admin users can manage other users through the web interface or API:

- **Promote to Admin**: Change user role to `admin`
- **Demote from Admin**: Change user role to `user`
- **Delete Users**: Remove users from the system
- **View User Activity**: Monitor user file uploads and posts

### Bulk User Operations

For bulk operations, use the API with admin credentials:

```bash
# List all users
curl -H "Authorization: Bearer {admin-token}" \
  http://localhost:8080/api/v1/users?pageSize=100

# Bulk user updates (scripted)
./scripts/bulk-user-operations.sh
```

## System Configuration

### Environment Configuration

Key environment variables for production:

```bash
# Backend Configuration
GO_ENV=production
PORT=8080
JWT_SECRET={secure-random-string}

# MinIO Configuration  
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD={secure-password}
MINIO_ENDPOINT=minio:9000

# Redis Configuration (if used)
REDIS_URL=redis://redis:6379
```

### Service Configuration

#### MinIO Configuration
- **Access Policies**: Configure bucket policies for different user roles
- **Versioning**: Enable object versioning for file recovery
- **Lifecycle Rules**: Set up automatic file cleanup policies

#### Backend Service
- **Rate Limiting**: Configure API rate limits
- **File Size Limits**: Set maximum upload sizes
- **CORS Settings**: Configure frontend domain access

### Container Configuration

Update Docker Compose configurations:

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  backend:
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
  
  minio:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
```

## Storage Management

### MinIO Administration

#### Bucket Management
```bash
# Create buckets
mc mb minio/users
mc mb minio/files
mc mb minio/posts

# Set bucket policies
mc policy set public minio/files
mc policy set private minio/users
```

#### Storage Monitoring
```bash
# Check storage usage
mc admin info minio

# Monitor server performance
mc admin top minio

# View server logs
mc admin logs minio
```

### Data Organization

The system uses the following bucket structure:
```
users/          # User profile data
├── {user-id}.json
files/          # Uploaded files
├── {user-id}/
│   ├── {file-id}.*
posts/          # User posts data  
├── {post-id}.json
```

### Storage Cleanup

Set up automated cleanup for:
- **Deleted user files**: Remove orphaned files
- **Temporary uploads**: Clean incomplete uploads
- **Old log files**: Rotate and archive logs

```bash
# Manual cleanup script
./scripts/storage-cleanup.sh

# Automated cleanup (cron)
0 2 * * * /app/scripts/storage-cleanup.sh
```

## Backup & Recovery

### Backup Strategy

1. **Database Backup** (MinIO objects):
   ```bash
   # Full backup
   mc mirror --preserve minio/users /backup/users/$(date +%Y%m%d)
   mc mirror --preserve minio/files /backup/files/$(date +%Y%m%d)
   mc mirror --preserve minio/posts /backup/posts/$(date +%Y%m%d)
   ```

2. **Configuration Backup**:
   ```bash
   # Backup configurations
   tar -czf /backup/config-$(date +%Y%m%d).tar.gz \
     docker/ k8s/ monitoring/ scripts/
   ```

3. **Automated Backup Script**:
   ```bash
   #!/bin/bash
   # /scripts/backup.sh
   BACKUP_DIR="/backup/$(date +%Y%m%d)"
   mkdir -p $BACKUP_DIR
   
   # Backup MinIO data
   mc mirror --preserve minio/ $BACKUP_DIR/minio/
   
   # Backup configurations
   tar -czf $BACKUP_DIR/configs.tar.gz docker/ k8s/
   
   # Cleanup old backups (keep 30 days)
   find /backup -type d -mtime +30 -exec rm -rf {} \;
   ```

### Recovery Procedures

1. **Full System Recovery**:
   ```bash
   # Stop services
   docker-compose down
   
   # Restore MinIO data
   mc mirror /backup/20240101/minio/ minio/
   
   # Restart services
   docker-compose up -d
   ```

2. **User Data Recovery**:
   ```bash
   # Restore specific user data
   mc cp /backup/users/{user-id}.json minio/users/
   mc mirror /backup/files/{user-id}/ minio/files/{user-id}/
   ```

3. **Point-in-Time Recovery**:
   - Use MinIO versioning to recover specific file versions
   - Restore from incremental backups for data consistency

## Performance Monitoring

### Key Metrics to Monitor

1. **System Performance**:
   - CPU usage
   - Memory consumption
   - Disk I/O
   - Network bandwidth

2. **Application Metrics**:
   - API response times
   - Request rates
   - Error rates
   - Active users

3. **Storage Metrics**:
   - Storage usage
   - Upload/download rates
   - Failed operations

### Monitoring Tools

Use the monitoring stack:
- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboards
- **AlertManager**: Alert notifications

```bash
# Start monitoring stack
cd monitoring/
docker-compose up -d

# Access Grafana
open http://localhost:3000
```

### Performance Tuning

1. **Backend Optimization**:
   ```bash
   # Increase Go process limits
   ulimit -n 65536
   
   # Tune garbage collector
   GOGC=100 GOMEMLIMIT=1GiB
   ```

2. **MinIO Optimization**:
   ```bash
   # Set appropriate drives for performance
   MINIO_DRIVES="/data1 /data2 /data3 /data4"
   
   # Tune for your workload
   MINIO_API_REQUESTS_MAX=10000
   ```

## Security Management

### Access Control

1. **API Security**:
   - Rotate JWT secrets regularly
   - Implement API rate limiting
   - Monitor for suspicious activity

2. **MinIO Security**:
   - Use strong access keys
   - Configure bucket policies
   - Enable server-side encryption

3. **Network Security**:
   - Use HTTPS in production
   - Configure firewall rules
   - Set up VPN for admin access

### Security Monitoring

Monitor for:
- Failed login attempts
- Unusual API usage patterns
- Unauthorized file access
- Large file uploads

```bash
# Review security logs
docker logs backend | grep "Unauthorized\|Forbidden"
docker logs minio | grep "AccessDenied"
```

### Incident Response

1. **Security Incident**:
   - Immediately revoke compromised tokens
   - Change system passwords
   - Review access logs
   - Notify relevant stakeholders

2. **Data Breach Response**:
   - Isolate affected systems
   - Assess data exposure
   - Document incident
   - Implement remediation

## Troubleshooting

### Common Issues

1. **Service Not Starting**:
   ```bash
   # Check service status
   docker-compose ps
   
   # Review logs
   docker-compose logs backend
   docker-compose logs minio
   ```

2. **Storage Issues**:
   ```bash
   # Check disk space
   df -h
   
   # Check MinIO health
   mc admin info minio
   ```

3. **Performance Issues**:
   ```bash
   # Monitor resource usage
   docker stats
   
   # Check application metrics
   curl http://localhost:8080/health
   ```

### Log Analysis

Key log locations:
- **Backend logs**: `docker logs backend`
- **MinIO logs**: `docker logs minio`
- **Nginx logs**: `docker logs nginx`

### Support Escalation

For complex issues:
1. Gather system information
2. Export relevant logs
3. Document reproduction steps
4. Contact development team

## Maintenance Schedule

### Daily Tasks
- Monitor system health
- Review error logs
- Check storage usage

### Weekly Tasks  
- Update system packages
- Review security logs
- Validate backup integrity

### Monthly Tasks
- Rotate log files
- Update documentation
- Performance review
- Security audit

---

## Quick Reference

### Essential Commands
```bash
# System status
docker-compose ps
curl http://localhost:8080/health

# User management
curl -H "Authorization: Bearer {token}" \
  http://localhost:8080/api/v1/users

# Storage status
mc admin info minio

# Backup
./scripts/backup.sh

# Monitoring
open http://localhost:3000  # Grafana
```

### Emergency Contacts
- Development Team: [dev-team@company.com]
- Infrastructure Team: [infra@company.com]
- Security Team: [security@company.com]

---

**Last Updated:** May 27, 2025  
**Version:** 1.0.0
