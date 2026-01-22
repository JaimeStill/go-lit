# Session 01a: Foundation Implementation Guide

## Overview

Establish the foundation for go-lit by extracting and simplifying the server architecture from agent-lab, setting up the web build infrastructure, and creating the client foundation with Lit and custom routing.

**Key Simplifications from agent-lab:**
- No agents CRUD - single agent config cached in browser localStorage
- Only ChatStream and VisionStream endpoints (no sync Chat, no Tools, no Embed)
- Config posted with each request, go-agents instance constructed on-the-fly
- No database - purely stateless server
- Simplified internal/ (no database, storage config) - but pkg/ is copied exactly from agent-lab
- Simplified runtime (lifecycle only, no database/storage subsystems)

**Reference Material:**
- `~/code/agent-lab` - pkg/, internal/agents/, web/ infrastructure
- `~/code/go-agents` - Agent config, execution patterns
- `~/.claude/plans/wiggly-spinning-whisper.md` - Detailed planning document

---

## Phase Structure

| Phase | Name | Description |
|-------|------|-------------|
| 1 | Go Foundation | go.mod + pkg/ packages (exact copies from agent-lab) |
| 2 | Server Infrastructure | config, pkg/web, cmd/server |
| 3 | Agents Domain | ChatStream/VisionStream handlers, API module |
| 4 | Web Build Infrastructure | Vite, TypeScript, Scalar module |
| 5 | Client Foundation | Design system, router, agents services |
| 6 | Integration | Shell template, components, wiring |

**Parallel Tracks:** Phases 1-3 (Go) can proceed in parallel with Phases 4-5 (Web).

---

## Phase 1: Go Foundation

**IMPORTANT:** The pkg/ packages are exact copies from agent-lab. These are shared infrastructure that should not be simplified.

### 1.1 go.mod

**File:** `go.mod`

```go
module github.com/JaimeStill/go-lit

go 1.24

require (
	github.com/JaimeStill/go-agents v0.1.0
	github.com/google/uuid v1.6.0
	github.com/pelletier/go-toml/v2 v2.2.3
)
```

### 1.2 pkg/handlers

**File:** `pkg/handlers/handlers.go`

```go
// Package handlers provides HTTP response utilities for JSON APIs.
// These stateless functions standardize response formatting across handlers.
package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// RespondJSON writes a JSON response with the given status code and data.
// It sets the Content-Type header to application/json.
func RespondJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// RespondError logs the error and writes a JSON error response.
// The response body contains {"error": "<error message>"}.
func RespondError(w http.ResponseWriter, logger *slog.Logger, status int, err error) {
	logger.Error("handler error", "error", err, "status", status)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
}
```

### 1.3 pkg/middleware

**File:** `pkg/middleware/middleware.go`

```go
// Package middleware provides HTTP middleware management and application.
package middleware

import "net/http"

// System manages a stack of HTTP middleware functions.
type System interface {
	Use(mw func(http.Handler) http.Handler)
	Apply(handler http.Handler) http.Handler
}

type middleware struct {
	stack []func(http.Handler) http.Handler
}

// New creates a middleware system.
func New() System {
	return &middleware{
		stack: []func(http.Handler) http.Handler{},
	}
}

// Use adds a middleware function to the stack.
func (m *middleware) Use(mw func(http.Handler) http.Handler) {
	m.stack = append(m.stack, mw)
}

// Apply wraps the handler with all middleware in the stack, applying them in reverse order.
func (m *middleware) Apply(handler http.Handler) http.Handler {
	for i := len(m.stack) - 1; i >= 0; i-- {
		handler = m.stack[i](handler)
	}
	return handler
}
```

**File:** `pkg/middleware/config.go`

```go
package middleware

import (
	"os"
	"strconv"
	"strings"
)

// CORSConfig holds Cross-Origin Resource Sharing policy settings.
type CORSConfig struct {
	Enabled          bool     `toml:"enabled"`
	Origins          []string `toml:"origins"`
	AllowedMethods   []string `toml:"allowed_methods"`
	AllowedHeaders   []string `toml:"allowed_headers"`
	AllowCredentials bool     `toml:"allow_credentials"`
	MaxAge           int      `toml:"max_age"`
}

// CORSEnv maps environment variable names for CORS configuration.
type CORSEnv struct {
	Enabled          string
	Origins          string
	AllowedMethods   string
	AllowedHeaders   string
	AllowCredentials string
	MaxAge           string
}

// Finalize applies defaults and loads environment variable overrides.
func (c *CORSConfig) Finalize(env *CORSEnv) error {
	c.loadDefaults()
	if env != nil {
		c.loadEnv(env)
	}
	return nil
}

// Merge applies non-zero values from the overlay configuration.
func (c *CORSConfig) Merge(overlay *CORSConfig) {
	c.Enabled = overlay.Enabled
	c.AllowCredentials = overlay.AllowCredentials

	if overlay.Origins != nil {
		c.Origins = overlay.Origins
	}
	if overlay.AllowedMethods != nil {
		c.AllowedMethods = overlay.AllowedMethods
	}
	if overlay.AllowedHeaders != nil {
		c.AllowedHeaders = overlay.AllowedHeaders
	}
	if overlay.MaxAge >= 0 {
		c.MaxAge = overlay.MaxAge
	}
}

func (c *CORSConfig) loadDefaults() {
	if len(c.AllowedMethods) == 0 {
		c.AllowedMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	}
	if len(c.AllowedHeaders) == 0 {
		c.AllowedHeaders = []string{"Content-Type", "Authorization"}
	}
	if c.MaxAge <= 0 {
		c.MaxAge = 3600
	}
}

func (c *CORSConfig) loadEnv(env *CORSEnv) {
	if env.Enabled != "" {
		if v := os.Getenv(env.Enabled); v != "" {
			if enabled, err := strconv.ParseBool(v); err == nil {
				c.Enabled = enabled
			}
		}
	}

	if env.Origins != "" {
		if v := os.Getenv(env.Origins); v != "" {
			origins := strings.Split(v, ",")
			c.Origins = make([]string, 0, len(origins))
			for _, origin := range origins {
				if trimmed := strings.TrimSpace(origin); trimmed != "" {
					c.Origins = append(c.Origins, trimmed)
				}
			}
		}
	}

	if env.AllowedMethods != "" {
		if v := os.Getenv(env.AllowedMethods); v != "" {
			methods := strings.Split(v, ",")
			c.AllowedMethods = make([]string, 0, len(methods))
			for _, method := range methods {
				if trimmed := strings.TrimSpace(method); trimmed != "" {
					c.AllowedMethods = append(c.AllowedMethods, trimmed)
				}
			}
		}
	}

	if env.AllowedHeaders != "" {
		if v := os.Getenv(env.AllowedHeaders); v != "" {
			headers := strings.Split(v, ",")
			c.AllowedHeaders = make([]string, 0, len(headers))
			for _, header := range headers {
				if trimmed := strings.TrimSpace(header); trimmed != "" {
					c.AllowedHeaders = append(c.AllowedHeaders, trimmed)
				}
			}
		}
	}

	if env.AllowCredentials != "" {
		if v := os.Getenv(env.AllowCredentials); v != "" {
			if creds, err := strconv.ParseBool(v); err == nil {
				c.AllowCredentials = creds
			}
		}
	}

	if env.MaxAge != "" {
		if v := os.Getenv(env.MaxAge); v != "" {
			if maxAge, err := strconv.Atoi(v); err == nil {
				c.MaxAge = maxAge
			}
		}
	}
}
```

**File:** `pkg/middleware/cors.go`

```go
package middleware

import (
	"fmt"
	"net/http"
	"slices"
	"strings"
)

// CORS returns middleware that handles Cross-Origin Resource Sharing based on configuration.
func CORS(cfg *CORSConfig) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !cfg.Enabled || len(cfg.Origins) == 0 {
				next.ServeHTTP(w, r)
				return
			}

			origin := r.Header.Get("Origin")
			allowed := slices.Contains(cfg.Origins, origin)

			if allowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Methods", strings.Join(cfg.AllowedMethods, ", "))
				w.Header().Set("Access-Control-Allow-Headers", strings.Join(cfg.AllowedHeaders, ", "))

				if cfg.AllowCredentials {
					w.Header().Set("Access-Control-Allow-Credentials", "true")
				}

				if cfg.MaxAge > 0 {
					w.Header().Set("Access-Control-Max-Age", fmt.Sprintf("%d", cfg.MaxAge))
				}
			}

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
```

**File:** `pkg/middleware/logger.go`

```go
package middleware

import (
	"log/slog"
	"net/http"
	"time"
)

// Logger returns middleware that logs HTTP requests.
func Logger(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			next.ServeHTTP(w, r)
			logger.Info("request",
				"method", r.Method,
				"path", r.URL.Path,
				"duration", time.Since(start),
			)
		})
	}
}
```

### 1.4 pkg/module

**File:** `pkg/module/module.go`

```go
// Package module provides modular HTTP routing with middleware support.
// Modules are isolated handler groups that can be mounted at path prefixes,
// each with their own middleware chain.
package module

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/JaimeStill/go-lit/pkg/middleware"
)

// Module represents an isolated HTTP handler group with a path prefix
// and middleware chain. Modules can be mounted onto a Router.
type Module struct {
	prefix     string
	router     http.Handler
	middleware middleware.System
}

// New creates a Module with the given path prefix and HTTP handler.
// Panics if the prefix is invalid (must start with "/" and be single-level).
func New(prefix string, router http.Handler) *Module {
	if err := validatePrefix(prefix); err != nil {
		panic(err)
	}
	return &Module{
		prefix:     prefix,
		router:     router,
		middleware: middleware.New(),
	}
}

// Handler returns the module's handler with all middleware applied.
func (m *Module) Handler() http.Handler {
	return m.middleware.Apply(m.router)
}

// Prefix returns the module's path prefix.
func (m *Module) Prefix() string {
	return m.prefix
}

// Serve handles HTTP requests by stripping the module prefix from the path
// before routing to the module's handler chain.
func (m *Module) Serve(w http.ResponseWriter, req *http.Request) {
	path := extractPath(req.URL.Path, m.prefix)
	request := cloneRequest(req, path)
	m.Handler().ServeHTTP(w, request)
}

// Use adds middleware to the module's chain.
func (m *Module) Use(mw func(http.Handler) http.Handler) {
	m.middleware.Use(mw)
}

func cloneRequest(req *http.Request, path string) *http.Request {
	request := new(http.Request)
	*request = *req
	request.URL = new(url.URL)
	*request.URL = *req.URL
	request.URL.Path = path
	request.URL.RawPath = ""
	return request
}

func extractPath(fullPath, prefix string) string {
	path := fullPath[len(prefix):]
	if path == "" {
		return "/"
	}
	return path
}

func validatePrefix(prefix string) error {
	if prefix == "" {
		return fmt.Errorf("module prefix cannot be empty")
	}
	if !strings.HasPrefix(prefix, "/") {
		return fmt.Errorf("module prefix must start with /: %s", prefix)
	}
	if strings.Count(prefix, "/") != 1 {
		return fmt.Errorf("module prefix must be single-level sub-path: %s", prefix)
	}
	return nil
}
```

