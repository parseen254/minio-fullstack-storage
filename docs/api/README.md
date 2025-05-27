# API Reference

Complete REST API documentation for the MinIO Fullstack Storage System.

## Base URL

- **Development**: `http://localhost:8080/api/v1`
- **Production**: `https://your-domain.com/api/v1`

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

## Status Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request |
| 401  | Unauthorized |
| 403  | Forbidden |
| 404  | Not Found |
| 409  | Conflict |
| 422  | Unprocessable Entity |
| 500  | Internal Server Error |

## Authentication Endpoints

### Register User
```http
POST /auth/register
```

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "role": "user",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "token": "jwt_token_string",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "role": "user|admin"
  }
}
```

### Get Profile
```http
GET /profile
```
*Requires Authentication*

**Response:**
```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "role": "user|admin",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

## User Management

### List Users (Admin Only)
```http
GET /users?page=1&pageSize=10&search=query
```
*Requires Admin Role*

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 10)
- `search` (optional): Search query

**Response:**
```json
{
  "users": [
    {
      "id": "string",
      "username": "string",
      "email": "string",
      "role": "user|admin",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### Get User by ID
```http
GET /users/{id}
```
*Requires Authentication*

**Response:**
```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "role": "user|admin",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Update User
```http
PUT /users/{id}
```
*Requires Authentication (Own profile) or Admin Role*

**Request Body:**
```json
{
  "username": "string",
  "email": "string"
}
```

### Delete User (Admin Only)
```http
DELETE /users/{id}
```
*Requires Admin Role*

## File Management

### Upload File
```http
POST /files/upload
```
*Requires Authentication*

**Request:** Multipart form data
- `file`: File to upload
- `description` (optional): File description

**Response:**
```json
{
  "id": "string",
  "filename": "string",
  "originalName": "string",
  "size": 1024,
  "contentType": "image/png",
  "uploadedBy": "user_id",
  "uploadedAt": "2024-01-01T00:00:00Z",
  "description": "string"
}
```

### Get File Metadata
```http
GET /files/{id}
```
*Requires Authentication*

**Response:**
```json
{
  "id": "string",
  "filename": "string",
  "originalName": "string",
  "size": 1024,
  "contentType": "image/png",
  "uploadedBy": "user_id",
  "uploadedAt": "2024-01-01T00:00:00Z",
  "description": "string"
}
```

### Download File
```http
GET /files/{id}/download
```
*Requires Authentication*

**Response:** File content with appropriate headers

### Delete File
```http
DELETE /files/{id}
```
*Requires Authentication (Own file) or Admin Role*

### List User Files
```http
GET /files/user/{userId}?page=1&pageSize=10
```
*Requires Authentication*

**Query Parameters:**
- `page` (optional): Page number
- `pageSize` (optional): Items per page

**Response:**
```json
{
  "files": [
    {
      "id": "string",
      "filename": "string",
      "originalName": "string",
      "size": 1024,
      "contentType": "image/png",
      "uploadedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

## Post Management

### Create Post
```http
POST /posts
```
*Requires Authentication*

**Request Body:**
```json
{
  "title": "string",
  "content": "string",
  "tags": ["tag1", "tag2"],
  "status": "draft|published"
}
```

**Response:**
```json
{
  "id": "string",
  "title": "string",
  "content": "string",
  "tags": ["tag1", "tag2"],
  "status": "draft|published",
  "authorId": "string",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### List Posts
```http
GET /posts?page=1&pageSize=10&status=published&tag=tag1
```

**Query Parameters:**
- `page` (optional): Page number
- `pageSize` (optional): Items per page
- `status` (optional): Filter by status
- `tag` (optional): Filter by tag

**Response:**
```json
{
  "posts": [
    {
      "id": "string",
      "title": "string",
      "content": "string",
      "tags": ["tag1", "tag2"],
      "status": "published",
      "authorId": "string",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### Get Post by ID
```http
GET /posts/{id}
```

**Response:**
```json
{
  "id": "string",
  "title": "string",
  "content": "string",
  "tags": ["tag1", "tag2"],
  "status": "published",
  "authorId": "string",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### Update Post
```http
PUT /posts/{id}
```
*Requires Authentication (Own post) or Admin Role*

**Request Body:**
```json
{
  "title": "string",
  "content": "string",
  "tags": ["tag1", "tag2"],
  "status": "draft|published"
}
```

### Delete Post
```http
DELETE /posts/{id}
```
*Requires Authentication (Own post) or Admin Role*

### Get User Posts
```http
GET /posts/user/{userId}?page=1&pageSize=10
```
*Requires Authentication*

## Admin Endpoints

### Get System Statistics
```http
GET /admin/stats
```
*Requires Admin Role*

**Response:**
```json
{
  "users": {
    "total": 100,
    "active": 85,
    "newThisMonth": 10
  },
  "posts": {
    "total": 250,
    "published": 200,
    "drafts": 50
  },
  "files": {
    "total": 500,
    "totalSize": 1073741824
  },
  "storage": {
    "used": "1.2 GB",
    "available": "8.8 GB",
    "percentage": 12
  }
}
```

### Promote User to Admin
```http
POST /admin/users/{id}/promote
```
*Requires Admin Role*

### Demote Admin to User
```http
POST /admin/users/{id}/demote
```
*Requires Admin Role*

### Ban User
```http
POST /admin/users/{id}/ban
```
*Requires Admin Role*

**Request Body:**
```json
{
  "reason": "string"
}
```

### Unban User
```http
POST /admin/users/{id}/unban
```
*Requires Admin Role*

## Health Check

### Health Status
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "services": {
    "minio": "healthy",
    "redis": "healthy",
    "nats": "healthy"
  }
}
```

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details (optional)"
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST` | Request validation failed |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `CONFLICT` | Resource already exists |
| `INTERNAL_ERROR` | Server error |

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Anonymous requests**: 100 requests per hour
- **Authenticated requests**: 1000 requests per hour
- **File uploads**: 10 uploads per minute

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination with the following parameters:

- `page`: Page number (1-based, default: 1)
- `pageSize`: Items per page (default: 10, max: 100)

Pagination response format:
```json
{
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## WebSocket Endpoints (Future)

Real-time features will be available via WebSocket:

```
ws://localhost:8080/ws
wss://your-domain.com/ws
```

Events:
- `file_upload_progress`
- `notification`
- `system_alert`

---

## OpenAPI/Swagger

Complete OpenAPI specification is available at:
- Development: `http://localhost:8080/swagger/`
- API Spec: `http://localhost:8080/swagger/doc.json`
