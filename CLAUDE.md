# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- `npm run dev` - Start Tauri development server with hot reload
- `npm run build` - Build frontend assets only
- `npm run typecheck` - Run TypeScript type checking
- `./universal_build.sh --release` - Create production macOS .app and .dmg

### Testing & Validation
- `npm run typecheck` - Validate all TypeScript code
- No test commands configured yet - check package.json for updates

### Build & Test Requirements
**IMPORTANT**: This project is macOS-specific. Always build and test for macOS:
- **ALWAYS use `./universal_build.sh --release`** for ALL builds (never use `npm run tauri build` directly)
- The script automatically:
  - Runs TypeScript type checking
  - Builds the Tauri application
  - Moves build artifacts to the project root:
    - `./BetterReplacementsManager.app` - The macOS application
    - `./BetterReplacementsManager_0.1.0_aarch64.dmg` - The installer (release builds only)
- For development builds, use `./universal_build.sh` (without --release)
- All testing should be performed on macOS to ensure compatibility

## Architecture Overview

This is a **Tauri v2 + React + TypeScript** desktop application for managing text replacements and AI prompts that integrates with Espanso.

### Core Stack
- **Frontend**: React 18 + TypeScript + Ant Design 5.25.2
- **Backend**: Rust + Tauri v2 (macOS-specific)
- **Target Platform**: macOS (ARM64/Intel Universal Binary)
- **State**: React Context API (ReplacementContext, ThemeContext)
- **Build**: Vite (frontend) + Cargo (backend)

### Key Architectural Patterns

#### Frontend-Backend Communication
- Uses Tauri's `invoke` command pattern for IPC
- Commands defined in `src-tauri/src/main.rs`:
  - `read_espanso_file(file_name)` - Read YAML config files
  - `write_espanso_file(file_name, content)` - Write YAML config files
- Frontend calls via `@tauri-apps/api/core`

#### State Management
- Context providers wrap the app for global state
- ReplacementContext manages replacement CRUD operations
- ThemeContext handles light/dark theme switching
- Data persists to Espanso YAML files via Tauri commands

#### UI Structure
- Ant Design Layout with fixed sidebar navigation
- Dynamic menu items loaded from Espanso config files
- Each YAML file (better_replacements.yml, base.yml, ai_prompts.yml) populates its own menu section
- Collapsible sidebar with trigger names as menu items

#### Data Flow
1. User interacts with React component
2. Component updates Context state
3. Context invokes Tauri command
4. Rust backend reads/writes YAML files
5. Response updates Context and UI

### File Organization
- `/src/components/` - Feature-based component folders
- `/src/contexts/` - React Context providers
- `/src-tauri/src/` - Rust backend code
- `/memory-bank/` - Project documentation and context

### Critical Implementation Details
- Espanso YAML files are parsed with `serde_yaml` in Rust
- Menu triggers are extracted from `matches[].trigger` in YAML
- Theme system uses both Ant Design tokens and custom CSS variables
- TypeScript strict mode is enabled - all types must be explicit