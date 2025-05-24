package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/minio-fullstack-storage/backend/internal/config"
	"github.com/minio-fullstack-storage/backend/internal/models"
	"github.com/minio-fullstack-storage/backend/internal/services"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestRouter(t *testing.T) *gin.Engine {
	gin.SetMode(gin.TestMode)

	// Use test configuration
	cfg := &config.Config{
		MinIO: config.MinIOConfig{
			Endpoint:        "localhost:9000",
			AccessKeyID:     "minioadmin",
			SecretAccessKey: "minioadmin123",
			UseSSL:          false,
			Region:          "us-east-1",
		},
		Database: config.DatabaseConfig{
			UsersBucket: "test-users",
			PostsBucket: "test-posts",
			FilesBucket: "test-files",
		},
		JWT: config.JWTConfig{
			Secret: "test-secret",
		},
	}

	storageService, err := services.NewStorageService(cfg)
	require.NoError(t, err)
	router := gin.New()
	SetupRoutes(router, cfg, storageService)

	return router
}

func TestHealthEndpoint(t *testing.T) {
	router := setupTestRouter(t)

	req, _ := http.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "healthy", response["status"])
}

func TestUserRegistration(t *testing.T) {
	router := setupTestRouter(t)

	// Use unique email to avoid conflicts
	timestamp := time.Now().UnixNano()
	user := models.RegisterRequest{
		Username:  fmt.Sprintf("testuser%d", timestamp),
		Email:     fmt.Sprintf("test%d@example.com", timestamp),
		Password:  "password123",
		FirstName: "Test",
		LastName:  "User",
	}

	jsonData, _ := json.Marshal(user)
	req, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var response models.AuthResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.NotEmpty(t, response.Token)
	assert.Equal(t, user.Email, response.User.Email)
}

func TestUserLogin(t *testing.T) {
	router := setupTestRouter(t)

	// First register a user with unique data
	timestamp := time.Now().UnixNano()
	email := fmt.Sprintf("login%d@example.com", timestamp)
	registerUser := models.RegisterRequest{
		Username:  fmt.Sprintf("logintest%d", timestamp),
		Email:     email,
		Password:  "password123",
		FirstName: "Login",
		LastName:  "Test",
	}

	jsonData, _ := json.Marshal(registerUser)
	req, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusCreated, w.Code)

	// Now try to login
	loginUser := models.LoginRequest{
		Email:    email,
		Password: "password123",
	}

	jsonData, _ = json.Marshal(loginUser)
	req, _ = http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.AuthResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.NotEmpty(t, response.Token)
}

func TestInvalidLogin(t *testing.T) {
	router := setupTestRouter(t)

	loginUser := models.LoginRequest{
		Email:    "nonexistent@example.com",
		Password: "wrongpassword",
	}

	jsonData, _ := json.Marshal(loginUser)
	req, _ := http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
