# Monitoring & Observability

## Overview

This document outlines the comprehensive monitoring and observability strategy for the MinIO Fullstack Storage System. Our approach provides visibility into application performance, system health, and user experience.

## Monitoring Stack

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   Monitoring    │    │    Alerting     │
│   (Backend,     │───►│   (Prometheus,  │───►│   (AlertManager,│
│   Frontend)     │    │   Grafana)      │    │   PagerDuty)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │    Logging      │
                       │   (ELK Stack,   │
                       │   Fluentd)      │
                       └─────────────────┘
```

### Technology Stack
- **Metrics Collection**: Prometheus
- **Visualization**: Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Log Shipping**: Fluentd
- **Alerting**: AlertManager + PagerDuty
- **Tracing**: Jaeger (optional)
- **Uptime Monitoring**: External service (Pingdom, UptimeRobot)

## Application Metrics

### Backend Metrics (Go)

**HTTP Metrics**
```go
// metrics.go
package metrics

import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    httpRequestsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "endpoint", "status_code"},
    )

    httpRequestDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "Duration of HTTP requests",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "endpoint"},
    )

    activeUsers = promauto.NewGauge(
        prometheus.GaugeOpts{
            Name: "active_users",
            Help: "Number of currently active users",
        },
    )

    fileOperations = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "file_operations_total",
            Help: "Total number of file operations",
        },
        []string{"operation", "status"},
    )

    storageUsage = promauto.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "storage_usage_bytes",
            Help: "Current storage usage in bytes",
        },
        []string{"bucket"},
    )
)

// Middleware for HTTP metrics
func PrometheusMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        
        c.Next()
        
        duration := time.Since(start).Seconds()
        statusCode := strconv.Itoa(c.Writer.Status())
        
        httpRequestsTotal.WithLabelValues(
            c.Request.Method,
            c.FullPath(),
            statusCode,
        ).Inc()
        
        httpRequestDuration.WithLabelValues(
            c.Request.Method,
            c.FullPath(),
        ).Observe(duration)
    }
}
```

**Business Metrics**
```go
// business_metrics.go
var (
    usersTotal = promauto.NewGauge(
        prometheus.GaugeOpts{
            Name: "users_total",
            Help: "Total number of registered users",
        },
    )

    postsTotal = promauto.NewGauge(
        prometheus.GaugeOpts{
            Name: "posts_total",
            Help: "Total number of posts",
        },
    )

    filesTotal = promauto.NewGauge(
        prometheus.GaugeOpts{
            Name: "files_total",
            Help: "Total number of uploaded files",
        },
    )

    authFailures = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "auth_failures_total",
            Help: "Total number of authentication failures",
        },
        []string{"reason"},
    )
)

func RecordUserCreation() {
    usersTotal.Inc()
}

func RecordAuthFailure(reason string) {
    authFailures.WithLabelValues(reason).Inc()
}
```

### Frontend Metrics (React)

**Performance Metrics**
```typescript
// metrics.ts
interface PerformanceMetrics {
  pageLoadTime: number
  apiResponseTime: number
  renderTime: number
  errorRate: number
}

class MetricsCollector {
  private metrics: PerformanceMetrics = {
    pageLoadTime: 0,
    apiResponseTime: 0,
    renderTime: 0,
    errorRate: 0
  }

  // Collect Core Web Vitals
  collectWebVitals() {
    // First Contentful Paint
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.sendMetric('fcp', entry.startTime)
        }
      }
    }).observe({ entryTypes: ['paint'] })

    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      this.sendMetric('lcp', lastEntry.startTime)
    }).observe({ entryTypes: ['largest-contentful-paint'] })

    // Cumulative Layout Shift
    let clsValue = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
        }
      }
      this.sendMetric('cls', clsValue)
    }).observe({ entryTypes: ['layout-shift'] })
  }

  // API Response Time Tracking
  trackApiCall(endpoint: string, duration: number, success: boolean) {
    this.sendMetric('api_response_time', duration, {
      endpoint,
      success: success.toString()
    })
  }

  // Error Tracking
  trackError(error: Error, context: string) {
    this.sendMetric('frontend_error', 1, {
      error: error.message,
      context,
      stack: error.stack?.substring(0, 500)
    })
  }

  private sendMetric(name: string, value: number, labels?: Record<string, string>) {
    // Send to your metrics endpoint
    fetch('/api/v1/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, value, labels, timestamp: Date.now() })
    }).catch(() => {
      // Fail silently for metrics
    })
  }
}

