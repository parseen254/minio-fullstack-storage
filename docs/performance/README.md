# Performance Guide

This guide covers performance optimization strategies for the MinIO Fullstack Storage application across all layers of the stack.

## Performance Overview

### Performance Goals
- **Response Time**: < 200ms for API endpoints
- **Throughput**: 1000+ concurrent users
- **File Upload**: > 100MB/s sustained transfer
- **Database**: < 50ms query response time
- **Frontend**: < 3s initial page load, < 1s navigation

### Performance Monitoring Stack
- **Application Metrics**: Prometheus + Grafana
- **Real User Monitoring**: Google Analytics, New Relic
- **APM**: DataDog, New Relic, or Jaeger
- **Infrastructure**: Node Exporter, Postgres Exporter

## Backend Performance

### Database Optimization

#### PostgreSQL Configuration
```sql
-- Production PostgreSQL settings (for 16GB RAM server)
ALTER SYSTEM SET shared_buffers = '4GB';
ALTER SYSTEM SET effective_cache_size = '12GB';
ALTER SYSTEM SET maintenance_work_mem = '1GB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '50MB';
ALTER SYSTEM SET max_worker_processes = 8;
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;
ALTER SYSTEM SET max_parallel_workers = 8;
SELECT pg_reload_conf();
```

#### Database Indexing Strategy
```sql
-- User table indexes
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_users_created_at ON users(created_at);

-- Posts table indexes
CREATE INDEX CONCURRENTLY idx_posts_user_id ON posts(user_id);
CREATE INDEX CONCURRENTLY idx_posts_created_at ON posts(created_at);
CREATE INDEX CONCURRENTLY idx_posts_user_created ON posts(user_id, created_at DESC);

-- Files table indexes
CREATE INDEX CONCURRENTLY idx_files_user_id ON files(user_id);
CREATE INDEX CONCURRENTLY idx_files_post_id ON files(post_id);
CREATE INDEX CONCURRENTLY idx_files_created_at ON files(created_at);
CREATE INDEX CONCURRENTLY idx_files_size ON files(size);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_posts_user_status ON posts(user_id, status) WHERE status = 'published';
CREATE INDEX CONCURRENTLY idx_files_user_type ON files(user_id, content_type);

-- Partial indexes for active records
CREATE INDEX CONCURRENTLY idx_users_active ON users(id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY idx_posts_published ON posts(id, created_at) WHERE status = 'published';
```

#### Query Optimization
```go
// backend/internal/repositories/post.go - Optimized queries

// Bad: N+1 query problem
func (r *PostRepository) GetPostsWithUsersBad(limit int) ([]*models.Post, error) {
    posts, err := r.GetPosts(limit)
    if err != nil {
        return nil, err
    }
    
    for _, post := range posts {
        user, err := r.userRepo.GetByID(post.UserID)
        if err != nil {
            return nil, err
        }
        post.User = user // N+1 queries!
    }
    return posts, nil
}

// Good: Single query with JOIN
func (r *PostRepository) GetPostsWithUsers(limit int) ([]*models.Post, error) {
    query := `
        SELECT 
            p.id, p.title, p.content, p.created_at,
            u.id, u.first_name, u.last_name, u.email
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.deleted_at IS NULL
        ORDER BY p.created_at DESC
        LIMIT $1
    `
    
    rows, err := r.db.Query(query, limit)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var posts []*models.Post
    for rows.Next() {
        var post models.Post
        var user models.User
        
        err := rows.Scan(
            &post.ID, &post.Title, &post.Content, &post.CreatedAt,
            &user.ID, &user.FirstName, &user.LastName, &user.Email,
        )
        if err != nil {
            return nil, err
        }
        
        post.User = &user
        posts = append(posts, &post)
    }
    
    return posts, nil
}
```

#### Connection Pooling
```go
// backend/internal/database/connection.go
func NewDatabase(config *Config) (*sql.DB, error) {
    db, err := sql.Open("postgres", config.DatabaseURL)
    if err != nil {
        return nil, err
    }
    
    // Connection pool settings
    db.SetMaxOpenConns(25)                 // Maximum connections
    db.SetMaxIdleConns(25)                 // Idle connections
    db.SetConnMaxLifetime(5 * time.Minute) // Connection lifetime
    db.SetConnMaxIdleTime(5 * time.Minute) // Idle timeout
    
    return db, nil
}
```

### API Performance Optimization