**File:** `pkg/module/router.go`

```go
package module

import (
	"net/http"
	"strings"
)

// Router routes requests to mounted modules or native handlers.
type Router struct {
	modules map[string]*Module
	native  *http.ServeMux
}

// NewRouter creates a Router for mounting modules and native handlers.
func NewRouter() *Router {
	return &Router{
		modules: make(map[string]*Module),
		native:  http.NewServeMux(),
	}
}

// HandleNative registers a handler directly with the native ServeMux,
// bypassing module routing. Used for handlers like health checks.
func (r *Router) HandleNative(pattern string, handler http.HandlerFunc) {
	r.native.HandleFunc(pattern, handler)
}

// Mount registers a module at its configured prefix.
func (r *Router) Mount(m *Module) {
	r.modules[m.prefix] = m
}

// ServeHTTP routes requests to the matching module or falls back to native handlers.
func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	path := normalizePath(req)
	prefix := extractPrefix(path)

	if m, ok := r.modules[prefix]; ok {
		m.Serve(w, req)
		return
	}

	r.native.ServeHTTP(w, req)
}

func extractPrefix(path string) string {
	parts := strings.SplitN(path, "/", 3)
	if len(parts) >= 2 {
		return "/" + parts[1]
	}
	return path
}

func normalizePath(req *http.Request) string {
	path := req.URL.Path
	if len(path) > 1 && strings.HasSuffix(path, "/") {
		path = strings.TrimSuffix(path, "/")
		req.URL.Path = path
	}
	return path
}
```

### 1.5 pkg/routes

**File:** `pkg/routes/route.go`

```go
// Package routes provides types for HTTP route registration.
// These types are used by internal/routes to build the HTTP handler
// and by domain handlers to define their routes.
package routes

import (
	"net/http"

	"github.com/JaimeStill/go-lit/pkg/openapi"
)

// Route defines an HTTP endpoint with its method, pattern, handler,
// and optional OpenAPI documentation.
type Route struct {
	Method  string
	Pattern string
	Handler http.HandlerFunc
	OpenAPI *openapi.Operation
}
```

**File:** `pkg/routes/group.go`

```go
package routes

import (
	"maps"
	"net/http"

	"github.com/JaimeStill/go-lit/pkg/openapi"
)

// Group represents a collection of routes under a common URL prefix.
// Groups can contain child groups for hierarchical route organization.
type Group struct {
	Prefix      string
	Tags        []string
	Description string
	Routes      []Route
	Children    []Group
	Schemas     map[string]*openapi.Schema
}

// AddToSpec adds the group's routes and schemas to the OpenAPI specification.
func (g *Group) AddToSpec(basePath string, spec *openapi.Spec) {
	g.addOperations(basePath, spec)
}

func (g *Group) addOperations(parentPrefix string, spec *openapi.Spec) {
	fullPrefix := parentPrefix + g.Prefix

	maps.Copy(spec.Components.Schemas, g.Schemas)

	for _, route := range g.Routes {
		if route.OpenAPI == nil {
			continue
		}

		path := fullPrefix + route.Pattern
		op := route.OpenAPI

		if len(op.Tags) == 0 {
			op.Tags = g.Tags
		}

		if spec.Paths[path] == nil {
			spec.Paths[path] = &openapi.PathItem{}
		}

		switch route.Method {
		case "GET":
			spec.Paths[path].Get = op
		case "POST":
			spec.Paths[path].Post = op
		case "PUT":
			spec.Paths[path].Put = op
		case "DELETE":
			spec.Paths[path].Delete = op
		}
	}

	for _, child := range g.Children {
		child.addOperations(fullPrefix, spec)
	}
}

// Register registers route groups with the HTTP mux and adds their OpenAPI documentation.
func Register(mux *http.ServeMux, basePath string, spec *openapi.Spec, groups ...Group) {
	for _, group := range groups {
		group.AddToSpec(basePath, spec)
		registerGroup(mux, "", group)
	}
}

func registerGroup(mux *http.ServeMux, parentPrefix string, group Group) {
	fullPrefix := parentPrefix + group.Prefix
	for _, route := range group.Routes {
		pattern := route.Method + " " + fullPrefix + route.Pattern
		mux.HandleFunc(pattern, route.Handler)
	}
	for _, child := range group.Children {
		registerGroup(mux, fullPrefix, child)
	}
}
```

### 1.6 pkg/openapi

**File:** `pkg/openapi/types.go`

```go
// Package openapi provides types and utilities for generating OpenAPI 3.1 specifications.
// It offers a programmatic approach to building API documentation that integrates
// with the routes system to auto-generate specifications at server startup.
package openapi

// Info provides metadata about the API.
type Info struct {
	Title       string `json:"title"`
	Version     string `json:"version"`
	Description string `json:"description,omitempty"`
}

// Server represents a server URL for the API.
type Server struct {
	URL         string `json:"url"`
	Description string `json:"description,omitempty"`
}

// PathItem describes operations available on a single path.
type PathItem struct {
	Get    *Operation `json:"get,omitempty"`
	Post   *Operation `json:"post,omitempty"`
	Put    *Operation `json:"put,omitempty"`
	Delete *Operation `json:"delete,omitempty"`
}

// Operation describes a single API operation on a path.
type Operation struct {
	Summary     string            `json:"summary,omitempty"`
	Description string            `json:"description,omitempty"`
	Tags        []string          `json:"tags,omitempty"`
	Parameters  []*Parameter      `json:"parameters,omitempty"`
	RequestBody *RequestBody      `json:"requestBody,omitempty"`
	Responses   map[int]*Response `json:"responses"`
}

// Parameter describes a single operation parameter (path, query, header, or cookie).
type Parameter struct {
	Name        string  `json:"name"`
	In          string  `json:"in"`
	Required    bool    `json:"required,omitempty"`
	Description string  `json:"description,omitempty"`
	Schema      *Schema `json:"schema"`
}

// RequestBody describes a single request body.
type RequestBody struct {
	Description string                `json:"description,omitempty"`
	Required    bool                  `json:"required,omitempty"`
	Content     map[string]*MediaType `json:"content"`
}

// Response describes a single response from an API operation.
type Response struct {
	Description string                `json:"description"`
	Content     map[string]*MediaType `json:"content,omitempty"`
	Ref         string                `json:"$ref,omitempty"`
}

// MediaType provides schema and examples for a media type.
type MediaType struct {
	Schema *Schema `json:"schema,omitempty"`
}

// Schema defines the structure of input and output data.
// Per OpenAPI 3.1, Schema Objects follow JSON Schema Draft 2020-12.
// Properties are themselves Schema Objects, enabling full composition.
type Schema struct {
	Type        string             `json:"type,omitempty"`
	Format      string             `json:"format,omitempty"`
	Description string             `json:"description,omitempty"`
	Properties  map[string]*Schema `json:"properties,omitempty"`
	Required    []string           `json:"required,omitempty"`
	Items       *Schema            `json:"items,omitempty"`
	Ref         string             `json:"$ref,omitempty"`

	Example any   `json:"example,omitempty"`
	Default any   `json:"default,omitempty"`
	Enum    []any `json:"enum,omitempty"`

	Minimum   *float64 `json:"minimum,omitempty"`
	Maximum   *float64 `json:"maximum,omitempty"`
	MinLength *int     `json:"minLength,omitempty"`
	MaxLength *int     `json:"maxLength,omitempty"`
	Pattern   string   `json:"pattern,omitempty"`
}

// Components holds reusable schema and response definitions.
type Components struct {
	Schemas   map[string]*Schema   `json:"schemas,omitempty"`
	Responses map[string]*Response `json:"responses,omitempty"`
}

// SchemaRef creates a JSON reference to a schema in components/schemas.
func SchemaRef(name string) *Schema {
	return &Schema{Ref: "#/components/schemas/" + name}
}

// ResponseRef creates a JSON reference to a response in components/responses.
func ResponseRef(name string) *Response {
	return &Response{Ref: "#/components/responses/" + name}
}

// RequestBodyJSON creates a request body with JSON content type referencing a schema.
func RequestBodyJSON(schemaName string, required bool) *RequestBody {
	return &RequestBody{
		Required: required,
		Content: map[string]*MediaType{
			"application/json": {Schema: SchemaRef(schemaName)},
		},
	}
}

// ResponseJSON creates a response with JSON content type referencing a schema.
func ResponseJSON(description, schemaName string) *Response {
	return &Response{
		Description: description,
		Content: map[string]*MediaType{
			"application/json": {Schema: SchemaRef(schemaName)},
		},
	}
}

// PathParam creates a required path parameter with UUID format.
func PathParam(name, description string) *Parameter {
	return &Parameter{
		Name:        name,
		In:          "path",
		Required:    true,
		Description: description,
		Schema:      &Schema{Type: "string", Format: "uuid"},
	}
}

// QueryParam creates a query parameter with the specified type.
func QueryParam(name, typ, description string, required bool) *Parameter {
	return &Parameter{
		Name:        name,
		In:          "query",
		Required:    required,
		Description: description,
		Schema:      &Schema{Type: typ},
	}
}
```

**File:** `pkg/openapi/spec.go`

```go
package openapi

import "net/http"

// Spec represents a complete OpenAPI 3.1 specification document.
type Spec struct {
	OpenAPI    string               `json:"openapi"`
	Info       *Info                `json:"info"`
	Servers    []*Server            `json:"servers,omitempty"`
	Paths      map[string]*PathItem `json:"paths"`
	Components *Components          `json:"components,omitempty"`
}

func NewSpec(title, version string) *Spec {
	return &Spec{
		OpenAPI: "3.1.0",
		Info: &Info{
			Title:   title,
			Version: version,
		},
		Components: NewComponents(),
		Paths:      make(map[string]*PathItem),
	}
}

func (s *Spec) AddServer(url string) {
	s.Servers = append(s.Servers, &Server{URL: url})
}

func (s *Spec) SetDescription(desc string) {
	s.Info.Description = desc
}

func ServeSpec(specBytes []byte) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		w.Write(specBytes)
	}
}
```

**File:** `pkg/openapi/components.go`

