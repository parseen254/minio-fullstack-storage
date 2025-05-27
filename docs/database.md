# Database & Storage Architecture

## Overview

The MinIO Fullstack Storage System uses **MinIO object storage** as its primary data store instead of traditional relational databases. This document explains the storage architecture, data models, and management strategies.

## Architecture Decision

### Why MinIO Object Storage?

**Benefits:**
- **Scalability**: Horizontally scalable object storage
- **High Availability**: Built-in replication and fault tolerance
- **S3 Compatibility**: Standard S3 API for easy integration
- **Cost Effective**: Cheaper storage for large files
- **Cloud Native**: Perfect for containerized deployments

**Trade-offs:**
- **No ACID Transactions**: Eventual consistency model
- **No Complex Queries**: No SQL-like query capabilities
- **Data Modeling**: Requires different approach than relational databases

## Storage Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MinIO Storage Cluster                    │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Users Bucket  │  Posts Bucket   │      Files Bucket           │
│                 │                 │                             │
│ user-{id}.json  │ post-{id}.json  │ {user-id}/{file-id}.{ext}   │
│                 │                 │                             │
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────────────────┐ │
│ │User Metadata│ │ │Post Content │ │ │    File Storage         │ │
│ │   + Index   │ │ │  + Metadata │ │ │   + Metadata            │ │
│ └─────────────┘ │ └─────────────┘ │ └─────────────────────────┘ │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

## Bucket Structure

### 1. Users Bucket (`users`)

**Purpose**: Store user account information and authentication data

**Object Structure:**
```
users/
├── user-{uuid}.json                 # Individual user records
├── indexes/
│   ├── username-{username}.json     # Username to ID mapping
│   ├── email-{email-hash}.json      # Email to ID mapping
│   └── role-{role}.json             # Role-based user lists
└── metadata/
    ├── total-count.json             # Total user count
    └── created-today.json           # Daily registration stats
```

**User Object Format:**
```json
{
  "id": "uuid-v4",
  "username": "string",
  "email": "string",
  "password": "bcrypt-hash",
  "firstName": "string",
  "lastName": "string", 
  "role": "admin|user",
  "avatar": "string|null",
  "createdAt": "2023-01-01T00:00:00Z",
  "updatedAt": "2023-01-01T00:00:00Z",
  "etag": "minio-etag",
  "version": 1,
  "status": "active|suspended|deleted"
}
```

### 2. Posts Bucket (`posts`)

**Purpose**: Store blog posts and content management data

**Object Structure:**
```
posts/
├── post-{uuid}.json                 # Individual post records
├── indexes/
│   ├── user-{user-id}/              # Posts by user
│   │   └── post-{post-id}.json
│   ├── status-{status}/             # Posts by status
│   │   └── post-{post-id}.json
│   ├── tags-{tag}/                  # Posts by tag
│   │   └── post-{post-id}.json
│   └── created-{date}/              # Posts by creation date
│       └── post-{post-id}.json
└── metadata/
    ├── total-count.json             # Total post count
    ├── published-count.json         # Published post count
    └── tags-list.json               # All available tags
```

**Post Object Format:**
```json
{
  "id": "uuid-v4",
  "userId": "uuid-v4",
  "title": "string",
  "content": "markdown-string",
  "summary": "string",
  "tags": ["tag1", "tag2"],
  "status": "draft|published|archived",
  "slug": "url-friendly-title",
  "featuredImage": "file-id|null",
  "createdAt": "2023-01-01T00:00:00Z",
  "updatedAt": "2023-01-01T00:00:00Z",
  "publishedAt": "2023-01-01T00:00:00Z|null",
  "etag": "minio-etag",
  "version": 1,
  "metadata": {
    "readTime": 5,
    "wordCount": 1200,
    "seoTitle": "string",
    "seoDescription": "string"
  }
}
```

### 3. Files Bucket (`files`)

