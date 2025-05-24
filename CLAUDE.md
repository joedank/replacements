# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- `./universal_build.sh` - Build and run macOS application for development
- `./universal_build.sh --release` - Create production macOS .app and .dmg
- `npm run typecheck` - Run TypeScript type checking
- `npm run build` - Build frontend assets only (used internally by build script)

### Testing & Validation
- `npm run typecheck` - Validate all TypeScript code
- No test commands configured yet - check package.json for updates

### Build & Test Requirements
**IMPORTANT**: This project is macOS-only. No web UI is available:
- **ALWAYS use `./universal_build.sh`** for development and testing
- **ALWAYS use `./universal_build.sh --release`** for production builds
- **NEVER use `npm run dev` or `npm run tauri dev`** - these are not supported
- The script automatically:
  - Runs TypeScript type checking
  - Builds the Tauri application
  - Moves build artifacts to the project root:
    - `./BetterReplacementsManager.app` - The macOS application
    - `./BetterReplacementsManager_0.1.0_aarch64.dmg` - The installer (release builds only)
- All testing must be performed on the built macOS application

## Architecture Overview

This is a **Tauri v2 + React + TypeScript** macOS-only desktop application for managing text replacements and AI prompts that integrates with Espanso.

### Core Stack
- **Frontend**: React 18 + TypeScript + Ant Design 5.25.2
- **Backend**: Rust + Tauri v2 (macOS-only)
- **Target Platform**: macOS (ARM64/Intel Universal Binary) - no web UI
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

## ⚠️ CRITICAL: Frontend-Backend Parameter Naming

### Tauri Command Parameters
**Tauri automatically converts Rust snake_case parameters to frontend camelCase:**

```rust
// Rust backend function
#[tauri::command]
fn read_espanso_file(file_path: String) -> Result<Vec<Replacement>, String>
```

```typescript
// Frontend call - MUST use camelCase
await invoke('read_espanso_file', { filePath: '/path/to/file' });
```

### Common Parameter Mapping:
- Rust: `file_path: String` → Frontend: `filePath`
- Rust: `user_input: String` → Frontend: `userInput`
- Rust: `project_id: String` → Frontend: `projectId`

### JSON File Naming
**JSON files interfacing with Rust backend MUST use camelCase:**
- ✅ `fileName` (not `file_name`)
- ✅ `isDefault` (not `is_default`)
- ✅ `createdAt` (not `created_at`)
- ✅ `updatedAt` (not `updated_at`)

### Environment Differences
**Frontend environment restrictions:**
- ❌ `process.env` - Not available in Tauri frontend
- ✅ `homeDir()` from `@tauri-apps/api/path` - Correct way to get paths
- ❌ Node.js APIs - Use Tauri APIs instead

### Error Prevention Checklist:
1. Always check Rust function signatures for parameter names
2. Convert snake_case to camelCase for frontend calls
3. Use Tauri APIs (`homeDir()`) instead of Node.js equivalents
4. Test all CRUD operations after parameter changes
5. Check error messages for "missing required key" - indicates naming mismatch