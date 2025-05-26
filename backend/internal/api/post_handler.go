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

// CreatePost godoc
// @Summary Create a new post
// @Description Create a new post for the authenticated user
// @Tags posts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body models.Post true "Post data"
// @Success 201 {object} models.SuccessResponse{data=models.Post} "Post created successfully"
// @Failure 400 {object} models.ErrorResponse "Invalid request format"
// @Failure 401 {object} models.ErrorResponse "Unauthorized"
// @Failure 500 {object} models.ErrorResponse "Internal server error"
// @Router /posts [post]
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

// GetPost godoc
// @Summary Get a post by ID
// @Description Get a specific post by its ID
// @Tags posts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Post ID"
// @Success 200 {object} models.SuccessResponse{data=models.Post} "Post retrieved successfully"
// @Failure 401 {object} models.ErrorResponse "Unauthorized"
// @Failure 404 {object} models.ErrorResponse "Post not found"
// @Router /posts/{id} [get]
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

// UpdatePost godoc
// @Summary Update a post
// @Description Update a post (users can only update their own posts, admins can update any post)
// @Tags posts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Post ID"
// @Param request body models.Post true "Post update data"
// @Success 200 {object} models.SuccessResponse{data=models.Post} "Post updated successfully"
// @Failure 400 {object} models.ErrorResponse "Invalid request format"
// @Failure 401 {object} models.ErrorResponse "Unauthorized"
// @Failure 403 {object} models.ErrorResponse "Forbidden"
// @Failure 404 {object} models.ErrorResponse "Post not found"
// @Failure 500 {object} models.ErrorResponse "Internal server error"
// @Router /posts/{id} [put]
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

// DeletePost godoc
// @Summary Delete a post
// @Description Delete a post (users can only delete their own posts, admins can delete any post)
// @Tags posts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Post ID"
// @Success 200 {object} models.SuccessResponse "Post deleted successfully"
// @Failure 401 {object} models.ErrorResponse "Unauthorized"
// @Failure 403 {object} models.ErrorResponse "Forbidden"
// @Failure 404 {object} models.ErrorResponse "Post not found"
// @Failure 500 {object} models.ErrorResponse "Internal server error"
// @Router /posts/{id} [delete]
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

// ListPosts godoc
// @Summary List all posts
// @Description Get a paginated list of all posts
// @Tags posts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page number" default(1)
// @Param pageSize query int false "Number of items per page" default(10)
// @Success 200 {object} models.ListResponse{data=[]models.Post} "Posts retrieved successfully"
// @Failure 401 {object} models.ErrorResponse "Unauthorized"
// @Failure 500 {object} models.ErrorResponse "Internal server error"
// @Router /posts [get]
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

// GetUserPosts godoc
// @Summary Get posts by user ID
// @Description Get a paginated list of posts by a specific user
// @Tags posts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param userId path string true "User ID"
// @Param page query int false "Page number" default(1)
// @Param pageSize query int false "Number of items per page" default(10)
// @Success 200 {object} models.ListResponse{data=[]models.Post} "User posts retrieved successfully"
// @Failure 401 {object} models.ErrorResponse "Unauthorized"
// @Failure 500 {object} models.ErrorResponse "Internal server error"
// @Router /posts/user/{userId} [get]
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
