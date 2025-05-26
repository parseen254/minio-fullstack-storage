package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/minio-fullstack-storage/backend/internal/models"
	"github.com/minio-fullstack-storage/backend/internal/services"
)

type UserHandler struct {
	storageService *services.StorageService
}

func NewUserHandler(storageService *services.StorageService) *UserHandler {
	return &UserHandler{
		storageService: storageService,
	}
}

// ListUsers godoc
// @Summary List users
// @Description Get a list of users with pagination
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page number" default(1)
// @Param pageSize query int false "Page size" default(10)
// @Success 200 {object} models.ListResponse{data=[]models.UserResponse} "Users retrieved successfully"
// @Failure 401 {object} models.ErrorResponse "Unauthorized"
// @Failure 500 {object} models.ErrorResponse "Internal server error"
// @Router /users [get]
func (h *UserHandler) ListUsers(c *gin.Context) {
	pagination := c.MustGet("pagination").(models.Pagination)

	users, total, err := h.storageService.ListUsers(c.Request.Context(), pagination)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to list users",
			Code:    http.StatusInternalServerError,
		})
		return
	}

	// Convert to UserResponse to exclude sensitive data
	userResponses := make([]*models.UserResponse, len(users))
	for i, user := range users {
		userResponses[i] = user.ToUserResponse()
	}

	pagination.Total = total

	c.JSON(http.StatusOK, models.ListResponse{
		Data:       userResponses,
		Pagination: pagination,
	})
}

// GetUser godoc
// @Summary Get user by ID
// @Description Get a specific user by their ID
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "User ID"
// @Success 200 {object} models.SuccessResponse{data=models.UserResponse} "User retrieved successfully"
// @Failure 401 {object} models.ErrorResponse "Unauthorized"
// @Failure 404 {object} models.ErrorResponse "User not found"
// @Router /users/{id} [get]
func (h *UserHandler) GetUser(c *gin.Context) {
	userID := c.Param("id")

	user, err := h.storageService.GetUser(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "Not Found",
			Message: "User not found",
			Code:    http.StatusNotFound,
		})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Message: "User retrieved successfully",
		Data:    user.ToUserResponse(),
	})
}

// UpdateUser godoc
// @Summary Update user
// @Description Update user information (users can only update their own profile, admins can update any user)
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "User ID"
// @Param request body models.User true "User update data"
// @Success 200 {object} models.SuccessResponse{data=models.User} "User updated successfully"
// @Failure 400 {object} models.ErrorResponse "Invalid request format"
// @Failure 401 {object} models.ErrorResponse "Unauthorized"
// @Failure 403 {object} models.ErrorResponse "Forbidden"
// @Failure 404 {object} models.ErrorResponse "User not found"
// @Failure 500 {object} models.ErrorResponse "Internal server error"
// @Router /users/{id} [put]
func (h *UserHandler) UpdateUser(c *gin.Context) {
	userID := c.Param("id")
	currentUserID := c.GetString("userID")
	currentUserRole := c.GetString("role")

	// Check if user can update this profile
	if userID != currentUserID && currentUserRole != "admin" {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error:   "Forbidden",
			Message: "Cannot update other user's profile",
			Code:    http.StatusForbidden,
		})
		return
	}

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

	// Only admin can update role
	if currentUserRole == "admin" && updates.Role != "" {
		user.Role = updates.Role
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
		Message: "User updated successfully",
		Data:    user.ToUserResponse(),
	})
}

// DeleteUser godoc
// @Summary Delete user
// @Description Delete a user (admin only)
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "User ID"
// @Success 200 {object} models.SuccessResponse "User deleted successfully"
// @Failure 401 {object} models.ErrorResponse "Unauthorized"
// @Failure 403 {object} models.ErrorResponse "Forbidden"
// @Failure 404 {object} models.ErrorResponse "User not found"
// @Failure 500 {object} models.ErrorResponse "Internal server error"
// @Router /users/{id} [delete]
func (h *UserHandler) DeleteUser(c *gin.Context) {
	userID := c.Param("id")
	currentUserID := c.GetString("userID")
	currentUserRole := c.GetString("role")

	// Check if user can delete this profile
	if userID != currentUserID && currentUserRole != "admin" {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error:   "Forbidden",
			Message: "Cannot delete other user's profile",
			Code:    http.StatusForbidden,
		})
		return
	}

	if err := h.storageService.DeleteUser(c.Request.Context(), userID); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to delete user",
			Code:    http.StatusInternalServerError,
		})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Message: "User deleted successfully",
		Data:    nil,
	})
}