**Purpose**: Store uploaded files and their metadata

**Object Structure:**
```
files/
├── {user-id}/                       # Files organized by user
│   ├── {file-id}.{extension}        # Actual file content
│   └── metadata/
│       └── {file-id}.json           # File metadata
├── indexes/
│   ├── content-type-{type}/         # Files by content type
│   │   └── {file-id}.json
│   ├── created-{date}/              # Files by creation date
│   │   └── {file-id}.json
│   └── size-range-{range}/          # Files by size range
│       └── {file-id}.json
└── metadata/
    ├── total-count.json             # Total file count
    ├── total-size.json              # Total storage used
    └── content-types.json           # Available content types
```

**File Metadata Format:**
```json
{
  "id": "uuid-v4",
  "userId": "uuid-v4",
  "fileName": "processed-filename.ext",
  "originalName": "user-uploaded-name.ext",
  "contentType": "application/pdf",
  "size": 1048576,
  "path": "files/{user-id}/{file-id}.ext",
  "metadata": {
    "width": 1920,
    "height": 1080,
    "duration": 120.5,
    "checksum": "sha256-hash"
  },
  "tags": ["work", "document"],
  "isPublic": false,
  "downloadCount": 42,
  "createdAt": "2023-01-01T00:00:00Z",
  "updatedAt": "2023-01-01T00:00:00Z",
  "etag": "minio-etag",
  "version": 1
}
```

## Data Access Patterns

### Service Layer Implementation