```go
package openapi

import "maps"

// NewComponents creates a Components instance with common shared schemas and responses.
// Includes PageRequest schema and standard error responses (BadRequest, NotFound, Conflict).
func NewComponents() *Components {
	return &Components{
		Schemas: map[string]*Schema{
			"PageRequest": {
				Type: "object",
				Properties: map[string]*Schema{
					"page":      {Type: "integer", Description: "Page number (1-indexed)", Example: 1},
					"page_size": {Type: "integer", Description: "Results per page", Example: 20},
					"search":    {Type: "string", Description: "Search query"},
					"sort":      {Type: "string", Description: "Comma-separated sort fields. Prefix with - for descending. Example: name,-created_at"},
				},
			},
		},
		Responses: map[string]*Response{
			"BadRequest": {
				Description: "Invalid request",
				Content: map[string]*MediaType{
					"application/json": {
						Schema: &Schema{
							Type: "object",
							Properties: map[string]*Schema{
								"error": {Type: "string", Description: "Error message"},
							},
						},
					},
				},
			},
			"NotFound": {
				Description: "Resource not found",
				Content: map[string]*MediaType{
					"application/json": {
						Schema: &Schema{
							Type: "object",
							Properties: map[string]*Schema{
								"error": {Type: "string", Description: "Error message"},
							},
						},
					},
				},
			},
			"Conflict": {
				Description: "Resource conflict (duplicate name)",
				Content: map[string]*MediaType{
					"application/json": {
						Schema: &Schema{
							Type: "object",
							Properties: map[string]*Schema{
								"error": {Type: "string", Description: "Error message"},
							},
						},
					},
				},
			},
		},
	}
}

// AddSchemas merges the provided schemas into the Components schemas map.
func (c *Components) AddSchemas(schemas map[string]*Schema) {
	maps.Copy(c.Schemas, schemas)
}

// AddResponses merges the provided responses into the Components responses map.
func (c *Components) AddResponses(responses map[string]*Response) {
	maps.Copy(c.Responses, responses)
}
```

**File:** `pkg/openapi/config.go`

```go
package openapi

import "os"

type Config struct {
	Title       string `toml:"title"`
	Description string `toml:"description"`
}

type ConfigEnv struct {
	Title       string
	Description string
}

func (c *Config) Finalize(env *ConfigEnv) error {
	c.loadDefaults()
	if env != nil {
		c.loadEnv(env)
	}
	return nil
}

func (c *Config) Merge(overlay *Config) {
	if overlay.Title != "" {
		c.Title = overlay.Title
	}
	if overlay.Description != "" {
		c.Description = overlay.Description
	}
}

func (c *Config) loadDefaults() {
	if c.Title == "" {
		c.Title = "Go-Lit API"
	}
	if c.Description == "" {
		c.Description = "Agent execution API for Go-Lit POC."
	}
}

func (c *Config) loadEnv(env *ConfigEnv) {
	if env.Title != "" {
		if v := os.Getenv(env.Title); v != "" {
			c.Title = v
		}
	}
	if env.Description != "" {
		if v := os.Getenv(env.Description); v != "" {
			c.Description = v
		}
	}
}
```

**File:** `pkg/openapi/json.go`

```go
package openapi

import (
	"encoding/json"
	"os"
)

// MarshalJSON serializes a Spec to formatted JSON bytes.
func MarshalJSON(spec *Spec) ([]byte, error) {
	return json.MarshalIndent(spec, "", "  ")
}

// WriteJSON serializes a Spec to formatted JSON and writes it to a file.
func WriteJSON(spec *Spec, filename string) error {
	data, err := json.MarshalIndent(spec, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filename, data, 0644)
}
```

### 1.7 pkg/pagination

**File:** `pkg/pagination/config.go`

```go
package pagination

// Config holds pagination settings for controlling page size limits.
type Config struct {
	DefaultPageSize int `toml:"default_page_size"`
	MaxPageSize     int `toml:"max_page_size"`
}

// Finalize applies default values to any unset configuration fields.
func (c *Config) Finalize() error {
	c.loadDefaults()
	return nil
}

// Merge applies non-zero values from the overlay configuration.
func (c *Config) Merge(overlay *Config) {
	if overlay.DefaultPageSize > 0 {
		c.DefaultPageSize = overlay.DefaultPageSize
	}
	if overlay.MaxPageSize > 0 {
		c.MaxPageSize = overlay.MaxPageSize
	}
}

func (c *Config) loadDefaults() {
	if c.DefaultPageSize <= 0 {
		c.DefaultPageSize = 20
	}
	if c.MaxPageSize <= 0 {
		c.MaxPageSize = 100
	}
}
```

**File:** `pkg/pagination/pagination.go`

```go
// Package pagination provides request/response types for paginated API endpoints.
package pagination

import (
	"encoding/json"
	"net/url"
	"strconv"
)

// PageRequest contains pagination parameters from client requests.
type PageRequest struct {
	Page     int    `json:"page"`
	PageSize int    `json:"page_size"`
	Search   string `json:"search"`
	Sort     string `json:"sort"`
}

// PageResult wraps paginated data with metadata.
type PageResult[T any] struct {
	Data       []T `json:"data"`
	Total      int `json:"total"`
	Page       int `json:"page"`
	PageSize   int `json:"page_size"`
	TotalPages int `json:"total_pages"`
}

// PageRequestFromQuery extracts pagination parameters from URL query values.
// It applies the configuration limits to ensure valid page sizes.
func PageRequestFromQuery(query url.Values, cfg Config) PageRequest {
	page, _ := strconv.Atoi(query.Get("page"))
	pageSize, _ := strconv.Atoi(query.Get("page_size"))

	req := PageRequest{
		Page:     page,
		PageSize: pageSize,
		Search:   query.Get("search"),
		Sort:     query.Get("sort"),
	}

	req.Normalize(cfg)
	return req
}

// Normalize applies default values and enforces limits from the configuration.
func (p *PageRequest) Normalize(cfg Config) {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.PageSize < 1 {
		p.PageSize = cfg.DefaultPageSize
	}
	if p.PageSize > cfg.MaxPageSize {
		p.PageSize = cfg.MaxPageSize
	}
}

// Offset returns the zero-based offset for database queries.
func (p *PageRequest) Offset() int {
	return (p.Page - 1) * p.PageSize
}

// UnmarshalJSON provides flexible JSON parsing for PageRequest.
// It handles both "page_size" and "pageSize" field names.
func (p *PageRequest) UnmarshalJSON(data []byte) error {
	type alias PageRequest
	aux := &struct {
		PageSizeCamel int `json:"pageSize"`
		*alias
	}{
		alias: (*alias)(p),
	}

	if err := json.Unmarshal(data, aux); err != nil {
		return err
	}

	if p.PageSize == 0 && aux.PageSizeCamel > 0 {
		p.PageSize = aux.PageSizeCamel
	}

	return nil
}
```

### 1.8 pkg/lifecycle

**File:** `pkg/lifecycle/lifecycle.go`

```go
// Package lifecycle provides application lifecycle coordination for startup and shutdown.
package lifecycle

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// ReadinessChecker provides a simple interface for checking if a system is ready.
type ReadinessChecker interface {
	Ready() bool
}

// Coordinator manages application lifecycle including startup hooks, shutdown hooks,
// and readiness state. It provides a shared context that is cancelled during shutdown.
type Coordinator struct {
	ctx        context.Context
	cancel     context.CancelFunc
	startupWg  sync.WaitGroup
	shutdownWg sync.WaitGroup
	ready      bool
	readyMu    sync.RWMutex
}

// New creates a new Coordinator with an active context.
func New() *Coordinator {
	ctx, cancel := context.WithCancel(context.Background())
	return &Coordinator{
		ctx:    ctx,
		cancel: cancel,
	}
}

// Context returns the coordinator's context, which is cancelled during shutdown.
func (c *Coordinator) Context() context.Context {
	return c.ctx
}

// OnStartup registers a function to run concurrently during startup.
// All registered functions must complete before WaitForStartup returns.
func (c *Coordinator) OnStartup(fn func()) {
	c.startupWg.Go(fn)
}

// OnShutdown registers a function to run concurrently during shutdown.
// Functions should wait for Context().Done() before performing cleanup.
func (c *Coordinator) OnShutdown(fn func()) {
	c.shutdownWg.Go(fn)
}

// Ready returns true after WaitForStartup has completed.
func (c *Coordinator) Ready() bool {
	c.readyMu.RLock()
	defer c.readyMu.RUnlock()
	return c.ready
}

// WaitForStartup blocks until all startup hooks complete, then marks the coordinator as ready.
func (c *Coordinator) WaitForStartup() {
	c.startupWg.Wait()
	c.readyMu.Lock()
	c.ready = true
	c.readyMu.Unlock()
}

// Shutdown cancels the context and waits for all shutdown hooks to complete.
// Returns an error if shutdown does not complete within the timeout.
func (c *Coordinator) Shutdown(timeout time.Duration) error {
	c.cancel()

	done := make(chan struct{})
	go func() {
		c.shutdownWg.Wait()
		close(done)
	}()

	select {
	case <-done:
		return nil
	case <-time.After(timeout):
		return fmt.Errorf("shutdown timeout after %v", timeout)
	}
}
```

### 1.9 pkg/web

**File:** `pkg/web/router.go`

```go
package web

import "net/http"

// Router wraps http.ServeMux with optional fallback handling for unmatched routes.
// Use SetFallback to configure custom 404 behavior; other error handling
// (unauthorized, forbidden) should be implemented via middleware.
type Router struct {
	mux      *http.ServeMux
	fallback http.HandlerFunc
}

// NewRouter creates a Router with default ServeMux behavior.
// Call SetFallback to configure custom handling for unmatched routes.
func NewRouter() *Router {
	return &Router{mux: http.NewServeMux()}
}

// SetFallback configures the handler for unmatched routes.
// If not set, the default ServeMux 404 behavior applies.
func (r *Router) SetFallback(handler http.HandlerFunc) {
	r.fallback = handler
}

// Handle registers a handler for the given pattern.
func (r *Router) Handle(pattern string, handler http.Handler) {
	r.mux.Handle(pattern, handler)
}

// HandleFunc registers a handler function for the given pattern.
func (r *Router) HandleFunc(pattern string, handler http.HandlerFunc) {
	r.mux.HandleFunc(pattern, handler)
}

// ServeHTTP implements http.Handler with optional fallback for unmatched routes.
func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	_, pattern := r.mux.Handler(req)
	if pattern == "" && r.fallback != nil {
		r.fallback.ServeHTTP(w, req)
		return
	}
	r.mux.ServeHTTP(w, req)
}
```

**File:** `pkg/web/static.go`

