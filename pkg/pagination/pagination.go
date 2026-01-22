// Package pagination provides request/response types for paginated API endpoints.
package pagination

import (
	"encoding/json"
	"net/url"
	"strconv"
)

// PageRequest contains pagination parameters from client requests.
type PageRequest struct {
	Page     int    `json:"page"`
	PageSize int    `json:"page_size"`
	Search   string `json:"search"`
	Sort     string `json:"sort"`
}

// PageResult wraps paginated data with metadata.
type PageResult[T any] struct {
	Data       []T `json:"data"`
	Total      int `json:"total"`
	Page       int `json:"page"`
	PageSize   int `json:"page_size"`
	TotalPages int `json:"total_pages"`
}

// PageRequestFromQuery extracts pagination parameters from URL query values.
// It applies the configuration limits to ensure valid page sizes.
func PageRequestFromQuery(query url.Values, cfg Config) PageRequest {
	page, _ := strconv.Atoi(query.Get("page"))
	pageSize, _ := strconv.Atoi(query.Get("page_size"))

	req := PageRequest{
		Page:     page,
		PageSize: pageSize,
		Search:   query.Get("search"),
		Sort:     query.Get("sort"),
	}

	req.Normalize(cfg)
	return req
}

// Normalize applies default values and enforces limits from the configuration.
func (p *PageRequest) Normalize(cfg Config) {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.PageSize < 1 {
		p.PageSize = cfg.DefaultPageSize
	}
	if p.PageSize > cfg.MaxPageSize {
		p.PageSize = cfg.MaxPageSize
	}
}

// Offset returns the zero-based offset for database queries.
func (p *PageRequest) Offset() int {
	return (p.Page - 1) * p.PageSize
}

// UnmarshalJSON provides flexible JSON parsing for PageRequest.
// It handles both "page_size" and "pageSize" field names.
func (p *PageRequest) UnmarshalJSON(data []byte) error {
	type alias PageRequest
	aux := &struct {
		PageSizeCamel int `json:"pageSize"`
		*alias
	}{
		alias: (*alias)(p),
	}

	if err := json.Unmarshal(data, aux); err != nil {
		return err
	}

	if p.PageSize == 0 && aux.PageSizeCamel > 0 {
		p.PageSize = aux.PageSizeCamel
	}

	return nil
}

