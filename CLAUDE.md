## Development Commands

### Essential Commands
- `./universal_build.sh` - Build macOS application in release mode (native build)
- `./universal_build.sh --debug` - Build macOS application in debug mode (shows DevTools)
- `npm run tauri build -- --runner cargo-xwin --target x86_64-pc-windows-msvc` - Cross-compile Windows installer from macOS
- `npm run typecheck` - Run TypeScript type checking
- GitHub Actions - Automated multi-platform builds (Windows, macOS Intel/ARM, Linux)

### Testing & Validation
- `npm run typecheck` - Validate all TypeScript code
- No test commands configured yet - check package.json for updates

### Build & Test Requirements
**IMPORTANT**: This is a cross-platform desktop application (Windows, macOS, Linux). No web UI is available:
- **Primary development platform**: macOS (can cross-compile Windows installer)
- **Local testing**: Use `./universal_build.sh` for macOS builds
- **Windows builds**: Cross-compile via cargo-xwin or use GitHub Actions
- **Linux builds**: Use GitHub Actions (requires Linux system dependencies)
- **NEVER use `npm run dev` or `npm run tauri dev`** - these are not supported
- Build artifacts location:
  - macOS: `./BetterReplacementsManager.app`, `./BetterReplacementsManager_0.1.0_aarch64.dmg`
  - Windows: `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/BetterReplacementsManager_0.1.0_x64-setup.exe`
  - Linux: Available via GitHub Actions (.deb, AppImage)

### Logging & Debugging
**DevTools (Debug builds only):**
- Only available in debug builds (`./universal_build.sh --debug`)
- Automatically disabled in release builds for security

**View logs during development:**
- DevTools Console - Shows all JavaScript console.log/debug/info/warn/error messages
- `RUST_LOG=debug ./universal_build.sh --debug` - Shows Rust backend logs in terminal
- **Log locations (platform-specific)**:
  - macOS: `~/Library/Logs/com.josephmcmyne.betterreplacementsmanager/`
  - Windows: `%APPDATA%\com.josephmcmyne.betterreplacementsmanager\logs\`
  - Linux: `~/.config/com.josephmcmyne.betterreplacementsmanager/logs/`
- See `memory-bank/logging.md` for detailed logging guide

## Architecture Overview

This is a **Tauri v2 + React + TypeScript** cross-platform desktop application for managing text replacements and AI prompts that integrates with Espanso.

### Core Stack
- **Frontend**: React 18 + TypeScript + Ant Design 5.25.2
- **Backend**: Rust + Tauri v2 (cross-platform)
- **Target Platforms**: Windows, macOS (ARM64/Intel Universal Binary), Linux - no web UI
- **State**: React Context API (ReplacementContext, ThemeContext, **PathContext**)
- **Build**: Vite (frontend) + Cargo (backend)

### Key Architectural Patterns

#### Frontend-Backend Communication
- Uses Tauri's `invoke` command pattern for IPC
- Commands defined in `src-tauri/src/lib.rs` and `src-tauri/src/paths.rs`:
  - **Path Commands** (from paths.rs):
    - `get_espanso_config_dir()` - Get Espanso config directory path
    - `get_espanso_match_dir()` - Get Espanso match directory path
    - `get_app_data_dir()` - Get app data directory path
    - `get_current_platform()` - Get platform name ('macos'|'windows'|'linux')
  - **Data Commands** (from lib.rs):
    - `read_espanso_file(file_name)` - Read YAML config files
    - `write_espanso_file(file_name, content)` - Write YAML config files
    - Plus project, category, variable, extension, and AI prompt commands
- Frontend calls via `@tauri-apps/api/core`
- PathContext reduces IPC overhead by caching all paths at startup

#### State Management
- Context providers wrap the app for global state
- **PathContext** provides cached platform-specific paths (loaded once at startup)
- **CategoriesContext** manages replacement categories (links YAML files to sidebar items)
- **ProjectCategoriesContext** manages project categories (defines variable schemas)
- ReplacementContext manages replacement CRUD operations
- ThemeContext handles light/dark theme switching
- Data persists to Espanso YAML files via Tauri commands

#### Two Category Systems (Critical Architecture)
**The application has TWO distinct category systems that work together:**

1. **Replacement Categories** (`categories.json`)
   - Purpose: Organize YAML replacement files in the sidebar
   - Examples: Global, Base, AI Prompts, Teapot
   - Each links to a YAML file (e.g., `base.yml`, `ai_prompts.yml`)
   - Has `categoryId` field linking to a Project Category
   - Managed by: `CategoriesContext`
   - Backend command: `get_categories()`

2. **Project Categories** (`project_categories.json`)
   - Purpose: Define variable schemas for projects
   - Examples: General (with project_name, etc.), Development (with tech_stack, etc.)
   - Contains variable definitions used by projects
   - Acts as parent category for filtering replacement categories
   - Managed by: `ProjectCategoriesContext`
   - Backend commands: `read_project_categories()`, `write_project_categories()`

**Category Linking via categoryId:**
- Each Replacement Category has a `categoryId` field (e.g., "general" or "development")
- The top dropdown filters sidebar to show only replacement categories matching selected project category
- Example: Selecting "Development" shows only AI Prompts and Teapot in sidebar
- No selection shows all replacement categories

#### Cross-Platform Path Management (Critical Architecture)
**Problem**: Different platforms use different path conventions
- macOS: `~/Library/Application Support/`
- Windows: `%APPDATA%\` (C:\Users\{user}\AppData\Roaming\)
- Linux: `~/.config/` (or `$XDG_CONFIG_HOME`)

**Solution**: PathContext pattern with startup caching
- **96% reduction in IPC calls** - From 100+ to just 4 on startup
- Rust backend exposes platform-aware path commands:
  - `get_espanso_config_dir()` - Espanso configuration directory
  - `get_espanso_match_dir()` - Espanso match files directory (where YAML files live)
  - `get_app_data_dir()` - Application data directory
  - `get_current_platform()` - Returns 'macos' | 'windows' | 'linux'
- Frontend PathContext loads all paths once at startup, caches in React Context
- Components use `usePaths()` hook for instant access (no await needed)

**Implementation**:
```typescript
// In any component:
import { usePaths } from '@/contexts/PathContext';

