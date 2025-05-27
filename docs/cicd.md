# CI/CD Pipeline Documentation

This document covers the continuous integration and continuous deployment (CI/CD) pipeline for the MinIO Fullstack Storage System, including automated testing, building, and deployment strategies.

## 📋 Table of Contents
- [Pipeline Overview](#pipeline-overview)
- [GitHub Actions Workflows](#github-actions-workflows)
- [Build Process](#build-process)
- [Testing Automation](#testing-automation)
- [Deployment Strategies](#deployment-strategies)
- [Security and Quality Gates](#security-and-quality-gates)
- [Monitoring and Notifications](#monitoring-and-notifications)
- [Best Practices](#best-practices)

## 🔄 Pipeline Overview

### Pipeline Architecture
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐     ┌──────────────┐
│   Source    │───▶│   Build &   │───▶│   Deploy    │───▶│  Production  │
│   Control   │    │    Test      │    │  Staging    │     │   Deploy     │
│  (GitHub)   │    │              │    │             │     │              │
└─────────────┘    └──────────────┘    └─────────────┘     └──────────────┘
                           │                    │                  │
                           ▼                    ▼                  ▼
                   ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
                   │   Quality    │    │  Integration│    │  Production  │
                   │    Gates     │    │   Testing   │    │  Monitoring  │
                   │              │    │             │    │              │
                   └──────────────┘    └─────────────┘    └──────────────┘
```

### Key Components
- **Source Control**: GitHub with branch protection
- **CI Platform**: GitHub Actions
- **Container Registry**: Docker Hub / GitHub Container Registry
- **Deployment**: Kubernetes with Helm charts
- **Monitoring**: Prometheus + Grafana alerts

## ⚙️ GitHub Actions Workflows

### 1. Pull Request Workflow
```yaml
# .github/workflows/pull-request.yml
name: Pull Request Validation

on:
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        component: [backend, frontend]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Environment
      uses: ./.github/actions/setup-${{ matrix.component }}
    
    - name: Lint Code
      run: |
        cd ${{ matrix.component }}
        npm run lint  # or make lint for backend
    
    - name: Run Unit Tests
      run: |
        cd ${{ matrix.component }}
        npm test      # or make test for backend
    
    - name: Security Scan
      uses: github/super-linter@v4
      env:
        DEFAULT_BRANCH: main
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Upload Coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./${{ matrix.component }}/coverage.xml
```

### 2. Main Branch Workflow
```yaml
# .github/workflows/main.yml
name: Main Branch CI/CD

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      minio:
        image: minio/minio:latest
        env:
          MINIO_ROOT_USER: minioadmin
          MINIO_ROOT_PASSWORD: minioadmin
        ports:
          - 9000:9000
        options: --health-cmd "curl -f http://localhost:9000/minio/health/live"
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Run Integration Tests
      run: |
        make test-integration
        make test-e2e
    
    - name: Build and Test Containers
      run: |
        docker-compose -f docker-compose.test.yml up --abort-on-container-exit
        docker-compose -f docker-compose.test.yml down

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Build and Push Backend
      uses: docker/build-push-action@v4
      with:
        context: ./backend
        platforms: linux/amd64,linux/arm64
        push: true
        tags: |
          ghcr.io/${{ github.repository }}/backend:latest
          ghcr.io/${{ github.repository }}/backend:${{ github.sha }}
    
    - name: Build and Push Frontend
      uses: docker/build-push-action@v4
      with:
        context: ./frontend
        platforms: linux/amd64,linux/arm64
        push: true
        tags: |
          ghcr.io/${{ github.repository }}/frontend:latest
          ghcr.io/${{ github.repository }}/frontend:${{ github.sha }}

  deploy-staging:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: staging
    steps:
    - name: Deploy to Staging
      uses: ./.github/actions/deploy-k8s
      with:
        environment: staging
        image-tag: ${{ github.sha }}
        kubeconfig: ${{ secrets.STAGING_KUBECONFIG }}
```

### 3. Release Workflow
```yaml
# .github/workflows/release.yml
name: Release Deployment

on:
  release:
    types: [published]

jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment: production
    steps:
    - uses: actions/checkout@v4
    
    - name: Validate Release
      run: |
        # Ensure staging tests passed
        # Verify image security scans
        # Check deployment readiness
    
    - name: Deploy to Production
      uses: ./.github/actions/deploy-k8s
      with:
        environment: production
        image-tag: ${{ github.event.release.tag_name }}
        kubeconfig: ${{ secrets.PRODUCTION_KUBECONFIG }}
    
    - name: Post-Deploy Verification
      run: |
        # Health checks
        # Smoke tests
        # Performance validation
    
    - name: Notify Stakeholders
      uses: 8398a7/action-slack@v3
      with:
        status: success
        text: "✅ Production deployment successful: ${{ github.event.release.tag_name }}"
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## 🏗️ Build Process

### Backend Build (Go)
```makefile
# Backend Makefile
.PHONY: build test lint security-scan

build:
	CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bin/server cmd/server/main.go

test:
	go test -v -race -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

lint:
	golangci-lint run ./...

security-scan:
	gosec ./...
	nancy sleuth

docker-build:
	docker build -t minio-storage-backend:$(VERSION) .

docker-scan:
	docker scout cves minio-storage-backend:$(VERSION)
	trivy image minio-storage-backend:$(VERSION)
```

### Frontend Build (Next.js)
```json
{
  "scripts": {
    "build": "next build",
    "test": "jest --coverage",
    "test:e2e": "playwright test",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "security-audit": "npm audit",
    "build-analyze": "ANALYZE=true npm run build"
  }
}
```

### Multi-Stage Docker Builds
```dockerfile
# Backend Dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server cmd/server/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/server .
EXPOSE 8080
CMD ["./server"]

# Frontend Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

## 🧪 Testing Automation

### Test Pyramid Implementation
```yaml
# Test execution in CI
test-unit:
  runs-on: ubuntu-latest
  steps:
  - name: Backend Unit Tests (70%)
    run: |
      cd backend
      go test -short ./...
  
  - name: Frontend Unit Tests (70%)
    run: |
      cd frontend
      npm test -- --coverage --watchAll=false

test-integration:
  runs-on: ubuntu-latest
  services:
    minio:
      image: minio/minio:latest
      env:
        MINIO_ROOT_USER: minioadmin
        MINIO_ROOT_PASSWORD: minioadmin
  steps:
  - name: Integration Tests (20%)
    run: |
      make test-integration

test-e2e:
  runs-on: ubuntu-latest
  steps:
  - name: E2E Tests (10%)
    run: |
      cd frontend
      npx playwright test
```

### Quality Gates
```yaml
quality-gates:
  runs-on: ubuntu-latest
  steps:
  - name: Code Coverage Check
    run: |
      # Ensure minimum 80% coverage
      go tool cover -func=coverage.out | grep total | awk '{print $3}' | sed 's/%//' | awk '$1 < 80 {exit 1}'
  
  - name: Security Vulnerability Check
    run: |
      # Fail on high/critical vulnerabilities
      npm audit --audit-level high
      gosec -severity high ./...
  
  - name: Performance Budget Check
    run: |
      # Check bundle size and performance metrics
      npx bundlesize
      lighthouse-ci --assert
```

## 🚀 Deployment Strategies

### 1. Blue-Green Deployment
```yaml
# K8s Blue-Green deployment
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: backend
spec:
  strategy:
    blueGreen:
      activeService: backend-active
      previewService: backend-preview
      autoPromotionEnabled: false
      scaleDownDelaySeconds: 30
      prePromotionAnalysis:
        templates:
        - templateName: success-rate
        args:
        - name: service-name
          value: backend-preview
```

### 2. Canary Deployment
```yaml
# Canary deployment with Istio
apiVersion: argoproj.io/v1alpha1
kind: Rollout
spec:
  strategy:
    canary:
      canaryService: backend-canary
      stableService: backend-stable
      trafficRouting:
        istio:
          virtualService:
            name: backend-vsvc
      steps:
      - setWeight: 10
      - pause: {duration: 1m}
      - setWeight: 20
      - pause: {duration: 1m}
      - setWeight: 50
      - pause: {duration: 1m}
```

### 3. GitOps with ArgoCD
```yaml
# ArgoCD Application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: minio-storage
spec:
  source:
    repoURL: https://github.com/your-org/minio-fullstack-storage
    path: k8s/manifests
    targetRevision: HEAD
  destination:
    server: https://kubernetes.default.svc
    namespace: minio-storage
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
```

## 🔒 Security and Quality Gates

### 1. Static Code Analysis
```yaml
security-scan:
  runs-on: ubuntu-latest
  steps:
  - name: Go Security Scan
    uses: securecodewarrior/github-action-gosec@master
    with:
      args: '-fmt sarif -out gosec.sarif ./...'
  
  - name: Upload SARIF file
    uses: github/codeql-action/upload-sarif@v2
    with:
      sarif_file: gosec.sarif

  - name: JavaScript Security Scan
    run: |
      cd frontend
      npm audit --audit-level moderate
      npx eslint-plugin-security
```

### 2. Container Security
```yaml
container-security:
  runs-on: ubuntu-latest
  steps:
  - name: Trivy Security Scan
    uses: aquasecurity/trivy-action@master
    with:
      image-ref: 'ghcr.io/${{ github.repository }}/backend:${{ github.sha }}'
      format: 'sarif'
      output: 'trivy-results.sarif'
  
  - name: Docker Scout
    uses: docker/scout-action@v1
    with:
      command: cves
      image: ghcr.io/${{ github.repository }}/backend:${{ github.sha }}
```

### 3. Infrastructure as Code Security
```yaml
iac-security:
  runs-on: ubuntu-latest
  steps:
  - name: Terraform Security Scan
    uses: aquasecurity/tfsec-action@v1.0.0
  
  - name: Kubernetes Manifest Security
    uses: azure/k8s-lint@v1
    with:
      manifests: |
        k8s/*.yaml
```

## 📊 Monitoring and Notifications

### 1. Deployment Health Checks
```yaml
health-check:
  runs-on: ubuntu-latest
  steps:
  - name: Wait for Deployment
    run: |
      kubectl rollout status deployment/backend -n minio-storage --timeout=300s
  
  - name: Health Check
    run: |
      # Wait for health endpoint
      timeout 60 bash -c 'until curl -f http://backend.staging/health; do sleep 2; done'
  
  - name: Smoke Tests
    run: |
      # Basic functionality tests
      curl -f http://backend.staging/api/health
      curl -f http://frontend.staging
```

### 2. Notification Strategy
```yaml
notifications:
  runs-on: ubuntu-latest
  if: always()
  steps:
  - name: Slack Notification
    uses: 8398a7/action-slack@v3
    with:
      status: ${{ job.status }}
      text: |
        Pipeline Status: ${{ job.status }}
        Branch: ${{ github.ref }}
        Commit: ${{ github.sha }}
        Author: ${{ github.actor }}
    env:
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}

  - name: Email Notification (on failure)
    if: failure()
    uses: dawidd6/action-send-mail@v3
    with:
      server_address: smtp.gmail.com
      server_port: 465
      username: ${{ secrets.EMAIL_USERNAME }}
      password: ${{ secrets.EMAIL_PASSWORD }}
      subject: "🚨 Pipeline Failure: ${{ github.repository }}"
      body: |
        Pipeline failed for commit ${{ github.sha }}
        View details: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
```

## 🎯 Best Practices

### 1. Pipeline Design
- **Keep pipelines fast** (< 10 minutes for CI)
- **Fail fast** with immediate feedback
- **Parallel execution** where possible
- **Cache dependencies** (Go modules, npm packages)
- **Use matrix builds** for multiple environments

### 2. Security
- **Scan early and often** (SAST, DAST, dependency checks)
- **Use least-privilege** service accounts
- **Rotate secrets regularly** and store securely
- **Sign container images** with Cosign
- **Implement admission controllers** for K8s

### 3. Testing Strategy
- **Comprehensive test coverage** (80%+ unit, integration, E2E)
- **Test in production-like** environments
- **Database migration testing** with realistic data
- **Performance regression testing**
- **Security testing** integration

### 4. Deployment
- **Zero-downtime deployments** with health checks
- **Rollback strategies** for quick recovery
- **Feature flags** for gradual rollouts
- **Environment parity** across all stages
- **Infrastructure as Code** for reproducibility

### 5. Monitoring
- **Real-time alerts** for failures
- **Deployment tracking** with metrics
- **Cost monitoring** for cloud resources
- **Performance baselines** and regression detection
- **SLA monitoring** and reporting

## 🔧 Pipeline Configuration Examples

### Environment Variables
```bash
# GitHub Actions secrets
DOCKER_REGISTRY_TOKEN=ghp_xxxxxxxxxxxx
STAGING_KUBECONFIG=<base64-encoded-kubeconfig>
PRODUCTION_KUBECONFIG=<base64-encoded-kubeconfig>
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
CODECOV_TOKEN=xxxxxxxxxx

# Repository variables
DOCKER_REGISTRY=ghcr.io
IMAGE_NAME=${{ github.repository }}
HELM_CHART_VERSION=1.0.0
```

### Branch Protection Rules
```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "ci/backend-tests",
      "ci/frontend-tests",
      "ci/integration-tests",
      "ci/security-scan"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 2,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "restrictions": null
}
```

For troubleshooting CI/CD issues, see [Troubleshooting Guide](./troubleshooting.md).
