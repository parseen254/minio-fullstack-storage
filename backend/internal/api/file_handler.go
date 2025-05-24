package api

import (
	"io"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/minio-fullstack-storage/backend/internal/models"
	"github.com/minio-fullstack-storage/backend/internal/services"
)

type FileHandler struct {
	storageService *services.StorageService
}

func NewFileHandler(storageService *services.StorageService) *FileHandler {
	return &FileHandler{
		storageService: storageService,
	}
}

func (h *FileHandler) UploadFile(c *gin.Context) {
	userID := c.GetString("userID")

	// Parse multipart form
	if err := c.Request.ParseMultipartForm(32 << 20); err != nil { // 32MB
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Bad Request",
			Message: "Failed to parse multipart form",
			Code:    http.StatusBadRequest,
		})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Bad Request",
			Message: "File is required",
			Code:    http.StatusBadRequest,
		})
		return
	}
	defer file.Close()

	// Create file metadata
	fileModel := &models.File{
		UserID:       userID,
		OriginalName: header.Filename,
		ContentType:  header.Header.Get("Content-Type"),
		Size:         header.Size,
		Metadata:     make(map[string]string),
	}

	// Add custom metadata from form
	for key, values := range c.Request.Form {
		if key != "file" && len(values) > 0 {
			fileModel.Metadata[key] = values[0]
		}
	}

	if err := h.storageService.UploadFile(c.Request.Context(), fileModel, file); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to upload file",
			Code:    http.StatusInternalServerError,
		})
		return
	}

	c.JSON(http.StatusCreated, models.SuccessResponse{
		Message: "File uploaded successfully",
		Data:    fileModel,
	})
}

func (h *FileHandler) GetFile(c *gin.Context) {
	fileID := c.Param("id")

	file, err := h.storageService.GetFile(c.Request.Context(), fileID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "Not Found",
			Message: "File not found",
			Code:    http.StatusNotFound,
		})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Message: "File retrieved successfully",
		Data:    file,
	})
}

func (h *FileHandler) DownloadFile(c *gin.Context) {
	fileID := c.Param("id")
	userID := c.GetString("userID")
	userRole := c.GetString("role")

	// Get file metadata
	file, err := h.storageService.GetFile(c.Request.Context(), fileID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "Not Found",
			Message: "File not found",
			Code:    http.StatusNotFound,
		})
		return
	}

	// Check if user can download this file
	if file.UserID != userID && userRole != "admin" {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error:   "Forbidden",
			Message: "Cannot download other user's file",
			Code:    http.StatusForbidden,
		})
		return
	}

	// Get file content
	content, err := h.storageService.GetFileContent(c.Request.Context(), fileID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to get file content",
			Code:    http.StatusInternalServerError,
		})
		return
	}
	defer content.Close()

	// Set headers for download
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", "attachment; filename="+file.OriginalName)
	c.Header("Content-Type", file.ContentType)
	c.Header("Content-Length", strconv.FormatInt(file.Size, 10))

	// Stream file content
	if _, err := io.Copy(c.Writer, content); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to stream file",
			Code:    http.StatusInternalServerError,
		})
		return
	}
}

func (h *FileHandler) DeleteFile(c *gin.Context) {
	fileID := c.Param("id")
	userID := c.GetString("userID")
	userRole := c.GetString("role")

	// Get existing file
	file, err := h.storageService.GetFile(c.Request.Context(), fileID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "Not Found",
			Message: "File not found",
			Code:    http.StatusNotFound,
		})
		return
	}

	// Check if user can delete this file
	if file.UserID != userID && userRole != "admin" {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error:   "Forbidden",
			Message: "Cannot delete other user's file",
			Code:    http.StatusForbidden,
		})
		return
	}

	if err := h.storageService.DeleteFile(c.Request.Context(), fileID); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to delete file",
			Code:    http.StatusInternalServerError,
		})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Message: "File deleted successfully",
		Data:    nil,
	})
}

func (h *FileHandler) ListFiles(c *gin.Context) {
	pagination := c.MustGet("pagination").(models.Pagination)

	files, total, err := h.storageService.ListFiles(c.Request.Context(), pagination)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to list files",
			Code:    http.StatusInternalServerError,
		})
		return
	}

	pagination.Total = total

	c.JSON(http.StatusOK, models.ListResponse{
		Data:       files,
		Pagination: pagination,
	})
}

func (h *FileHandler) GetUserFiles(c *gin.Context) {
	pagination := c.MustGet("pagination").(models.Pagination)

	files, total, err := h.storageService.ListFiles(c.Request.Context(), pagination)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to list user files",
			Code:    http.StatusInternalServerError,
		})
		return
	}

	pagination.Total = total

	c.JSON(http.StatusOK, models.ListResponse{
		Data:       files,
		Pagination: pagination,
	})
}
