# Security Guide

This comprehensive security guide covers all aspects of securing the MinIO Fullstack Storage application for production deployment.

## Security Overview

### Security Principles
- **Defense in Depth**: Multiple layers of security controls
- **Least Privilege**: Minimal necessary permissions
- **Zero Trust**: Verify everything, trust nothing
- **Security by Design**: Built-in security from the start

### Threat Model
- **Data Breaches**: Unauthorized access to user data and files
- **Injection Attacks**: SQL injection, XSS, command injection
- **Authentication Bypass**: Unauthorized system access
- **Denial of Service**: Service availability attacks
- **Insider Threats**: Malicious or negligent internal access

## Authentication & Authorization

### JWT Security Configuration

#### Backend JWT Settings
```go
// backend/internal/config/jwt.go
type JWTConfig struct {
    Secret     string        `env:"JWT_SECRET,required"`
    Expiry     time.Duration `env:"JWT_EXPIRY" envDefault:"2h"`
    Issuer     string        `env:"JWT_ISSUER" envDefault:"minio-storage-api"`
    Audience   string        `env:"JWT_AUDIENCE" envDefault:"minio-storage-app"`
    Algorithm  string        `env:"JWT_ALGORITHM" envDefault:"HS256"`
}

// Production JWT settings
JWT_SECRET=your-256-bit-secret-key-minimum-32-characters
JWT_EXPIRY=2h
JWT_ISSUER=your-production-domain.com
JWT_AUDIENCE=your-production-domain.com
JWT_ALGORITHM=HS256
```

#### Secure JWT Implementation
```go
// Add security headers and validation
func (s *AuthService) ValidateToken(tokenString string) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        // Validate signing method
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
        }
        return []byte(s.jwtSecret), nil
    })
    
    if err != nil {
        return nil, err
    }
    
    if claims, ok := token.Claims.(*Claims); ok && token.Valid {
        // Additional validation
        if time.Now().Unix() > claims.ExpiresAt {
            return nil, errors.New("token expired")
        }
        return claims, nil
    }
    
    return nil, errors.New("invalid token")
}
```

### Password Security

#### Password Requirements
```go
// backend/internal/validators/password.go
func ValidatePassword(password string) error {
    if len(password) < 12 {
        return errors.New("password must be at least 12 characters long")
    }
    
    var (
        hasUpper   = regexp.MustCompile(`[A-Z]`).MatchString(password)
        hasLower   = regexp.MustCompile(`[a-z]`).MatchString(password)
        hasNumber  = regexp.MustCompile(`\d`).MatchString(password)
        hasSpecial = regexp.MustCompile(`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]`).MatchString(password)
    )
    
    if !hasUpper || !hasLower || !hasNumber || !hasSpecial {
        return errors.New("password must contain uppercase, lowercase, number, and special character")
    }
    
    return nil
}
```

#### Password Hashing
```go
// Use bcrypt with cost factor 12+ for production
func HashPassword(password string) (string, error) {
    // Cost factor 12 takes ~250ms on modern hardware
    hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
    if err != nil {
        return "", err
    }
    return string(hash), nil
}
```

### Multi-Factor Authentication (MFA)

#### TOTP Implementation
```go
// backend/internal/services/mfa.go
func (s *MFAService) GenerateTOTPSecret(userID string) (*TOTPSecret, error) {
    secret := make([]byte, 20)
    _, err := rand.Read(secret)
    if err != nil {
        return nil, err
    }
    
    encodedSecret := base32.StdEncoding.EncodeToString(secret)
    
    // Store encrypted secret in database
    encryptedSecret, err := s.encrypt(encodedSecret)
    if err != nil {
        return nil, err
    }
    
    err = s.repo.StoreTOTPSecret(userID, encryptedSecret)
    if err != nil {
        return nil, err
    }
    
    return &TOTPSecret{
        Secret: encodedSecret,
        QRCode: s.generateQRCode(userID, encodedSecret),
    }, nil
}
```

## Input Validation & Sanitization

### SQL Injection Prevention