#### Response Caching
```go
// backend/internal/middleware/cache.go
func CacheMiddleware(duration time.Duration) gin.HandlerFunc {
    cache := cache.New(5*time.Minute, 10*time.Minute)
    
    return func(c *gin.Context) {
        // Only cache GET requests
        if c.Request.Method != "GET" {
            c.Next()
            return
        }
        
        cacheKey := generateCacheKey(c.Request.URL.Path, c.Request.URL.RawQuery)
        
        // Check cache
        if cached, found := cache.Get(cacheKey); found {
            c.Data(http.StatusOK, "application/json", cached.([]byte))
            return
        }
        
        // Capture response
        recorder := &responseRecorder{
            ResponseWriter: c.Writer,
            body:          bytes.NewBuffer([]byte{}),
        }
        c.Writer = recorder
        
        c.Next()
        
        // Cache successful responses
        if recorder.Code == http.StatusOK {
            cache.Set(cacheKey, recorder.body.Bytes(), duration)
        }
    }
}

// Apply caching to specific routes
router.GET("/api/posts", CacheMiddleware(5*time.Minute), handlers.GetPosts)
router.GET("/api/users/:id/posts", CacheMiddleware(2*time.Minute), handlers.GetUserPosts)
```

#### Request Compression
```go
// backend/internal/middleware/compression.go
func CompressionMiddleware() gin.HandlerFunc {
    return gzip.Gzip(gzip.DefaultCompression, gzip.WithExcludedExtensions([]string{".jpg", ".png", ".gif", ".mp4"}))
}

// Apply compression globally
router.Use(CompressionMiddleware())
```

#### Connection Keep-Alive
```go
// backend/cmd/server/main.go
func main() {
    router := gin.Default()
    
    server := &http.Server{
        Addr:         ":8080",
        Handler:      router,
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 10 * time.Second,
        IdleTimeout:  120 * time.Second, // Keep connections alive
    }
    
    server.ListenAndServe()
}
```

#### Parallel Processing
```go
// backend/internal/services/file.go
func (s *FileService) ProcessMultipleFiles(files []FileInput) ([]*models.File, error) {
    var wg sync.WaitGroup
    results := make(chan FileResult, len(files))
    
    // Process files concurrently
    for _, file := range files {
        wg.Add(1)
        go func(f FileInput) {
            defer wg.Done()
            
            processedFile, err := s.ProcessFile(f)
            results <- FileResult{File: processedFile, Error: err}
        }(file)
    }
    
    // Wait for all processing to complete
    go func() {
        wg.Wait()
        close(results)
    }()
    
    // Collect results
    var processedFiles []*models.File
    for result := range results {
        if result.Error != nil {
            return nil, result.Error
        }
        processedFiles = append(processedFiles, result.File)
    }
    
    return processedFiles, nil
}
```

### Memory Management

#### Memory Pooling
```go
// backend/internal/utils/pool.go
var bufferPool = sync.Pool{
    New: func() interface{} {
        return make([]byte, 32*1024) // 32KB buffers
    },
}

func (s *FileService) ProcessFile(reader io.Reader) error {
    // Get buffer from pool
    buffer := bufferPool.Get().([]byte)
    defer bufferPool.Put(buffer) // Return to pool
    
    // Use buffer for processing
    for {
        n, err := reader.Read(buffer)
        if err == io.EOF {
            break
        }
        if err != nil {
            return err
        }
        
        // Process chunk
        if err := s.processChunk(buffer[:n]); err != nil {
            return err
        }
    }
    
    return nil
}
```

#### Garbage Collection Tuning
```bash
# Environment variables for GC tuning
export GOGC=100                    # GC target percentage
export GOMEMLIMIT=2GiB            # Memory limit
export GODEBUG=gctrace=1          # Enable GC tracing (debug only)
```

## Frontend Performance

### React Component Optimization

#### Memoization
```typescript
// frontend/src/components/post-list.tsx
import React, { memo, useMemo, useCallback } from 'react';

interface PostListProps {
  posts: Post[];
  onPostClick: (id: string) => void;
}

export const PostList = memo<PostListProps>(({ posts, onPostClick }) => {
  // Memoize expensive calculations
  const sortedPosts = useMemo(() => {
    return posts.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [posts]);
  
  // Memoize callback functions
  const handlePostClick = useCallback((id: string) => {
    onPostClick(id);
  }, [onPostClick]);
  
  return (
    <div>
      {sortedPosts.map(post => (
        <PostItem 
          key={post.id} 
          post={post} 
          onClick={handlePostClick}
        />
      ))}
    </div>
  );
});

// Use React.memo for pure components
const PostItem = memo<{ post: Post; onClick: (id: string) => void }>(
  ({ post, onClick }) => {
    return (
      <div onClick={() => onClick(post.id)}>
        <h3>{post.title}</h3>
        <p>{post.excerpt}</p>
      </div>
    );
  }
);
```