export const metricsCollector = new MetricsCollector()
```

**React Performance Hook**
```tsx
// usePerformanceMonitoring.ts
import { useEffect } from 'react'
import { metricsCollector } from '@/lib/metrics'

export function usePerformanceMonitoring(componentName: string) {
  useEffect(() => {
    const startTime = performance.now()

    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      metricsCollector.trackApiCall('component_render', renderTime, true)
    }
  }, [componentName])

  const trackUserAction = (action: string) => {
    metricsCollector.sendMetric('user_action', 1, {
      component: componentName,
      action
    })
  }

  return { trackUserAction }
}
```

## Infrastructure Metrics

### MinIO Metrics
```yaml
# MinIO Prometheus configuration
version: '3.8'
services:
  minio:
    image: minio/minio:latest
    environment:
      MINIO_PROMETHEUS_AUTH_TYPE: "public"
      MINIO_PROMETHEUS_URL: "http://prometheus:9090"
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"

  # MinIO metrics collection
  minio-prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
```

### System Metrics

**Docker Metrics**
```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    restart: unless-stopped
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    ports:
      - "9100:9100"

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: cadvisor
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    privileged: true
    devices:
      - /dev/kmsg
```

## Logging Strategy

### Backend Logging (Go)

**Structured Logging**
```go
// logger.go
package logger

import (
    "context"
    "os"
    "time"

    "github.com/sirupsen/logrus"
)

type Logger struct {
    *logrus.Logger
}

func NewLogger() *Logger {
    log := logrus.New()
    
    // JSON formatting for production
    log.SetFormatter(&logrus.JSONFormatter{
        TimestampFormat: time.RFC3339,
        FieldMap: logrus.FieldMap{
            logrus.FieldKeyTime:  "timestamp",
            logrus.FieldKeyLevel: "level",
            logrus.FieldKeyMsg:   "message",
        },
    })

    // Set level from environment
    level, err := logrus.ParseLevel(os.Getenv("LOG_LEVEL"))
    if err != nil {
        level = logrus.InfoLevel
    }
    log.SetLevel(level)

    return &Logger{log}
}

func (l *Logger) WithContext(ctx context.Context) *logrus.Entry {
    entry := l.WithFields(logrus.Fields{})
    
    // Add request ID if available
    if requestID := ctx.Value("requestID"); requestID != nil {
        entry = entry.WithField("request_id", requestID)
    }
    
    // Add user ID if available
    if userID := ctx.Value("userID"); userID != nil {
        entry = entry.WithField("user_id", userID)
    }
    
    return entry
}

// Usage in handlers
func (h *UserHandler) CreateUser(c *gin.Context) {
    logger := h.logger.WithContext(c.Request.Context())
    
    logger.WithFields(logrus.Fields{
        "action": "create_user",
        "method": c.Request.Method,
        "path":   c.Request.URL.Path,
    }).Info("Creating new user")
    
    // Implementation...
    
    logger.WithFields(logrus.Fields{
        "user_id": user.ID,
        "username": user.Username,
    }).Info("User created successfully")
}
```

**Request Logging Middleware**
```go
func LoggingMiddleware(logger *logger.Logger) gin.HandlerFunc {
    return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
        log := logger.WithFields(logrus.Fields{
            "timestamp":      param.TimeStamp.Format(time.RFC3339),
            "status":         param.StatusCode,
            "latency":        param.Latency,
            "client_ip":      param.ClientIP,
            "method":         param.Method,
            "path":           param.Path,
            "user_agent":     param.Request.UserAgent(),
            "response_size":  param.BodySize,
        })

        if param.ErrorMessage != "" {
            log = log.WithField("error", param.ErrorMessage)
        }

        log.Info("HTTP request")
        return ""
    })
}
```

### Frontend Logging (React)

**Error Boundary with Logging**
```tsx
// ErrorBoundary.tsx
import React, { Component, ErrorInfo } from 'react'
import { logError } from '@/lib/logger'