```go
// storage_service.go
type StorageService struct {
    minioClient *minio.Client
    usersBucket string
    postsBucket string
    filesBucket string
    logger      *logrus.Logger
}

// User Operations
func (s *StorageService) CreateUser(ctx context.Context, user *models.User) error {
    // Generate UUID
    user.ID = uuid.New().String()
    user.CreatedAt = time.Now()
    user.UpdatedAt = time.Now()
    
    // Store main user object
    if err := s.putObject(ctx, s.usersBucket, fmt.Sprintf("user-%s.json", user.ID), user); err != nil {
        return fmt.Errorf("failed to store user: %w", err)
    }
    
    // Create username index
    usernameIndex := map[string]string{"userId": user.ID}
    if err := s.putObject(ctx, s.usersBucket, fmt.Sprintf("indexes/username-%s.json", user.Username), usernameIndex); err != nil {
        return fmt.Errorf("failed to create username index: %w", err)
    }
    
    // Create email index
    emailHash := s.hashEmail(user.Email)
    emailIndex := map[string]string{"userId": user.ID}
    if err := s.putObject(ctx, s.usersBucket, fmt.Sprintf("indexes/email-%s.json", emailHash), emailIndex); err != nil {
        return fmt.Errorf("failed to create email index: %w", err)
    }
    
    return nil
}

func (s *StorageService) GetUser(ctx context.Context, userID string) (*models.User, error) {
    var user models.User
    if err := s.getObject(ctx, s.usersBucket, fmt.Sprintf("user-%s.json", userID), &user); err != nil {
        return nil, fmt.Errorf("user not found: %w", err)
    }
    return &user, nil
}

func (s *StorageService) GetUserByUsername(ctx context.Context, username string) (*models.User, error) {
    // Get user ID from username index
    var usernameIndex map[string]string
    if err := s.getObject(ctx, s.usersBucket, fmt.Sprintf("indexes/username-%s.json", username), &usernameIndex); err != nil {
        return nil, fmt.Errorf("username not found: %w", err)
    }
    
    // Get user by ID
    return s.GetUser(ctx, usernameIndex["userId"])
}

func (s *StorageService) ListUsers(ctx context.Context, pagination models.Pagination) ([]*models.User, int64, error) {
    // List all user objects
    objects := s.minioClient.ListObjects(ctx, s.usersBucket, minio.ListObjectsOptions{
        Prefix: "user-",
    })
    
    var users []*models.User
    var total int64
    
    for object := range objects {
        if object.Err != nil {
            return nil, 0, object.Err
        }
        
        total++
        
        // Apply pagination
        if total <= int64(pagination.Offset) {
            continue
        }
        if len(users) >= pagination.PageSize {
            break
        }
        
        var user models.User
        if err := s.getObject(ctx, s.usersBucket, object.Key, &user); err != nil {
            s.logger.Errorf("Failed to fetch user %s: %v", object.Key, err)
            continue
        }
        
        users = append(users, &user)
    }
    
    return users, total, nil
}

// Post Operations
func (s *StorageService) CreatePost(ctx context.Context, post *models.Post) error {
    // Generate UUID and timestamps
    post.ID = uuid.New().String()
    post.CreatedAt = time.Now()
    post.UpdatedAt = time.Now()
    
    // Generate slug
    post.Slug = s.generateSlug(post.Title)
    
    // Store main post object
    if err := s.putObject(ctx, s.postsBucket, fmt.Sprintf("post-%s.json", post.ID), post); err != nil {
        return fmt.Errorf("failed to store post: %w", err)
    }
    
    // Create user index
    userIndex := map[string]string{"postId": post.ID}
    userIndexPath := fmt.Sprintf("indexes/user-%s/post-%s.json", post.UserID, post.ID)
    if err := s.putObject(ctx, s.postsBucket, userIndexPath, userIndex); err != nil {
        return fmt.Errorf("failed to create user index: %w", err)
    }
    
    // Create status index
    statusIndex := map[string]string{"postId": post.ID}
    statusIndexPath := fmt.Sprintf("indexes/status-%s/post-%s.json", post.Status, post.ID)
    if err := s.putObject(ctx, s.postsBucket, statusIndexPath, statusIndex); err != nil {
        return fmt.Errorf("failed to create status index: %w", err)
    }
    
    // Create tag indexes
    for _, tag := range post.Tags {
        tagIndex := map[string]string{"postId": post.ID}
        tagIndexPath := fmt.Sprintf("indexes/tags-%s/post-%s.json", tag, post.ID)
        if err := s.putObject(ctx, s.postsBucket, tagIndexPath, tagIndex); err != nil {
            s.logger.Errorf("Failed to create tag index for %s: %v", tag, err)
        }
    }
    
    return nil
}

// File Operations
func (s *StorageService) UploadFile(ctx context.Context, fileModel *models.File, fileData io.Reader) error {
    // Generate UUID
    fileModel.ID = uuid.New().String()
    fileModel.CreatedAt = time.Now()
    fileModel.UpdatedAt = time.Now()
    
    // Determine file path
    filePath := fmt.Sprintf("%s/%s.%s", fileModel.UserID, fileModel.ID, s.getFileExtension(fileModel.FileName))
    fileModel.Path = filePath
    
    // Upload file content
    _, err := s.minioClient.PutObject(ctx, s.filesBucket, filePath, fileData, -1, minio.PutObjectOptions{
        ContentType: fileModel.ContentType,
    })
    if err != nil {
        return fmt.Errorf("failed to upload file: %w", err)
    }
    
    // Store file metadata
    metadataPath := fmt.Sprintf("%s/metadata/%s.json", fileModel.UserID, fileModel.ID)
    if err := s.putObject(ctx, s.filesBucket, metadataPath, fileModel); err != nil {
        return fmt.Errorf("failed to store file metadata: %w", err)
    }
    
    return nil
}

// Helper methods
func (s *StorageService) putObject(ctx context.Context, bucket, key string, data interface{}) error {
    jsonData, err := json.Marshal(data)
    if err != nil {
        return err
    }
    
    _, err = s.minioClient.PutObject(ctx, bucket, key, bytes.NewReader(jsonData), int64(len(jsonData)), minio.PutObjectOptions{
        ContentType: "application/json",
    })
    return err
}

func (s *StorageService) getObject(ctx context.Context, bucket, key string, dest interface{}) error {
    object, err := s.minioClient.GetObject(ctx, bucket, key, minio.GetObjectOptions{})
    if err != nil {
        return err
    }
    defer object.Close()
    
    data, err := io.ReadAll(object)
    if err != nil {
        return err
    }
    
    return json.Unmarshal(data, dest)
}
```

