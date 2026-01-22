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
