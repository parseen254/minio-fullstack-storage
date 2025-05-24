package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port     string
	MinIO    MinIOConfig
	Redis    RedisConfig
	NATS     NATSConfig
	JWT      JWTConfig
	Database DatabaseConfig
}

type MinIOConfig struct {
	Endpoint        string
	AccessKeyID     string
	SecretAccessKey string
	UseSSL          bool
	Region          string
}

type RedisConfig struct {
	URL      string
	Password string
	DB       int
}

type NATSConfig struct {
	URL string
}

type JWTConfig struct {
	Secret     string
	Expiration int // hours
}

type DatabaseConfig struct {
	UsersBucket string
	PostsBucket string
	FilesBucket string
}

func Load() (*Config, error) {
	return &Config{
		Port: getEnv("PORT", "8080"),
		MinIO: MinIOConfig{
			Endpoint:        getEnv("MINIO_ENDPOINT", "localhost:9000"),
			AccessKeyID:     getEnv("MINIO_ACCESS_KEY", "minioadmin"),
			SecretAccessKey: getEnv("MINIO_SECRET_KEY", "minioadmin123"),
			UseSSL:          getEnvBool("MINIO_USE_SSL", false),
			Region:          getEnv("MINIO_REGION", "us-east-1"),
		},
		Redis: RedisConfig{
			URL:      getEnv("REDIS_URL", "localhost:6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getEnvInt("REDIS_DB", 0),
		},
		NATS: NATSConfig{
			URL: getEnv("NATS_URL", "localhost:4222"),
		},
		JWT: JWTConfig{
			Secret:     getEnv("JWT_SECRET", "your-super-secret-jwt-key"),
			Expiration: getEnvInt("JWT_EXPIRATION", 24),
		},
		Database: DatabaseConfig{
			UsersBucket: getEnv("USERS_BUCKET", "users"),
			PostsBucket: getEnv("POSTS_BUCKET", "posts"),
			FilesBucket: getEnv("FILES_BUCKET", "files"),
		},
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}