```go
package web

import (
	"bytes"
	"embed"
	"io/fs"
	"net/http"
	"time"

	"github.com/JaimeStill/go-lit/pkg/routes"
)

// DistServer returns a handler that serves files from an embedded filesystem.
// It strips the URL prefix and serves from the specified subdirectory.
func DistServer(fsys embed.FS, subdir, urlPrefix string) http.HandlerFunc {
	sub, err := fs.Sub(fsys, subdir)
	if err != nil {
		panic("failed to create sub-filesystem: " + err.Error())
	}
	server := http.StripPrefix(urlPrefix, http.FileServer(http.FS(sub)))
	return func(w http.ResponseWriter, r *http.Request) {
		server.ServeHTTP(w, r)
	}
}

// PublicFile returns a handler that serves a single file from an embedded filesystem.
func PublicFile(fsys embed.FS, subdir, filename string) http.HandlerFunc {
	path := subdir + "/" + filename
	return func(w http.ResponseWriter, r *http.Request) {
		data, err := fsys.ReadFile(path)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		http.ServeContent(w, r, filename, time.Time{}, bytes.NewReader(data))
	}
}

// PublicFileRoutes generates routes for serving multiple files at root-level URLs.
func PublicFileRoutes(fsys embed.FS, subdir string, files ...string) []routes.Route {
	routeList := make([]routes.Route, len(files))
	for i, file := range files {
		routeList[i] = routes.Route{
			Method:  "GET",
			Pattern: "/" + file,
			Handler: PublicFile(fsys, subdir, file),
		}
	}
	return routeList
}

// ServeEmbeddedFile returns a handler that serves raw bytes with the specified content type.
func ServeEmbeddedFile(data []byte, contentType string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", contentType)
		w.WriteHeader(http.StatusOK)
		w.Write(data)
	}
}
```

**File:** `pkg/web/views.go`

```go
// Package web provides infrastructure for serving web views with Go templates.
// It supports pre-parsed templates for zero per-request overhead and
// declarative view definitions for simplified route generation.
package web

import (
	"embed"
	"fmt"
	"html/template"
	"io/fs"
	"net/http"
)

// ViewDef defines a view with its route, template file, title, and bundle name.
type ViewDef struct {
	Route    string
	Template string
	Title    string
	Bundle   string
}

// ViewData contains the data passed to view templates during rendering.
// BasePath enables portable URL generation in templates via {{ .BasePath }}.
type ViewData struct {
	Title    string
	Bundle   string
	BasePath string
	Data     any
}

// TemplateSet holds pre-parsed templates and a base path for URL generation.
// Templates are parsed once at startup, avoiding per-request overhead.
// The basePath is automatically included in ViewData for all handlers.
type TemplateSet struct {
	views    map[string]*template.Template
	basePath string
}

// NewTemplateSet creates a TemplateSet by parsing layout templates and cloning them
// for each view. The basePath is stored and automatically included in ViewData
// for all handlers, enabling portable URL generation in templates.
// This pre-parsing at startup enables fail-fast behavior and eliminates
// per-request template parsing overhead.
func NewTemplateSet(layoutFS, viewFS embed.FS, layoutGlob, viewSubdir, basePath string, views []ViewDef) (*TemplateSet, error) {
	layouts, err := template.ParseFS(layoutFS, layoutGlob)
	if err != nil {
		return nil, err
	}

	viewSub, err := fs.Sub(viewFS, viewSubdir)
	if err != nil {
		return nil, err
	}

	viewTemplates := make(map[string]*template.Template, len(views))
	for _, v := range views {
		t, err := layouts.Clone()
		if err != nil {
			return nil, fmt.Errorf("clone layouts for %s: %w", v.Template, err)
		}
		_, err = t.ParseFS(viewSub, v.Template)
		if err != nil {
			return nil, fmt.Errorf("parse template: %s: %w", v.Template, err)
		}
		viewTemplates[v.Template] = t
	}

	return &TemplateSet{
		views:    viewTemplates,
		basePath: basePath,
	}, nil
}

// ErrorHandler returns an HTTP handler that renders an error view with the given status code.
func (ts *TemplateSet) ErrorHandler(layout string, view ViewDef, status int) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(status)
		data := ViewData{
			Title:    view.Title,
			Bundle:   view.Bundle,
			BasePath: ts.basePath,
		}
		if err := ts.Render(w, layout, view.Template, data); err != nil {
			http.Error(w, http.StatusText(status), status)
		}
	}
}

// ViewHandler returns an HTTP handler that renders the given view.
func (ts *TemplateSet) ViewHandler(layout string, view ViewDef) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		data := ViewData{
			Title:    view.Title,
			Bundle:   view.Bundle,
			BasePath: ts.basePath,
		}
		if err := ts.Render(w, layout, view.Template, data); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	}
}

// Render executes the named layout template with the given view data.
// It sets the Content-Type header to text/html.
func (ts *TemplateSet) Render(w http.ResponseWriter, layoutName, viewPath string, data ViewData) error {
	t, ok := ts.views[viewPath]
	if !ok {
		return fmt.Errorf("template not found: %s", viewPath)
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	return t.ExecuteTemplate(w, layoutName, data)
}
```

**Verification:** `go vet ./pkg/...`

---

## Phase 2: Server Infrastructure

**Note:** pkg/web is already defined in Phase 1.9. This phase focuses on internal/config and cmd/server with lifecycle coordination.

### 2.1 internal/config

**File:** `internal/config/types.go`

```go
package config

import (
	"fmt"
	"log/slog"
)

// LogLevel represents the minimum severity level for log output.
type LogLevel string

const (
	// LogLevelDebug enables all log levels including debug messages.
	LogLevelDebug LogLevel = "debug"

	// LogLevelInfo enables info, warn, and error messages.
	LogLevelInfo LogLevel = "info"

	// LogLevelWarn enables warn and error messages.
	LogLevelWarn LogLevel = "warn"

	// LogLevelError enables only error messages.
	LogLevelError LogLevel = "error"
)

// Validate checks if the log level is one of the recognized values.
func (l LogLevel) Validate() error {
	switch l {
	case LogLevelDebug, LogLevelInfo, LogLevelWarn, LogLevelError:
		return nil
	default:
		return fmt.Errorf("invalid log level: %s (must be debug, info, warn, or error)", l)
	}
}

// ToSlogLevel converts the log level to its corresponding slog.Level value.
func (l LogLevel) ToSlogLevel() slog.Level {
	switch l {
	case LogLevelDebug:
		return slog.LevelDebug
	case LogLevelWarn:
		return slog.LevelWarn
	case LogLevelError:
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// LogFormat represents the output format for log messages.
type LogFormat string

const (
	// LogFormatText outputs logs in human-readable text format.
	LogFormatText LogFormat = "text"

	// LogFormatJSON outputs logs in JSON format for structured logging.
	LogFormatJSON LogFormat = "json"
)

// Validate checks if the log format is one of the recognized values.
func (f LogFormat) Validate() error {
	switch f {
	case LogFormatText, LogFormatJSON:
		return nil
	default:
		return fmt.Errorf("invalid log format: %s (must be text or json)", f)
	}
}
```

**File:** `internal/config/server.go`

```go
package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

const (
	// EnvServerHost overrides the server host address.
	EnvServerHost = "SERVER_HOST"

	// EnvServerPort overrides the server port.
	EnvServerPort = "SERVER_PORT"

	// EnvServerReadTimeout overrides the server read timeout.
	EnvServerReadTimeout = "SERVER_READ_TIMEOUT"

	// EnvServerWriteTimeout overrides the server write timeout.
	EnvServerWriteTimeout = "SERVER_WRITE_TIMEOUT"

	// EnvServerShutdownTimeout overrides the server shutdown timeout.
	EnvServerShutdownTimeout = "SERVER_SHUTDOWN_TIMEOUT"
)

// ServerConfig contains HTTP server configuration.
type ServerConfig struct {
	Host            string `toml:"host"`
	Port            int    `toml:"port"`
	ReadTimeout     string `toml:"read_timeout"`
	WriteTimeout    string `toml:"write_timeout"`
	ShutdownTimeout string `toml:"shutdown_timeout"`
}

// Addr returns the server address in host:port format.
func (c *ServerConfig) Addr() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}

// ReadTimeoutDuration parses and returns the read timeout as a time.Duration.
func (c *ServerConfig) ReadTimeoutDuration() time.Duration {
	d, _ := time.ParseDuration(c.ReadTimeout)
	return d
}

// WriteTimeoutDuration parses and returns the write timeout as a time.Duration.
func (c *ServerConfig) WriteTimeoutDuration() time.Duration {
	d, _ := time.ParseDuration(c.WriteTimeout)
	return d
}

// ShutdownTimeoutDuration parses and returns the shutdown timeout as a time.Duration.
func (c *ServerConfig) ShutdownTimeoutDuration() time.Duration {
	d, _ := time.ParseDuration(c.ShutdownTimeout)
	return d
}

// Finalize applies defaults, loads environment overrides, and validates the server configuration.
func (c *ServerConfig) Finalize() error {
	c.loadDefaults()
	c.loadEnv()
	return c.validate()
}

// Merge applies values from overlay configuration that differ from zero values.
func (c *ServerConfig) Merge(overlay *ServerConfig) {
	if overlay.Host != "" {
		c.Host = overlay.Host
	}
	if overlay.Port != 0 {
		c.Port = overlay.Port
	}
	if overlay.ReadTimeout != "" {
		c.ReadTimeout = overlay.ReadTimeout
	}
	if overlay.WriteTimeout != "" {
		c.WriteTimeout = overlay.WriteTimeout
	}
	if overlay.ShutdownTimeout != "" {
		c.ShutdownTimeout = overlay.ShutdownTimeout
	}
}

func (c *ServerConfig) loadEnv() {
	if v := os.Getenv(EnvServerHost); v != "" {
		c.Host = v
	}
	if v := os.Getenv(EnvServerPort); v != "" {
		if port, err := strconv.Atoi(v); err == nil {
			c.Port = port
		}
	}
	if v := os.Getenv(EnvServerReadTimeout); v != "" {
		c.ReadTimeout = v
	}
	if v := os.Getenv(EnvServerWriteTimeout); v != "" {
		c.WriteTimeout = v
	}
	if v := os.Getenv(EnvServerShutdownTimeout); v != "" {
		c.ShutdownTimeout = v
	}
}

func (c *ServerConfig) loadDefaults() {
	if c.Host == "" {
		c.Host = "0.0.0.0"
	}
	if c.Port == 0 {
		c.Port = 8080
	}
	if c.ReadTimeout == "" {
		c.ReadTimeout = "1m"
	}
	if c.WriteTimeout == "" {
		c.WriteTimeout = "15m"
	}
	if c.ShutdownTimeout == "" {
		c.ShutdownTimeout = "30s"
	}
}

func (c *ServerConfig) validate() error {
	if c.Port < 1 || c.Port > 65535 {
		return fmt.Errorf("invalid port: %d", c.Port)
	}
	if _, err := time.ParseDuration(c.ReadTimeout); err != nil {
		return fmt.Errorf("invalid read_timeout: %w", err)
	}
	if _, err := time.ParseDuration(c.WriteTimeout); err != nil {
		return fmt.Errorf("invalid write_timeout: %w", err)
	}
	if _, err := time.ParseDuration(c.ShutdownTimeout); err != nil {
		return fmt.Errorf("invalid shutdown_timeout: %w", err)
	}
	return nil
}
```

