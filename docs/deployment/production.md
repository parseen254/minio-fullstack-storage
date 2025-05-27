# Production Deployment Guide

This guide covers deploying the MinIO Fullstack Storage application to production environments.

## Production Architecture

### Recommended Production Setup

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Web Servers   │    │   API Servers   │
│    (HAProxy/    │────│   (Next.js)     │────│     (Go)        │
│     Nginx)      │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                │                       │
                       ┌─────────────────┐    ┌─────────────────┐
                       │   CDN/Static    │    │   PostgreSQL    │
                       │   Assets        │    │   Database      │
                       │                 │    │   (Primary +    │
                       └─────────────────┘    │   Replicas)     │
                                              └─────────────────┘
                                                       │
                                              ┌─────────────────┐
                                              │   MinIO         │
                                              │   Cluster       │
                                              │                 │
                                              └─────────────────┘
```

## Prerequisites

### Infrastructure Requirements

#### Minimum Production Requirements
- **CPU**: 4 cores per service
- **RAM**: 8GB per service
- **Storage**: 100GB system + data storage requirements
- **Network**: High-bandwidth, low-latency connectivity

#### Recommended Production Setup
- **Load Balancer**: 2 cores, 4GB RAM
- **Frontend Servers**: 2-4 instances, 2 cores, 4GB RAM each
- **Backend Servers**: 2-4 instances, 4 cores, 8GB RAM each
- **Database**: 8 cores, 16GB RAM, SSD storage
- **MinIO Cluster**: 4+ nodes, 4 cores, 8GB RAM each

### External Services

#### Required
- **PostgreSQL Database** (managed service recommended)
  - AWS RDS, Google Cloud SQL, or Azure Database
  - Version 13+ with SSL enabled
  - Automated backups configured

- **MinIO Object Storage**
  - MinIO cluster or S3-compatible service
  - High availability configuration
  - Data replication enabled

#### Recommended
- **CDN** (CloudFlare, AWS CloudFront, Azure CDN)
- **SSL Certificate** (Let's Encrypt, AWS Certificate Manager)
- **Monitoring** (Prometheus + Grafana, DataDog, New Relic)
- **Logging** (ELK Stack, Fluentd, CloudWatch)
- **Backup Service** (automated database and file backups)

## Deployment Methods

### Method 1: Docker with Docker Compose

#### 1. Prepare Production Environment
```bash
# Create application directory
sudo mkdir -p /opt/minio-storage
cd /opt/minio-storage

# Clone repository
git clone <repository-url> .
```

#### 2. Production Environment Configuration
Create `production.env`:
```bash
# Database - Use external managed database
DATABASE_URL=postgresql://user:password@db.example.com:5432/minio_storage
DB_HOST=db.example.com
DB_PORT=5432
DB_NAME=minio_storage
DB_USER=prod_user
DB_PASSWORD=secure_password

# MinIO - Use external MinIO cluster or S3
MINIO_ENDPOINT=minio.example.com:9000
MINIO_ACCESS_KEY=production_access_key
MINIO_SECRET_KEY=production_secret_key
MINIO_USE_SSL=true
MINIO_BUCKET_NAME=minio-fullstack-storage-prod

# Backend Configuration
PORT=8080
GIN_MODE=release
JWT_SECRET=super-secure-production-jwt-secret-32-chars-minimum
JWT_EXPIRY=2h
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# Security
RATE_LIMIT_REQUESTS_PER_MINUTE=60
RATE_LIMIT_BURST=100

# File Upload
MAX_FILE_SIZE=52428800  # 50MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf,text/plain

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_NAME="MinIO Storage App"

# Monitoring
METRICS_ENABLED=true
METRICS_PORT=9090
LOG_LEVEL=info
LOG_FORMAT=json
```

#### 3. Production Docker Compose
Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    restart: unless-stopped
    env_file:
      - production.env
    ports:
      - "8080:8080"
      - "9090:9090"  # Metrics
    volumes:
      - /var/log/minio-storage:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    restart: unless-stopped
    env_file:
      - production.env
    ports:
      - "3000:3000"
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
      - /var/log/nginx:/var/log/nginx
    depends_on:
      - frontend
      - backend

volumes:
  logs:
    driver: local
```

