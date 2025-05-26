package api

import (
	"github.com/gin-gonic/gin"
	"github.com/minio-fullstack-storage/backend/internal/auth"
	"github.com/minio-fullstack-storage/backend/internal/config"
	"github.com/minio-fullstack-storage/backend/internal/services"
)

func SetupRoutes(router *gin.Engine, cfg *config.Config, storageService *services.StorageService) {
	// Services are passed in from main

	jwtManager := auth.NewJWTManager(cfg.JWT.Secret, cfg.JWT.Expiration)

	// Initialize handlers
	authHandler := NewAuthHandler(storageService, jwtManager)
	userHandler := NewUserHandler(storageService)
	postHandler := NewPostHandler(storageService)
	fileHandler := NewFileHandler(storageService)

	// Apply global middleware
	router.Use(CORSMiddleware())
	router.Use(RateLimitMiddleware())

	// Health check
	// @Summary Health check
	// @Description Check if the API is running
	// @Tags health
	// @Accept json
	// @Produce json
	// @Success 200 {object} map[string]string "API is healthy"
	// @Router /health [get]
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "healthy",
			"service": "minio-storage-system",
		})
	})

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Public routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
		}

		// Protected routes
		protected := v1.Group("/")
		protected.Use(AuthMiddleware(jwtManager))
		{
			// Profile routes
			protected.GET("/profile", authHandler.GetProfile)

			// User routes
			users := protected.Group("/users")
			users.Use(PaginationMiddleware())
			{
				users.GET("/", userHandler.ListUsers)
				users.GET("/:id", userHandler.GetUser)
				users.PUT("/:id", userHandler.UpdateUser)
				users.DELETE("/:id", userHandler.DeleteUser)
			}

			// Post routes
			posts := protected.Group("/posts")
			posts.Use(PaginationMiddleware())
			{
				posts.POST("/", postHandler.CreatePost)
				posts.GET("/", postHandler.ListPosts)
				posts.GET("/:id", postHandler.GetPost)
				posts.PUT("/:id", postHandler.UpdatePost)
				posts.DELETE("/:id", postHandler.DeletePost)
				posts.GET("/user/:userId", postHandler.GetUserPosts)
			}

			// File routes
			files := protected.Group("/files")
			{
				files.POST("/upload", fileHandler.UploadFile)
				files.GET("/:id", fileHandler.GetFile)
				files.GET("/:id/download", fileHandler.DownloadFile)
				files.DELETE("/:id", fileHandler.DeleteFile)
			}

			// Admin routes
			admin := protected.Group("/admin")
			admin.Use(AdminMiddleware())
			{
				admin.GET("/users", userHandler.ListUsers)
				admin.DELETE("/users/:id", userHandler.DeleteUser)
			}
		}
	}
}