**File:** `internal/config/api.go`

```go
package config

import (
	"fmt"
	"os"

	"github.com/JaimeStill/go-lit/pkg/middleware"
	"github.com/JaimeStill/go-lit/pkg/openapi"
)

var corsEnv = &middleware.CORSEnv{
	Enabled:          "API_CORS_ENABLED",
	Origins:          "API_CORS_ORIGINS",
	AllowedMethods:   "API_CORS_ALLOWED_METHODS",
	AllowedHeaders:   "API_CORS_ALLOWED_HEADERS",
	AllowCredentials: "API_CORS_ALLOW_CREDENTIALS",
	MaxAge:           "API_CORS_MAX_AGE",
}

var openAPIEnv = &openapi.ConfigEnv{
	Title:       "API_OPENAPI_TITLE",
	Description: "API_OPENAPI_DESCRIPTION",
}

// APIConfig contains API module configuration.
type APIConfig struct {
	BasePath string                `toml:"base_path"`
	CORS     middleware.CORSConfig `toml:"cors"`
	OpenAPI  openapi.Config        `toml:"openapi"`
}

// Finalize applies defaults, loads environment overrides, and validates nested configurations.
func (c *APIConfig) Finalize() error {
	c.loadDefaults()
	c.loadEnv()

	if err := c.CORS.Finalize(corsEnv); err != nil {
		return fmt.Errorf("cors: %w", err)
	}
	if err := c.OpenAPI.Finalize(openAPIEnv); err != nil {
		return fmt.Errorf("openapi: %w", err)
	}
	return nil
}

// Merge applies non-zero values from the overlay configuration.
func (c *APIConfig) Merge(overlay *APIConfig) {
	if overlay.BasePath != "" {
		c.BasePath = overlay.BasePath
	}
	c.CORS.Merge(&overlay.CORS)
	c.OpenAPI.Merge(&overlay.OpenAPI)
}

func (c *APIConfig) loadDefaults() {
	if c.BasePath == "" {
		c.BasePath = "/api"
	}
}

func (c *APIConfig) loadEnv() {
	if v := os.Getenv("API_BASE_PATH"); v != "" {
		c.BasePath = v
	}
}
```

**File:** `internal/config/logging.go`

```go
package config

import "os"

const (
	// EnvLoggingLevel overrides the logging level.
	EnvLoggingLevel = "LOGGING_LEVEL"

	// EnvLoggingFormat overrides the logging format.
	EnvLoggingFormat = "LOGGING_FORMAT"
)

// LoggingConfig contains logging configuration.
type LoggingConfig struct {
	Level  LogLevel  `toml:"level"`
	Format LogFormat `toml:"format"`
}

// Finalize applies defaults, loads environment overrides, and validates the logging configuration.
func (c *LoggingConfig) Finalize() error {
	c.loadDefaults()
	c.loadEnv()
	return c.validate()
}

// Merge applies values from overlay configuration that differ from zero values.
func (c *LoggingConfig) Merge(overlay *LoggingConfig) {
	if overlay.Level != "" {
		c.Level = overlay.Level
	}
	if overlay.Format != "" {
		c.Format = overlay.Format
	}
}

func (c *LoggingConfig) loadEnv() {
	if v := os.Getenv(EnvLoggingLevel); v != "" {
		c.Level = LogLevel(v)
	}
	if v := os.Getenv(EnvLoggingFormat); v != "" {
		c.Format = LogFormat(v)
	}
}

func (c *LoggingConfig) loadDefaults() {
	if c.Level == "" {
		c.Level = LogLevelInfo
	}
	if c.Format == "" {
		c.Format = LogFormatJSON
	}
}

func (c *LoggingConfig) validate() error {
	if err := c.Level.Validate(); err != nil {
		return err
	}
	if err := c.Format.Validate(); err != nil {
		return err
	}
	return nil
}
```

**File:** `internal/config/config.go`

```go
// Package config provides application configuration management with support for
// TOML files, environment variable overrides, and configuration overlays.
package config

import (
	"fmt"
	"os"
	"time"

	"github.com/pelletier/go-toml/v2"
)

const (
	// BaseConfigFile is the primary configuration file name.
	BaseConfigFile = "config.toml"

	// OverlayConfigPattern is the file name pattern for environment-specific overlays.
	OverlayConfigPattern = "config.%s.toml"

	EnvServiceDomain = "SERVICE_DOMAIN"

	// EnvServiceEnv specifies the environment name for configuration overlays.
	EnvServiceEnv = "SERVICE_ENV"

	// EnvServiceShutdownTimeout overrides the service shutdown timeout.
	EnvServiceShutdownTimeout = "SERVICE_SHUTDOWN_TIMEOUT"

	EnvServiceVersion = "SERVICE_VERSION"
)

// Config represents the root service configuration.
type Config struct {
	Server          ServerConfig  `toml:"server"`
	Logging         LoggingConfig `toml:"logging"`
	API             APIConfig     `toml:"api"`
	Domain          string        `toml:"domain"`
	ShutdownTimeout string        `toml:"shutdown_timeout"`
	Version         string        `toml:"version"`
}

// Env returns the current environment name from the SERVICE_ENV variable or "local".
func (c *Config) Env() string {
	if env := os.Getenv(EnvServiceEnv); env != "" {
		return env
	}
	return "local"
}

// ShutdownTimeoutDuration parses and returns the shutdown timeout as a time.Duration.
func (c *Config) ShutdownTimeoutDuration() time.Duration {
	d, _ := time.ParseDuration(c.ShutdownTimeout)
	return d
}

// Load reads and parses the base configuration file and applies any environment-specific overlay.
func Load() (*Config, error) {
	cfg, err := load(BaseConfigFile)
	if err != nil {
		return nil, err
	}

	if path := overlayPath(); path != "" {
		overlay, err := load(path)
		if err != nil {
			return nil, fmt.Errorf("load overlay %s: %w", path, err)
		}
		cfg.Merge(overlay)
	}

	if err := cfg.finalize(); err != nil {
		return nil, fmt.Errorf("finalize config: %w", err)
	}

	return cfg, nil
}

// Finalize applies defaults, loads environment overrides, and validates the configuration.
func (c *Config) finalize() error {
	c.loadDefaults()
	c.loadEnv()

	if err := c.validate(); err != nil {
		return err
	}
	if err := c.Server.Finalize(); err != nil {
		return fmt.Errorf("server: %w", err)
	}
	if err := c.Logging.Finalize(); err != nil {
		return fmt.Errorf("logging: %w", err)
	}
	if err := c.API.Finalize(); err != nil {
		return fmt.Errorf("api: %w", err)
	}
	return nil
}

// Merge applies values from overlay configuration that differ from zero values.
func (c *Config) Merge(overlay *Config) {
	if overlay.Domain != "" {
		c.Domain = overlay.Domain
	}
	if overlay.ShutdownTimeout != "" {
		c.ShutdownTimeout = overlay.ShutdownTimeout
	}
	if overlay.Version != "" {
		c.Version = overlay.Version
	}
	c.Server.Merge(&overlay.Server)
	c.Logging.Merge(&overlay.Logging)
	c.API.Merge(&overlay.API)
}

func (c *Config) loadDefaults() {
	if c.Domain == "" {
		c.Domain = "http://localhost:8080"
	}
	if c.ShutdownTimeout == "" {
		c.ShutdownTimeout = "30s"
	}
	if c.Version == "" {
		c.Version = "0.1.0"
	}
}

func (c *Config) loadEnv() {
	if v := os.Getenv(EnvServiceDomain); v != "" {
		c.Domain = v
	}
	if v := os.Getenv(EnvServiceShutdownTimeout); v != "" {
		c.ShutdownTimeout = v
	}
	if v := os.Getenv(EnvServiceVersion); v != "" {
		c.Version = v
	}
}

func (c *Config) validate() error {
	if _, err := time.ParseDuration(c.ShutdownTimeout); err != nil {
		return fmt.Errorf("invalid shutdown_timeout: %w", err)
	}
	return nil
}

func load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config: %w", err)
	}

	var cfg Config
	if err := toml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}

	return &cfg, nil
}

func overlayPath() string {
	if env := os.Getenv(EnvServiceEnv); env != "" {
		overlayPath := fmt.Sprintf(OverlayConfigPattern, env)
		if _, err := os.Stat(overlayPath); err == nil {
			return overlayPath
		}
	}
	return ""
}
```

**File:** `config.toml`

```toml
domain = "http://localhost:8080"
version = "0.1.0"
shutdown_timeout = "30s"

[server]
host = "0.0.0.0"
port = 8080
read_timeout = "1m"
write_timeout = "15m"
shutdown_timeout = "30s"

[api]
base_path = "/api"

[api.cors]
enabled = true
origins = ["http://localhost:8080"]
allowed_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
allowed_headers = ["Content-Type", "Authorization"]
allow_credentials = false
max_age = 3600

[api.openapi]
title = "Go-Lit API"
description = "Agent execution API for Go-Lit POC"

[logging]
level = "info"
format = "text"
```

### 2.2 cmd/server

**Note:** This follows the cold/hot startup pattern with lifecycle coordination, without database initialization.

**File:** `cmd/server/main.go`

```go
package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/JaimeStill/go-lit/internal/config"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("config load failed:", err)
	}

	srv, err := NewServer(cfg)
	if err != nil {
		log.Fatal("service init failed:", err)
	}

	if err := srv.Start(); err != nil {
		log.Fatal("service start failed:", err)
	}

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	<-sigChan

	if err := srv.Shutdown(cfg.ShutdownTimeoutDuration()); err != nil {
		log.Fatal("shutdown failed:", err)
	}

	log.Println("service stopped gracefully")
}
```

**File:** `cmd/server/server.go`