#### Parameterized Queries
```go
// backend/internal/repositories/user.go - SECURE
func (r *UserRepository) GetUserByEmail(email string) (*models.User, error) {
    var user models.User
    err := r.db.QueryRow(
        "SELECT id, email, password_hash FROM users WHERE email = $1",
        email,
    ).Scan(&user.ID, &user.Email, &user.PasswordHash)
    
    if err != nil {
        return nil, err
    }
    return &user, nil
}

// NEVER do this - vulnerable to SQL injection
func (r *UserRepository) GetUserByEmailBad(email string) (*models.User, error) {
    query := fmt.Sprintf("SELECT * FROM users WHERE email = '%s'", email)
    // This is vulnerable!
}
```

### Input Validation

#### Request Validation Middleware
```go
// backend/internal/middleware/validation.go
func ValidateRequest(schema interface{}) gin.HandlerFunc {
    return func(c *gin.Context) {
        var req interface{}
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
            c.Abort()
            return
        }
        
        // Validate against schema
        if err := validator.New().Struct(req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
            c.Abort()
            return
        }
        
        c.Set("validatedRequest", req)
        c.Next()
    }
}
```

#### File Upload Validation
```go
// backend/internal/handlers/file.go
func (h *FileHandler) validateFile(file *multipart.FileHeader) error {
    // Size validation
    if file.Size > h.config.MaxFileSize {
        return errors.New("file too large")
    }
    
    // Type validation
    contentType := file.Header.Get("Content-Type")
    if !h.isAllowedContentType(contentType) {
        return errors.New("file type not allowed")
    }
    
    // File extension validation
    ext := filepath.Ext(file.Filename)
    if !h.isAllowedExtension(ext) {
        return errors.New("file extension not allowed")
    }
    
    // Scan file content for malware signatures
    fileContent, err := file.Open()
    if err != nil {
        return err
    }
    defer fileContent.Close()
    
    return h.scanFileContent(fileContent)
}
```

### XSS Prevention

#### Frontend Input Sanitization
```typescript
// frontend/src/utils/sanitize.ts
import DOMPurify from 'dompurify';

export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}
```

#### Content Security Policy (CSP)
```go
// backend/internal/middleware/security.go
func SecurityHeaders() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Header("Content-Security-Policy", 
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
            "font-src 'self' https://fonts.gstatic.com; " +
            "img-src 'self' data: blob: https:; " +
            "connect-src 'self'; " +
            "frame-ancestors 'none';")
        
        c.Header("X-Content-Type-Options", "nosniff")
        c.Header("X-Frame-Options", "DENY")
        c.Header("X-XSS-Protection", "1; mode=block")
        c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        
        c.Next()
    }
}
```

## Data Encryption

### Database Encryption

#### Encryption at Rest
```sql
-- PostgreSQL transparent data encryption
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = '/etc/ssl/certs/server.crt';
ALTER SYSTEM SET ssl_key_file = '/etc/ssl/private/server.key';

-- Enable column-level encryption for sensitive data
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive user data
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    encrypted_phone_number BYTEA,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert encrypted data
INSERT INTO user_profiles (user_id, encrypted_phone_number) 
VALUES ($1, pgp_sym_encrypt($2, $3));

-- Query encrypted data
SELECT pgp_sym_decrypt(encrypted_phone_number, $1) as phone_number 
FROM user_profiles WHERE user_id = $2;
```

#### Application-Level Encryption
```go
// backend/internal/services/encryption.go
type EncryptionService struct {
    key []byte
}

func (s *EncryptionService) Encrypt(plaintext string) (string, error) {
    block, err := aes.NewCipher(s.key)
    if err != nil {
        return "", err
    }
    
    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return "", err
    }
    
    nonce := make([]byte, gcm.NonceSize())
    if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
        return "", err
    }
    
    ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
    return base64.StdEncoding.EncodeToString(ciphertext), nil
}
```

### File Storage Encryption

#### MinIO Server-Side Encryption
```bash
# Enable encryption for MinIO bucket
mc encrypt set sse-s3 minio_cluster/minio-fullstack-storage-prod

# Set encryption policy
mc admin policy add minio_cluster encryption-policy encryption-policy.json
```

