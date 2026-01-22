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
