package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/minio-fullstack-storage/backend/internal/auth"
	"github.com/minio-fullstack-storage/backend/internal/models"
	"github.com/minio-fullstack-storage/backend/internal/services"
)

type AuthHandler struct {
	storageService *services.StorageService
	jwtManager     *auth.JWTManager
}

func NewAuthHandler(storageService *services.StorageService, jwtManager *auth.JWTManager) *AuthHandler {
	return &AuthHandler{
		storageService: storageService,
		jwtManager:     jwtManager,
	}
}

// Register godoc
// @Summary Register a new user
// @Description Register a new user account
// @Tags authentication
// @Accept json
// @Produce json
// @Param request body models.RegisterRequest true "User registration data"
// @Success 201 {object} models.AuthResponse "User registered successfully"
// @Failure 400 {object} models.ErrorResponse "Invalid request format"
// @Failure 409 {object} models.ErrorResponse "User already exists"
// @Failure 500 {object} models.ErrorResponse "Internal server error"
// @Router /auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request format",
			Message: err.Error(),
		})
		return
	}

	// Check if user already exists (by email)
	if _, err := h.storageService.GetUserByEmail(c.Request.Context(), req.Email); err == nil {
		c.JSON(http.StatusConflict, models.ErrorResponse{
			Error: "User with this email already exists",
		})
		return
	}

	// Check if username already exists
	if _, err := h.storageService.GetUserByUsername(c.Request.Context(), req.Username); err == nil {
		c.JSON(http.StatusConflict, models.ErrorResponse{
			Error: "Username already taken",
		})
		return
	}

	// Hash password
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to process password",
		})
		return
	}

	// Create user
	user := &models.User{
		Username:  req.Username,
		Email:     req.Email,
		Password:  hashedPassword,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Role:      "user", // Default role
	}

	if err := h.storageService.CreateUser(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to create user",
		})
		return
	}

	// Generate token
	token, err := h.jwtManager.GenerateToken(user.ID, user.Username, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to generate token",
		})
		return
	}

	c.JSON(http.StatusCreated, models.AuthResponse{
		User:  user.ToUserResponse(),
		Token: token,
	})
}

// Login godoc
// @Summary Login user
// @Description Authenticate user and return JWT token
// @Tags authentication
// @Accept json
// @Produce json
// @Param request body models.LoginRequest true "User login credentials"
// @Success 200 {object} models.AuthResponse "Login successful"
// @Failure 400 {object} models.ErrorResponse "Invalid request format"
// @Failure 401 {object} models.ErrorResponse "Invalid credentials"
// @Failure 500 {object} models.ErrorResponse "Internal server error"
// @Router /auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "Invalid request format",
		})
		return
	}

	// Get user by username
	user, err := h.storageService.GetUserByUsername(c.Request.Context(), req.Username)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error: "Invalid credentials",
		})
		return
	}

	// Check password
	if err := auth.CheckPassword(req.Password, user.Password); err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error: "Invalid credentials",
		})
		return
	}

	// Generate token
	token, err := h.jwtManager.GenerateToken(user.ID, user.Username, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to generate token",
		})
		return
	}

	c.JSON(http.StatusOK, models.AuthResponse{
		User:  user.ToUserResponse(),
		Token: token,
	})
}

// GetProfile godoc
// @Summary Get user profile
// @Description Get current user's profile information
// @Tags authentication
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} models.SuccessResponse{data=models.User} "Profile retrieved successfully"
// @Failure 401 {object} models.ErrorResponse "Unauthorized"
// @Failure 404 {object} models.ErrorResponse "User not found"
// @Router /profile [get]
func (h *AuthHandler) GetProfile(c *gin.Context) {
	userID := c.GetString("userID")

	user, err := h.storageService.GetUser(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error: "User not found",
		})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Message: "Profile retrieved successfully",
		Data:    user.ToUserResponse(),
	})
}

func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userID := c.GetString("userID")

	var updates models.User
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Bad Request",
			Message: err.Error(),
			Code:    http.StatusBadRequest,
		})
		return
	}

	// Get existing user
	user, err := h.storageService.GetUser(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "Not Found",
			Message: "User not found",
			Code:    http.StatusNotFound,
		})
		return
	}

	// Update allowed fields
	if updates.FirstName != "" {
		user.FirstName = updates.FirstName
	}
	if updates.LastName != "" {
		user.LastName = updates.LastName
	}
	if updates.Avatar != "" {
		user.Avatar = updates.Avatar
	}

	if err := h.storageService.UpdateUser(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to update user",
			Code:    http.StatusInternalServerError,
		})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Message: "Profile updated successfully",
		Data:    user.ToUserResponse(),
	})
}