const { espansoMatchDir, platform } = usePaths();
// Instant access, already cached - no IPC call
const filePath = `${espansoMatchDir}/${fileName}`;
```

**Backend path utilities** (`src-tauri/src/paths.rs`):
- **Dynamic Path Detection**: First tries `espanso path` CLI command to detect custom installations
- Falls back to platform-specific defaults if CLI unavailable
- `get_espanso_config_dir_internal()` - Returns PathBuf for internal use
- `get_espanso_match_dir_internal()` - Returns PathBuf for internal use
- `get_app_data_dir_internal()` - Returns PathBuf for internal use (deprecated, migrated to espanso/config)
- `initialize_app_files()` - Creates required YAML files and directories on startup
- All functions automatically create directories if missing
- Platform detection via Rust `cfg!` macros

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
- ✅ `categoryId` (not `category_id`) - Links replacement categories to project categories
- ✅ `isDefault` (not `is_default`)
- ✅ `createdAt` (not `created_at`)
- ✅ `updatedAt` (not `updated_at`)

### Frontend Path Access
**Correct approach (uses PathContext):**
- ✅ `const { espansoMatchDir } = usePaths()` - Get cached paths from PathContext
- ✅ Platform detection via `const { platform } = usePaths()` - Returns 'macos'|'windows'|'linux'
- ✅ All paths loaded once at app startup, cached for instant access

**Deprecated approaches:**
- ❌ `process.env` - Not available in Tauri frontend
- ❌ `homeDir()` from `@tauri-apps/api/path` - Deprecated, use PathContext instead
- ❌ `invoke('get_espanso_match_dir')` in components - Use usePaths() hook instead (avoids IPC overhead)
- ❌ Node.js APIs - Use Tauri APIs instead

### Error Prevention Checklist:
1. Always check Rust function signatures for parameter names
2. Convert snake_case to camelCase for frontend calls
3. Use Tauri APIs (`homeDir()`) instead of Node.js equivalents
4. Test all CRUD operations after parameter changes
5. Check error messages for "missing required key" - indicates naming mismatch

### Command Line Tools
- Use ripgrep "rg" rather than grep whenever possible.

## Cross-Platform Build & Distribution

### Supported Platforms
- **Windows** - x64 NSIS installer (cross-compiled from macOS or via GitHub Actions)
- **macOS** - Universal Binary (ARM64 + Intel) .app and .dmg
- **Linux** - .deb (Debian/Ubuntu) and AppImage (universal) via GitHub Actions

### Local Cross-Compilation (macOS → Windows)
**Requirements** (one-time setup):
```bash
# Install NSIS for Windows installer packaging
brew install nsis

# Install LLVM for cross-compilation
brew install llvm

# Update Rust and add Windows target
rustup update
rustup target add x86_64-pc-windows-msvc

# Install cargo-xwin for seamless cross-compilation
cargo install cargo-xwin
```

**Build Windows installer from macOS**:
```bash
npm run tauri build -- --runner cargo-xwin --target x86_64-pc-windows-msvc

