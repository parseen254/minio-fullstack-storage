package auth

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestJWTManager_GenerateToken(t *testing.T) {
	jwtManager := NewJWTManager("test-secret", 24)
	userID := "123"
	username := "testuser"
	email := "test@example.com"
	role := "user"

	token, err := jwtManager.GenerateToken(userID, username, email, role)
	require.NoError(t, err)
	assert.NotEmpty(t, token)
}

func TestJWTManager_ValidateToken(t *testing.T) {
	jwtManager := NewJWTManager("test-secret", 24)
	userID := "123"
	username := "testuser"
	email := "test@example.com"
	role := "user"

	// Generate a token
	token, err := jwtManager.GenerateToken(userID, username, email, role)
	require.NoError(t, err)

	// Validate the token
	claims, err := jwtManager.ValidateToken(token)
	require.NoError(t, err)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, username, claims.Username)
	assert.Equal(t, email, claims.Email)
	assert.Equal(t, role, claims.Role)
}

func TestJWTManager_ValidateTokenWithWrongSecret(t *testing.T) {
	jwtManager1 := NewJWTManager("test-secret", 24)
	jwtManager2 := NewJWTManager("wrong-secret", 24)
	userID := "123"
	username := "testuser"
	email := "test@example.com"
	role := "user"

	// Generate a token with first manager
	token, err := jwtManager1.GenerateToken(userID, username, email, role)
	require.NoError(t, err)

	// Try to validate with second manager (wrong secret)
	_, err = jwtManager2.ValidateToken(token)
	assert.Error(t, err)
}

func TestJWTManager_ValidateInvalidToken(t *testing.T) {
	jwtManager := NewJWTManager("test-secret", 24)
	invalidToken := "invalid.token.here"

	_, err := jwtManager.ValidateToken(invalidToken)
	assert.Error(t, err)
}

func TestHashPassword(t *testing.T) {
	password := "testpassword123"

	hashedPassword, err := HashPassword(password)
	require.NoError(t, err)
	assert.NotEmpty(t, hashedPassword)
	assert.NotEqual(t, password, hashedPassword)
}

func TestCheckPassword(t *testing.T) {
	password := "testpassword123"

	// Hash the password
	hashedPassword, err := HashPassword(password)
	require.NoError(t, err)

	// Check correct password
	err = CheckPassword(password, hashedPassword)
	assert.NoError(t, err)

	// Check wrong password
	err = CheckPassword("wrongpassword", hashedPassword)
	assert.Error(t, err)
}