```go
package main

import (
	"log/slog"
	"os"
	"time"

	"github.com/JaimeStill/go-lit/internal/config"
	"github.com/JaimeStill/go-lit/pkg/lifecycle"
)

// Server coordinates the lifecycle of all subsystems.
type Server struct {
	lifecycle *lifecycle.Coordinator
	logger    *slog.Logger
	http      *httpServer
}

// NewServer creates and initializes the service with all subsystems.
func NewServer(cfg *config.Config) (*Server, error) {
	lc := lifecycle.New()
	logger := newLogger(&cfg.Logging)

	router := buildRouter(lc)

	modules, err := NewModules(cfg, logger)
	if err != nil {
		return nil, err
	}
	modules.Mount(router)

	logger.Info(
		"server initialized",
		"addr", cfg.Server.Addr(),
		"version", cfg.Version,
	)

	return &Server{
		lifecycle: lc,
		logger:    logger,
		http:      newHTTPServer(&cfg.Server, router, logger),
	}, nil
}

// Start begins all subsystems and returns when they are ready.
func (s *Server) Start() error {
	s.logger.Info("starting service")

	if err := s.http.Start(s.lifecycle); err != nil {
		return err
	}

	go func() {
		s.lifecycle.WaitForStartup()
		s.logger.Info("all subsystems ready")
	}()

	return nil
}

// Shutdown gracefully stops all subsystems within the provided context deadline.
func (s *Server) Shutdown(timeout time.Duration) error {
	s.logger.Info("initiating shutdown")
	return s.lifecycle.Shutdown(timeout)
}

func newLogger(cfg *config.LoggingConfig) *slog.Logger {
	opts := &slog.HandlerOptions{
		Level: cfg.Level.ToSlogLevel(),
	}

	var handler slog.Handler
	if cfg.Format == config.LogFormatJSON {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		handler = slog.NewTextHandler(os.Stdout, opts)
	}

	return slog.New(handler)
}
```

**File:** `cmd/server/modules.go`

```go
package main

import (
	"log/slog"
	"net/http"

	"github.com/JaimeStill/go-lit/internal/api"
	"github.com/JaimeStill/go-lit/internal/config"
	"github.com/JaimeStill/go-lit/pkg/lifecycle"
	"github.com/JaimeStill/go-lit/pkg/module"
	"github.com/JaimeStill/go-lit/web/app"
	"github.com/JaimeStill/go-lit/web/scalar"
)

// Modules holds all application modules that are mounted to the router.
type Modules struct {
	API    *module.Module
	App    *module.Module
	Scalar *module.Module
}

// NewModules creates and configures all application modules.
func NewModules(cfg *config.Config, logger *slog.Logger) (*Modules, error) {
	apiModule, err := api.NewModule(cfg, logger)
	if err != nil {
		return nil, err
	}

	appModule, err := app.NewModule("/app", logger)
	if err != nil {
		return nil, err
	}

	scalarModule := scalar.NewModule("/scalar")

	return &Modules{
		API:    apiModule,
		App:    appModule,
		Scalar: scalarModule,
	}, nil
}

// Mount registers all modules with the router.
func (m *Modules) Mount(router *module.Router) {
	router.Mount(m.API)
	router.Mount(m.App)
	router.Mount(m.Scalar)
}

func buildRouter(lc *lifecycle.Coordinator) *module.Router {
	router := module.NewRouter()

	router.HandleNative("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	router.HandleNative("GET /readyz", func(w http.ResponseWriter, r *http.Request) {
		if !lc.Ready() {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte("NOT READY"))
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("READY"))
	})

	return router
}
```

**File:** `cmd/server/http.go`

```go
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/JaimeStill/go-lit/internal/config"
	"github.com/JaimeStill/go-lit/pkg/lifecycle"
)

type httpServer struct {
	http            *http.Server
	logger          *slog.Logger
	shutdownTimeout time.Duration
}

func newHTTPServer(cfg *config.ServerConfig, handler http.Handler, logger *slog.Logger) *httpServer {
	return &httpServer{
		http: &http.Server{
			Addr:         cfg.Addr(),
			Handler:      handler,
			ReadTimeout:  cfg.ReadTimeoutDuration(),
			WriteTimeout: cfg.WriteTimeoutDuration(),
		},
		logger:          logger.With("system", "http"),
		shutdownTimeout: cfg.ShutdownTimeoutDuration(),
	}
}

func (s *httpServer) Start(lc *lifecycle.Coordinator) error {
	go func() {
		s.logger.Info("server listening", "addr", s.http.Addr)
		if err := s.http.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			s.logger.Error("server error", "error", err)
		}
	}()

	lc.OnShutdown(func() {
		<-lc.Context().Done()
		s.logger.Info("shutting down server")

		shutdownCtx, cancel := context.WithTimeout(context.Background(), s.shutdownTimeout)
		defer cancel()

		if err := s.http.Shutdown(shutdownCtx); err != nil {
			s.logger.Error("server shutdown error", "error", err)
		} else {
			s.logger.Info("server shutdown complete")
		}
	})

	return nil
}
```

---

## Phase 3: Agents Domain

### 3.1 internal/agents

**File:** `internal/agents/errors.go`

```go
package agents

import (
	"errors"
	"net/http"
)

var (
	ErrExecution = errors.New("execution error")
	ErrInvalidConfig = errors.New("invalid configuration")
	ErrInvalidRequest = errors.New("invalid request")
)

func MapHTTPStatus(err error) int {
	switch {
	case errors.Is(err, ErrInvalidConfig), errors.Is(err, ErrInvalidRequest):
		return http.StatusBadRequest
	case errors.Is(err, ErrExecution):
		return http.StatusInternalServerError
	default:
		return http.StatusInternalServerError
	}
}
```

**File:** `internal/agents/requests.go`

```go
package agents

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"

	"github.com/JaimeStill/go-agents/pkg/config"
)

type ChatStreamRequest struct {
	Config config.AgentConfig `json:"config"`
	Prompt string             `json:"prompt"`
}

type VisionForm struct {
	Config  config.AgentConfig
	Prompt  string
	Images  []string
	Options map[string]any
	Token   string
}

func ParseVisionForm(r *http.Request, maxMemory int64) (*VisionForm, error) {
	if err := r.ParseMultipartForm(maxMemory); err != nil {
		return nil, fmt.Errorf("parsing multipart form: %w", err)
	}

	configJSON := r.FormValue("config")
	var cfg config.AgentConfig
	if err := json.Unmarshal([]byte(configJSON), &cfg); err != nil {
		return nil, fmt.Errorf("parsing config: %w", err)
	}

	prompt := r.FormValue("prompt")
	if prompt == "" {
		return nil, fmt.Errorf("prompt is required")
	}

	files := r.MultipartForm.File["images[]"]
	if len(files) == 0 {
		files = r.MultipartForm.File["images"]
	}

	images := make([]string, 0, len(files))
	for _, fh := range files {
		dataURI, err := fileToDataURI(fh)
		if err != nil {
			return nil, fmt.Errorf("processing image %s: %w", fh.Filename, err)
		}
		images = append(images, dataURI)
	}

	return &VisionForm{
		Config: cfg,
		Prompt: prompt,
		Images: images,
	}, nil
}

func fileToDataURI(fh *multipart.FileHeader) (string, error) {
	file, err := fh.Open()
	if err != nil {
		return "", err
	}
	defer file.Close()

	contentType := fh.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		return "", fmt.Errorf("invalid content type: %s", contentType)
	}

	data, err := io.ReadAll(file)
	if err != nil {
		return "", err
	}

	encoded := base64.StdEncoding.EncodeToString(data)
	return fmt.Sprintf("data:%s;base64,%s", contentType, encoded), nil
}
```

**File:** `internal/agents/handler.go`

```go
package agents

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/JaimeStill/go-agents/pkg/agent"
	"github.com/JaimeStill/go-agents/pkg/config"
	"github.com/JaimeStill/go-agents/pkg/response"
	"github.com/JaimeStill/go-lit/pkg/handlers"
	"github.com/JaimeStill/go-lit/pkg/routes"
)

const maxFormMemory = 32 << 20

type Handler struct {
	logger *slog.Logger
}

func NewHandler(logger *slog.Logger) *Handler {
	return &Handler{logger: logger}
}

func (h *Handler) Routes() routes.Group {
	return routes.Group{
		Prefix:  "",
		Tags:    []string{"Execution"},
		Schemas: Schemas,
		Routes: []routes.Route{
			{Method: "POST", Pattern: "/chat", Handler: h.ChatStream, OpenAPI: Spec.ChatStream},
			{Method: "POST", Pattern: "/vision", Handler: h.VisionStream, OpenAPI: Spec.VisionStream},
		},
	}
}

func (h *Handler) ChatStream(w http.ResponseWriter, r *http.Request) {
	var req ChatStreamRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		handlers.RespondError(w, h.logger, http.StatusBadRequest, fmt.Errorf("%w: %v", ErrInvalidRequest, err))
		return
	}

	if req.Prompt == "" {
		handlers.RespondError(w, h.logger, http.StatusBadRequest, fmt.Errorf("%w: prompt is required", ErrInvalidRequest))
		return
	}

	cfg := config.DefaultAgentConfig()
	cfg.Merge(&req.Config)

	a, err := agent.New(cfg)
	if err != nil {
		handlers.RespondError(w, h.logger, http.StatusBadRequest, fmt.Errorf("%w: %v", ErrInvalidConfig, err))
		return
	}

	chunks, err := a.ChatStream(r.Context(), req.Prompt)
	if err != nil {
		handlers.RespondError(w, h.logger, http.StatusInternalServerError, fmt.Errorf("%w: %v", ErrExecution, err))
		return
	}

	h.writeSSEStream(w, r, chunks)
}

func (h *Handler) VisionStream(w http.ResponseWriter, r *http.Request) {
	form, err := ParseVisionForm(r, maxFormMemory)
	if err != nil {
		handlers.RespondError(w, h.logger, http.StatusBadRequest, fmt.Errorf("%w: %v", ErrInvalidRequest, err))
		return
	}

	cfg := config.DefaultAgentConfig()
	cfg.Merge(&form.Config)

	a, err := agent.New(cfg)
	if err != nil {
		handlers.RespondError(w, h.logger, http.StatusBadRequest, fmt.Errorf("%w: %v", ErrInvalidConfig, err))
		return
	}

	chunks, err := a.VisionStream(r.Context(), form.Prompt, form.Images)
	if err != nil {
		handlers.RespondError(w, h.logger, http.StatusInternalServerError, fmt.Errorf("%w: %v", ErrExecution, err))
		return
	}

	h.writeSSEStream(w, r, chunks)
}

func (h *Handler) writeSSEStream(w http.ResponseWriter, r *http.Request, stream <-chan *response.StreamingChunk) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)

	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}

	for chunk := range stream {
		if chunk.Error != nil {
			data, _ := json.Marshal(map[string]string{"error": chunk.Error.Error()})
			fmt.Fprintf(w, "data: %s\n\n", data)
			if f, ok := w.(http.Flusher); ok {
				f.Flush()
			}
			return
		}

		select {
		case <-r.Context().Done():
			return
		default:
		}

		data, err := json.Marshal(chunk)
		if err != nil {
			h.logger.Error("failed to marshal chunk", "error", err)
			continue
		}

		fmt.Fprintf(w, "data: %s\n\n", data)
		if f, ok := w.(http.Flusher); ok {
			f.Flush()
		}
	}

	fmt.Fprintf(w, "data: [DONE]\n\n")
	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}
}
```