#### 4. Nginx Configuration
Create `nginx.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:8080;
    }
    
    upstream frontend {
        server frontend:3000;
    }
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=web:10m rate=30r/s;
    
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;
        
        # SSL Configuration
        ssl_certificate /etc/ssl/certs/fullchain.pem;
        ssl_certificate_key /etc/ssl/certs/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        
        # Security Headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
        
        # API Routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Frontend Routes
        location / {
            limit_req zone=web burst=50 nodelay;
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Static Assets
        location /_next/static/ {
            proxy_pass http://frontend;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

#### 5. Deploy to Production
```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations
docker-compose -f docker-compose.prod.yml exec backend go run cmd/migrate/main.go up

# Check service status
docker-compose -f docker-compose.prod.yml ps
```

### Method 2: Kubernetes Deployment

See [Kubernetes Deployment Guide](./kubernetes.md) for detailed instructions.

### Method 3: Manual Deployment

#### Backend Deployment
```bash
# Build backend
cd backend
CGO_ENABLED=0 GOOS=linux go build -o minio-storage-api cmd/server/main.go

# Deploy binary
scp minio-storage-api user@server:/opt/minio-storage/
ssh user@server 'sudo systemctl restart minio-storage-api'
```

#### Frontend Deployment
```bash
# Build frontend
cd frontend
npm run build
npm run export

# Deploy static files
rsync -avz out/ user@server:/var/www/minio-storage/
```

## Production Configuration

### Security Configuration

#### 1. Environment Variables Security
```bash
# Use a secrets management system in production
# AWS Secrets Manager, HashiCorp Vault, etc.

# Store sensitive variables securely
JWT_SECRET=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 24)
```

#### 2. Database Security
```sql
-- Create restricted database user
CREATE USER minio_prod_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE minio_storage TO minio_prod_user;
GRANT USAGE ON SCHEMA public TO minio_prod_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO minio_prod_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO minio_prod_user;

-- Enable SSL
ALTER SYSTEM SET ssl = on;
SELECT pg_reload_conf();
```

#### 3. MinIO Security
```bash
# Create dedicated MinIO user
mc admin user add minio_cluster minio_prod_user secure_password

# Create policy for application
mc admin policy set minio_cluster readwrite user=minio_prod_user

# Enable SSL/TLS
mc admin config set minio_cluster api secure=on
```

### Performance Configuration

#### 1. Database Optimization
```sql
-- Production PostgreSQL settings
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET maintenance_work_mem = '512MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
SELECT pg_reload_conf();
```

#### 2. Application Performance
```bash
# Backend optimization
export GOMAXPROCS=4
export GOGC=100

# Frontend optimization - Enable gzip compression in Nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
```

## Monitoring and Logging

### 1. Application Monitoring
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'minio-storage-backend'
    static_configs:
      - targets: ['localhost:9090']
  
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']
```

### 2. Log Management
```bash
# Configure log rotation
cat > /etc/logrotate.d/minio-storage << EOF
/var/log/minio-storage/*.log {
    daily
    missingok
    rotate 52
    compress
    notifempty
    create 644 root root
    postrotate
        docker-compose -f /opt/minio-storage/docker-compose.prod.yml restart backend frontend
    endscript
}
EOF
```

### 3. Health Checks
```bash
# Create health check script
cat > /opt/minio-storage/health-check.sh << 'EOF'
#!/bin/bash

# Check backend health
if ! curl -f http://localhost:8080/api/health; then
    echo "Backend health check failed"
    exit 1
fi

# Check frontend health
if ! curl -f http://localhost:3000; then
    echo "Frontend health check failed"
    exit 1
fi

echo "All services healthy"
EOF

chmod +x /opt/minio-storage/health-check.sh

# Add to crontab
echo "*/5 * * * * /opt/minio-storage/health-check.sh" | crontab -
```

## Backup and Recovery

### 1. Database Backup
```bash
# Daily database backup
cat > /opt/scripts/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/minio_storage_$DATE.sql"

mkdir -p $BACKUP_DIR

pg_dump -h db.example.com -U prod_user -d minio_storage > $BACKUP_FILE
gzip $BACKUP_FILE

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
EOF

# Schedule daily backup
echo "0 2 * * * /opt/scripts/backup-db.sh" | crontab -
```

