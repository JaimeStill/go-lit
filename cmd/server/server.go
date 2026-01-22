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
