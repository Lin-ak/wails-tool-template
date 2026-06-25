module wails-tool-template

go 1.23

// Wails and its dependencies are added by `go mod tidy` / `wails build`.
// The internal/* packages depend only on the standard library, so
// `go vet ./internal/...` and `go test ./internal/...` run offline.