# Output: src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/
# File: BetterReplacementsManager_0.1.0_x64-setup.exe
```

**Performance**: ~20-30 seconds for subsequent builds (after initial SDK download)

### GitHub Actions CI/CD
**Automated multi-platform builds** on every git tag push (e.g., `v0.2.0`)

**Supported outputs**:
- Windows: NSIS .exe installer
- macOS ARM64: .dmg installer
- macOS x64 (Intel): .dmg installer
- Linux: .deb package + AppImage

**Trigger release build**:
```bash
# Create and push tag
git tag v0.2.0
git push origin v0.2.0

# GitHub Actions will automatically:
# 1. Build for all platforms in parallel
# 2. Create GitHub Release (draft)
# 3. Upload all installers as release assets
```

**Build times** (with cache): ~10 minutes total (parallel)

**Configuration**: `.github/workflows/release.yml`

### Platform-Specific Path Locations

**Espanso Configuration** (dynamically detected via `espanso path` CLI):
- macOS: `~/Library/Application Support/espanso`
- Windows: `%APPDATA%\espanso` (C:\Users\{user}\AppData\Roaming\espanso)
- Linux: `~/.config/espanso`

**Data Files Structure**:
```
espanso/
├── config/
│   ├── categories.json          # Replacement categories (sidebar items)
│   ├── project_categories.json  # Project categories (variable schemas)
│   ├── projects.json            # Project definitions
│   └── default.yml             # Espanso configuration
└── match/
    ├── base.yml                # Base replacements
    ├── better_replacements.yml # Global replacements
    ├── ai_prompts.yml          # AI prompt templates
    └── [custom].yml            # User-created category files
```

**Application Data** (deprecated - migrated to espanso/config):
- macOS: `~/Library/Application Support/BetterReplacementsManager`
- Windows: `%APPDATA%\BetterReplacementsManager`
- Linux: `~/.config/BetterReplacementsManager`

**All paths automatically detected and managed by PathContext** - no manual configuration needed.

## Claude Code Agent Workflow

This project uses specialized Claude Code agents to improve development efficiency and maintain clean context.

### Available Agents

Located in `.claude/agents/`:

- **@planner** (`planner.md`) - Research and plan features before implementation
  - Uses MCP tools (Context7, Ant Design Components, WebSearch)
  - Creates detailed implementation plans
  - Identifies cross-platform considerations
  - Returns concise plans with platform-specific notes

- **@frontend-expert** (`frontend-expert.md`) - TypeScript/React/Ant Design specialist
  - Implements React components with strict TypeScript
  - Uses Ant Design components following best practices
  - Ensures proper frontend-backend parameter naming (camelCase)
  - Runs typecheck and build verification

- **@backend-expert** (`backend-expert.md`) - Rust/Tauri specialist
  - Implements Tauri commands with proper error handling
  - Handles file I/O and YAML parsing (serde_yaml)
  - Uses snake_case for Rust (auto-converts to camelCase for frontend)
  - Considers cross-platform path handling

- **@code-reviewer** (`code-reviewer.md`) - Code quality and security reviewer
  - Reviews TypeScript/React and Rust code
  - Checks for security issues (path validation, input sanitization)
  - Verifies cross-platform compatibility
  - Returns categorized issues (Critical/Warning/Suggestion)

- **@researcher** (`researcher.md`) - Library and pattern research specialist
  - Researches libraries, components, and best practices
  - Uses MCP tools for up-to-date documentation
  - Compares options with trade-off analysis
  - Saves detailed findings to `/memory-bank/research/`

### Recommended Workflow

**For New Features:**
```
1. @planner - Research and create implementation plan
2. Review plan in main conversation
3. @frontend-expert + @backend-expert - Implement in parallel
4. @code-reviewer - Review before finalizing
5. Main conversation - Integration and testing
```

**For Research Questions:**
```
1. @researcher - Investigate options and patterns
2. Review condensed findings in main conversation
3. Make decision
4. Reference detailed report in /memory-bank/research/ if needed
```

**For Component Selection:**
```
1. @researcher - Use Ant Design MCP to explore components
2. Review component recommendations
3. @frontend-expert - Implement chosen component
4. @code-reviewer - Verify implementation
```

### Agent Invocation

**Automatic Invocation:**
Agents automatically activate based on task context. Simply describe your task:
- "I need to implement user authentication" → @planner may activate
- "Review the latest changes" → @code-reviewer may activate

**Explicit Invocation:**
Request specific agents by name for guaranteed execution:
- "Use @planner to research cross-platform file dialogs"
- "Use @researcher to compare state management libraries"
- "Use @code-reviewer to check security"

### Context Management Strategy

**How Agents Help:**
- **Separate Context Windows**: Each agent has its own context (doesn't pollute main conversation)
- **Condensed Summaries**: Agents process 15,000-50,000 tokens internally but return only 1,000-2,000 token summaries
- **Persistent Knowledge**: Detailed findings saved to `/memory-bank/` for future reference
- **Parallel Processing**: Frontend and backend agents work simultaneously

**Benefits:**
- Main conversation stays clean and focused
- Context window usage reduced by 50-60%
- Research doesn't bloat conversation history
- Knowledge persists across sessions

**Best Practices:**
- Use `/compact` when main conversation grows large
- Start fresh conversation for unrelated work
- Update `/memory-bank/NOTES.md` to maintain context across sessions
- Reference research files instead of re-researching

### Memory Bank Structure

```
/memory-bank/
├── NOTES.md              # Persistent session context
├── research/             # Detailed research findings
├── decisions/            # Architecture decisions
└── architecture/         # System design docs
```

**NOTES.md** tracks:
- Current work session status
- Active decisions and rationale
- Known issues
- Research index
- Cross-platform development notes
- Useful commands

**Research Files:**
Agents save detailed findings to `/memory-bank/research/[topic].md`:
- Full comparison data
- Code examples
- Performance benchmarks
- Migration guides

**Usage:**
- Agents automatically update relevant files
- Reference files to recall previous research
- Share findings across development sessions
- Build institutional knowledge

### Example Agent Workflow

**Scenario**: Add new feature requiring platform-specific behavior

```
Main Conversation:
> "I need to add system tray integration"

