# Testing Strategy

## Overview

This document outlines the comprehensive testing strategy for the MinIO Fullstack Storage System. Our testing approach ensures reliability, performance, and maintainability across all components.

## Testing Philosophy

- **Test Early, Test Often**: Implement tests as part of the development process
- **Test Pyramid**: More unit tests, fewer integration tests, minimal E2E tests
- **Automation First**: All tests should be automated and run in CI/CD
- **Quality Gates**: No code ships without passing tests

## Testing Levels

### 1. Unit Tests (70% of test coverage)

**Backend Unit Tests (Go)**

```bash
# Run all unit tests
go test ./...

# Run tests with coverage
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out

# Run specific package tests
go test ./internal/services/...
```

**Test Structure:**
```go
// Example: user_service_test.go
func TestUserService_CreateUser(t *testing.T) {
    tests := []struct {
        name           string
        user          *models.User
        expectedError error
        setupMocks    func(*mocks.MockStorage)
    }{
        {
            name: "successful user creation",
            user: &models.User{
                Username: "testuser",
                Email:    "test@example.com",
                Password: "hashedpassword",
            },
            expectedError: nil,
            setupMocks: func(m *mocks.MockStorage) {
                m.EXPECT().CreateUser(gomock.Any(), gomock.Any()).Return(nil)
            },
        },
        {
            name: "duplicate username error",
            user: &models.User{
                Username: "existinguser",
                Email:    "test@example.com",
            },
            expectedError: errors.New("username already exists"),
            setupMocks: func(m *mocks.MockStorage) {
                m.EXPECT().CreateUser(gomock.Any(), gomock.Any()).
                    Return(errors.New("username already exists"))
            },
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            ctrl := gomock.NewController(t)
            defer ctrl.Finish()

            mockStorage := mocks.NewMockStorage(ctrl)
            tt.setupMocks(mockStorage)

            service := services.NewUserService(mockStorage)
            err := service.CreateUser(context.Background(), tt.user)

            if tt.expectedError != nil {
                assert.Error(t, err)
                assert.Contains(t, err.Error(), tt.expectedError.Error())
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```

**Frontend Unit Tests (Jest + React Testing Library)**

```bash
# Run all unit tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- UserCard.test.tsx
```

**Test Structure:**
```tsx
// Example: UserCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { UserCard } from '../UserCard'
import { User } from '@/types/api'

const mockUser: User = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'user',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  etag: 'test-etag'
}

describe('UserCard', () => {
  it('renders user information correctly', () => {
    render(<UserCard user={mockUser} onEdit={jest.fn()} />)
    
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('testuser')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('calls onEdit when edit button is clicked', () => {
    const mockOnEdit = jest.fn()
    render(<UserCard user={mockUser} onEdit={mockOnEdit} />)
    
    fireEvent.click(screen.getByRole('button', { name: /edit/i }))
    expect(mockOnEdit).toHaveBeenCalledWith(mockUser)
  })

  it('displays role badge correctly', () => {
    render(<UserCard user={mockUser} onEdit={jest.fn()} />)
    
    expect(screen.getByText('user')).toHaveClass('role-badge')
  })
})
```

### 2. Integration Tests (20% of test coverage)

**Backend Integration Tests**

```go
// Example: api_integration_test.go
func TestAuthFlow_Integration(t *testing.T) {
    // Setup test environment
    testServer := setupTestServer(t)
    defer testServer.Close()

    // Test user registration
    registerPayload := map[string]string{
        "username":  "integrationtest",
        "email":     "integration@test.com",
        "password":  "testpassword123",
        "firstName": "Integration",
        "lastName":  "Test",
    }

    resp := makeRequest(t, testServer, "POST", "/api/v1/auth/register", registerPayload)
    assert.Equal(t, http.StatusCreated, resp.StatusCode)

    var authResponse models.AuthResponse
    json.Unmarshal(resp.Body, &authResponse)
    assert.NotEmpty(t, authResponse.Token)
    assert.Equal(t, "integrationtest", authResponse.User.Username)

    // Test login with registered user
    loginPayload := map[string]string{
        "username": "integrationtest",
        "password": "testpassword123",
    }

    loginResp := makeRequest(t, testServer, "POST", "/api/v1/auth/login", loginPayload)
    assert.Equal(t, http.StatusOK, loginResp.StatusCode)

    // Test protected endpoint with token
    profileResp := makeAuthenticatedRequest(t, testServer, "GET", "/api/v1/profile", nil, authResponse.Token)
    assert.Equal(t, http.StatusOK, profileResp.StatusCode)
}
```

