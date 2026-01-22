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