**File:** `internal/agents/openapi.go`

```go
package agents

import "github.com/JaimeStill/go-lit/pkg/openapi"

var Spec = struct {
	ChatStream   *openapi.Operation
	VisionStream *openapi.Operation
}{
	ChatStream: &openapi.Operation{
		Summary:     "Stream chat response",
		Description: "Execute a chat prompt and stream the response via SSE",
		RequestBody: openapi.RequestBodyJSON("ChatStreamRequest", true),
		Responses: map[int]*openapi.Response{
			200: {
				Description: "SSE stream of chat response chunks",
				Content: map[string]*openapi.MediaType{
					"text/event-stream": {},
				},
			},
			400: openapi.ResponseJSON("Invalid request", "Error"),
			500: openapi.ResponseJSON("Execution error", "Error"),
		},
	},
	VisionStream: &openapi.Operation{
		Summary:     "Stream vision response",
		Description: "Execute a vision prompt with images and stream the response via SSE",
		RequestBody: &openapi.RequestBody{
			Required: true,
			Content: map[string]*openapi.MediaType{
				"multipart/form-data": {
					Schema: &openapi.Schema{
						Type: "object",
						Properties: map[string]*openapi.Schema{
							"config":   {Type: "string", Description: "JSON-encoded AgentConfig"},
							"prompt":   {Type: "string", Description: "Vision prompt"},
							"images[]": {Type: "array", Items: &openapi.Schema{Type: "string", Format: "binary"}},
						},
						Required: []string{"config", "prompt", "images[]"},
					},
				},
			},
		},
		Responses: map[int]*openapi.Response{
			200: {
				Description: "SSE stream of vision response chunks",
				Content: map[string]*openapi.MediaType{
					"text/event-stream": {},
				},
			},
			400: openapi.ResponseJSON("Invalid request", "Error"),
			500: openapi.ResponseJSON("Execution error", "Error"),
		},
	},
}

var Schemas = map[string]*openapi.Schema{
	"ChatStreamRequest": {
		Type:     "object",
		Required: []string{"prompt"},
		Properties: map[string]*openapi.Schema{
			"config": {
				Type:        "object",
				Description: "Agent configuration (go-agents AgentConfig)",
			},
			"prompt": {Type: "string", Description: "User prompt"},
		},
	},
	"Error": {
		Type: "object",
		Properties: map[string]*openapi.Schema{
			"error": {Type: "string"},
		},
	},
}
```

### 3.2 internal/api

**File:** `internal/api/routes.go`

```go
package api

import (
	"log/slog"
	"net/http"

	"github.com/JaimeStill/go-lit/internal/agents"
	"github.com/JaimeStill/go-lit/internal/config"
	"github.com/JaimeStill/go-lit/pkg/openapi"
	"github.com/JaimeStill/go-lit/pkg/routes"
)

func registerRoutes(mux *http.ServeMux, spec *openapi.Spec, cfg *config.Config, logger *slog.Logger) {
	handler := agents.NewHandler(logger)

	routes.Register(
		mux,
		cfg.API.BasePath,
		spec,
		handler.Routes(),
	)
}
```

**File:** `internal/api/api.go`

```go
package api

import (
	"log/slog"
	"net/http"

	"github.com/JaimeStill/go-lit/internal/config"
	"github.com/JaimeStill/go-lit/pkg/middleware"
	"github.com/JaimeStill/go-lit/pkg/module"
	"github.com/JaimeStill/go-lit/pkg/openapi"
)

// NewModule creates the API module with domain handlers and middleware.
func NewModule(cfg *config.Config, logger *slog.Logger) (*module.Module, error) {
	spec := openapi.NewSpec(cfg.API.OpenAPI.Title, cfg.Version)
	spec.SetDescription(cfg.API.OpenAPI.Description)
	spec.AddServer(cfg.Domain)

	mux := http.NewServeMux()
	registerRoutes(mux, spec, cfg, logger)

	specBytes, err := openapi.MarshalJSON(spec)
	if err != nil {
		return nil, err
	}
	mux.HandleFunc("GET /openapi.json", openapi.ServeSpec(specBytes))

	m := module.New(cfg.API.BasePath, mux)
	m.Use(middleware.CORS(&cfg.API.CORS))
	m.Use(middleware.Logger(logger))

	return m, nil
}
```

**Verification:** `go build ./cmd/server`

---

## Phase 4: Web Build Infrastructure

### 4.1 Package Configuration

**File:** `web/package.json`

```json
{
  "name": "go-lit-web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "vite build",
    "watch": "vite build --watch"
  },
  "dependencies": {
    "lit": "^3.2.0",
    "@lit/context": "^1.1.0",
    "@lit-labs/signals": "^1.0.0"
  },
  "devDependencies": {
    "@scalar/api-reference": "^1.25.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

**File:** `web/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "paths": {
      "@app/*": ["./app/client/*"]
    }
  },
  "include": ["app/client/**/*", "scalar/**/*"]
}
```

**File:** `web/vite.client.ts`

```typescript
import { resolve } from 'path';
import type { PreRenderedAsset, PreRenderedChunk, RollupOptions } from 'rollup';
import type { UserConfig } from 'vite';

export interface ClientConfig {
  name: string;
  input?: string;
  output?: {
    entryFileNames?: string | ((chunk: PreRenderedChunk) => string);
    assetFileNames?: string | ((asset: PreRenderedAsset) => string);
  };
  aliases?: Record<string, string>;
}

const root = __dirname;

export function merge(clients: ClientConfig[]): UserConfig {
  return {
    build: {
      outDir: '.',
      emptyOutDir: false,
      rollupOptions: mergeRollup(clients),
    },
    resolve: mergeResolve(clients),
  };
}

function defaultInput(name: string) {
  return resolve(root, `${name}/client/app.ts`);
}

function defaultEntry(name: string) {
  return `${name}/dist/app.js`;
}

function defaultAssets(name: string) {
  return `${name}/dist/[name][extname]`;
}

function mergeRollup(clients: ClientConfig[]): RollupOptions {
  return {
    input: Object.fromEntries(
      clients.map((c) => [c.name, c.input ?? defaultInput(c.name)])
    ),
    output: {
      entryFileNames: (chunk: PreRenderedChunk): string => {
        const client = clients.find((c) => c.name === chunk.name);
        const custom = client?.output?.entryFileNames;
        if (custom) return typeof custom === 'function' ? custom(chunk) : custom;
        return defaultEntry(chunk.name);
      },
      assetFileNames: (asset: PreRenderedAsset): string => {
        const originalPath = asset.originalFileNames?.[0] ?? '';
        const client = clients.find((c) => originalPath.startsWith(`${c.name}/`));
        if (client?.output?.assetFileNames) {
          const custom = client.output.assetFileNames;
          return typeof custom === 'function' ? custom(asset) : custom;
        }
        return client ? defaultAssets(client.name) : 'app/dist/[name][extname]';
      },
    },
  };
}

function mergeResolve(clients: ClientConfig[]): UserConfig['resolve'] {
  return {
    alias: Object.assign({}, ...clients.map((c) => c.aliases ?? {})),
  };
}
```

**File:** `web/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import { merge } from './vite.client';
import appConfig from './app/client.config';
import scalarConfig from './scalar/client.config';

export default defineConfig(merge([appConfig, scalarConfig]));
```

### 4.2 App Client Config

**File:** `web/app/client.config.ts`

```typescript
import { resolve } from 'path';
import type { ClientConfig } from '../vite.client';

const root = __dirname;

const config: ClientConfig = {
  name: 'app',
  aliases: {
    '@app/design': resolve(root, 'client/design'),
    '@app/router': resolve(root, 'client/router'),
    '@app/shared': resolve(root, 'client/shared'),
    '@app/agents': resolve(root, 'client/agents'),
  },
};

export default config;
```

### 4.3 Scalar Module

**File:** `web/scalar/client.config.ts`

```typescript
import { resolve } from 'path';
import type { ClientConfig } from '../vite.client';

const config: ClientConfig = {
  name: 'scalar',
  input: resolve(__dirname, 'app.ts'),
  output: {
    entryFileNames: 'scalar/scalar.js',
    assetFileNames: 'scalar/scalar.css',
  },
};

export default config;
```

**File:** `web/scalar/app.ts`

```typescript
import { createApiReference } from '@scalar/api-reference';
import '@scalar/api-reference/style.css';

createApiReference('#api-reference', {
  url: '/api/openapi.json',
  withDefaultFonts: false,
});
```

**File:** `web/scalar/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <base href="{{ .BasePath }}/">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Documentation - Go-Lit</title>
  <link rel="stylesheet" href="scalar.css">
  <style>
    :root {
      --scalar-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      --scalar-font-code: ui-monospace, 'Cascadia Code', 'SF Mono', Menlo, Monaco, Consolas, monospace;
    }
  </style>
</head>
<body>
  <div id="api-reference"></div>
  <script type="module" src="scalar.js"></script>
</body>
</html>
```

**File:** `web/scalar/scalar.go`

```go
// Package scalar provides the interactive API documentation handler using Scalar UI.
// Assets are embedded at compile time for zero-dependency deployment.
package scalar

import (
	"embed"
	"html/template"
	"net/http"

	"github.com/JaimeStill/go-lit/pkg/module"
)

//go:embed index.html scalar.css scalar.js
var staticFS embed.FS

// NewModule creates the Scalar documentation module at the given base path.
func NewModule(basePath string) *module.Module {
	router := buildRouter(basePath)
	return module.New(basePath, router)
}

func buildRouter(basePath string) http.Handler {
	mux := http.NewServeMux()

	tmpl := template.Must(template.ParseFS(staticFS, "index.html"))
	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		tmpl.Execute(w, map[string]string{"BasePath": basePath})
	})

	mux.Handle("GET /", http.FileServer(http.FS(staticFS)))

	return mux
}
```

**Verification:** `cd web && bun install && bun run build`

---

## Phase 5: Client Foundation

### 5.1 Design System

**File:** `web/app/client/design/styles.css`

```css
@layer reset, theme, layout, components;

