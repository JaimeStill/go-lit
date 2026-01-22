package pagination

// Config holds pagination settings for controlling page size limits.
type Config struct {
	DefaultPageSize int `toml:"default_page_size"`
	MaxPageSize     int `toml:"max_page_size"`
}

// Finalize applies default values to any unset configuration fields.
func (c *Config) Finalize() error {
	c.loadDefaults()
	return nil
}

// Merge applies non-zero values from the overlay configuration.
func (c *Config) Merge(overlay *Config) {
	if overlay.DefaultPageSize > 0 {
		c.DefaultPageSize = overlay.DefaultPageSize
	}
	if overlay.MaxPageSize > 0 {
		c.MaxPageSize = overlay.MaxPageSize
	}
}

func (c *Config) loadDefaults() {
	if c.DefaultPageSize <= 0 {
		c.DefaultPageSize = 20
	}
	if c.MaxPageSize <= 0 {
		c.MaxPageSize = 100
	}
}