interface Props {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error }>
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError(error, 'ErrorBoundary', {
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error!} />
    }

    return this.props.children
  }
}
```

**Centralized Logging**
```typescript
// logger.ts
interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  context?: string
  metadata?: Record<string, any>
  timestamp: string
  userId?: string
  sessionId: string
}

class Logger {
  private sessionId: string
  private userId?: string

  constructor() {
    this.sessionId = this.generateSessionId()
  }

  setUserId(userId: string) {
    this.userId = userId
  }

  debug(message: string, context?: string, metadata?: Record<string, any>) {
    this.log('debug', message, context, metadata)
  }

  info(message: string, context?: string, metadata?: Record<string, any>) {
    this.log('info', message, context, metadata)
  }

  warn(message: string, context?: string, metadata?: Record<string, any>) {
    this.log('warn', message, context, metadata)
  }

  error(message: string, context?: string, metadata?: Record<string, any>) {
    this.log('error', message, context, metadata)
  }

  private log(level: LogEntry['level'], message: string, context?: string, metadata?: Record<string, any>) {
    const entry: LogEntry = {
      level,
      message,
      context,
      metadata,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      sessionId: this.sessionId
    }

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.log(JSON.stringify(entry, null, 2))
    }

    // Send to logging service
    this.sendToLoggingService(entry)
  }

  private sendToLoggingService(entry: LogEntry) {
    // Send to backend logging endpoint
    fetch('/api/v1/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    }).catch(() => {
      // Store locally if network fails
      this.storeLocally(entry)
    })
  }

  private storeLocally(entry: LogEntry) {
    const logs = JSON.parse(localStorage.getItem('pendingLogs') || '[]')
    logs.push(entry)
    localStorage.setItem('pendingLogs', JSON.stringify(logs.slice(-100))) // Keep last 100
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }
}

export const logger = new Logger()

// Helper functions
export function logError(error: Error, context: string, metadata?: Record<string, any>) {
  logger.error(error.message, context, {
    ...metadata,
    stack: error.stack,
    name: error.name
  })
}

export function logUserAction(action: string, metadata?: Record<string, any>) {
  logger.info(`User action: ${action}`, 'user-interaction', metadata)
}
```

## Grafana Dashboards

### Application Dashboard
```json
{
  "dashboard": {
    "title": "MinIO Storage System - Application Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{endpoint}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"4..|5..\"}[5m]) / rate(http_requests_total[5m]) * 100",
            "legendFormat": "Error Rate %"
          }
        ]
      },
      {
        "title": "Active Users",
        "type": "singlestat",
        "targets": [
          {
            "expr": "active_users",
            "legendFormat": "Active Users"
          }
        ]
      },
      {
        "title": "File Operations",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(file_operations_total[5m])",
            "legendFormat": "{{operation}} - {{status}}"
          }
        ]
      },
      {
        "title": "Storage Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "storage_usage_bytes",
            "legendFormat": "{{bucket}}"
          }
        ]
      }
    ]
  }
}
```

### Infrastructure Dashboard
```json
{
  "dashboard": {
    "title": "MinIO Storage System - Infrastructure",
    "panels": [
      {
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - (avg(rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "CPU Usage %"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100",
            "legendFormat": "Memory Usage %"
          }
        ]
      },
      {
        "title": "Disk Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - (node_filesystem_avail_bytes / node_filesystem_size_bytes * 100)",
            "legendFormat": "{{mountpoint}}"
          }
        ]
      },
      {
        "title": "Network I/O",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(node_network_receive_bytes_total[5m])",
            "legendFormat": "Receive {{device}}"
          },
          {
            "expr": "rate(node_network_transmit_bytes_total[5m])",
            "legendFormat": "Transmit {{device}}"
          }
        ]
      }
    ]
  }
}
```

## Alerting Rules

### Prometheus Alerting Rules
```yaml
# alerts.yml
groups:
  - name: application_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"

      - alert: LowActiveUsers
        expr: active_users < 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "No active users"
          description: "No users have been active for 10 minutes"

  - name: infrastructure_alerts
    rules:
      - alert: HighCPUUsage
        expr: 100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is {{ $value }}%"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}%"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.instance }} has been down for more than 1 minute"
```

### AlertManager Configuration
```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@yourdomain.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://pagerduty-webhook:8080/webhook'
    email_configs:
      - to: 'admin@yourdomain.com'
        subject: 'Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
