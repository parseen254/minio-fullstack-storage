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

	// Remove passwords from response
	for _, user := range users {
		user.Password = ""
	}

	pagination.Total = total

	c.JSON(http.StatusOK, models.ListResponse{
		Data:       users,
		Pagination: pagination,
	})
}

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

	// Remove password from response
	user.Password = ""

	c.JSON(http.StatusOK, models.SuccessResponse{
		Message: "User retrieved successfully",
		Data:    user,
	})
}

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

	// Remove password from response
	user.Password = ""

	c.JSON(http.StatusOK, models.SuccessResponse{
		Message: "User updated successfully",
		Data:    user,
	})
}

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
