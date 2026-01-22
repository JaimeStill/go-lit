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
		Prefix: "",
		Tags:   []string{"Execution"},
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

	a, err := agent.New(&cfg)
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

	a, err := agent.New(&cfg)
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
