# Gotchas

Cross-cutting traps distilled from real Wails-tool projects built on this
template. Each entry is a bug that cost time once and is invisible until it
bites. Some are already handled in the skeleton (noted **✅ handled**); others
are **recipes** you'll want the moment you hit that situation (noted
**⚑ situational**) and aren't wired into the bare template.

---

## React Aria Components

### `defaultValue` vs RHF `defaultValues` — edit forms render blank ✅ handled
A React Aria-wrapped input (`TextField`/`SensitiveTextField`) does **not** pick up
React Hook Form's `defaultValues` for **display**. The value sits in RHF state (so
an unchanged field still submits it) but the field renders **empty** — which
silently breaks every "edit the existing value" form. Seed the field's own RAC
`defaultValue` too, from the same source, so display == submit. See
`shared/TextField.tsx` and its test, and the README "Seed initial form values"
note.

### `ConfirmDialog` reports `role="alertdialog"`, not `dialog` ✅ handled
`shared/ConfirmDialog` is a RAC `Dialog` with `role="alertdialog"` (it's a
confirm/alert, not a generic modal). Playwright/`getByRole`/testing-library
queries for `getByRole("dialog")` return **nothing**. Query
`getByRole("alertdialog")`. See `e2e/example.spec.ts`.

### `DisclosurePanel hidden="until-found"` leaves an empty chrome strip
RAC's `DisclosurePanel` keeps the element in the DOM (collapsed via
`hidden="until-found"`) so browser find-in-page can expand it. If you put the
panel's border/padding on the panel element itself, the collapsed panel still
paints as a thin bordered strip. **Move the chrome (border, padding, background)
to an inner `<div>`**; leave the panel element layout-only.

### Password field: kill the WebView2 native reveal + autofill ✅ handled (autofill) / ⚑ (reveal icon)
`shared/SensitiveTextField` defaults to `autoComplete="off"` so WebView2 / the OS
password manager doesn't offer to autofill a one-shot secret. If you also want to
suppress Edge/WebView2's **native password-reveal eye** (which double-renders next
to a custom reveal button), add to `app.css`:

```css
input[type="password"]::-ms-reveal,
input[type="password"]::-ms-clear { display: none; }
```

Not in the template because the bare `SensitiveTextField` ships no custom reveal
button — add the rule when you build one.

---

## Tailwind v4

### No `tailwind.config.js` — tokens live in CSS ✅ handled
Tailwind v4 is a Vite plugin; there is **no config file**. Design tokens,
utilities and the light/dark theme all live in `frontend/src/app.css`
(`@theme inline` + `:root`/`.dark`). Don't create a `tailwind.config.js` and
expect it to be read — it won't be. See the README "Theming & design tokens".

### The community React Aria Tailwind plugin doesn't register under `@plugin` ✅ handled
The `tailwindcss-react-aria-components` plugin's paired hover/focus variants don't
load under v4's CSS-first `@plugin`. You don't need it: RAC exposes state as
data-attributes, so style directly with v4's native `data-[hovered]:`,
`data-[focused]:`, `data-[pressed]:`, `data-[focus-visible]:`, `data-[invalid]:`,
`data-[disabled]:` variants. See `ExampleForm.tsx`.

### Reduced motion: kill movement, keep meaning ✅ handled
The `prefers-reduced-motion` block in `app.css` restricts transitions to
**colour** properties only (`color, background-color, border-color, fill, stroke,
opacity`), which makes transform-driven motion (switch thumb, button press-scale,
stepper reflow) instant — while the spinner (a CSS *animation*, not a transition)
keeps turning so "working" still reads. Don't blanket-disable all animation; you'll
kill the spinner too.

---

## Testing (Vitest / Playwright)

### `toBeDisabled()` ignores `<fieldset disabled>`
Playwright's (and testing-library's) `toBeDisabled()` does **not** report a
`<fieldset>` as disabled even when `disabled` is set and its controls are
inert — and if you have several fieldsets, `getByRole` also trips strict-mode on
the collision. Assert on the **descendant controls** instead
(`input[name="…"]`, `[role="switch"]`), not the fieldset.