```json
// encryption-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::minio-fullstack-storage-prod/*",
      "Condition": {
        "StringEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    }
  ]
}
```

#### Client-Side Encryption
```go
// backend/internal/services/file_encryption.go
func (s *FileService) UploadEncryptedFile(file io.Reader, filename string) error {
    // Generate unique encryption key for this file
    key := make([]byte, 32)
    if _, err := rand.Read(key); err != nil {
        return err
    }
    
    // Encrypt file content
    encryptedContent, err := s.encryptFile(file, key)
    if err != nil {
        return err
    }
    
    // Store encrypted key separately (encrypted with master key)
    encryptedKey, err := s.encryptKey(key)
    if err != nil {
        return err
    }
    
    // Upload to MinIO
    err = s.minioClient.PutObject(
        s.bucketName,
        filename,
        encryptedContent,
        -1,
        minio.PutObjectOptions{},
    )
    
    // Store key reference in database
    return s.storeKeyReference(filename, encryptedKey)
}
```

## Network Security

### TLS/SSL Configuration

#### TLS Certificate Management
```nginx
# nginx.conf - Production TLS configuration
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # Modern TLS configuration
    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/ssl/certs/fullchain.pem;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;
}
```

#### Certificate Automation
```bash
# Automated certificate renewal with Let's Encrypt
cat > /opt/scripts/renew-certs.sh << 'EOF'
#!/bin/bash

# Renew certificates
certbot renew --quiet

# Reload nginx if certificates were renewed
if [ $? -eq 0 ]; then
    nginx -t && systemctl reload nginx
fi
EOF

# Schedule certificate renewal
echo "0 3 * * * /opt/scripts/renew-certs.sh" | crontab -
```

### Rate Limiting

#### Application-Level Rate Limiting
```go
// backend/internal/middleware/rate_limit.go
func RateLimitMiddleware() gin.HandlerFunc {
    store := memory.NewStore()
    
    rateLimiter := rate.NewLimiter(rate.Every(time.Minute), 100)
    
    return func(c *gin.Context) {
        ip := c.ClientIP()
        
        // Check if IP is rate limited
        if !rateLimiter.Allow() {
            c.JSON(http.StatusTooManyRequests, gin.H{
                "error": "Rate limit exceeded",
                "retry_after": 60,
            })
            c.Abort()
            return
        }
        
        c.Next()
    }
}
```

#### Nginx Rate Limiting
```nginx
# nginx.conf - Rate limiting configuration
http {
    # Define rate limiting zones
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/s;
    
    server {
        # API rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            limit_req_status 429;
        }
        
        # Login rate limiting
        location /api/auth/login {
            limit_req zone=login burst=10 nodelay;
            limit_req_status 429;
        }
        
        # File upload rate limiting
        location /api/files/upload {
            limit_req zone=upload burst=5 nodelay;
            limit_req_status 429;
        }
    }
}
```

### Firewall Configuration

#### iptables Rules
```bash
# Basic firewall setup
#!/bin/bash

# Flush existing rules
iptables -F
iptables -X
iptables -Z

# Default policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT

# Allow established connections
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow SSH (change port as needed)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow HTTP/HTTPS
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow database (restrict to application servers)
iptables -A INPUT -p tcp --dport 5432 -s 10.0.1.0/24 -j ACCEPT

# Allow MinIO (restrict to application servers)
iptables -A INPUT -p tcp --dport 9000 -s 10.0.1.0/24 -j ACCEPT

# Drop everything else
iptables -A INPUT -j DROP

# Save rules
iptables-save > /etc/iptables/rules.v4
```

## Secrets Management

### Environment Variables Security

#### Production Secrets Configuration
```bash
# Use a secrets management service in production
# AWS Secrets Manager, HashiCorp Vault, Azure Key Vault

# Example with AWS Secrets Manager
export DATABASE_URL=$(aws secretsmanager get-secret-value \
    --secret-id prod/database/url \
    --query SecretString --output text)

export JWT_SECRET=$(aws secretsmanager get-secret-value \
    --secret-id prod/jwt/secret \
    --query SecretString --output text)
```