**Frontend Integration Tests**

```tsx
// Example: FileUpload.integration.test.tsx
import { renderWithProviders } from '@/test-utils'
import { FileUpload } from '@/components/FileUpload'
import { server } from '@/mocks/server'
import { rest } from 'msw'

describe('FileUpload Integration', () => {
  it('uploads file successfully', async () => {
    // Mock successful upload
    server.use(
      rest.post('/api/v1/files/upload', (req, res, ctx) => {
        return res(
          ctx.status(201),
          ctx.json({
            message: 'File uploaded successfully',
            data: {
              id: 'file-123',
              fileName: 'test.pdf',
              originalName: 'test.pdf',
              contentType: 'application/pdf',
              size: 1024
            }
          })
        )
      })
    )

    const { user } = renderWithProviders(<FileUpload />)

    // Create a test file
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

    // Simulate file selection
    const fileInput = screen.getByLabelText(/choose file/i)
    await user.upload(fileInput, file)

    // Click upload button
    const uploadButton = screen.getByRole('button', { name: /upload/i })
    await user.click(uploadButton)

    // Verify success message
    await waitFor(() => {
      expect(screen.getByText(/file uploaded successfully/i)).toBeInTheDocument()
    })
  })
})
```

### 3. End-to-End Tests (10% of test coverage)

**Playwright E2E Tests**

```typescript
// Example: auth.e2e.test.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('user can register, login, and access dashboard', async ({ page }) => {
    // Go to registration page
    await page.goto('/auth/register')

    // Fill registration form
    await page.fill('[data-testid="username"]', 'e2etest')
    await page.fill('[data-testid="email"]', 'e2e@test.com')
    await page.fill('[data-testid="password"]', 'testpassword123')
    await page.fill('[data-testid="firstName"]', 'E2E')
    await page.fill('[data-testid="lastName"]', 'Test')

    // Submit registration
    await page.click('[data-testid="register-button"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome, E2E')

    // Logout
    await page.click('[data-testid="logout-button"]')
    await expect(page).toHaveURL('/auth/login')

    // Login again
    await page.fill('[data-testid="username"]', 'e2etest')
    await page.fill('[data-testid="password"]', 'testpassword123')
    await page.click('[data-testid="login-button"]')

    // Should be back on dashboard
    await expect(page).toHaveURL('/dashboard')
  })

  test('admin can access admin panel', async ({ page }) => {
    // Login as admin
    await page.goto('/auth/login')
    await page.fill('[data-testid="username"]', 'admin')
    await page.fill('[data-testid="password"]', 'adminpassword')
    await page.click('[data-testid="login-button"]')

    // Navigate to admin panel
    await page.click('[data-testid="admin-nav"]')
    await expect(page).toHaveURL('/dashboard/admin')

    // Verify admin features are visible
    await expect(page.locator('[data-testid="user-management"]')).toBeVisible()
    await expect(page.locator('[data-testid="system-stats"]')).toBeVisible()
  })
})

// File upload E2E test
test('user can upload and download files', async ({ page }) => {
  // Login first
  await loginAsUser(page, 'testuser', 'password')

  // Navigate to files page
  await page.click('[data-testid="files-nav"]')

  // Upload a file
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.click('[data-testid="upload-button"]')
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles('./test-files/sample.pdf')

  // Wait for upload to complete
  await expect(page.locator('[data-testid="upload-success"]')).toBeVisible()

  // Verify file appears in list
  await expect(page.locator('[data-testid="file-item"]')).toContainText('sample.pdf')

  // Download the file
  const downloadPromise = page.waitForEvent('download')
  await page.click('[data-testid="download-button"]')
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('sample.pdf')
})
```