### Strict-mode collisions with raw JSON / repeated text
A `<pre>` dump of raw JSON, or a value that appears both in a field and in a
result panel, makes `getByText("…")` match multiple nodes and fail strict mode.
Scope the query by role/region first (`getByRole("cell", …)`,
`getByRole("status")`, `panel.getByText(…)`), then match the text.

### The mock bridge must be installed before first render ✅ handled
`src/e2e/main.tsx` calls `installMockBridge()` **before** `ReactDOM.createRoot`,
because a bridge-backed TanStack Query fires on mount. Install the mock late and
the first query hits an undefined `window.go` and rejects. Keep mock setup above
the render.

---

## Backend / Go

### Windows console output is OEM-encoded (GBK on CN Windows), not UTF-8
`sc.exe`, `wevtutil`, `netsh` and friends emit text in the console **OEM code
page**, which is GBK on Chinese Windows. Read it as UTF-8 and you get mojibake
(e.g. `成功` → `\xb3ɹ\xa6`). Decode defensively: if the bytes aren't valid UTF-8,
try the OEM decoder (`golang.org/x/text/encoding/simplifiedchinese`.GBK) before
using the string. This bit a service-status reader hard; the pattern is a small
`decodeConsoleOutput([]byte) string` helper (`utf8.Valid` → fall back to GBK).

### `GOTOOLCHAIN=auto` silently downloads an SDK ✅ documented
Go's default `GOTOOLCHAIN=auto` will **download** the toolchain named by the
`go`/`toolchain` directives when it's newer than your local Go — convenient on CI,
surprising offline. `go.mod` pins `go 1.23` (widely installed) so a normal build
needs no download. Set `GOTOOLCHAIN=local` to fail fast instead of fetching. See
the README "Go version" note.

### Secrets never go in `argv`
A password on a child process's command line is visible to every user via
`ps`/Task Manager and lands in shell history and logs. Pass secrets by
**environment variable or stdin**, never as a flag value; keep config files to
**non-secret** defaults (host, username, ports); and redact at every boundary
(backend `Redactor`, frontend `sanitizeSensitiveText`). When you package a build,
**exclude any `run-*.bat`/wrapper that inlines real secrets** — delete it, don't
ship it.

---

## Windows packaging / cross-compile ⚑ situational

The template's CI builds natively on `windows-latest` (`wails build -platform
windows/amd64`), which is the simplest path. The rest here is for when you build
the Windows binary **from macOS/Linux** or need elevation.

### Cross-compiling from macOS: CGO + mingw
Wails' Windows build needs CGO, so a pure `GOOS=windows go build` won't do. Cross
from an Apple-Silicon Mac with the mingw toolchain:

```bash
brew install mingw-w64
CGO_ENABLED=1 CC=x86_64-w64-mingw32-gcc \
  wails build -platform windows/amd64
```

Keep the CGO-free CLI (`internal/*` is stdlib-only) separate so *it* still
cross-compiles with a plain `GOOS=windows GOARCH=amd64 go build`.

### Autostart / service registration needs elevation
If your tool registers a Windows service or a scheduled task at runtime, the
process must run **elevated**, or the call fails with access-denied. Ship a
`requireAdministrator` manifest embedded in the exe (via the Wails/`goversioninfo`
manifest) so Windows prompts for UAC on launch. Only add this if you actually do
privileged writes — it makes every launch prompt.

### Version string shows `dev` on a plain cross-build
A plain `wails build` (no ldflags) leaves the version as `dev`. Derive it from VCS
at build time and fall back to `dev-<rev>` from `runtime/debug.ReadBuildInfo()` so
even an unstamped build carries the commit. Don't mistake the `dev` header for a
bug — it just means no ldflags were passed.
