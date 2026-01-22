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
