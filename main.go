package main

import (
	"context"
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"

	apppkg "wails-tool-template/internal/app"
	"wails-tool-template/internal/ops"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := apppkg.NewApp()
	api := apppkg.NewAPI(app) // only the API surface is bound to JS

	err := wails.Run(&options.App{
		Title:  "wails-tool-template",
		Width:  1100,
		Height: 720,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		OnStartup: func(ctx context.Context) {
			app.Startup(ctx)
			// Wire the Wails progress emitter — the one place internal/* touches
			// the Wails runtime. Frontend listens via EventsOn("op:progress").
			app.SetEmitter(ops.EmitterFunc(func(p ops.Progress) {
				wailsruntime.EventsEmit(ctx, "op:progress", p)
			}))
		},
		Bind: []any{api},
	})
	if err != nil {
		panic(err)
	}
}
