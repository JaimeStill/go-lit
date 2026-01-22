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
