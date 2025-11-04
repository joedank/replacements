# Repository Guidelines

## Project Structure & Module Organization
The TypeScript/React client lives in `src/`, organized by concern (`components/`, `contexts/`, `hooks/`, `utils/`). Shared design tokens sit in `design-tokens.ts` and `design-tokens.css`. The Tauri backend is under `src-tauri/` with Rust modules such as `src-tauri/src/llm_api.rs` for API calls and `secure_storage.rs` for keyring access. Persisted UX research and architectural notes live in `memory-bank/`; reference these before proposing structural shifts. Built assets land in `dist/`, while `universal_build.sh` bundles cross-platform artifacts.

## Build, Test, and Development Commands
- `npm run dev` – Starts the Tauri development shell with hot reload across frontend and Rust layers.  
- `npm run build` – Runs TypeScript compilation followed by `vite build`; use before PRs to catch type or bundling regressions.  
- `npm run preview` – Serves the production bundle for smoke testing.  
- `npm run typecheck` – Fast feedback loop when iterating on types-only changes.  
- `npm run migrate` – Executes `migrate-to-categories.js` to normalize legacy data; run only when touching storage schemas.  
- `npm run tauri build` – Produces distributables defined in `tauri.conf.json`; rely on CI or local validation before shipping installers.

## Coding Style & Naming Conventions
Use TypeScript throughout the frontend with 2-space indentation, single quotes, and explicit imports. React components and contexts are PascalCase (`MainLayout`, `ReplacementProvider`), hooks are camelCase with `use` prefixes, and utility modules use descriptive camelCase filenames. Rust modules follow idiomatic snake_case and keep public APIs minimal; colocate helpers in the same file unless shared. Preserve existing lazy-loading patterns and suspense boundaries when introducing new views.

## Testing Guidelines
Automated coverage is minimal today; include targeted unit or integration tests whenever you introduce non-trivial behavior. If you wire up React tests, place them under `src/__tests__/` and add the necessary Vitest + Testing Library setup in the same PR. Rust modules can embed `#[cfg(test)]` blocks alongside implementation files. Always describe manual walkthrough steps in the PR when UI or Tauri behavior changes, confirm `npm run build` succeeds, and run `cargo check` within `src-tauri` before requesting review.

## Commit & Pull Request Guidelines
Follow the conventional commits pattern present in history (`feat:`, `fix:`, `refactor:`). Keep messages scoped to a single logical change and reference issues when available. PRs must describe motivation, highlight risky areas, list verification steps, and attach screenshots or clips for UI changes. Link any updated research docs from `memory-bank/` so reviewers can trace context.