## Test Data Management

### Backend Test Data

```go
// test_data.go
var TestUsers = map[string]*models.User{
    "admin": {
        ID:        "admin-id",
        Username:  "admin",
        Email:     "admin@test.com",
        Role:      "admin",
        FirstName: "Admin",
        LastName:  "User",
    },
    "user": {
        ID:        "user-id",
        Username:  "testuser",
        Email:     "user@test.com",
        Role:      "user",
        FirstName: "Test",
        LastName:  "User",
    },
}

var TestPosts = map[string]*models.Post{
    "published": {
        ID:      "post-1",
        UserID:  "user-id",
        Title:   "Test Post",
        Content: "This is a test post",
        Status:  "published",
    },
    "draft": {
        ID:      "post-2",
        UserID:  "user-id",
        Title:   "Draft Post",
        Content: "This is a draft",
        Status:  "draft",
    },
}
```

### Frontend Test Data

```typescript
// test-data.ts
export const mockUsers: User[] = [
  {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    etag: 'test-etag'
  },
  {
    id: '2',
    username: 'admin',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    etag: 'admin-etag'
  }
]

export const mockPosts: Post[] = [
  {
    id: '1',
    title: 'Test Post',
    content: 'This is a test post content',
    summary: 'Test summary',
    status: 'published',
    tags: ['test', 'example'],
    userId: '1',
    etag: 'post-etag',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  }
]
```

## Test Environment Setup

### Database Setup for Tests

```go
// test_helpers.go
func SetupTestStorage(t *testing.T) *services.StorageService {
    cfg := &config.Config{
        MinIO: config.MinIOConfig{
            Endpoint:        "localhost:9000",
            AccessKeyID:     "minioadmin",
            SecretAccessKey: "minioadmin123",
            UseSSL:          false,
            Region:          "us-east-1",
        },
        Database: config.DatabaseConfig{
            UsersBucket: fmt.Sprintf("test-users-%d", time.Now().UnixNano()),
            PostsBucket: fmt.Sprintf("test-posts-%d", time.Now().UnixNano()),
            FilesBucket: fmt.Sprintf("test-files-%d", time.Now().UnixNano()),
        },
    }

    storage, err := services.NewStorageService(cfg)
    require.NoError(t, err)

    // Cleanup function
    t.Cleanup(func() {
        storage.Cleanup()
    })

    return storage
}
```

### Frontend Test Environment

```typescript
// test-utils.tsx
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'

export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...options })
}
```

## Mocking Strategy

### Backend Mocks

```go
// Generate mocks with gomock
//go:generate mockgen -source=internal/services/storage.go -destination=mocks/mock_storage.go

// Usage in tests
func TestUserHandler_CreateUser(t *testing.T) {
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()

    mockStorage := mocks.NewMockStorageService(ctrl)
    mockStorage.EXPECT().
        CreateUser(gomock.Any(), gomock.Any()).
        Return(nil)

    handler := api.NewUserHandler(mockStorage)
    // Test implementation...
}
```

### Frontend Mocks (MSW)

```typescript
// mocks/handlers.ts
import { rest } from 'msw'

export const handlers = [
  rest.post('/api/v1/auth/login', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        user: mockUsers[0],
        token: 'mock-jwt-token'
      })
    )
  }),

  rest.get('/api/v1/users', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: mockUsers,
        pagination: {
          page: 1,
          pageSize: 10,
          total: mockUsers.length,
          offset: 0
        }
      })
    )
  }),

  rest.post('/api/v1/files/upload', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        message: 'File uploaded successfully',
        data: {
          id: 'file-123',
          fileName: 'test.pdf',
          originalName: 'test.pdf',
          contentType: 'application/pdf',
          size: 1024
        }
      })
    )
  })
]

// mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

## Continuous Integration

### GitHub Actions Test Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      minio:
        image: minio/minio
        ports:
          - 9000:9000
        env:
          MINIO_ACCESS_KEY: minioadmin
          MINIO_SECRET_KEY: minioadmin123
        options: --health-cmd "curl -f http://localhost:9000/minio/health/live" --health-interval=30s --health-timeout=10s --health-retries=3

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Go
        uses: actions/setup-go@v3
        with:
          go-version: 1.21

      - name: Run tests
        run: |
          cd backend
          go test ./... -v -coverprofile=coverage.out
          go tool cover -html=coverage.out -o coverage.html

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./backend/coverage.out

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Run tests
        run: |
          cd frontend
          npm test -- --coverage --watchAll=false

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./frontend/coverage/lcov.info

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install Playwright
        run: |
          cd frontend
          npm ci
          npx playwright install

      - name: Start services
        run: docker-compose up -d
        
      - name: Wait for services
        run: |
          timeout 60 bash -c 'until curl -f http://localhost:3000; do sleep 2; done'
          timeout 60 bash -c 'until curl -f http://localhost:8080/health; do sleep 2; done'

      - name: Run E2E tests
        run: |
          cd frontend
          npm run test:e2e

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

## Performance Testing

### Backend Load Testing (with k6)

```javascript
// load-test.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
}