Agent Flow:
1. @planner (automatic):
   - Reads current Tauri configuration
   - Researches cross-platform system tray APIs
   - Documents platform-specific requirements (macOS vs Windows vs Linux)
   - Returns: Implementation plan with platform-specific notes

2. Main Conversation:
   > Reviews plan, approves

3. @backend-expert + @frontend-expert (parallel):
   - Backend: Implements Tauri system tray commands with platform detection
   - Frontend: Updates UI to show platform-appropriate icons/menus
   - Both: Use PathContext for any path-related operations
   - Both: Run tests and build verification
   - Return: Summary of changes

4. @code-reviewer (automatic):
   - Reviews cross-platform implementation
   - Checks all three platforms handled correctly
   - Verifies no hardcoded paths introduced
   - Returns: Approval or concerns

5. Main Conversation:
   > Integrates changes
   > Tests locally on macOS via ./universal_build.sh
   > Pushes tag to trigger GitHub Actions for multi-platform testing
```

### MCP Tools Integration

Agents use Model Context Protocol (MCP) tools for enhanced capabilities:

**Context7** - Up-to-date library documentation:
- Get latest Tauri, React, TypeScript docs
- Research best practices and patterns
- Used primarily by @planner and @researcher

**Ant Design Components** - Component exploration:
- List all available components
- Get component API documentation
- Fetch usage examples
- Used by @researcher and @frontend-expert

**Filesystem** - Direct file operations:
- Read/write beyond @ references
- Used by all implementation agents

Configuration in `.claude/mcp.json` (created separately)

### Tips for Effective Agent Usage

**DO:**
- Use agents for complex, multi-step tasks
- Let agents handle research-heavy work
- Run frontend + backend agents in parallel when possible
- Reference memory-bank files for persistent knowledge
- Update NOTES.md to maintain session context

**DON'T:**
- Use agents for simple, single-step tasks
- Re-research topics already documented in memory-bank
- Ignore agent recommendations without consideration
- Skip the planning phase for complex features
- Forget to review agent output before proceeding

### Cross-Platform Development with Agents

**Platform-Specific Workflow:**

When implementing cross-platform features:
1. **@planner** identifies platform-specific requirements
2. **@researcher** finds platform-specific APIs and patterns
3. **@backend-expert** implements with platform detection
4. **@frontend-expert** ensures UI works across platforms
5. **@code-reviewer** validates cross-platform compatibility

**Platform Status:**
- macOS: ✅ Primary development platform - Full testing and validation
- Windows: ✅ Cross-compilation working - Installer builds successfully, pending real-world testing
- Linux: ✅ CI/CD configured - .deb and AppImage build successfully, pending real-world testing

**Testing Strategy:**
- All features tested on macOS during development
- Windows installer cross-compiled locally for quick iteration
- GitHub Actions validates all platforms on every release
- Real Windows/Linux testing required before production release

See `/memory-bank/NOTES.md` for detailed cross-platform notes, `crossplatformChecklist.md` for platform-specific requirements, and `WHATS_NEXT.md` for testing status.