### 2. File Storage Backup
```bash
# MinIO backup script
cat > /opt/scripts/backup-files.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/files"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Sync MinIO bucket to backup location
mc mirror minio_cluster/minio-fullstack-storage-prod $BACKUP_DIR/$DATE

# Keep only last 7 days
find $BACKUP_DIR -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;
EOF
```

## Scaling

### Horizontal Scaling

#### 1. Load Balancer Configuration
```nginx
upstream backend_servers {
    least_conn;
    server backend1:8080 max_fails=3 fail_timeout=30s;
    server backend2:8080 max_fails=3 fail_timeout=30s;
    server backend3:8080 max_fails=3 fail_timeout=30s;
}

upstream frontend_servers {
    least_conn;
    server frontend1:3000 max_fails=3 fail_timeout=30s;
    server frontend2:3000 max_fails=3 fail_timeout=30s;
}
```

#### 2. Database Scaling
```bash
# Read replicas for read-heavy workloads
# Configure read replica connection in application

# Connection pooling
export DB_MAX_OPEN_CONNS=25
export DB_MAX_IDLE_CONNS=25
export DB_CONN_MAX_LIFETIME=5m
```

### Vertical Scaling
```yaml
# Increase resource limits
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2'
        reservations:
          memory: 1G
          cpus: '1'
```

## Security Hardening

### 1. System Security
```bash
# Firewall configuration
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Fail2ban for SSH protection
apt install fail2ban
systemctl enable fail2ban
```

### 2. Application Security
```bash
# Regular security updates
apt update && apt upgrade -y

# Container security scanning
docker scan minio-storage-backend:latest
docker scan minio-storage-frontend:latest
```

## Troubleshooting Production Issues

### 1. High CPU Usage
```bash
# Check processes
top -p $(pgrep -d',' -f minio-storage)

# Check database queries
docker exec -it postgres psql -U prod_user -d minio_storage -c "SELECT query, state, query_start FROM pg_stat_activity WHERE state = 'active';"
```

### 2. Memory Issues
```bash
# Check memory usage
docker stats

# Check for memory leaks
curl http://localhost:9090/debug/pprof/heap > heap.prof
```

### 3. Database Connection Issues
```bash
# Check connection pool
curl http://localhost:9090/metrics | grep db_connections

# Check database locks
docker exec -it postgres psql -U prod_user -d minio_storage -c "SELECT * FROM pg_locks WHERE granted = false;"
```

## Disaster Recovery

### 1. Recovery Procedures
```bash
# Database recovery
psql -h db.example.com -U prod_user -d minio_storage < backup_file.sql

# File storage recovery
mc mirror /backup/files/20231201_020000 minio_cluster/minio-fullstack-storage-prod

# Application restart
docker-compose -f docker-compose.prod.yml restart
```

### 2. Failover Procedures
1. Update DNS to point to backup infrastructure
2. Restore latest database backup to new database server
3. Sync file storage to new MinIO cluster
4. Deploy application to new servers
5. Update monitoring and alerting

## Maintenance

### Regular Maintenance Tasks
```bash
# Weekly maintenance script
cat > /opt/scripts/weekly-maintenance.sh << 'EOF'
#!/bin/bash

# Update system packages
apt update && apt upgrade -y

# Clean Docker
docker system prune -f

# Analyze database
docker exec -it postgres psql -U prod_user -d minio_storage -c "ANALYZE;"

# Check SSL certificate expiry
openssl x509 -in /etc/ssl/certs/fullchain.pem -noout -dates

# Check disk space
df -h

# Check logs for errors
grep -i error /var/log/minio-storage/*.log | tail -20
EOF

# Schedule weekly maintenance
echo "0 4 * * 0 /opt/scripts/weekly-maintenance.sh" | crontab -
```

## Next Steps

After production deployment:
1. Set up comprehensive monitoring: [Monitoring Guide](../monitoring/README.md)
2. Implement security best practices: [Security Guide](../security/README.md)
3. Configure performance monitoring: [Performance Guide](../performance/README.md)
4. Set up incident response procedures
5. Schedule regular security audits
