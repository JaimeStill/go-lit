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