@import url(./reset.css);
@import url(./theme.css);
@import url(./layout.css);
@import url(./components.css);
```

**File:** `web/app/client/design/reset.css`

```css
@layer reset {

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  * {
    margin: 0;
  }

  body {
    min-height: 100svh;
    line-height: 1.5;
  }

  img,
  picture,
  video,
  canvas,
  svg {
    display: block;
    max-width: 100%;
  }

  @media (prefers-reduced-motion: no-preference) {
    :has(:target) {
      scroll-behavior: smooth;
    }
  }
}
```

**File:** `web/app/client/design/theme.css`

```css
@layer theme {
  :root {
    color-scheme: dark light;

    --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    --font-mono: ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg: hsl(0, 0%, 7%);
      --bg-1: hsl(0, 0%, 12%);
      --bg-2: hsl(0, 0%, 18%);
      --color: hsl(0, 0%, 93%);
      --color-1: hsl(0, 0%, 80%);
      --color-2: hsl(0, 0%, 65%);
      --divider: hsl(0, 0%, 25%);

      --blue: hsl(210, 100%, 70%);
      --blue-bg: hsl(210, 50%, 20%);
      --green: hsl(140, 70%, 55%);
      --green-bg: hsl(140, 40%, 18%);
      --red: hsl(0, 85%, 65%);
      --red-bg: hsl(0, 50%, 20%);
      --yellow: hsl(45, 90%, 60%);
      --yellow-bg: hsl(45, 50%, 18%);
      --orange: hsl(25, 95%, 65%);
      --orange-bg: hsl(25, 50%, 20%);
    }
  }

  @media (prefers-color-scheme: light) {
    :root {
      --bg: hsl(0, 0%, 100%);
      --bg-1: hsl(0, 0%, 96%);
      --bg-2: hsl(0, 0%, 92%);
      --color: hsl(0, 0%, 10%);
      --color-1: hsl(0, 0%, 30%);
      --color-2: hsl(0, 0%, 45%);
      --divider: hsl(0, 0%, 80%);

      --blue: hsl(210, 90%, 45%);
      --blue-bg: hsl(210, 80%, 92%);
      --green: hsl(140, 60%, 35%);
      --green-bg: hsl(140, 50%, 90%);
      --red: hsl(0, 70%, 50%);
      --red-bg: hsl(0, 70%, 93%);
      --yellow: hsl(45, 80%, 40%);
      --yellow-bg: hsl(45, 80%, 88%);
      --orange: hsl(25, 85%, 50%);
      --orange-bg: hsl(25, 75%, 90%);
    }
  }

  body {
    font-family: var(--font-sans);
    background-color: var(--bg);
    color: var(--color);
  }

  pre,
  code {
    font-family: var(--font-mono);
  }
}
```

**File:** `web/app/client/design/layout.css`

```css
@layer layout {
  :root {
    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-5: 1.25rem;
    --space-6: 1.5rem;
    --space-8: 2rem;
    --space-10: 2.5rem;
    --space-12: 3rem;
    --space-16: 4rem;

    --text-xs: 0.75rem;
    --text-sm: 0.875rem;
    --text-base: 1rem;
    --text-lg: 1.125rem;
    --text-xl: 1.25rem;
    --text-2xl: 1.5rem;
    --text-3xl: 1.875rem;
    --text-4xl: 2.25rem;
  }
}
```

**File:** `web/app/client/design/components.css`

```css
@layer components {
  /* Component styles will be added as needed */
}
```

### 5.2 App Entry Point

**File:** `web/app/client/app.ts`

```typescript
import './design/styles.css';
```

This minimal entry point imports the CSS design system. The client-side router and Lit components will be added in Session 2.

**Verification:** `cd web && bun run build`

---

## Phase 6: Integration

### 6.1 App Go Module

**File:** `web/app/app.go`

```go
package app

import (
	"embed"
	"net/http"

	"github.com/JaimeStill/go-lit/pkg/module"
	"github.com/JaimeStill/go-lit/pkg/web"
)

//go:embed dist/*
var distFS embed.FS

//go:embed public/*
var publicFS embed.FS

//go:embed server/layouts/*
var layoutFS embed.FS

//go:embed server/views/*
var viewFS embed.FS

var publicFiles = []string{
	"favicon.ico",
	"favicon-16x16.png",
	"favicon-32x32.png",
	"apple-touch-icon.png",
	"android-chrome-192x192.png",
	"android-chrome-512x512.png",
	"site.webmanifest",
}

var views = []web.ViewDef{
	{Route: "/{$}", Template: "home.html", Title: "Home", Bundle: "app"},
}

// NewModule creates the app module configured for the given base path.
func NewModule(basePath string) (*module.Module, error) {
	ts, err := web.NewTemplateSet(
		layoutFS,
		viewFS,
		"server/layouts/*.html",
		"server/views",
		basePath,
		views,
	)
	if err != nil {
		return nil, err
	}

	router := buildRouter(ts)
	return module.New(basePath, router), nil
}

func buildRouter(ts *web.TemplateSet) http.Handler {
	r := web.NewRouter()

	for _, view := range views {
		r.HandleFunc("GET "+view.Route, ts.ViewHandler("app.html", view))
	}

	r.Handle("GET /dist/", http.FileServer(http.FS(distFS)))

	for _, route := range web.PublicFileRoutes(publicFS, "public", publicFiles...) {
		r.HandleFunc(route.Method+" "+route.Pattern, route.Handler)
	}

	return r
}
```

### 6.2 Layout Template

**File:** `web/app/server/layouts/app.html`

```html
<!DOCTYPE html>
<html lang="en">

<head>
  <base href="{{ .BasePath }}/">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ .Title }} - Go Lit</title>
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png">
  <link rel="stylesheet" href="dist/{{ .Bundle }}.css">
</head>

<body>
  <main id="app-content">
    {{ block "content" . }}{{ end }}
  </main>
  <script type="module" src="dist/{{ .Bundle }}.js"></script>
</body>

</html>
```

### 6.3 Home View Template

**File:** `web/app/server/views/home.html`

```html
{{ define "content" }}
<h1>Go-Lit</h1>
<p>Shell rendered successfully. Client infrastructure coming in Session 2.</p>
{{ end }}
```

### 6.4 Modules Pattern

**File:** `cmd/server/modules.go`

```go
package main

import (
	"log/slog"
	"net/http"

	"github.com/JaimeStill/go-lit/internal/api"
	"github.com/JaimeStill/go-lit/internal/config"
	"github.com/JaimeStill/go-lit/pkg/lifecycle"
	"github.com/JaimeStill/go-lit/pkg/middleware"
	"github.com/JaimeStill/go-lit/pkg/module"
	"github.com/JaimeStill/go-lit/web/app"
	"github.com/JaimeStill/go-lit/web/scalar"
)

// Modules holds all application modules that are mounted to the router.
type Modules struct {
	API    *module.Module
	App    *module.Module
	Scalar *module.Module
}

// NewModules creates and configures all application modules.
func NewModules(cfg *config.Config, logger *slog.Logger) (*Modules, error) {
	apiModule, err := api.NewModule(cfg, logger)
	if err != nil {
		return nil, err
	}

	appModule, err := app.NewModule("/app")
	if err != nil {
		return nil, err
	}
	appModule.Use(middleware.Logger(logger))

	scalarModule := scalar.NewModule("/scalar")

	return &Modules{
		API:    apiModule,
		App:    appModule,
		Scalar: scalarModule,
	}, nil
}

// Mount registers all modules with the router.
func (m *Modules) Mount(router *module.Router) {
	router.Mount(m.API)
	router.Mount(m.App)
	router.Mount(m.Scalar)
}

func buildRouter(lc *lifecycle.Coordinator) *module.Router {
	router := module.NewRouter()

	router.HandleNative("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	router.HandleNative("GET /readyz", func(w http.ResponseWriter, r *http.Request) {
		if !lc.Ready() {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte("NOT READY"))
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("READY"))
	})

	return router
}
```

### 6.5 Server Integration

**File:** `cmd/server/server.go` (relevant changes)

```go
// Server coordinates the lifecycle of all subsystems.
type Server struct {
	lifecycle *lifecycle.Coordinator
	logger    *slog.Logger
	modules   *Modules
	http      *httpServer
}

// NewServer creates and initializes the service with all subsystems.
func NewServer(cfg *config.Config) (*Server, error) {
	lc := lifecycle.New()
	logger := newLogger(&cfg.Logging)

	modules, err := NewModules(cfg, logger)
	if err != nil {
		return nil, err
	}

	router := buildRouter(lc)
	modules.Mount(router)

	logger.Info(
		"server initialized",
		"addr", cfg.Server.Addr(),
		"version", cfg.Version,
	)

	return &Server{
		lifecycle: lc,
		logger:    logger,
		modules:   modules,
		http:      newHTTPServer(&cfg.Server, router, logger),
	}, nil
}
```

### 6.6 Public Assets

Favicon infrastructure files in `web/app/public/`:
- `favicon.ico`
- `apple-touch-icon.png`
- `favicon-32x32.png`
- `favicon-16x16.png`
- `android-chrome-192x192.png`
- `android-chrome-512x512.png`
- `site.webmanifest`

---

## Verification Checklist

**Server:**
- [ ] `go vet ./...` passes (after `make web`)
- [ ] `go run ./cmd/server` starts without errors
- [ ] `GET /healthz` returns `OK`
- [ ] `GET /readyz` returns `READY`
- [ ] `GET /api/openapi.json` returns valid OpenAPI spec
- [ ] `GET /scalar/` renders API documentation
- [ ] `GET /app/` serves shell template with CSS applied

**Build:**
- [ ] `cd web && bun install` succeeds
- [ ] `cd web && bun run build` generates `app/dist/app.js` and `app/dist/app.css`

---

## Next Steps (Session 2)

Session 2 will implement the client application:

**Shared Infrastructure:**
- `web/app/client/shared/types.ts` - Result, PageRequest, PageResult types
- `web/app/client/shared/api.ts` - API client wrapper

**Router:**
- `web/app/client/router/types.ts` - RouteConfig, RouteMatch
- `web/app/client/router/routes.ts` - Route definitions
- `web/app/client/router/router.ts` - Client-side router with history API

**Agents Domain:**
- `web/app/client/agents/types.ts` - AgentConfig, ChatStreamRequest, etc.
- `web/app/client/agents/interfaces.ts` - ConfigService, ExecutionService
- `web/app/client/agents/context.ts` - Lit context definitions
- `web/app/client/agents/services/` - Service implementations

**View Components:**
- `web/app/client/views/home-view.ts`
- `web/app/client/views/config-view.ts`
- `web/app/client/views/execute-view.ts`

**Updated app.ts:**
```typescript
import './design/styles.css';
import { Router } from './router/router';

import './views/home-view';
import './views/config-view';
import './views/execute-view';

const router = new Router('app-content');
router.start();
```
