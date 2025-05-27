# Troubleshooting Guide

This comprehensive troubleshooting guide covers common issues, their solutions, and debugging techniques for the MinIO Fullstack Storage System.

## 📋 Table of Contents
- [Quick Diagnostics](#quick-diagnostics)
- [Backend Issues](#backend-issues)
- [Frontend Issues](#frontend-issues)
- [MinIO Storage Issues](#minio-storage-issues)
- [Docker & Container Issues](#docker--container-issues)
- [Kubernetes Issues](#kubernetes-issues)
- [Performance Issues](#performance-issues)
- [Security Issues](#security-issues)
- [Development Environment](#development-environment)
- [Production Issues](#production-issues)

## 🚨 Quick Diagnostics

### Health Check Commands
```bash
# Quick system health check
curl http://localhost:8080/health
curl http://localhost:3000

# Container status
docker-compose ps
docker-compose logs

# Kubernetes status
kubectl get pods -n minio-storage
kubectl get services -n minio-storage
```

### Log Locations
```bash
# Backend logs
docker-compose logs backend
kubectl logs -f deployment/backend -n minio-storage

# Frontend logs
docker-compose logs frontend
kubectl logs -f deployment/frontend -n minio-storage

# MinIO logs
docker-compose logs minio
kubectl logs -f deployment/minio -n minio-storage
```

## 🔧 Backend Issues

### 1. Server Won't Start

#### Symptoms
- Application exits immediately
- "Connection refused" errors
- Port binding errors

#### Common Causes & Solutions

**Port Already in Use**
```bash
# Check what's using port 8080
sudo netstat -tulpn | grep :8080
sudo lsof -i :8080

# Kill process using port
sudo kill -9 $(sudo lsof -t -i:8080)

# Or change port in environment
export SERVER_PORT=8081
```

**Missing Environment Variables**
```bash
# Check required variables
env | grep -E "(MINIO|JWT|DB)"

# Copy and edit environment file
cp .env.example .env
nano .env
```

**MinIO Connection Issues**
```bash
# Test MinIO connectivity
curl http://localhost:9000/minio/health/live

# Check MinIO credentials
docker exec -it minio_container mc config host add local http://localhost:9000 minioadmin minioadmin
```

### 2. Authentication Issues

#### JWT Token Problems
```bash
# Debug JWT issues
# Check if JWT secret is set
echo $JWT_SECRET_KEY

# Test token generation (add to backend for debugging)
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

**Common Solutions:**
- Ensure JWT secret is at least 32 characters
- Check token expiration time
- Verify CORS settings for frontend

### 3. File Upload Issues

#### Large File Upload Failures
```bash
# Check file size limits
curl -v -X POST http://localhost:8080/api/files/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@large_file.pdf"
```

**Solutions:**
- Increase `MAX_FILE_SIZE_MB` environment variable
- Check MinIO bucket policies
- Verify disk space availability

#### File Type Restrictions
```bash
# Check allowed file types
echo $ALLOWED_FILE_TYPES

# Test with different file types
curl -X POST http://localhost:8080/api/files/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.txt"
```

### 4. Database/Storage Connection Issues

#### MinIO Connection Problems
```bash
# Test MinIO connectivity from backend
docker exec -it backend_container \
  curl http://minio:9000/minio/health/live

# Check MinIO bucket existence
docker exec -it minio_container \
  mc ls local/uploads
```

**Solutions:**
- Verify MinIO endpoint configuration
- Check network connectivity between containers
- Ensure MinIO credentials are correct
- Create bucket if it doesn't exist

## 💻 Frontend Issues

### 1. Application Won't Load

#### White Screen or Loading Issues
```bash
# Check frontend logs
docker-compose logs frontend

# Check if API is reachable
curl http://localhost:8080/health

# Test API from frontend network
docker exec -it frontend_container \
  curl http://backend:8080/health
```

**Common Solutions:**
- Check API base URL configuration
- Verify CORS settings
- Ensure environment variables are loaded

### 2. API Communication Issues

#### CORS Errors
```javascript
// Browser console will show:
// "Access to XMLHttpRequest at 'http://localhost:8080' from origin 'http://localhost:3000' has been blocked by CORS policy"
```

**Solutions:**
```bash
# Update backend CORS configuration
export CORS_ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"

# For development, use wildcard (not recommended for production)
export CORS_ALLOWED_ORIGINS="*"
```

#### API Timeout Issues
```bash
# Test API response time
time curl http://localhost:8080/api/users

# Increase timeout in frontend
# Update NEXT_PUBLIC_API_TIMEOUT in .env
```

### 3. File Upload Issues

#### Upload Progress Not Showing
- Check if WebSocket connection is working
- Verify chunk upload implementation
- Test with smaller files first

#### Upload Stuck at 100%
- Check backend processing logs
- Verify MinIO connectivity
- Test with different file types

## 🗄️ MinIO Storage Issues

### 1. MinIO Container Issues

#### Container Won't Start
```bash
# Check MinIO logs
docker-compose logs minio

# Common issues:
# - Port conflicts
# - Volume mounting issues
# - Insufficient permissions
```

**Solutions:**
```bash
# Fix volume permissions
sudo chown -R 1001:1001 ./minio-data

# Check port availability
sudo netstat -tulpn | grep :9000

# Start with different ports
export MINIO_PORT=9001
```

### 2. Bucket and Object Issues

#### Bucket Not Found
```bash
# List existing buckets
docker exec -it minio_container mc ls local

# Create bucket manually
docker exec -it minio_container mc mb local/uploads

# Set bucket policy
docker exec -it minio_container mc policy set public local/uploads
```

#### Object Access Issues
```bash
# Test object access
curl http://localhost:9000/uploads/test-file.txt

# Check bucket policies
docker exec -it minio_container mc policy get local/uploads

# Fix bucket policy
docker exec -it minio_container mc policy set download local/uploads
```

### 3. Performance Issues

#### Slow Upload/Download
```bash
# Check MinIO metrics
curl http://localhost:9000/minio/v2/metrics/cluster

# Monitor network usage
docker stats minio_container

# Check disk I/O
iostat -x 1
```

**Solutions:**
- Increase MinIO memory allocation
- Use SSD storage for better I/O
- Configure MinIO with multiple drives

## 🐳 Docker & Container Issues

### 1. Build Issues

#### Docker Build Failures
```bash
# Build with verbose output
docker build --no-cache --progress=plain -t backend ./backend

# Check build context size
du -sh ./backend

# Common issues:
# - Large build context
# - Missing dependencies
# - Network issues during build
```

#### Multi-platform Build Issues
```bash
# Setup buildx for multi-platform
docker buildx create --use
docker buildx inspect --bootstrap

# Build for specific platform
docker buildx build --platform linux/amd64 -t backend ./backend
```

### 2. Runtime Issues

#### Container Crashes
```bash
# Check container exit code
docker ps -a

# View crash logs
docker logs container_name

# Check resource limits
docker stats container_name

# Common exit codes:
# 0: Normal exit
# 1: General error
# 125: Docker daemon error
# 126: Container command not executable
# 127: Container command not found
```

#### Memory Issues
```bash
# Check memory usage
docker stats --no-stream

# Increase memory limits
docker run -m 512m your_image

# In docker-compose.yml:
services:
  backend:
    mem_limit: 512m
    memswap_limit: 512m
```

### 3. Network Issues

#### Container Communication Problems
```bash
# Test network connectivity
docker exec -it backend_container ping frontend_container

# Check network configuration
docker network ls
docker network inspect minio-storage_default

# Test DNS resolution
docker exec -it backend_container nslookup minio
```

## ☸️ Kubernetes Issues

### 1. Pod Issues

#### Pod Won't Start
```bash
# Check pod status
kubectl get pods -n minio-storage

# Describe pod for events
kubectl describe pod POD_NAME -n minio-storage

# Check pod logs
kubectl logs POD_NAME -n minio-storage

# Common issues:
# - Image pull errors
# - Resource limits
# - Configuration errors
```

#### ImagePullBackOff Errors
```bash
# Check image exists
docker pull ghcr.io/your-org/minio-storage/backend:latest

# Check registry credentials
kubectl get secrets -n minio-storage
kubectl describe secret regcred -n minio-storage

# Create registry secret
kubectl create secret docker-registry regcred \
  --docker-server=ghcr.io \
  --docker-username=YOUR_USERNAME \
  --docker-password=YOUR_TOKEN \
  -n minio-storage
```

### 2. Service Issues

#### Service Not Accessible
```bash
# Check service configuration
kubectl get services -n minio-storage
kubectl describe service backend -n minio-storage

# Test service connectivity
kubectl exec -it POD_NAME -n minio-storage -- curl http://backend:8080/health

# Check endpoints
kubectl get endpoints -n minio-storage
```

#### LoadBalancer Issues
```bash
# Check external IP assignment
kubectl get services -n minio-storage

# For cloud providers, check:
# - Load balancer creation in cloud console
# - Security groups/firewall rules
# - Node groups and availability
```

### 3. Configuration Issues

#### ConfigMap/Secret Issues
```bash
# Check configmap
kubectl get configmaps -n minio-storage
kubectl describe configmap app-config -n minio-storage

# Check secrets
kubectl get secrets -n minio-storage
kubectl describe secret app-secrets -n minio-storage

# Test configuration loading
kubectl exec -it POD_NAME -n minio-storage -- env | grep MINIO
```

## ⚡ Performance Issues

### 1. Backend Performance

#### High Response Times
```bash
# Monitor API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8080/api/users

# curl-format.txt content:
#     time_namelookup:  %{time_namelookup}\n
#        time_connect:  %{time_connect}\n
#     time_appconnect:  %{time_appconnect}\n
#    time_pretransfer:  %{time_pretransfer}\n
#       time_redirect:  %{time_redirect}\n
#  time_starttransfer:  %{time_starttransfer}\n
#                     ----------\n
#          time_total:  %{time_total}\n
```

**Solutions:**
- Enable request caching
- Optimize database queries
- Add request rate limiting
- Scale horizontally

#### Memory Leaks
```bash
# Monitor memory usage over time
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Profile Go application (add to code)
import _ "net/http/pprof"
go tool pprof http://localhost:8080/debug/pprof/heap
```

### 2. Frontend Performance

#### Slow Page Loads
```bash
# Analyze bundle size
npm run build-analyze

# Check Core Web Vitals
npx lighthouse http://localhost:3000 --output html

# Monitor in browser
# Chrome DevTools > Performance tab
```

**Solutions:**
- Implement code splitting
- Optimize images
- Enable gzip compression
- Use CDN for static assets

### 3. Storage Performance

#### Slow File Operations
```bash
# Test MinIO performance
mc admin speedtest local

# Monitor disk I/O
iostat -x 1

# Check network latency
ping minio-server
```

## 🔒 Security Issues

### 1. Authentication Problems

#### JWT Token Issues
```bash
# Validate JWT token
echo "YOUR_JWT_TOKEN" | base64 -d | jq

# Check token expiration
date -d @$(echo "YOUR_JWT_TOKEN" | cut -d. -f2 | base64 -d | jq -r .exp)
```

#### Unauthorized Access
- Check CORS configuration
- Verify JWT secret consistency
- Review user permissions
- Audit access logs

### 2. File Security Issues

#### Unauthorized File Access
```bash
# Check bucket policies
mc policy get local/uploads

# Review file permissions
ls -la /minio-data/uploads/
```

**Solutions:**
- Implement proper bucket policies
- Use signed URLs for downloads
- Add file access logging
- Regular security audits

## 🛠️ Development Environment

### 1. Setup Issues

#### Dependencies Not Installing
```bash
# Clear caches
npm cache clean --force
go clean -modcache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Go modules
rm go.sum
go mod tidy
go mod download
```

#### Hot Reload Not Working
```bash
# Check file watching limits (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# For Docker on macOS/Windows
# Ensure file sharing is enabled for project directory
```

### 2. Database Issues

#### Test Database Conflicts
```bash
# Use separate test buckets
export MINIO_BUCKET_NAME=test-uploads

# Clean test data between runs
mc rm --recursive local/test-uploads/
```

## 🏭 Production Issues

### 1. Scaling Issues

#### High Load
```bash
# Monitor system resources
top
htop
kubectl top nodes
kubectl top pods -n minio-storage

# Check autoscaling
kubectl get hpa -n minio-storage
kubectl describe hpa backend -n minio-storage
```

#### Database Connection Pool Exhaustion
- Increase connection pool size
- Implement connection pooling
- Add circuit breakers
- Scale database replicas

### 2. Monitoring and Alerting

#### Missing Metrics
```bash
# Check Prometheus targets
curl http://prometheus:9090/api/v1/targets

# Verify metric endpoints
curl http://backend:8080/metrics
curl http://minio:9000/minio/v2/metrics/cluster
```

#### Alert Fatigue
- Review alert thresholds
- Implement alert routing
- Add alert suppression rules
- Create runbook links

## 🔍 Debugging Tools

### Backend Debugging
```bash
# Enable debug logging
export LOG_LEVEL=debug

# Go profiling
go tool pprof http://localhost:8080/debug/pprof/profile
go tool pprof http://localhost:8080/debug/pprof/heap

# Network debugging
tcpdump -i any -w traffic.pcap port 8080
```

### Frontend Debugging
```javascript
// Enable debug mode
localStorage.setItem('debug', 'minio-storage:*');

// Performance monitoring
performance.mark('start-api-call');
// ... API call
performance.mark('end-api-call');
performance.measure('api-call-duration', 'start-api-call', 'end-api-call');
```

### Container Debugging
```bash
# Debug mode containers
docker run -it --entrypoint=/bin/sh your_image

# Copy files from container
docker cp container_name:/app/logs ./logs

# Network debugging
docker exec -it container_name netstat -tulpn
docker exec -it container_name ss -tulpn
```

## 📞 Getting Help

### Log Analysis
1. Always check logs first: `docker-compose logs` or `kubectl logs`
2. Look for error patterns and stack traces
3. Check timestamps for event correlation
4. Use grep/awk for log filtering

### Performance Analysis
1. Use built-in metrics and monitoring
2. Enable profiling in development
3. Load test before production deployment
4. Monitor resource usage trends

### When to Escalate
- Security vulnerabilities
- Data corruption or loss
- Performance degradation > 50%
- System-wide outages
- Compliance violations

### Community Resources
- GitHub Issues: Report bugs and feature requests
- Documentation: Always check latest docs
- Stack Overflow: Community Q&A
- Discord/Slack: Real-time community help

## 📝 Creating Bug Reports

### Include This Information
```markdown
## Environment
- OS: [e.g., Ubuntu 20.04]
- Docker version: [e.g., 20.10.17]
- Browser: [e.g., Chrome 95]
- Component: [backend/frontend/minio]

## Steps to Reproduce
1. Start application with `docker-compose up`
2. Navigate to login page
3. Enter credentials
4. Click login button

## Expected Behavior
User should be redirected to dashboard

## Actual Behavior
Error message "Invalid credentials" appears

## Logs
```
[Paste relevant logs here]
```

## Additional Context
- First occurred after recent update
- Works in development environment
- Affects all users
```

For additional support, see our [Getting Started Guide](./getting-started.md) and [Development Guide](./development/README.md).