#### Virtual Scrolling
```typescript
// frontend/src/components/virtual-post-list.tsx
import { FixedSizeList as List } from 'react-window';

interface VirtualPostListProps {
  posts: Post[];
  height: number;
}

export const VirtualPostList: React.FC<VirtualPostListProps> = ({ 
  posts, 
  height 
}) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <PostItem post={posts[index]} />
    </div>
  );
  
  return (
    <List
      height={height}
      itemCount={posts.length}
      itemSize={120} // Height of each item
      width="100%"
    >
      {Row}
    </List>
  );
};
```

### State Management Optimization

#### Selective Re-renders
```typescript
// frontend/src/hooks/use-posts.ts
export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Optimize updates to prevent unnecessary re-renders
  const updatePost = useCallback((updatedPost: Post) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === updatedPost.id ? updatedPost : post
      )
    );
  }, []);
  
  const addPost = useCallback((newPost: Post) => {
    setPosts(prevPosts => [newPost, ...prevPosts]);
  }, []);
  
  const removePost = useCallback((postId: string) => {
    setPosts(prevPosts => 
      prevPosts.filter(post => post.id !== postId)
    );
  }, []);
  
  return {
    posts,
    loading,
    error,
    updatePost,
    addPost,
    removePost
  };
}
```

#### Zustand State Management
```typescript
// frontend/src/store/posts.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface PostsState {
  posts: Post[];
  selectedPost: Post | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
  updatePost: (post: Post) => void;
  removePost: (id: string) => void;
  setSelectedPost: (post: Post | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePostsStore = create<PostsState>()(
  subscribeWithSelector((set, get) => ({
    posts: [],
    selectedPost: null,
    loading: false,
    error: null,
    
    setPosts: (posts) => set({ posts }),
    
    addPost: (post) => set((state) => ({
      posts: [post, ...state.posts]
    })),
    
    updatePost: (updatedPost) => set((state) => ({
      posts: state.posts.map(post => 
        post.id === updatedPost.id ? updatedPost : post
      )
    })),
    
    removePost: (id) => set((state) => ({
      posts: state.posts.filter(post => post.id !== id)
    })),
    
    setSelectedPost: (selectedPost) => set({ selectedPost }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
  }))
);
```

### Asset Optimization

#### Image Optimization
```typescript
// frontend/src/components/optimized-image.tsx
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  priority = false
}) => {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkrHB0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      className="object-cover"
    />
  );
};
```

#### Code Splitting
```typescript
// frontend/src/pages/posts.tsx
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamic imports for code splitting
const PostEditor = dynamic(() => import('../components/post-editor'), {
  loading: () => <div>Loading editor...</div>,
  ssr: false // Client-side only component
});

const PostAnalytics = dynamic(() => import('../components/post-analytics'), {
  loading: () => <div>Loading analytics...</div>
});

export default function PostsPage() {
  return (
    <div>
      <Suspense fallback={<div>Loading posts...</div>}>
        <PostList />
      </Suspense>
      
      <Suspense fallback={<div>Loading editor...</div>}>
        <PostEditor />
      </Suspense>
      
      <Suspense fallback={<div>Loading analytics...</div>}>
        <PostAnalytics />
      </Suspense>
    </div>
  );
}
```

### Bundle Optimization

#### Webpack Bundle Analyzer
```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  webpack: (config, { isServer }) => {
    // Optimize chunks
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            minChunks: 2,
            chunks: 'all',
            enforce: true,
            name: 'common',
          },
        },
      };
    }
    
    return config;
  },
  
  // Enable compression
  compress: true,
  
  // Optimize images
  images: {
    domains: ['localhost', 'your-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Enable experimental features
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react'],
  },
});
```

## File Storage Performance

### MinIO Optimization

#### MinIO Server Configuration
```bash
# MinIO server optimization
export MINIO_CACHE_DRIVES="/mnt/cache1,/mnt/cache2"
export MINIO_CACHE_QUOTA=80
export MINIO_CACHE_AFTER=3
export MINIO_CACHE_WATERMARK_LOW=70
export MINIO_CACHE_WATERMARK_HIGH=90

# Erasure coding configuration
minio server /data{1...4} \
  --console-address ":9001" \
  --address ":9000"
```