export default function () {
  // Test authentication endpoint
  let loginResponse = http.post('http://localhost:8080/api/v1/auth/login', {
    username: 'testuser',
    password: 'testpassword',
  })

  check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 500ms': (r) => r.timings.duration < 500,
  })

  let token = JSON.parse(loginResponse.body).token

  // Test file upload
  let uploadResponse = http.post(
    'http://localhost:8080/api/v1/files/upload',
    { file: http.file('test-file.txt', 'test content') },
    { headers: { Authorization: `Bearer ${token}` } }
  )

  check(uploadResponse, {
    'upload status is 201': (r) => r.status === 201,
    'upload response time < 2s': (r) => r.timings.duration < 2000,
  })

  sleep(1)
}
```

## Test Metrics and Reporting

### Coverage Targets
- **Backend**: 85% line coverage
- **Frontend**: 80% line coverage
- **E2E**: Critical user flows covered

### Quality Gates
- All tests must pass
- No decrease in test coverage
- Performance tests within acceptable limits
- Security tests pass

### Test Reports
- Coverage reports uploaded to Codecov
- Test results in CI/CD dashboard
- Performance metrics tracked over time
- Security scan results reviewed

## Best Practices

### General
1. **Write tests first** (TDD approach when possible)
2. **Keep tests isolated** and independent
3. **Use descriptive test names** that explain what is being tested
4. **Test behavior, not implementation**
5. **Maintain test data** separate from production data

### Backend Testing
1. **Mock external dependencies** (MinIO, external APIs)
2. **Use table-driven tests** for multiple scenarios
3. **Test error conditions** as well as happy paths
4. **Use proper test fixtures** and cleanup
5. **Test concurrent scenarios** where applicable

### Frontend Testing
1. **Test user interactions** rather than implementation details
2. **Use semantic queries** (getByRole, getByText)
3. **Mock API calls** consistently
4. **Test accessibility** (screen readers, keyboard navigation)
5. **Test responsive behavior** on different screen sizes

### E2E Testing
1. **Focus on critical user journeys**
2. **Use page object model** for maintainability
3. **Test cross-browser compatibility**
4. **Keep tests stable** and retry flaky tests
5. **Test with realistic data** volumes

## Troubleshooting Test Issues

### Common Backend Issues
```bash
# MinIO connection issues
docker ps | grep minio  # Check if MinIO is running
curl http://localhost:9000/minio/health/live  # Check health

# Go module issues
go mod tidy
go mod download

# Test timeout issues
go test ./... -timeout=30s
```

### Common Frontend Issues
```bash
# Node modules issues
rm -rf node_modules package-lock.json
npm install

# Jest configuration issues
npm test -- --verbose

# React Testing Library issues
npm test -- --no-cache
```

### Common E2E Issues
```bash
# Playwright browser issues
npx playwright install

# Service startup issues
docker-compose logs frontend
docker-compose logs backend

# Network issues
netstat -tulpn | grep :3000
netstat -tulpn | grep :8080
```

This comprehensive testing strategy ensures the MinIO Fullstack Storage System maintains high quality, reliability, and performance across all components and user interactions.
