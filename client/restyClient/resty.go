package httprequest

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/go-resty/resty/v2"
)

type Client interface {
	SetBaseURL(url string)
	R() *resty.Request

	Do(ctx context.Context, method, path string, opt *Options) (*resty.Response, error)
	Get(ctx context.Context, path string, opt *Options) (*resty.Response, error)
	Post(ctx context.Context, path string, opt *Options) (*resty.Response, error)
	Put(ctx context.Context, path string, opt *Options) (*resty.Response, error)
	Delete(ctx context.Context, path string, opt *Options) (*resty.Response, error)

	// tambahan
	SetLogger(l Logger)
	SetDebug(debug bool)
}

type Logger interface {
	Printf(format string, v ...any)
}

type RestyClient struct {
	c     *resty.Client
	log   Logger
	debug bool
}

type Options struct {
	Headers   map[string]string
	Query     map[string]string
	QueryRaw  url.Values
	PathParam map[string]string

	Body     any
	FormData map[string]string

	Result    any
	ErrResult any

	Timeout *time.Duration

	// log control per request (optional)
	LogRequestBody  bool
	LogResponseBody bool
}

func NewRestyClient() *RestyClient {
	rc := resty.New().
		SetRetryCount(2).
		SetRetryWaitTime(300 * time.Millisecond).
		SetRetryMaxWaitTime(2 * time.Second).
		AddRetryCondition(func(r *resty.Response, err error) bool {
			if err != nil {
				return true
			}
			return r.StatusCode() >= http.StatusInternalServerError
		})

	return &RestyClient{
		c:   rc,
		log: log.Default(),
	}
}

func (r *RestyClient) SetLogger(l Logger) {
	if l != nil {
		r.log = l
	}
}
func (r *RestyClient) SetDebug(debug bool) { r.debug = debug }

func (r *RestyClient) SetBaseURL(url string) { r.c.SetBaseURL(url) }
func (r *RestyClient) R() *resty.Request     { return r.c.R() }

func (r *RestyClient) Do(ctx context.Context, method, path string, opt *Options) (*resty.Response, error) {
	if method == "" {
		return nil, fmt.Errorf("method is required")
	}
	if path == "" {
		return nil, fmt.Errorf("path is required")
	}

	req := r.c.R().SetContext(ctx)

	// timeout per request
	// if opt != nil && opt.Timeout != nil {
	// 	req.SetTimeout(*opt.Timeout)
	// }

	applyOptions(req, opt)

	// ==== LOG: request ====
	start := time.Now()
	fullURL := joinURL(r.c.BaseURL, path)
	r.log.Printf("[httpclient] -> %s %s", method, fullURL)

	if r.debug {
		if opt != nil {
			if len(opt.Query) > 0 {
				r.log.Printf("[httpclient]    query=%v", opt.Query)
			}
			if opt.QueryRaw != nil && len(opt.QueryRaw) > 0 {
				r.log.Printf("[httpclient]    query_raw=%v", opt.QueryRaw)
			}
			if len(opt.PathParam) > 0 {
				r.log.Printf("[httpclient]    path_param=%v", opt.PathParam)
			}
			if len(opt.Headers) > 0 {
				r.log.Printf("[httpclient]    headers=%v", maskHeaders(opt.Headers))
			}
			if opt.LogRequestBody && opt.Body != nil {
				r.log.Printf("[httpclient]    body=%#v", opt.Body)
			}
			if opt.LogRequestBody && len(opt.FormData) > 0 {
				r.log.Printf("[httpclient]    form=%v", opt.FormData)
			}
			if opt.Timeout != nil {
				r.log.Printf("[httpclient]    timeout=%s", opt.Timeout.String())
			}
		}
	}

	resp, err := req.Execute(method, path)
	elapsed := time.Since(start)

	// ==== LOG: error ====
	if err != nil {
		r.log.Printf("[httpclient] <- ERROR %s %s elapsed=%s err=%v", method, fullURL, elapsed, err)
		return nil, err
	}

	// ==== LOG: response ====
	r.log.Printf("[httpclient] <- %d %s %s elapsed=%s bytes=%d",
		resp.StatusCode(), method, fullURL, elapsed, len(resp.Body()),
	)

	if r.debug && opt != nil && opt.LogResponseBody {
		body := string(resp.Body())
		r.log.Printf("[httpclient]    resp_body=%s", truncate(body, 2000))
	}

	if resp.StatusCode() >= 400 {
		return resp, fmt.Errorf("http error %d: %s", resp.StatusCode(), string(resp.Body()))
	}

	return resp, nil
}

func (r *RestyClient) Get(ctx context.Context, path string, opt *Options) (*resty.Response, error) {
	return r.Do(ctx, http.MethodGet, path, opt)
}
func (r *RestyClient) Post(ctx context.Context, path string, opt *Options) (*resty.Response, error) {
	return r.Do(ctx, http.MethodPost, path, opt)
}
func (r *RestyClient) Put(ctx context.Context, path string, opt *Options) (*resty.Response, error) {
	return r.Do(ctx, http.MethodPut, path, opt)
}
func (r *RestyClient) Delete(ctx context.Context, path string, opt *Options) (*resty.Response, error) {
	return r.Do(ctx, http.MethodDelete, path, opt)
}

func applyOptions(req *resty.Request, opt *Options) {
	if opt == nil {
		return
	}

	if len(opt.Headers) > 0 {
		req.SetHeaders(opt.Headers)
	}
	if len(opt.Query) > 0 {
		req.SetQueryParams(opt.Query)
	}
	if opt.QueryRaw != nil && len(opt.QueryRaw) > 0 {
		req.SetQueryParamsFromValues(opt.QueryRaw)
	}
	if len(opt.PathParam) > 0 {
		req.SetPathParams(opt.PathParam)
	}

	if opt.Body != nil {
		req.SetHeader("Content-Type", "application/json")
		req.SetBody(opt.Body)
	}
	if len(opt.FormData) > 0 {
		req.SetHeader("Content-Type", "application/x-www-form-urlencoded")
		req.SetFormData(opt.FormData)
	}

	if opt.Result != nil {
		req.SetResult(opt.Result)
	}
	if opt.ErrResult != nil {
		req.SetError(opt.ErrResult)
	}
}

// ===== helpers =====

func joinURL(base, path string) string {
	base = strings.TrimRight(base, "/")
	path = strings.TrimLeft(path, "/")
	if base == "" {
		return "/" + path
	}
	return base + "/" + path
}

func maskHeaders(h map[string]string) map[string]string {
	out := make(map[string]string, len(h))
	for k, v := range h {
		kl := strings.ToLower(k)
		if kl == "authorization" || kl == "x-api-key" || kl == "api-key" {
			out[k] = maskToken(v)
			continue
		}
		out[k] = v
	}
	return out
}

func maskToken(v string) string {
	v = strings.TrimSpace(v)
	if v == "" {
		return v
	}
	// keep prefix like "Bearer "
	if strings.HasPrefix(strings.ToLower(v), "bearer ") {
		t := strings.TrimSpace(v[7:])
		return "Bearer " + maskMid(t)
	}
	return maskMid(v)
}

func maskMid(s string) string {
	if len(s) <= 8 {
		return "****"
	}
	return s[:4] + "****" + s[len(s)-4:]
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "...(truncated)"
}
