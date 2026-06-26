# wails-tool-template

A generic starter for **desktop tools that orchestrate native CLIs or
services** — cross-compiled to a single Windows binary from any host. It bakes in
the architecture and lessons of a real project so a new tool starts where the
last one ended, not at zero.

## Stack

| Layer | Choice |
|-------|--------|
| Shell | Wails v2 (Go ↔ WebView2) |
| Backend | Go — single static binary, `os/exec` + `context` for the boundary |
| Frontend | React 19 + TypeScript + Vite |
| Components | **React Aria Components** (unstyled, accessible) |
| Styling | **Tailwind v4** (`@tailwindcss/vite`, CSS-first `@theme`) + `tailwind-variants`; RAC state via native `data-[…]:` variants |
| Data / forms | TanStack Query · React Hook Form + Zod |
| Tooling | Vitest · Biome · Windows CI |

## Layout

```
main.go                     Wails bootstrap only (bind app + wire progress emitter)
internal/
  app/       thin handlers (DI seam, testable) — DoExample, ApplyExample, CancelOperation
  adapter/   Runner + typed Result taxonomy + Exec/Fake/Logging/Retry runners
  domain/    request normalization/validation + plan→confirm→execute (+ progress)
  ops/       cancellation Registry + progress Emitter
  logging/   slog logger + secret Redactor
  platform/  build-tagged OS specifics
frontend/src/
  bridge/    typed facade over Wails bindings + TanStack Query hooks + progress events
  shared/    UI kit (Button, TextField, SensitiveTextField, StatusMessage, Panel)
             + sanitizeSensitiveText (redact output before display)
  features/example/  ExamplePage, ExampleForm (RHF+Zod+RAC), ApplyOperation (progress+cancel)
.github/workflows/ci.yml    Windows backend CI + Linux frontend CI
doc/design/architecture.md  the boundary-layer playbook + rules
```

## Tailwind v4 + React Aria notes

- Tailwind v4 has **no `tailwind.config.js`**. Design tokens live in
  `frontend/src/app.css` via `@theme`.
- React Aria exposes component state as data-attributes; style them with
  Tailwind v4's native variants: `data-[hovered]:`, `data-[focused]:`,
  `data-[pressed]:`, `data-[focus-visible]:`, `data-[invalid]:`,
  `data-[disabled]:`. See `ExampleForm.tsx`. (No Tailwind plugin needed — the
  community RAC plugin's paired hover/focus variants don't register under v4's
  CSS-first `@plugin` loading.)
- Variant logic lives in `tailwind-variants` recipes (`tv(...)`), keeping the JSX
  free of long conditional class strings.

## Getting started

```bash
# 1. Rename the module + app
#    go.mod:  module your-tool
#    wails.json / main.go titles

# 2. Backend (works offline — internal/* is stdlib-only)
go vet ./internal/... && go test ./internal/...

# 3. Frontend
cd frontend && npm install
npm run build && npm test

# 4. Run the whole app (needs the Wails CLI + WebView2)
wails dev          # generates the TS bindings under frontend/wailsjs
wails build -platform windows/amd64
```

## Conventions

See [`doc/design/architecture.md`](doc/design/architecture.md). In short: every
external call goes through a `Runner` and returns a classified `Result`; every
dependency has a fake; handlers stay thin; redact at every boundary; mutations
are idempotent; CI runs on Windows.

**Sanitize output before display.** Any backend or CLI text shown in the UI —
stderr, command lines, config dumps, error messages — can echo a secret, so pass
it through `sanitizeSensitiveText` (`shared/sensitiveText.ts`) first; see
`ExampleForm`/`ApplyOperation`. It's the frontend complement to the backend
`Redactor`, and is deliberately conservative so it won't mangle paths or
ordinary error text (extend `SECRET_NAMES` for domain-specific field names).

## Replace the `example` feature

`DoExample` (Go) and `features/example` (TS) are a vertical slice showing the
whole path: form → Zod → bridge → thin handler → `Runner` → classified `Result` →
redacted output. Delete it and copy its shape for your real operations.
