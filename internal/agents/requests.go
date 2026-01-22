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
