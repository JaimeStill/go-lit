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
