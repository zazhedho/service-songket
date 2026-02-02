package token

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestPasetoMaker(t *testing.T) {
	maker, err := NewPasetoMaker("12345678901234567890123456789012")
	require.NoError(t, err)

	userID := "user123"
	role := "user"
	duration := time.Minute

	issuedAt := time.Now()
	expiredAt := issuedAt.Add(duration)

	token, payload, err := maker.CreateToken(userID, role, duration)
	require.NoError(t, err)
	require.NotEmpty(t, token)
	require.NotEmpty(t, payload)

	require.Equal(t, userID, payload.UserID)
	require.Equal(t, role, payload.Role)
	require.WithinDuration(t, issuedAt, payload.IssuedAt, time.Second)
	require.WithinDuration(t, expiredAt, payload.ExpiredAt, time.Second)

	payload, err = maker.VerifyToken(token)
	require.NoError(t, err)
	require.NotEmpty(t, payload)

	require.Equal(t, userID, payload.UserID)
	require.Equal(t, role, payload.Role)
	require.WithinDuration(t, issuedAt, payload.IssuedAt, time.Second)
	require.WithinDuration(t, expiredAt, payload.ExpiredAt, time.Second)
}

func TestExpiredPasetoToken(t *testing.T) {
	maker, err := NewPasetoMaker("12345678901234567890123456789012")
	require.NoError(t, err)

	token, _, err := maker.CreateToken("user123", "user", -time.Minute)
	require.NoError(t, err)
	require.NotEmpty(t, token)

	payload, err := maker.VerifyToken(token)
	require.Error(t, err)
	require.EqualError(t, err, ErrExpiredToken.Error())
	require.Nil(t, payload)
}

func BenchmarkPasetoMaker_CreateAndVerify(b *testing.B) {
	maker, err := NewPasetoMaker("12345678901234567890123456789012")
	if err != nil {
		b.Fatalf("failed to create paseto maker: %v", err)
	}

	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		token, _, err := maker.CreateToken("bench-user", "role", time.Minute)
		if err != nil {
			b.Fatalf("failed to create token: %v", err)
		}
		if _, err := maker.VerifyToken(token); err != nil {
			b.Fatalf("failed to verify token: %v", err)
		}
	}
}
