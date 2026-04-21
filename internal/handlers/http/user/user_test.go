package handleruser

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"service-songket/internal/authscope"
	domainuser "service-songket/internal/domain/user"
	"service-songket/internal/dto"
	interfaceuser "service-songket/internal/interfaces/user"
	"service-songket/pkg/filter"
	"service-songket/utils"
	"testing"

	"github.com/gin-gonic/gin"
)

type userServiceMock struct {
	updateCalled bool
	updateID     string
	updateCtx    context.Context
	updateReq    dto.UserUpdate
	updateResp   domainuser.Users
	updateErr    error
}

func (m *userServiceMock) RegisterUser(req dto.UserRegister) (domainuser.Users, error) {
	return domainuser.Users{}, nil
}
func (m *userServiceMock) AdminCreateUser(ctx context.Context, req dto.AdminCreateUser) (domainuser.Users, error) {
	return domainuser.Users{}, nil
}
func (m *userServiceMock) LoginUser(req dto.Login, logId string) (string, error) {
	return "", nil
}
func (m *userServiceMock) LogoutUser(token string) error { return nil }
func (m *userServiceMock) GetUserById(id string) (domainuser.Users, error) {
	return domainuser.Users{}, nil
}
func (m *userServiceMock) GetUserByEmail(email string) (domainuser.Users, error) {
	return domainuser.Users{}, nil
}
func (m *userServiceMock) GetUserByAuth(id string) (map[string]interface{}, error) {
	return nil, nil
}
func (m *userServiceMock) GetAllUsers(ctx context.Context, params filter.BaseParams) ([]domainuser.Users, int64, error) {
	return nil, 0, nil
}
func (m *userServiceMock) Update(ctx context.Context, id string, req dto.UserUpdate) (domainuser.Users, error) {
	m.updateCalled = true
	m.updateID = id
	m.updateCtx = ctx
	m.updateReq = req
	if m.updateResp.Id == "" {
		m.updateResp = domainuser.Users{Id: id, Role: req.Role}
	}
	return m.updateResp, m.updateErr
}
func (m *userServiceMock) ChangePassword(id string, req dto.ChangePassword) (domainuser.Users, error) {
	return domainuser.Users{}, nil
}
func (m *userServiceMock) ForgotPassword(req dto.ForgotPasswordRequest) (string, error) {
	return "", nil
}
func (m *userServiceMock) ResetPassword(req dto.ResetPasswordRequest) error { return nil }
func (m *userServiceMock) Delete(id string) error                           { return nil }

var _ interfaceuser.ServiceUserInterface = (*userServiceMock)(nil)

func TestUpdateClearsRoleForSelfUpdate(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &userServiceMock{updateResp: domainuser.Users{Id: "11111111-1111-1111-1111-111111111111"}}
	handler := NewUserHandler(service, nil)

	body := dto.UserUpdate{
		Name: "Jane Doe",
		Role: utils.RoleAdmin,
	}
	raw, _ := json.Marshal(body)

	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = httptest.NewRequest(http.MethodPut, "/api/user", bytes.NewReader(raw))
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Set(utils.CtxKeyAuthData, map[string]interface{}{
		"user_id": "11111111-1111-1111-1111-111111111111",
		"role":    utils.RoleDealer,
	})
	ctx.Request = ctx.Request.WithContext(authscope.WithContext(ctx.Request.Context(), authscope.New("11111111-1111-1111-1111-111111111111", utils.RoleDealer, nil)))

	handler.Update(ctx)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
	if !service.updateCalled {
		t.Fatal("expected service update to be called")
	}
	if service.updateReq.Role != "" {
		t.Fatalf("expected self-update role to be cleared, got %q", service.updateReq.Role)
	}
}

func TestUpdateUserByIdDoesNotRequirePassword(t *testing.T) {
	gin.SetMode(gin.TestMode)

	targetID := "11111111-1111-1111-1111-111111111111"
	service := &userServiceMock{updateResp: domainuser.Users{Id: targetID}}
	handler := NewUserHandler(service, nil)

	body := dto.UserUpdate{
		Name: "Jane Doe",
		Role: utils.RoleAdmin,
	}
	raw, _ := json.Marshal(body)

	w := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(w)
	ctx.Params = gin.Params{{Key: "id", Value: targetID}}
	ctx.Request = httptest.NewRequest(http.MethodPut, "/api/user/"+targetID, bytes.NewReader(raw))
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Set(utils.CtxKeyAuthData, map[string]interface{}{
		"user_id": "22222222-2222-2222-2222-222222222222",
		"role":    utils.RoleAdmin,
	})
	ctx.Request = ctx.Request.WithContext(authscope.WithContext(ctx.Request.Context(), authscope.New("22222222-2222-2222-2222-222222222222", utils.RoleAdmin, []string{"users:assign_role"})))

	handler.UpdateUserById(ctx)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
	if !service.updateCalled {
		t.Fatal("expected service update to be called")
	}
	if service.updateID != targetID {
		t.Fatalf("expected target id %q, got %q", targetID, service.updateID)
	}
	if service.updateReq.Role != utils.RoleAdmin {
		t.Fatalf("expected role to be passed through for admin update, got %q", service.updateReq.Role)
	}
}