#### Multipart Upload Optimization
```go
// backend/internal/services/file_upload.go
func (s *FileService) UploadLargeFile(file io.Reader, filename string, size int64) error {
    // Use multipart upload for files > 100MB
    if size > 100*1024*1024 {
        return s.uploadMultipart(file, filename, size)
    }
    
    return s.uploadSingle(file, filename, size)
}

func (s *FileService) uploadMultipart(file io.Reader, filename string, size int64) error {
    // Initialize multipart upload
    upload, err := s.minioClient.NewMultipartUpload(
        s.bucketName,
        filename,
        minio.PutObjectOptions{},
    )
    if err != nil {
        return err
    }
    
    // Upload parts concurrently
    partSize := int64(64 * 1024 * 1024) // 64MB parts
    var parts []minio.CompletePart
    partNumber := 1
    
    buffer := make([]byte, partSize)
    for {
        n, err := io.ReadFull(file, buffer)
        if err == io.EOF {
            break
        }
        if err != nil && err != io.ErrUnexpectedEOF {
            return err
        }
        
        // Upload part
        part, err := s.minioClient.PutObjectPart(
            s.bucketName,
            filename,
            upload.UploadID,
            partNumber,
            bytes.NewReader(buffer[:n]),
            int64(n),
            minio.PutObjectPartOptions{},
        )
        if err != nil {
            return err
        }
        
        parts = append(parts, minio.CompletePart{
            PartNumber: partNumber,
            ETag:       part.ETag,
        })
        
        partNumber++
    }
    
    // Complete multipart upload
    _, err = s.minioClient.CompleteMultipartUpload(
        s.bucketName,
        filename,
        upload.UploadID,
        parts,
    )
    
    return err
}
```

#### CDN Integration
```go
// backend/internal/services/cdn.go
func (s *CDNService) GetFileURL(filename string) string {
    // Use CDN for static assets
    if s.cdnEnabled {
        return fmt.Sprintf("https://cdn.yourdomain.com/%s", filename)
    }
    
    // Fallback to direct MinIO URL
    return s.getMinIOURL(filename)
}

func (s *FileService) UploadWithCDNInvalidation(file io.Reader, filename string) error {
    // Upload to MinIO
    err := s.uploadToMinIO(file, filename)
    if err != nil {
        return err
    }
    
    // Invalidate CDN cache asynchronously
    go func() {
        if err := s.cdnService.InvalidateCache(filename); err != nil {
            log.Printf("CDN invalidation failed: %v", err)
        }
    }()
    
    return nil
}
```

### File Processing Optimization

#### Concurrent Processing
```go
// backend/internal/services/image_processing.go
func (s *ImageService) ProcessImages(images []ImageInput) error {
    semaphore := make(chan struct{}, 4) // Limit to 4 concurrent processes
    var wg sync.WaitGroup
    
    for _, img := range images {
        wg.Add(1)
        
        go func(image ImageInput) {
            defer wg.Done()
            
            // Acquire semaphore
            semaphore <- struct{}{}
            defer func() { <-semaphore }()
            
            if err := s.processImage(image); err != nil {
                log.Printf("Image processing failed: %v", err)
            }
        }(img)
    }
    
    wg.Wait()
    return nil
}

func (s *ImageService) processImage(image ImageInput) error {
    // Generate thumbnails
    if err := s.generateThumbnail(image); err != nil {
        return err
    }
    
    // Optimize image
    if err := s.optimizeImage(image); err != nil {
        return err
    }
    
    // Extract metadata
    if err := s.extractMetadata(image); err != nil {
        return err
    }
    
    return nil
}
```

#### Image Optimization
```go
// backend/internal/services/image_optimization.go
import "github.com/disintegration/imaging"

func (s *ImageService) optimizeImage(input ImageInput) error {
    // Open image
    img, err := imaging.Open(input.Path)
    if err != nil {
        return err
    }
    
    // Resize if too large
    bounds := img.Bounds()
    maxWidth, maxHeight := 2048, 2048
    
    if bounds.Dx() > maxWidth || bounds.Dy() > maxHeight {
        img = imaging.Fit(img, maxWidth, maxHeight, imaging.Lanczos)
    }
    
    // Save with optimization
    return imaging.Save(img, input.OutputPath, imaging.JPEGQuality(85))
}

func (s *ImageService) generateThumbnail(input ImageInput) error {
    img, err := imaging.Open(input.Path)
    if err != nil {
        return err
    }
    
    // Generate multiple thumbnail sizes
    sizes := []int{150, 300, 600}
    
    for _, size := range sizes {
        thumbnail := imaging.Resize(img, size, 0, imaging.Lanczos)
        
        thumbnailPath := fmt.Sprintf("%s_thumb_%d.jpg", 
            strings.TrimSuffix(input.Path, filepath.Ext(input.Path)), 
            size)
        
        if err := imaging.Save(thumbnail, thumbnailPath, imaging.JPEGQuality(80)); err != nil {
            return err
        }
    }
    
    return nil
}
```

