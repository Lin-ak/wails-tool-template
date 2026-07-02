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
  bridge/    typed facade over Wails bindings + TanStack Query hooks + progress events + errorMessage
  shared/    UI kit (Button, TextField, TextAreaField, SensitiveTextField, Switch,
             SegmentedControl, ConfirmDialog, ContextMenu, Panel,
             ProofPanel, StatusMessage, Spinner, EmptyState)
             + sanitizeSensitiveText (redact output before display) + clipboard
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

### Go version

`go.mod` pins **`go 1.23`** — a widely-installed version — so the backend builds
with whatever toolchain you already have, with no download. Two things worth
knowing:

- **Newer language features?** Bump the `go` directive (e.g. `go 1.24`) and, if
  you want to require an exact patch, add a `toolchain` line (e.g.
  `toolchain go1.24.2`).
- **`GOTOOLCHAIN=auto`** (Go's default) will *download* the toolchain named by
  the `go`/`toolchain` directives when it's higher than your local Go — handy on
  CI, but it needs network and silently fetches a new SDK. If you pin a version
  above what's installed, expect that download (or set `GOTOOLCHAIN=local` to
  fail fast instead).

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

**Normalize Wails errors before display.** A failed bound call rejects with the
Go error *string*, not an `Error` — so `(error as Error).message` is `undefined`
and the error box renders blank. Run any caught/rejected error through
`errorMessage` (`bridge/errorMessage.ts`) first; see `ExampleForm`.

**Seed initial form values via `defaultValue`, not RHF `defaultValues`.** A
React Aria-wrapped input (`TextField`/`SensitiveTextField`) does *not* pick up
React Hook Form's `defaultValues` for **display** — the value sits in RHF state
(so an unchanged field still submits it) but the field renders **blank**. Pass
the seed to the field's own `defaultValue` too (RAC's initial-value path),
sourced from the same place so display == submit. See `shared/TextField.tsx` and
its test. This silently breaks any "edit the existing value" form.

**Editing live state? read → seed → idempotent apply.** When a form edits
existing remote/system state (not a one-shot action): read the current values
and seed the form (via `defaultValue`); gate the section on that read with a
loading state and mount the form *after* it resolves so user edits aren't
clobbered by a late response; invalidate the read after a successful write; and
keep writes idempotent so an unchanged field is a safe no-op. Persist only
non-secret hints (host, username) across launches — never secrets.

**Safe writes: plan → confirm → apply → verify read-back.** Any write to an
external system should be provable, not assumed. The primitives live in
`internal/domain/diff.go`: build a **whitelisted diff** of current→planned
before writing (`BuildPreflight` / `BuildDiffForSubmittedFields` — any change
outside the whitelist blocks the write), show it for confirmation
(`shared/DiffList` inside `ConfirmDialog`), then after the write **verify the
read-back** (`VerifyPostWriteFields`: changed fields must be whitelisted;
readback fields must hold their planned values) and surface what landed
(`ProofPanel`'s read-back block, `shared/resultProof.ts`). `PlanExample` /
`ApplyExample` + `ExampleForm` demo the whole loop; mask secret values in a
diff with `MaskDiffValues`.

## Replace the `example` feature

`DoExample` (Go) and `features/example` (TS) are a vertical slice showing the
whole path: form → Zod → bridge → thin handler → `Runner` → classified `Result` →
redacted output. `PlanExample`/`ApplyExample` + `ExampleForm` add the safe-write
loop on top (preflight diff → confirm → apply → read-back verification). Delete
them and copy their shape for your real operations.
