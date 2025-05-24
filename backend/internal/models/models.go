package models

import (
	"time"
)

// User represents a user in the system
type User struct {
	ID        string    `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Password  string    `json:"password,omitempty"`
	FirstName string    `json:"firstName"`
	LastName  string    `json:"lastName"`
	Role      string    `json:"role"`
	Avatar    string    `json:"avatar,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	ETag      string    `json:"etag,omitempty"`
}

// Post represents a user post
type Post struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	Summary   string    `json:"summary"`
	Tags      []string  `json:"tags"`
	Status    string    `json:"status"` // draft, published, archived
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	ETag      string    `json:"etag,omitempty"`
}

// File represents an uploaded file
type File struct {
	ID           string            `json:"id"`
	UserID       string            `json:"userId"`
	FileName     string            `json:"fileName"`
	OriginalName string            `json:"originalName"`
	ContentType  string            `json:"contentType"`
	Size         int64             `json:"size"`
	Path         string            `json:"path"`
	Metadata     map[string]string `json:"metadata,omitempty"`
	CreatedAt    time.Time         `json:"createdAt"`
	UpdatedAt    time.Time         `json:"updatedAt"`
	ETag         string            `json:"etag,omitempty"`
}

// Pagination for listing operations
type Pagination struct {
	Page     int   `json:"page"`
	PageSize int   `json:"pageSize"`
	Offset   int   `json:"offset"`
	Total    int64 `json:"total"`
}

// LoginRequest for authentication
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// RegisterRequest for user registration
type RegisterRequest struct {
	Username  string `json:"username" binding:"required"`
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=6"`
	FirstName string `json:"firstName" binding:"required"`
	LastName  string `json:"lastName" binding:"required"`
}

// AuthResponse for login/register responses
type AuthResponse struct {
	User  *User  `json:"user"`
	Token string `json:"token"`
}

// ErrorResponse for API errors
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
	Code    int    `json:"code,omitempty"`
}

// SuccessResponse for API success responses
type SuccessResponse struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// ListResponse for paginated list responses
type ListResponse struct {
	Data       interface{} `json:"data"`
	Pagination Pagination  `json:"pagination"`
}