## Indexing Strategy

### 1. Primary Indexes
- **Users**: By ID (`user-{id}.json`)
- **Posts**: By ID (`post-{id}.json`)
- **Files**: By ID (`{user-id}/{file-id}.ext`)

### 2. Secondary Indexes
- **Username**: Username → User ID mapping
- **Email**: Email hash → User ID mapping
- **User Posts**: User ID → Post IDs
- **Post Status**: Status → Post IDs
- **Post Tags**: Tag → Post IDs
- **File Type**: Content type → File IDs

### 3. Index Maintenance

```go
// Index management utilities
type IndexManager struct {
    storageService *StorageService
}

func (im *IndexManager) UpdateUserIndex(ctx context.Context, user *models.User, oldUser *models.User) error {
    // Handle username changes
    if oldUser != nil && oldUser.Username != user.Username {
        // Remove old username index
        if err := im.deleteIndex(ctx, "users", fmt.Sprintf("indexes/username-%s.json", oldUser.Username)); err != nil {
            return err
        }
    }
    
    // Create/update new username index
    usernameIndex := map[string]string{"userId": user.ID}
    return im.putIndex(ctx, "users", fmt.Sprintf("indexes/username-%s.json", user.Username), usernameIndex)
}

func (im *IndexManager) UpdatePostIndexes(ctx context.Context, post *models.Post, oldPost *models.Post) error {
    // Handle status changes
    if oldPost != nil && oldPost.Status != post.Status {
        // Remove from old status index
        oldStatusPath := fmt.Sprintf("indexes/status-%s/post-%s.json", oldPost.Status, post.ID)
        im.deleteIndex(ctx, "posts", oldStatusPath)
    }
    
    // Add to new status index
    statusIndex := map[string]string{"postId": post.ID}
    statusPath := fmt.Sprintf("indexes/status-%s/post-%s.json", post.Status, post.ID)
    return im.putIndex(ctx, "posts", statusPath, statusIndex)
}
```

## Backup and Recovery

### Backup Strategy

```bash
#!/bin/bash
# backup.sh - MinIO backup script

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/minio_${BACKUP_DATE}"

echo "Starting MinIO backup: ${BACKUP_DATE}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Backup each bucket
for bucket in users posts files; do
    echo "Backing up bucket: ${bucket}"
    mc mirror --preserve source-minio/${bucket} "${BACKUP_DIR}/${bucket}"
done

# Create metadata
cat > "${BACKUP_DIR}/backup_info.json" << EOF
{
    "timestamp": "${BACKUP_DATE}",
    "version": "$(cat VERSION)",
    "buckets": ["users", "posts", "files"],
    "backup_type": "full"
}
EOF

# Compress backup
tar -czf "/backups/minio_backup_${BACKUP_DATE}.tar.gz" -C "/backups" "minio_${BACKUP_DATE}"

# Clean up temp directory
rm -rf "${BACKUP_DIR}"

echo "Backup completed: minio_backup_${BACKUP_DATE}.tar.gz"

# Clean old backups (keep last 7 days)
find /backups -name "minio_backup_*.tar.gz" -mtime +7 -delete
```

### Recovery Procedures

