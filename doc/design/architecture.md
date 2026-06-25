# Architecture — the boundary-layer playbook

This template exists to make one idea the default: **for a tool that drives the
messy real world (OS, native binaries, networks, remote services), the
architecture's job is to contain, observe, and test the boundary with that
world. Everything inside is comparatively easy.**

## Layers

```
frontend/         React 19 + React Aria Components + Tailwind v4 (+ TanStack Query, RHF/Zod)
   │  Wails bridge (generated TS ↔ Go bindings) + EventsOn("op:progress")
main.go           Wails bootstrap only: bind the app, wire the progress emitter.
internal/app      Thin handlers (testable, no Wails import): marshal → internal/* → marshal back.
internal/domain   Framework-agnostic logic: normalize, validate, plan (plan→confirm→execute→verify).
internal/adapter  The external boundary: Runner + typed Result taxonomy + Exec/Fake/Logging/Retry runners.
internal/ops      Operation lifecycle: cancellation Registry + progress Emitter.
internal/logging  slog logger + secret Redactor.
internal/platform Build-tagged OS specifics (hidden command window, etc.).
   │
External systems  CLI / RPC service (classified once, at the boundary).
```

## Runtime concerns (built in)

- **Runner middleware** — `LoggingRunner` logs every command + outcome; `RetryRunner`
  retries `KindTransient` with backoff. Compose them in `NewApp`; the rules become
  structure, not per-handler discipline.
- **Cancellation + progress** — `ops.Registry` gives each operation a cancellable
  context (`CancelOperation(id)`); `Plan.ExecuteWithProgress` streams `ops.Progress`
  to the UI via the Wails emitter wired in `main.go`.
- **Secret channel** — `Command.Stdin` carries secrets; they never touch argv.

## Rules (the "definition of done" for boundary code)

1. **Every external call goes through a `Runner`** and returns a classified
   `Result` (`internal/adapter`). Never string-match raw output at the call site.
2. **Each dependency has a fake.** Write the interface + `FakeRunner` responses
   before the real impl; every flow stays testable without the real system.
3. **Handlers stay thin.** `app.go` only marshals + orchestrates. Logic lives in
   `internal/*`, which imports nothing from Wails.
4. **Redact at every boundary.** Logs and displayed output both pass through a
   `logging.Redactor`. Prefer stdin/headers over argv for secrets.
5. **Mutations are idempotent.** Use `KindAlreadyDone` + `Step.AllowAlreadyDone`,
   and report partial completion (`domain.Committed`) honestly.
6. **CI runs on the target OS** (`windows-latest`) from commit #1.

## Where to extend

- New external system → a new file in `internal/adapter` with its own
  `Classifier`, or an RPC client that returns `adapter.Result` directly.
- New write flow → build a `domain.Plan` of `Step`s; run it with `Plan.Execute`.
- New screen → a folder under `frontend/src/features`, a Zod schema, a TanStack
  Query hook in `frontend/src/bridge`.
