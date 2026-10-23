# minio-fullstack-storage

A full-stack app that keeps all of its data in MinIO, with no database. Users, posts, and uploaded files each live in their own bucket as objects. I built it to see how far object storage gets you before you miss SQL.

## What's in it

- `backend/`: Go API on Gin. JWT auth with bcrypt-hashed passwords, role-based route protection, CRUD for users and posts, and file upload and download through `minio-go`. Swagger UI is served at `/swagger/index.html`.
- `frontend/`: Next.js 14 console (App Router, TypeScript, Tailwind, shadcn/ui, TanStack Query) for managing users, posts, and files.
- `docker/`: Compose files for dev (hot reload on both sides) and prod (multi-stage builds, non-root containers, health checks, resource limits).
- `k8s/base/`: Kubernetes manifests for the storage layer and the two apps.
- `monitoring/`: a Prometheus and Grafana compose file.

The compose files also start Redis and NATS. The backend doesn't use either yet.

Buckets are created on startup. Each object keeps its content type and ETag, which is what the API uses for file metadata.

## Quick start

You need Docker and Docker Compose. For running outside Docker you also need Go 1.23+ and Node.js 18+.

### Development

```bash
git clone https://github.com/parseen254/minio-fullstack-storage
cd minio-fullstack-storage
./scripts/dev.sh start
```

Or by hand: `cd docker && docker-compose -f docker-compose.dev.yml up -d`.

- Frontend: http://localhost:3000
- Backend: http://localhost:8080
- MinIO console: http://localhost:9001 (minioadmin / minioadmin123)

### Production

```bash
cp docker/.env.prod.template docker/.env.prod   # then fill in real values
./scripts/prod.sh deploy
```

Or by hand: `cd docker && docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d`.

### Scripts

`scripts/dev.sh`:
```bash
./scripts/dev.sh start     # Start development environment
./scripts/dev.sh stop      # Stop development environment
./scripts/dev.sh restart   # Restart development environment
./scripts/dev.sh logs      # Show logs (follow mode)
./scripts/dev.sh build     # Rebuild all services
./scripts/dev.sh clean     # Clean up containers and volumes
./scripts/dev.sh status    # Show status of all services
./scripts/dev.sh shell     # Open shell in backend container
./scripts/dev.sh test      # Run backend tests
```

`scripts/prod.sh`:
```bash
./scripts/prod.sh start     # Start production environment
./scripts/prod.sh stop      # Stop production environment
./scripts/prod.sh deploy    # Build and deploy
./scripts/prod.sh backup    # Backup all volumes
./scripts/prod.sh restore   # Restore from backup
./scripts/prod.sh health    # Check service health
./scripts/prod.sh scale     # Scale services
```

### Without Docker for the apps

```bash
cd docker && docker-compose up -d minio      # storage only
cd ../backend && go run ./cmd/server
cd ../frontend && npm install && npm run dev
```

### Environment variables

Each app reads a `.env` file in its own directory:

Backend (`.env`):
```env
PORT=8080
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY_ID=minioadmin
MINIO_SECRET_ACCESS_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_REGION=us-east-1
REDIS_ADDR=localhost:6379
NATS_URL=nats://localhost:4222
JWT_SECRET=your-super-secret-jwt-key-here
USERS_BUCKET=users
POSTS_BUCKET=posts
FILES_BUCKET=files
```

Frontend (`.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## API

### Auth

- `POST /api/v1/auth/register`: User registration
- `POST /api/v1/auth/login`: User login
- `GET /api/v1/profile`: Get user profile (authenticated)

### Users

- `GET /api/v1/users/`: List users (admin)
- `GET /api/v1/users/:id`: Get user by ID
- `PUT /api/v1/users/:id`: Update user
- `DELETE /api/v1/users/:id`: Delete user

### Posts

- `POST /api/v1/posts/`: Create post
- `GET /api/v1/posts/`: List posts
- `GET /api/v1/posts/:id`: Get post by ID
- `PUT /api/v1/posts/:id`: Update post
- `DELETE /api/v1/posts/:id`: Delete post
- `GET /api/v1/posts/user/:userId`: Get user posts

### Files

- `POST /api/v1/files/upload`: Upload file
- `GET /api/v1/files/:id`: Get file metadata
- `GET /api/v1/files/:id/download`: Download file
- `DELETE /api/v1/files/:id`: Delete file

## Layout

```
minio-fullstack-storage/
├── backend/
│   ├── cmd/server/          # Application entry point
│   ├── internal/
│   │   ├── api/             # HTTP handlers and routes
│   │   ├── auth/            # Authentication logic
│   │   ├── config/          # Configuration management
│   │   ├── models/          # Data models
│   │   └── services/        # Business logic services
│   ├── pkg/                 # Public packages
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js app router
│   │   ├── components/      # React components
│   │   ├── lib/             # Utility functions
│   │   ├── services/        # API client services
│   │   └── types/           # TypeScript type definitions
│   └── Dockerfile
├── docker/
│   └── docker-compose.yml   # Development services
├── k8s/
│   └── base/                # Kubernetes manifests
└── scripts/                 # Utility scripts
```

## Kubernetes

```bash
kubectl apply -f k8s/base/infrastructure.yaml
kubectl apply -f k8s/base/applications.yaml
kubectl get pods -n minio-storage
```

## Tests

```bash
cd backend && go test ./...
cd frontend && npm test
./scripts/integration-test.sh
```

## Not done yet

Multi-tenancy, caching through the Redis that's already in compose, and WebSocket updates.

## License

MIT. See LICENSE.
