package api

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/minio-fullstack-storage/backend/internal/auth"
	"github.com/minio-fullstack-storage/backend/internal/models"
)

func AuthMiddleware(jwtManager *auth.JWTManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Error: "Authorization header required",
			})
			c.Abort()
			return
		}

		bearerToken := strings.Split(authHeader, " ")
		if len(bearerToken) != 2 || bearerToken[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Error: "Invalid authorization header format",
			})
			c.Abort()
			return
		}

		claims, err := jwtManager.ValidateToken(bearerToken[1])
		if err != nil {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Error: "Invalid token",
			})
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)

		c.Next()
	}
}

func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		role := c.GetString("role")
		if role != "admin" {
			c.JSON(http.StatusForbidden, models.ErrorResponse{
				Error: "Admin access required",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func RateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Simple rate limiting implementation
		// In production, use a proper rate limiter like go-redis rate limiter
		c.Next()
	}
}

func PaginationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))

		if page < 1 {
			page = 1
		}
		if pageSize < 1 || pageSize > 100 {
			pageSize = 10
		}

		pagination := models.Pagination{
			Page:     page,
			PageSize: pageSize,
			Offset:   (page - 1) * pageSize,
		}

		c.Set("pagination", pagination)
		c.Next()
	}
}