#### Vault Integration
```go
// backend/internal/config/vault.go
type VaultConfig struct {
    client *vault.Client
}

func (v *VaultConfig) GetSecret(path string) (string, error) {
    secret, err := v.client.Logical().Read(path)
    if err != nil {
        return "", err
    }
    
    if secret == nil || secret.Data == nil {
        return "", errors.New("secret not found")
    }
    
    value, ok := secret.Data["value"].(string)
    if !ok {
        return "", errors.New("invalid secret format")
    }
    
    return value, nil
}
```

### Database Credentials

#### Credential Rotation
```bash
# Automated database password rotation
cat > /opt/scripts/rotate-db-password.sh << 'EOF'
#!/bin/bash

NEW_PASSWORD=$(openssl rand -base64 32)

# Update password in database
psql -h $DB_HOST -U $DB_ADMIN -c "ALTER USER $DB_USER PASSWORD '$NEW_PASSWORD';"

# Update secret in vault/secrets manager
aws secretsmanager update-secret \
    --secret-id prod/database/password \
    --secret-string "$NEW_PASSWORD"

# Restart application to pick up new password
docker-compose -f /opt/minio-storage/docker-compose.prod.yml restart backend
EOF
```

## Security Monitoring

### Audit Logging

#### Application Audit Logs
```go
// backend/internal/middleware/audit.go
func AuditMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        
        // Capture request details
        requestBody, _ := ioutil.ReadAll(c.Request.Body)
        c.Request.Body = ioutil.NopCloser(bytes.NewBuffer(requestBody))
        
        c.Next()
        
        // Log security-relevant events
        auditLog := AuditLog{
            Timestamp:    start,
            UserID:       getUserIDFromContext(c),
            IP:           c.ClientIP(),
            Method:       c.Request.Method,
            Path:         c.Request.URL.Path,
            StatusCode:   c.Writer.Status(),
            Duration:     time.Since(start),
            UserAgent:    c.Request.UserAgent(),
            RequestBody:  string(requestBody),
        }
        
        // Log to audit system
        logAuditEvent(auditLog)
    }
}
```

#### Database Audit Trail
```sql
-- Enable PostgreSQL audit logging
CREATE EXTENSION IF NOT EXISTS pgaudit;

-- Configure audit settings
ALTER SYSTEM SET pgaudit.log = 'ddl,write,role';
ALTER SYSTEM SET pgaudit.log_catalog = off;
ALTER SYSTEM SET pgaudit.log_parameter = on;
SELECT pg_reload_conf();

-- Create audit table for application events
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    ip_address INET NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

### Intrusion Detection

#### Log Analysis
```bash
# Security log monitoring script
cat > /opt/scripts/security-monitor.sh << 'EOF'
#!/bin/bash

LOG_FILE="/var/log/minio-storage/security.log"
ALERT_EMAIL="security@yourdomain.com"

# Check for suspicious activity patterns
suspicious_ips=$(grep "FAILED_LOGIN" $LOG_FILE | \
    awk '{print $3}' | sort | uniq -c | \
    awk '$1 > 10 {print $2}')

if [ ! -z "$suspicious_ips" ]; then
    echo "Suspicious IPs detected: $suspicious_ips" | \
    mail -s "Security Alert: Multiple Failed Logins" $ALERT_EMAIL
fi

# Check for unusual file access patterns
large_downloads=$(grep "FILE_DOWNLOAD" $LOG_FILE | \
    awk '$7 > 1000000000 {print}' | wc -l)

if [ $large_downloads -gt 10 ]; then
    echo "Unusual download pattern detected" | \
    mail -s "Security Alert: Large Downloads" $ALERT_EMAIL
fi
EOF

# Schedule security monitoring
echo "*/5 * * * * /opt/scripts/security-monitor.sh" | crontab -
```

### Security Alerting

#### Real-time Security Alerts
```go
// backend/internal/services/security_alerts.go
type SecurityAlertService struct {
    alertChannel chan SecurityAlert
}