```bash
#!/bin/bash
# restore.sh - MinIO restore script

BACKUP_FILE="$1"
RESTORE_DATE=$(date +%Y%m%d_%H%M%S)

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.tar.gz>"
    exit 1
fi

echo "Starting MinIO restore from: ${BACKUP_FILE}"

# Extract backup
TEMP_DIR="/tmp/restore_${RESTORE_DATE}"
mkdir -p "${TEMP_DIR}"
tar -xzf "${BACKUP_FILE}" -C "${TEMP_DIR}"

# Find backup directory
BACKUP_DIR=$(find "${TEMP_DIR}" -name "minio_*" -type d | head -1)

if [ -z "$BACKUP_DIR" ]; then
    echo "Error: Invalid backup file"
    exit 1
fi

# Restore each bucket
for bucket in users posts files; do
    if [ -d "${BACKUP_DIR}/${bucket}" ]; then
        echo "Restoring bucket: ${bucket}"
        mc mirror --preserve "${BACKUP_DIR}/${bucket}" target-minio/${bucket}
    fi
done

# Clean up
rm -rf "${TEMP_DIR}"

echo "Restore completed successfully"
```

## Performance Optimization

### 1. Object Naming Conventions
- Use consistent prefixes for grouping related objects
- Include date/time in object names for time-series data
- Use UUIDs to avoid naming conflicts

### 2. Bucket Organization
- Separate buckets by data type and access patterns
- Use bucket policies for access control
- Implement lifecycle policies for old data

### 3. Caching Strategy
```go
// Cache implementation
type CacheService struct {
    redisClient *redis.Client
    storage     *StorageService
}

func (c *CacheService) GetUser(ctx context.Context, userID string) (*models.User, error) {
    // Try cache first
    cached, err := c.redisClient.Get(ctx, fmt.Sprintf("user:%s", userID)).Result()
    if err == nil {
        var user models.User
        if json.Unmarshal([]byte(cached), &user) == nil {
            return &user, nil
        }
    }
    
    // Fallback to storage
    user, err := c.storage.GetUser(ctx, userID)
    if err != nil {
        return nil, err
    }
    
    // Cache for 5 minutes
    if data, err := json.Marshal(user); err == nil {
        c.redisClient.Set(ctx, fmt.Sprintf("user:%s", userID), data, 5*time.Minute)
    }
    
    return user, nil
}
```

## Monitoring and Maintenance

### Storage Metrics
- Object count per bucket
- Storage usage per bucket
- Request rates and error rates
- Performance metrics (latency, throughput)

### Maintenance Tasks
```bash
#!/bin/bash
# maintenance.sh - Regular maintenance tasks

echo "Starting MinIO maintenance tasks"

# Clean up orphaned indexes
echo "Cleaning orphaned indexes..."
go run cmd/maintenance/cleanup-indexes.go

# Update metadata counters
echo "Updating metadata counters..."
go run cmd/maintenance/update-counters.go

# Verify data integrity
echo "Verifying data integrity..."
go run cmd/maintenance/verify-integrity.go

# Generate storage reports
echo "Generating storage reports..."
go run cmd/maintenance/storage-report.go

echo "Maintenance tasks completed"
```

### Data Integrity Checks
```go
// integrity_checker.go
type IntegrityChecker struct {
    storage *StorageService
}

func (ic *IntegrityChecker) VerifyUserData(ctx context.Context) error {
    // List all users
    objects := ic.storage.minioClient.ListObjects(ctx, "users", minio.ListObjectsOptions{
        Prefix: "user-",
    })
    
    for object := range objects {
        // Verify user object integrity
        var user models.User
        if err := ic.storage.getObject(ctx, "users", object.Key, &user); err != nil {
            ic.logger.Errorf("Corrupt user object: %s", object.Key)
            continue
        }
        
        // Verify username index exists
        usernameIndexKey := fmt.Sprintf("indexes/username-%s.json", user.Username)
        if !ic.objectExists(ctx, "users", usernameIndexKey) {
            ic.logger.Errorf("Missing username index for user: %s", user.ID)
        }
    }
    
    return nil
}
```

This document provides a comprehensive overview of the MinIO-based storage architecture, including data models, access patterns, indexing strategies, and maintenance procedures.