## Monitoring and Profiling

### Application Metrics

#### Prometheus Metrics
```go
// backend/internal/metrics/metrics.go
var (
    httpRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "endpoint", "status_code"},
    )
    
    httpRequestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "Duration of HTTP requests",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "endpoint"},
    )
    
    dbConnectionsActive = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "db_connections_active",
            Help: "Number of active database connections",
        },
    )
    
    fileUploadSize = prometheus.NewHistogram(
        prometheus.HistogramOpts{
            Name:    "file_upload_size_bytes",
            Help:    "Size of uploaded files",
            Buckets: []float64{1024, 10240, 102400, 1048576, 10485760, 104857600},
        },
    )
)

func init() {
    prometheus.MustRegister(httpRequestsTotal)
    prometheus.MustRegister(httpRequestDuration)
    prometheus.MustRegister(dbConnectionsActive)
    prometheus.MustRegister(fileUploadSize)
}

// Middleware to collect HTTP metrics
func MetricsMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        
        c.Next()
        
        duration := time.Since(start)
        statusCode := strconv.Itoa(c.Writer.Status())
        
        httpRequestsTotal.WithLabelValues(
            c.Request.Method,
            c.FullPath(),
            statusCode,
        ).Inc()
        
        httpRequestDuration.WithLabelValues(
            c.Request.Method,
            c.FullPath(),
        ).Observe(duration.Seconds())
    }
}
```

#### Database Metrics
```go
// backend/internal/database/metrics.go
type DatabaseMetrics struct {
    db *sql.DB
}

func (m *DatabaseMetrics) UpdateMetrics() {
    stats := m.db.Stats()
    
    dbConnectionsActive.Set(float64(stats.OpenConnections))
    
    prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "db_connections_idle",
            Help: "Number of idle database connections",
        },
        []string{},
    ).WithLabelValues().Set(float64(stats.Idle))
    
    prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "db_connections_in_use",
            Help: "Number of database connections in use",
        },
        []string{},
    ).WithLabelValues().Set(float64(stats.InUse))
}

// Update metrics every 30 seconds
func (m *DatabaseMetrics) StartMetricsCollection() {
    ticker := time.NewTicker(30 * time.Second)
    go func() {
        for range ticker.C {
            m.UpdateMetrics()
        }
    }()
}
```

### Performance Profiling

#### CPU Profiling
```go
// backend/cmd/server/main.go
import _ "net/http/pprof"

func main() {
    // Enable pprof endpoint in development
    if gin.Mode() == gin.DebugMode {
        go func() {
            log.Println(http.ListenAndServe("localhost:6060", nil))
        }()
    }
    
    // Start main server
    router := setupRouter()
    router.Run(":8080")
}
```

```bash
# Profile CPU usage
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

# Profile memory usage
go tool pprof http://localhost:6060/debug/pprof/heap

# Profile goroutines
go tool pprof http://localhost:6060/debug/pprof/goroutine
```

#### Database Query Analysis
```sql
-- Enable PostgreSQL query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
ALTER SYSTEM SET log_min_duration_statement = 100; -- Log queries > 100ms
SELECT pg_reload_conf();

-- Analyze slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
ORDER BY idx_tup_read DESC;
```

## Load Testing

### Backend Load Testing

#### Artillery.js Configuration
```yaml
# load-test.yml
config:
  target: 'http://localhost:8080'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
    - duration: 120
      arrivalRate: 100
      name: "Peak load"
  payload:
    path: "users.csv"
    fields:
      - "email"
      - "password"

scenarios:
  - name: "User authentication and file operations"
    weight: 70
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "{{ email }}"
            password: "{{ password }}"
          capture:
            - json: "$.token"
              as: "authToken"
      - get:
          url: "/api/posts"
          headers:
            Authorization: "Bearer {{ authToken }}"
      - post:
          url: "/api/files/upload"
          headers:
            Authorization: "Bearer {{ authToken }}"
          formData:
            file: "@test-file.jpg"

  - name: "Anonymous browsing"
    weight: 30
    flow:
      - get:
          url: "/api/health"
      - get:
          url: "/api/posts/public"
```

