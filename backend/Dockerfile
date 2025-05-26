# Development Dockerfile for Go Backend
FROM golang:1.24-alpine

WORKDIR /app

# Install development tools and dependencies
RUN apk add --no-cache \
    git \
    ca-certificates \
    curl \
    gcc \
    musl-dev \
    && go install github.com/air-verse/air@latest \
    && go install github.com/swaggo/swag/cmd/swag@latest

# Copy go mod files for dependency caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p /app/logs

# Expose port
EXPOSE 8080

# Use air for hot reload in development
CMD ["air", "-c", ".air.toml"]