```

## Health Checks

### Backend Health Checks
```go
// health.go
type HealthChecker struct {
    storageService *services.StorageService
    dependencies   map[string]func() error
}

type HealthStatus struct {
    Status       string            `json:"status"`
    Timestamp    time.Time         `json:"timestamp"`
    Version      string            `json:"version"`
    Dependencies map[string]string `json:"dependencies"`
}

func (h *HealthChecker) CheckHealth() HealthStatus {
    status := HealthStatus{
        Timestamp:    time.Now(),
        Version:      os.Getenv("APP_VERSION"),
        Dependencies: make(map[string]string),
    }

    allHealthy := true

    // Check MinIO connectivity
    if err := h.storageService.HealthCheck(); err != nil {
        status.Dependencies["minio"] = "unhealthy: " + err.Error()
        allHealthy = false
    } else {
        status.Dependencies["minio"] = "healthy"
    }

    // Check other dependencies
    for name, checkFunc := range h.dependencies {
        if err := checkFunc(); err != nil {
            status.Dependencies[name] = "unhealthy: " + err.Error()
            allHealthy = false
        } else {
            status.Dependencies[name] = "healthy"
        }
    }

    if allHealthy {
        status.Status = "healthy"
    } else {
        status.Status = "unhealthy"
    }

    return status
}

// Health check endpoint
func (h *HealthChecker) HealthHandler(c *gin.Context) {
    health := h.CheckHealth()
    
    statusCode := http.StatusOK
    if health.Status == "unhealthy" {
        statusCode = http.StatusServiceUnavailable
    }
    
    c.JSON(statusCode, health)
}
```

### Frontend Health Checks
```typescript
// health.ts
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: {
    api: string
    storage: string
    auth: string
  }
}

export async function checkHealth(): Promise<HealthStatus> {
  const checks = {
    api: 'unknown',
    storage: 'unknown',
    auth: 'unknown'
  }

  try {
    // Check API connectivity
    const apiResponse = await fetch('/api/v1/health', { 
      timeout: 5000 
    })
    checks.api = apiResponse.ok ? 'healthy' : 'unhealthy'
  } catch {
    checks.api = 'unhealthy'
  }

  try {
    // Check if user can authenticate
    const token = localStorage.getItem('token')
    if (token) {
      const authResponse = await fetch('/api/v1/profile', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      })
      checks.auth = authResponse.ok ? 'healthy' : 'unhealthy'
    } else {
      checks.auth = 'healthy' // No token needed for health check
    }
  } catch {
    checks.auth = 'unhealthy'
  }

  // Determine overall status
  const unhealthyCount = Object.values(checks).filter(status => status === 'unhealthy').length
  let overallStatus: HealthStatus['status'] = 'healthy'
  
  if (unhealthyCount > 0) {
    overallStatus = unhealthyCount === Object.keys(checks).length ? 'unhealthy' : 'degraded'
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks
  }
}
```

## Production Monitoring Checklist

### ✅ Core Metrics
- [ ] HTTP request rate and latency
- [ ] Error rates (4xx, 5xx)
- [ ] System resources (CPU, Memory, Disk)
- [ ] Application-specific metrics (users, files, posts)
- [ ] Database/Storage metrics

### ✅ Logging
- [ ] Structured logging implemented
- [ ] Log aggregation configured
- [ ] Log retention policies set
- [ ] Error tracking and alerting

### ✅ Alerting
- [ ] Critical alerts configured
- [ ] Alert routing and escalation
- [ ] Alert fatigue prevention
- [ ] Runbook documentation

### ✅ Dashboards
- [ ] Application performance dashboard
- [ ] Infrastructure monitoring dashboard
- [ ] Business metrics dashboard
- [ ] Real-user monitoring dashboard

### ✅ Health Checks
- [ ] Liveness probes
- [ ] Readiness probes
- [ ] Dependency health checks
- [ ] External service monitoring

### ✅ Performance Monitoring
- [ ] Frontend performance metrics
- [ ] Backend performance profiling
- [ ] Database query performance
- [ ] Cache hit rates

This comprehensive monitoring setup ensures full visibility into the MinIO Fullstack Storage System's health, performance, and user experience.
