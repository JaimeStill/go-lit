package agents

import (
	"errors"
	"net/http"
)

var (
	ErrExecution      = errors.New("execution error")
	ErrInvalidConfig  = errors.New("invalid configuration")
	ErrInvalidRequest = errors.New("invalid request")
)

func MapHTTPStatus(err error) int {
	switch {
	case errors.Is(err, ErrInvalidConfig), errors.Is(err, ErrInvalidRequest):
		return http.StatusBadRequest
	case errors.Is(err, ErrExecution):
		return http.StatusInternalServerError
	default:
		return http.StatusInternalServerError
	}
}