func (s *SecurityAlertService) SendAlert(alert SecurityAlert) {
    select {
    case s.alertChannel <- alert:
        // Alert sent
    default:
        // Channel full, log error
        log.Error("Alert channel full, dropping alert")
    }
}

func (s *SecurityAlertService) ProcessAlerts() {
    for alert := range s.alertChannel {
        switch alert.Severity {
        case "critical":
            s.sendImmediateAlert(alert)
        case "high":
            s.sendHighPriorityAlert(alert)
        default:
            s.logAlert(alert)
        }
    }
}
```

## Security Testing

### Automated Security Scanning

#### Container Security Scanning
```bash
# Docker security scanning
docker scan minio-storage-backend:latest
docker scan minio-storage-frontend:latest

# Trivy scanning
trivy image minio-storage-backend:latest
trivy image minio-storage-frontend:latest

# Clair scanning
clair-scanner --ip localhost minio-storage-backend:latest
```

#### Dependency Scanning
```bash
# Go dependency scanning
go list -json -m all | nancy sleuth

# Node.js dependency scanning
cd frontend
npm audit
npm audit fix

# OWASP Dependency Check
dependency-check --project "MinIO Storage" --scan ./
```

### Penetration Testing

#### Automated Security Testing
```bash
# OWASP ZAP automated scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
    -t https://yourdomain.com

# Nikto web scanner
nikto -h https://yourdomain.com

# SQL injection testing
sqlmap -u "https://yourdomain.com/api/login" \
    --data="email=test&password=test" \
    --dbs
```

#### Manual Security Testing Checklist
1. **Authentication Testing**
   - Password complexity requirements
   - Account lockout mechanisms
   - Session management
   - JWT token security

2. **Authorization Testing**
   - Role-based access control
   - Privilege escalation attempts
   - Direct object references

3. **Input Validation Testing**
   - SQL injection
   - XSS attacks
   - File upload vulnerabilities
   - Command injection

4. **Session Management Testing**
   - Session fixation
   - Session hijacking
   - Secure cookie settings

## Incident Response

### Security Incident Procedures

#### Incident Response Plan
```bash
# Security incident response script
cat > /opt/scripts/security-incident.sh << 'EOF'
#!/bin/bash

INCIDENT_TYPE=$1
SEVERITY=$2

case $INCIDENT_TYPE in
    "data_breach")
        # Immediate containment
        iptables -A INPUT -j DROP
        
        # Preserve logs
        tar -czf /tmp/incident-logs-$(date +%Y%m%d).tar.gz /var/log/
        
        # Notify stakeholders
        echo "SECURITY INCIDENT: Data breach detected" | \
        mail -s "CRITICAL: Security Incident" security@yourdomain.com
        ;;
        
    "unauthorized_access")
        # Block suspicious IPs
        grep "FAILED_LOGIN" /var/log/auth.log | \
        awk '{print $11}' | sort | uniq | \
        while read ip; do
            iptables -A INPUT -s $ip -j DROP
        done
        ;;
esac
EOF
```

### Recovery Procedures

#### System Recovery Checklist
1. **Immediate Actions**
   - Contain the incident
   - Preserve evidence
   - Assess damage
   - Notify stakeholders

2. **Investigation**
   - Analyze logs
   - Identify attack vectors
   - Determine scope of compromise
   - Document findings

3. **Recovery**
   - Patch vulnerabilities
   - Reset compromised credentials
   - Restore from clean backups
   - Implement additional controls

4. **Post-Incident**
   - Conduct lessons learned
   - Update security procedures
   - Improve monitoring
   - Train staff on new procedures

## Compliance

### Data Protection

#### GDPR Compliance
```go
// backend/internal/services/gdpr.go
func (s *GDPRService) ExportUserData(userID string) (*UserDataExport, error) {
    export := &UserDataExport{
        UserID:    userID,
        ExportedAt: time.Now(),
    }
    
    // Export user profile data
    profile, err := s.userRepo.GetProfile(userID)
    if err != nil {
        return nil, err
    }
    export.Profile = profile
    
    // Export user files
    files, err := s.fileRepo.GetUserFiles(userID)
    if err != nil {
        return nil, err
    }
    export.Files = files
    
    // Export user posts
    posts, err := s.postRepo.GetUserPosts(userID)
    if err != nil {
        return nil, err
    }
    export.Posts = posts
    
    return export, nil
}

