package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/minio-fullstack-storage/backend/internal/config"
	"github.com/minio-fullstack-storage/backend/internal/models"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type StorageService struct {
	client      *minio.Client
	usersBucket string
	postsBucket string
	filesBucket string
}

func NewStorageService(cfg *config.Config) (*StorageService, error) {
	client, err := minio.New(cfg.MinIO.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinIO.AccessKeyID, cfg.MinIO.SecretAccessKey, ""),
		Secure: cfg.MinIO.UseSSL,
		Region: cfg.MinIO.Region,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create MinIO client: %w", err)
	}

	service := &StorageService{
		client:      client,
		usersBucket: cfg.Database.UsersBucket,
		postsBucket: cfg.Database.PostsBucket,
		filesBucket: cfg.Database.FilesBucket,
	}

	// Initialize buckets
	if err := service.initializeBuckets(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to initialize buckets: %w", err)
	}

	return service, nil
}

func (s *StorageService) initializeBuckets(ctx context.Context) error {
	buckets := []string{s.usersBucket, s.postsBucket, s.filesBucket}

	for _, bucket := range buckets {
		exists, err := s.client.BucketExists(ctx, bucket)
		if err != nil {
			return fmt.Errorf("error checking bucket %s: %w", bucket, err)
		}

		if !exists {
			err := s.client.MakeBucket(ctx, bucket, minio.MakeBucketOptions{
				Region: "us-east-1",
			})
			if err != nil {
				return fmt.Errorf("error creating bucket %s: %w", bucket, err)
			}
		}
	}

	return nil
}

// User operations
func (s *StorageService) CreateUser(ctx context.Context, user *models.User) error {
	if user.ID == "" {
		user.ID = uuid.New().String()
	}
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	data, err := json.Marshal(user)
	if err != nil {
		return fmt.Errorf("failed to marshal user: %w", err)
	}

	objectName := fmt.Sprintf("users/%s.json", user.ID)
	reader := bytes.NewReader(data)

	info, err := s.client.PutObject(ctx, s.usersBucket, objectName, reader, int64(len(data)), minio.PutObjectOptions{
		ContentType: "application/json",
	})
	if err != nil {
		return fmt.Errorf("failed to store user: %w", err)
	}

	user.ETag = info.ETag
	return nil
}

func (s *StorageService) GetUser(ctx context.Context, userID string) (*models.User, error) {
	objectName := fmt.Sprintf("users/%s.json", userID)

	object, err := s.client.GetObject(ctx, s.usersBucket, objectName, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get user object: %w", err)
	}
	defer object.Close()

	data, err := io.ReadAll(object)
	if err != nil {
		return nil, fmt.Errorf("failed to read user data: %w", err)
	}

	var user models.User
	if err := json.Unmarshal(data, &user); err != nil {
		return nil, fmt.Errorf("failed to unmarshal user: %w", err)
	}

	return &user, nil
}

func (s *StorageService) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	// List all users and find by email (in production, consider using an index)
	objectsCh := s.client.ListObjects(ctx, s.usersBucket, minio.ListObjectsOptions{
		Prefix:    "users/",
		Recursive: true,
	})

	for object := range objectsCh {
		if object.Err != nil {
			continue
		}

		obj, err := s.client.GetObject(ctx, s.usersBucket, object.Key, minio.GetObjectOptions{})
		if err != nil {
			continue
		}

		data, err := io.ReadAll(obj)
		obj.Close()
		if err != nil {
			continue
		}

		var user models.User
		if err := json.Unmarshal(data, &user); err != nil {
			continue
		}

		if user.Email == email {
			return &user, nil
		}
	}

	return nil, fmt.Errorf("user not found")
}

func (s *StorageService) UpdateUser(ctx context.Context, user *models.User) error {
	user.UpdatedAt = time.Now()

	data, err := json.Marshal(user)
	if err != nil {
		return fmt.Errorf("failed to marshal user: %w", err)
	}

	objectName := fmt.Sprintf("users/%s.json", user.ID)
	reader := bytes.NewReader(data)

	info, err := s.client.PutObject(ctx, s.usersBucket, objectName, reader, int64(len(data)), minio.PutObjectOptions{
		ContentType: "application/json",
	})
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	user.ETag = info.ETag
	return nil
}

