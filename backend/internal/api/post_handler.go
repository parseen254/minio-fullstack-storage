package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/minio-fullstack-storage/backend/internal/models"
	"github.com/minio-fullstack-storage/backend/internal/services"
)

type PostHandler struct {
	storageService *services.StorageService
}

func NewPostHandler(storageService *services.StorageService) *PostHandler {
	return &PostHandler{
		storageService: storageService,
	}
}

func (h *PostHandler) CreatePost(c *gin.Context) {
	userID := c.GetString("userID")

	var post models.Post
	if err := c.ShouldBindJSON(&post); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Bad Request",
			Message: err.Error(),
			Code:    http.StatusBadRequest,
		})
		return
	}

	post.UserID = userID
	if post.Status == "" {
		post.Status = "draft"
	}

	if err := h.storageService.CreatePost(c.Request.Context(), &post); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to create post",
			Code:    http.StatusInternalServerError,
		})
		return
	}

	c.JSON(http.StatusCreated, models.SuccessResponse{
		Message: "Post created successfully",
		Data:    post,
	})
}

func (h *PostHandler) GetPost(c *gin.Context) {
	postID := c.Param("id")

	post, err := h.storageService.GetPost(c.Request.Context(), postID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "Not Found",
			Message: "Post not found",
			Code:    http.StatusNotFound,
		})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Message: "Post retrieved successfully",
		Data:    post,
	})
}

func (h *PostHandler) UpdatePost(c *gin.Context) {
	postID := c.Param("id")
	userID := c.GetString("userID")
	userRole := c.GetString("role")

	// Get existing post
	post, err := h.storageService.GetPost(c.Request.Context(), postID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "Not Found",
			Message: "Post not found",
			Code:    http.StatusNotFound,
		})
		return
	}

	// Check if user can update this post
	if post.UserID != userID && userRole != "admin" {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error:   "Forbidden",
			Message: "Cannot update other user's post",
			Code:    http.StatusForbidden,
		})
		return
	}

	var updates models.Post
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Bad Request",
			Message: err.Error(),
			Code:    http.StatusBadRequest,
		})
		return
	}

	// Update allowed fields
	if updates.Title != "" {
		post.Title = updates.Title
	}
	if updates.Content != "" {
		post.Content = updates.Content
	}
	if updates.Summary != "" {
		post.Summary = updates.Summary
	}
	if len(updates.Tags) > 0 {
		post.Tags = updates.Tags
	}
	if updates.Status != "" {
		post.Status = updates.Status
	}

	if err := h.storageService.UpdatePost(c.Request.Context(), post); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to update post",
			Code:    http.StatusInternalServerError,
		})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Message: "Post updated successfully",
		Data:    post,
	})
}

func (h *PostHandler) DeletePost(c *gin.Context) {
	postID := c.Param("id")
	userID := c.GetString("userID")
	userRole := c.GetString("role")

	// Get existing post
	post, err := h.storageService.GetPost(c.Request.Context(), postID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "Not Found",
			Message: "Post not found",
			Code:    http.StatusNotFound,
		})
		return
	}

	// Check if user can delete this post
	if post.UserID != userID && userRole != "admin" {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error:   "Forbidden",
			Message: "Cannot delete other user's post",
			Code:    http.StatusForbidden,
		})
		return
	}

	if err := h.storageService.DeletePost(c.Request.Context(), postID); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to delete post",
			Code:    http.StatusInternalServerError,
		})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Message: "Post deleted successfully",
		Data:    nil,
	})
}

func (h *PostHandler) ListPosts(c *gin.Context) {
	pagination := c.MustGet("pagination").(models.Pagination)

	posts, total, err := h.storageService.ListPosts(c.Request.Context(), pagination)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to list posts",
			Code:    http.StatusInternalServerError,
		})
		return
	}

	pagination.Total = total

	c.JSON(http.StatusOK, models.ListResponse{
		Data:       posts,
		Pagination: pagination,
	})
}

func (h *PostHandler) GetUserPosts(c *gin.Context) {
	pagination := c.MustGet("pagination").(models.Pagination)

	posts, total, err := h.storageService.ListPosts(c.Request.Context(), pagination)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to list user posts",
			Code:    http.StatusInternalServerError,
		})
		return
	}

	pagination.Total = total

	c.JSON(http.StatusOK, models.ListResponse{
		Data:       posts,
		Pagination: pagination,
	})
}