func (s *GDPRService) DeleteUserData(userID string) error {
    // Delete in order to maintain referential integrity
    if err := s.postRepo.DeleteUserPosts(userID); err != nil {
        return err
    }
    
    if err := s.fileRepo.DeleteUserFiles(userID); err != nil {
        return err
    }
    
    if err := s.userRepo.DeleteUser(userID); err != nil {
        return err
    }
    
    return nil
}
```

### Audit Requirements

#### SOC 2 Compliance
```sql
-- Audit trail for SOC 2 compliance
CREATE TABLE soc2_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    user_id UUID,
    resource_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    result VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    additional_data JSONB
);

-- Retention policy for audit logs (7 years for SOC 2)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM soc2_audit_trail 
    WHERE created_at < NOW() - INTERVAL '7 years';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup
SELECT cron.schedule('cleanup-audit-logs', '0 2 1 * *', 'SELECT cleanup_old_audit_logs();');
```

## Security Checklist

### Pre-Production Security Checklist

#### Application Security
- [ ] All inputs validated and sanitized
- [ ] SQL injection prevention implemented
- [ ] XSS protection in place
- [ ] CSRF protection enabled
- [ ] Secure authentication implemented
- [ ] Authorization controls tested
- [ ] Password policies enforced
- [ ] Session management secure
- [ ] File upload security implemented
- [ ] Error handling doesn't leak information

#### Infrastructure Security
- [ ] TLS/SSL properly configured
- [ ] Firewall rules implemented
- [ ] Rate limiting configured
- [ ] Security headers set
- [ ] Monitoring and alerting configured
- [ ] Audit logging enabled
- [ ] Backup security verified
- [ ] Access controls implemented
- [ ] Network segmentation in place
- [ ] Intrusion detection configured

#### Data Security
- [ ] Data encryption at rest
- [ ] Data encryption in transit
- [ ] Key management implemented
- [ ] Data classification done
- [ ] Privacy controls implemented
- [ ] Data retention policies set
- [ ] Backup encryption verified
- [ ] Data leakage prevention
- [ ] Compliance requirements met
- [ ] Data access logging enabled

### Ongoing Security Maintenance

#### Daily Tasks
- [ ] Review security alerts
- [ ] Check failed login attempts
- [ ] Monitor system resources
- [ ] Verify backup integrity

#### Weekly Tasks
- [ ] Review audit logs
- [ ] Update security patches
- [ ] Test incident response procedures
- [ ] Review access permissions

#### Monthly Tasks
- [ ] Security vulnerability scan
- [ ] Dependency security update
- [ ] Review and rotate credentials
- [ ] Security awareness training

#### Quarterly Tasks
- [ ] Penetration testing
- [ ] Security policy review
- [ ] Incident response drill
- [ ] Compliance audit

## Security Resources

### Tools and Services
- **Security Scanning**: OWASP ZAP, Nessus, Qualys
- **Dependency Scanning**: Snyk, OWASP Dependency Check
- **Container Scanning**: Trivy, Clair, Anchore
- **SIEM/Monitoring**: Splunk, ELK Stack, Sumo Logic
- **Vulnerability Management**: Rapid7, Tenable
- **Secrets Management**: HashiCorp Vault, AWS Secrets Manager

### Security References
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [SANS Security Policies](https://www.sans.org/security-resources/policies/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CIS Controls](https://www.cisecurity.org/controls/)
- [PCI DSS Standards](https://www.pcisecuritystandards.org/)

### Emergency Contacts
- **Security Team**: security@yourdomain.com
- **Incident Response**: incident@yourdomain.com
- **Legal/Compliance**: legal@yourdomain.com
- **Executive Escalation**: ceo@yourdomain.com