func (s *StorageService) DeleteUser(ctx context.Context, userID string) error {
	objectName := fmt.Sprintf("users/%s.json", userID)

	err := s.client.RemoveObject(ctx, s.usersBucket, objectName, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	return nil
}

// Post operations
func (s *StorageService) CreatePost(ctx context.Context, post *models.Post) error {
	if post.ID == "" {
		post.ID = uuid.New().String()
	}
	post.CreatedAt = time.Now()
	post.UpdatedAt = time.Now()

	data, err := json.Marshal(post)
	if err != nil {
		return fmt.Errorf("failed to marshal post: %w", err)
	}

	objectName := fmt.Sprintf("posts/%s/%s.json", post.UserID, post.ID)
	reader := bytes.NewReader(data)

	info, err := s.client.PutObject(ctx, s.postsBucket, objectName, reader, int64(len(data)), minio.PutObjectOptions{
		ContentType: "application/json",
	})
	if err != nil {
		return fmt.Errorf("failed to store post: %w", err)
	}

	post.ETag = info.ETag
	return nil
}

func (s *StorageService) GetPost(ctx context.Context, postID string) (*models.Post, error) {
	// Search across all user directories for the post
	objectsCh := s.client.ListObjects(ctx, s.postsBucket, minio.ListObjectsOptions{
		Prefix:    "posts/",
		Recursive: true,
	})

	for object := range objectsCh {
		if object.Err != nil {
			continue
		}

		if strings.Contains(object.Key, postID+".json") {
			obj, err := s.client.GetObject(ctx, s.postsBucket, object.Key, minio.GetObjectOptions{})
			if err != nil {
				continue
			}

			data, err := io.ReadAll(obj)
			obj.Close()
			if err != nil {
				continue
			}

			var post models.Post
			if err := json.Unmarshal(data, &post); err != nil {
				continue
			}

			return &post, nil
		}
	}

	return nil, fmt.Errorf("post not found")
}

// Additional Post operations
func (s *StorageService) UpdatePost(ctx context.Context, post *models.Post) error {
	post.UpdatedAt = time.Now()

	data, err := json.Marshal(post)
	if err != nil {
		return fmt.Errorf("failed to marshal post: %w", err)
	}

	objectName := fmt.Sprintf("posts/%s/%s.json", post.UserID, post.ID)
	reader := bytes.NewReader(data)

	info, err := s.client.PutObject(ctx, s.postsBucket, objectName, reader, int64(len(data)), minio.PutObjectOptions{
		ContentType: "application/json",
	})
	if err != nil {
		return fmt.Errorf("failed to update post: %w", err)
	}

	post.ETag = info.ETag
	return nil
}

func (s *StorageService) DeletePost(ctx context.Context, postID string) error {
	// Find and delete the post
	objectsCh := s.client.ListObjects(ctx, s.postsBucket, minio.ListObjectsOptions{
		Prefix:    "posts/",
		Recursive: true,
	})

	for object := range objectsCh {
		if object.Err != nil {
			continue
		}

		if strings.Contains(object.Key, postID+".json") {
			err := s.client.RemoveObject(ctx, s.postsBucket, object.Key, minio.RemoveObjectOptions{})
			if err != nil {
				return fmt.Errorf("failed to delete post: %w", err)
			}
			return nil
		}
	}

	return fmt.Errorf("post not found")
}

func (s *StorageService) ListPosts(ctx context.Context, pagination models.Pagination) ([]*models.Post, int64, error) {
	var posts []*models.Post
	var total int64

	objectsCh := s.client.ListObjects(ctx, s.postsBucket, minio.ListObjectsOptions{
		Prefix:    "posts/",
		Recursive: true,
	})

	for object := range objectsCh {
		if object.Err != nil {
			continue
		}

		total++

		// Simple pagination (skip and take)
		if total <= int64(pagination.Offset) {
			continue
		}

		if len(posts) >= pagination.PageSize {
			continue
		}

		obj, err := s.client.GetObject(ctx, s.postsBucket, object.Key, minio.GetObjectOptions{})
		if err != nil {
			continue
		}

		data, err := io.ReadAll(obj)
		obj.Close()
		if err != nil {
			continue
		}

		var post models.Post
		if err := json.Unmarshal(data, &post); err != nil {
			continue
		}

		posts = append(posts, &post)
	}

	return posts, total, nil
}

// File operations
func (s *StorageService) StoreFile(ctx context.Context, file *models.File, reader io.Reader) error {
	if file.ID == "" {
		file.ID = uuid.New().String()
	}
	file.CreatedAt = time.Now()
	file.UpdatedAt = time.Now()

	// Store file content
	contentPath := fmt.Sprintf("files/%s/%s/content", file.UserID, file.ID)
	info, err := s.client.PutObject(ctx, s.filesBucket, contentPath, reader, file.Size, minio.PutObjectOptions{
		ContentType: file.ContentType,
	})
	if err != nil {
		return fmt.Errorf("failed to store file content: %w", err)
	}

	file.Path = contentPath
	file.ETag = info.ETag

	// Store file metadata
	metadata, err := json.Marshal(file)
	if err != nil {
		return fmt.Errorf("failed to marshal file metadata: %w", err)
	}

	metadataPath := fmt.Sprintf("files/%s/%s/metadata.json", file.UserID, file.ID)
	metadataReader := bytes.NewReader(metadata)

	_, err = s.client.PutObject(ctx, s.filesBucket, metadataPath, metadataReader, int64(len(metadata)), minio.PutObjectOptions{
		ContentType: "application/json",
	})
	if err != nil {
		return fmt.Errorf("failed to store file metadata: %w", err)
	}

	return nil
}

func (s *StorageService) UploadFile(ctx context.Context, file *models.File, reader io.Reader) error {
	return s.StoreFile(ctx, file, reader)
}

func (s *StorageService) GetFile(ctx context.Context, fileID string) (*models.File, error) {
	// Search for file metadata
	objectsCh := s.client.ListObjects(ctx, s.filesBucket, minio.ListObjectsOptions{
		Prefix:    "files/",
		Recursive: true,
	})

	for object := range objectsCh {
		if object.Err != nil {
			continue
		}

		if strings.Contains(object.Key, fileID+"/metadata.json") {
			obj, err := s.client.GetObject(ctx, s.filesBucket, object.Key, minio.GetObjectOptions{})
			if err != nil {
				continue
			}

			data, err := io.ReadAll(obj)
			obj.Close()
			if err != nil {
				continue
			}

			var file models.File
			if err := json.Unmarshal(data, &file); err != nil {
				continue
			}

			return &file, nil
		}
	}

	return nil, fmt.Errorf("file not found")
}

func (s *StorageService) GetFileContent(ctx context.Context, fileID string) (io.ReadCloser, error) {
	// First get file metadata to find the content path
	file, err := s.GetFile(ctx, fileID)
	if err != nil {
		return nil, err
	}

	// Get file content
	object, err := s.client.GetObject(ctx, s.filesBucket, file.Path, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get file content: %w", err)
	}

	return object, nil
}

func (s *StorageService) DeleteFile(ctx context.Context, fileID string) error {
	// Find and delete both content and metadata
	objectsCh := s.client.ListObjects(ctx, s.filesBucket, minio.ListObjectsOptions{
		Prefix:    "files/",
		Recursive: true,
	})

	var filesToDelete []string
	for object := range objectsCh {
		if object.Err != nil {
			continue
		}

		if strings.Contains(object.Key, fileID+"/") {
			filesToDelete = append(filesToDelete, object.Key)
		}
	}

	for _, key := range filesToDelete {
		err := s.client.RemoveObject(ctx, s.filesBucket, key, minio.RemoveObjectOptions{})
		if err != nil {
			return fmt.Errorf("failed to delete file %s: %w", key, err)
		}
	}

	if len(filesToDelete) == 0 {
		return fmt.Errorf("file not found")
	}

	return nil
}

func (s *StorageService) ListFiles(ctx context.Context, pagination models.Pagination) ([]*models.File, int64, error) {
	var files []*models.File
	var total int64

	objectsCh := s.client.ListObjects(ctx, s.filesBucket, minio.ListObjectsOptions{
		Prefix:    "files/",
		Recursive: true,
	})

	for object := range objectsCh {
		if object.Err != nil {
			continue
		}

		// Only process metadata files
		if !strings.HasSuffix(object.Key, "/metadata.json") {
			continue
		}

		total++

		// Simple pagination (skip and take)
		if total <= int64(pagination.Offset) {
			continue
		}

		if len(files) >= pagination.PageSize {
			continue
		}

		obj, err := s.client.GetObject(ctx, s.filesBucket, object.Key, minio.GetObjectOptions{})
		if err != nil {
			continue
		}

		data, err := io.ReadAll(obj)
		obj.Close()
		if err != nil {
			continue
		}

		var file models.File
		if err := json.Unmarshal(data, &file); err != nil {
			continue
		}

		files = append(files, &file)
	}

	return files, total, nil
}

// Helper methods
func (s *StorageService) ListUsers(ctx context.Context, pagination models.Pagination) ([]*models.User, int64, error) {
	var users []*models.User
	var total int64

	objectsCh := s.client.ListObjects(ctx, s.usersBucket, minio.ListObjectsOptions{
		Prefix:    "users/",
		Recursive: true,
	})

	for object := range objectsCh {
		if object.Err != nil {
			continue
		}

		total++

		// Simple pagination (skip and take)
		if total <= int64(pagination.Offset) {
			continue
		}

		if len(users) >= pagination.PageSize {
			continue
		}

		obj, err := s.client.GetObject(ctx, s.usersBucket, object.Key, minio.GetObjectOptions{})
		if err != nil {
			continue
		}

		data, err := io.ReadAll(obj)
		obj.Close()
		if err != nil {
			continue
		}

		var user models.User
		if err := json.Unmarshal(data, &user); err != nil {
			continue
		}

		users = append(users, &user)
	}

	return users, total, nil
}