```bash
# Run load test
artillery run load-test.yml

# Generate HTML report
artillery run --output report.json load-test.yml
artillery report report.json
```

#### K6 Load Testing
```javascript
// k6-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Error rate under 1%
  },
};

export default function() {
  // Login
  let loginResponse = http.post('http://localhost:8080/api/auth/login', {
    email: 'test@example.com',
    password: 'password123',
  });
  
  check(loginResponse, {
    'login successful': (r) => r.status === 200,
  });
  
  let authToken = loginResponse.json('token');
  
  // Get posts
  let postsResponse = http.get('http://localhost:8080/api/posts', {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  
  check(postsResponse, {
    'posts loaded': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  sleep(1);
}
```

### Frontend Load Testing

#### Lighthouse CI
```yaml
# .lighthouserc.yml
ci:
  collect:
    url:
      - http://localhost:3000
      - http://localhost:3000/posts
      - http://localhost:3000/profile
    settings:
      chromeFlags: --no-sandbox
  assert:
    assertions:
      categories:performance: ['error', {minScore: 0.9}]
      categories:accessibility: ['error', {minScore: 0.9}]
      categories:best-practices: ['error', {minScore: 0.9}]
      categories:seo: ['error', {minScore: 0.9}]
  upload:
    target: temporary-public-storage
```

```bash
# Run Lighthouse CI
npm install -g @lhci/cli
lhci collect --url=http://localhost:3000
lhci assert
```

## Performance Optimization Checklist

### Backend Optimization
- [ ] Database indexes optimized
- [ ] Query performance analyzed
- [ ] Connection pooling configured
- [ ] Response caching implemented
- [ ] Request compression enabled
- [ ] Memory usage optimized
- [ ] Garbage collection tuned
- [ ] API rate limiting implemented
- [ ] Metrics collection enabled
- [ ] Performance profiling set up

### Frontend Optimization
- [ ] Component memoization implemented
- [ ] Code splitting configured
- [ ] Bundle size optimized
- [ ] Image optimization enabled
- [ ] Lazy loading implemented
- [ ] Virtual scrolling for large lists
- [ ] State management optimized
- [ ] Asset compression enabled
- [ ] CDN configured for static assets
- [ ] Service worker implemented

### Database Optimization
- [ ] Proper indexing strategy
- [ ] Query optimization completed
- [ ] Connection pooling tuned
- [ ] Partitioning implemented (if needed)
- [ ] Vacuum and analyze scheduled
- [ ] Statistics updated regularly
- [ ] Slow query monitoring enabled
- [ ] Read replicas configured (if needed)

### File Storage Optimization
- [ ] MinIO cluster configured
- [ ] Multipart uploads implemented
- [ ] CDN integration completed
- [ ] Image optimization enabled
- [ ] Thumbnail generation optimized
- [ ] Concurrent processing implemented
- [ ] File compression enabled
- [ ] Cache headers configured

### Infrastructure Optimization
- [ ] Load balancing configured
- [ ] Auto-scaling implemented
- [ ] Resource limits set
- [ ] Health checks configured
- [ ] Monitoring dashboards created
- [ ] Alerting rules defined
- [ ] Performance baselines established
- [ ] Load testing completed

## Performance Targets

### Response Time Targets
- **API Endpoints**: < 200ms (95th percentile)
- **Database Queries**: < 50ms (average)
- **File Uploads**: > 100MB/s sustained
- **Page Load**: < 3s initial, < 1s navigation
- **Time to Interactive**: < 3s

### Throughput Targets
- **Concurrent Users**: 1000+
- **Requests per Second**: 5000+
- **File Operations**: 100 uploads/minute
- **Database Connections**: 25 per backend instance

### Resource Usage Targets
- **CPU Usage**: < 70% average
- **Memory Usage**: < 80% of allocated
- **Disk I/O**: < 80% capacity
- **Network Bandwidth**: < 80% capacity

## Next Steps

After implementing performance optimizations:
1. Set up comprehensive monitoring: [Monitoring Guide](../monitoring/README.md)
2. Implement automated testing: [Testing Guide](../testing/README.md)
3. Configure alerting for performance issues
4. Schedule regular performance reviews
5. Plan capacity scaling based on growth
