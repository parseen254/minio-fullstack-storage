# Architecture Overview

## System Architecture

The MinIO Fullstack Storage System implements a modern microservices architecture designed for scalability, performance, and maintainability.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 14 Application (TypeScript)                            │
│  • Admin Dashboard (/dashboard/admin)                           │
│  • User Dashboard (/dashboard/user)                             │
│  • Authentication Pages                                         │
│  • Role-based Routing                                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP/HTTPS
                                │ REST API Calls
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND API LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  Go (Gin Framework) REST API Server                             │
│  • Authentication & Authorization (JWT)                         │
│  • File Management Endpoints                                    │
│  • User Management (CRUD + Admin)                               │
│  • Post Management (Content System)                             │
│  • Role-based Access Control                                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ MinIO SDK / Redis / NATS
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   MinIO     │  │    Redis    │  │    NATS     │              │
│  │  (Storage)  │  │  (Cache)    │  │ (Messages)  │              │
│  │             │  │             │  │             │              │
│  │ • Users     │  │ • Sessions  │  │ • Events    │              │
│  │ • Posts     │  │ • Cache     │  │ • Jobs      │              │
│  │ • Files     │  │ • Tokens    │  │ • Notify    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### Frontend Layer (Next.js 14)

**Technology Stack:**
- Next.js 14 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- React Query (TanStack Query) for data management
- Radix UI components (shadcn/ui)

**Key Features:**
- **Role-based Dashboards**: Separate interfaces for admin and regular users
- **Responsive Design**: Mobile-first responsive interface
- **Real-time Updates**: Background data fetching and caching
- **Type Safety**: Complete TypeScript integration
- **Component Library**: Reusable UI components

**Directory Structure:**
```
frontend/src/
├── app/                    # Next.js App Router
│   ├── dashboard/
│   │   ├── admin/         # Admin-only pages
│   │   └── user/          # User pages
│   └── auth/              # Authentication pages
├── components/
│   ├── admin/             # Admin-specific components
│   ├── user/              # User-specific components
│   ├── files/             # File management
│   └── ui/                # Reusable UI library
├── hooks/                 # Custom React hooks
├── services/              # API service layer
├── types/                 # TypeScript definitions
└── lib/                   # Utility functions
```

### Backend API Layer (Go/Gin)

**Technology Stack:**
- Go 1.23+ with Gin HTTP framework
- JWT authentication with bcrypt password hashing
- MinIO SDK for object storage operations
- Redis for caching and session management
- NATS for asynchronous messaging

**API Architecture:**
```
backend/internal/
├── api/                   # HTTP handlers and routes
│   ├── handlers/         # Request handlers
│   ├── middleware/       # Authentication, CORS, etc.
│   └── routes.go         # Route definitions
├── auth/                 # Authentication logic
├── config/               # Configuration management
├── models/               # Data models and validation
└── services/             # Business logic services
    ├── storage.go        # MinIO operations
    ├── auth.go           # Authentication service
    └── cache.go          # Redis caching
```

**API Endpoints:**
- **Authentication**: `/api/v1/auth/*` - Login, register, profile
- **Users**: `/api/v1/users/*` - User CRUD and admin operations
- **Files**: `/api/v1/files/*` - Upload, download, delete files
- **Posts**: `/api/v1/posts/*` - Content management system
- **Admin**: `/api/v1/admin/*` - Administrative functions

### Infrastructure Layer

#### MinIO Object Storage
- **Purpose**: Primary data persistence layer
- **Buckets**: 
  - `users` - User profile data and metadata
  - `posts` - Blog posts and content
  - `files` - User-uploaded files and assets
- **Features**: 
  - Distributed storage
  - Data integrity with ETags
  - Bucket policies and access control
  - Versioning support

#### Redis Cache
- **Purpose**: Caching and session management
- **Usage**:
  - JWT token blacklisting
  - Session storage
  - API response caching
  - Rate limiting data

#### NATS Messaging
- **Purpose**: Asynchronous message processing
- **Usage**:
  - File processing events
  - Email notifications
  - Background job processing
  - System events

## Data Flow

### User Authentication Flow
```
1. User → Frontend (Login Form)
2. Frontend → Backend API (/auth/login)
3. Backend → MinIO (Verify user credentials)
4. Backend → Redis (Store session)
5. Backend → Frontend (JWT token)
6. Frontend → Store token (Local state)
```

### File Upload Flow
```
1. User → Frontend (File Upload)
2. Frontend → Backend API (/files/upload)
3. Backend → MinIO (Store file)
4. Backend → MinIO (Store metadata)
5. Backend → NATS (File processing event)
6. Backend → Frontend (File metadata)
```

### Role-based Access Control
```
1. Request → Backend API (Any protected endpoint)
2. Middleware → Extract JWT token
3. Middleware → Validate token signature
4. Middleware → Check user role
5. Middleware → Allow/Deny based on role
```

## Security Architecture

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication with configurable expiration
- **Password Security**: bcrypt hashing with salt
- **Role-based Access Control**: Admin and User roles with different permissions
- **Token Blacklisting**: Redis-based token revocation

### Data Security
- **Environment Variables**: Secure configuration management
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Configurable cross-origin policies
- **Rate Limiting**: API rate limiting and abuse prevention

### Network Security
- **HTTPS Ready**: TLS/SSL configuration for production
- **Container Security**: Non-root containers and security scanning
- **Network Policies**: Kubernetes network isolation

## Scalability Design

### Horizontal Scaling
- **Stateless Services**: All services designed to be stateless
- **Load Balancing**: Support for multiple backend instances
- **Database Scaling**: MinIO distributed storage
- **Cache Scaling**: Redis clustering support

### Performance Optimizations
- **Connection Pooling**: Efficient database connections
- **Caching Strategy**: Multi-layer caching with Redis
- **CDN Ready**: Static asset optimization
- **Resource Limits**: Container resource management

## Deployment Architecture

### Development Environment
```
Docker Compose:
├── Frontend (localhost:3000)
├── Backend (localhost:8080)
├── MinIO (localhost:9000/9001)
├── Redis (localhost:6379)
└── NATS (localhost:4222)
```

### Production Environment
```
Kubernetes Cluster:
├── Frontend Pods (Load Balanced)
├── Backend Pods (Auto-scaling)
├── MinIO Distributed Setup
├── Redis Cluster
├── NATS Cluster
├── Ingress Controller
└── Monitoring Stack
```

## Technology Decisions

### Why MinIO?
- **Scalability**: Distributed object storage
- **Compatibility**: S3-compatible API
- **Performance**: High-performance storage
- **Cost**: Open-source with commercial support

### Why Go for Backend?
- **Performance**: Compiled language with excellent concurrency
- **Ecosystem**: Rich ecosystem for web APIs
- **Deployment**: Single binary deployment
- **MinIO SDK**: Native MinIO SDK support

### Why Next.js for Frontend?
- **Performance**: Server-side rendering and optimization
- **Developer Experience**: Hot reload and TypeScript support
- **Ecosystem**: Rich React ecosystem
- **Deployment**: Easy deployment and scaling

---

This architecture provides a solid foundation for a production-ready storage system with clear separation of concerns, scalability, and maintainability.
