package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLoad(t *testing.T) {
	// Set test environment variables
	os.Setenv("PORT", "8080")
	os.Setenv("MINIO_ENDPOINT", "localhost:9000")
	os.Setenv("MINIO_ACCESS_KEY", "minioadmin")
	os.Setenv("MINIO_SECRET_KEY", "minioadmin123")
	os.Setenv("JWT_SECRET", "test-secret")
	defer func() {
		os.Unsetenv("PORT")
		os.Unsetenv("MINIO_ENDPOINT")
		os.Unsetenv("MINIO_ACCESS_KEY")
		os.Unsetenv("MINIO_SECRET_KEY")
		os.Unsetenv("JWT_SECRET")
	}()

	cfg, err := Load()
	assert.NoError(t, err)
	assert.NotNil(t, cfg)
	assert.Equal(t, "8080", cfg.Port)
	assert.Equal(t, "localhost:9000", cfg.MinIO.Endpoint)
	assert.Equal(t, "minioadmin", cfg.MinIO.AccessKeyID)
	assert.Equal(t, "minioadmin123", cfg.MinIO.SecretAccessKey)
	assert.Equal(t, "test-secret", cfg.JWT.Secret)
}

func TestLoadWithDefaults(t *testing.T) {
	// Clear all environment variables
	os.Unsetenv("PORT")
	os.Unsetenv("MINIO_ENDPOINT")
	os.Unsetenv("MINIO_ACCESS_KEY")
	os.Unsetenv("MINIO_SECRET_KEY")
	os.Unsetenv("JWT_SECRET")

	cfg, err := Load()
	assert.NoError(t, err)
	assert.NotNil(t, cfg)
	assert.Equal(t, "8080", cfg.Port) // Default port
}

func TestLoadMissingJWTSecret(t *testing.T) {
	// Set required environment variables but miss JWT secret
	os.Setenv("PORT", "8080")
	os.Setenv("MINIO_ENDPOINT", "localhost:9000")
	os.Setenv("MINIO_ACCESS_KEY", "minioadmin")
	os.Setenv("MINIO_SECRET_KEY", "minioadmin123")
	os.Unsetenv("JWT_SECRET")
	defer func() {
		os.Unsetenv("PORT")
		os.Unsetenv("MINIO_ENDPOINT")
		os.Unsetenv("MINIO_ACCESS_KEY")
		os.Unsetenv("MINIO_SECRET_KEY")
	}()

	cfg, err := Load()
	assert.NoError(t, err) // Config loading doesn't fail, it uses defaults
	assert.NotNil(t, cfg)
	assert.Equal(t, "your-super-secret-jwt-key", cfg.JWT.Secret) // Default value
}
