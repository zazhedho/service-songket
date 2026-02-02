package token

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestPayloadValid(t *testing.T) {
	payload, err := NewPayload("user", "role", time.Second)
	require.NoError(t, err)
	require.NoError(t, payload.Valid())
}

func TestPayloadExpired(t *testing.T) {
	payload := &Payload{
		UserID:    "user",
		Role:      "role",
		IssuedAt:  time.Now().Add(-2 * time.Minute),
		ExpiredAt: time.Now().Add(-time.Minute),
	}
	require.ErrorIs(t, payload.Valid(), ErrExpiredToken)
}
