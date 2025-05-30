# System Patterns: BetterReplacementsManager

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + Ant Design
- **Backend**: Rust + Tauri v2
- **Build System**: npm + Vite + Cargo
- **Platform**: macOS (primary), cross-platform potential

### Application Architecture
```
┌─────────────────────────────────────┐
│           React Frontend            │
│  ┌─────────────────────────────────┐ │
│  │      Ant Design Layout          │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │   Sidebar | Header | Main   │ │ │
│  │  │   ├─Global| Title  | Content │ │ │
│  │  │   ├─Base  | Toggle | Area    │ │ │
│  │  │   └─AI    | Footer |         │ │ │
│  │  └─────────────────────────────┘ │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │     Context Providers       │ │ │
│  │  │  - ReplacementContext       │ │ │
│  │  │  - ProjectContext           │ │ │
│  │  │  - VariablesContext         │ │ │
│  │  │  - SavedExtensionsContext   │ │ │
│  │  └─────────────────────────────┘ │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│           Tauri Backend             │
│  ┌─────────────────────────────────┐ │
│  │      File System Operations     │ │
│  │      - read_espanso_file       │ │
│  │      - write_espanso_file      │ │
│  │      - read_saved_extensions    │ │
│  │      - write_saved_extensions   │ │
│  │      Espanso Integration        │ │
│  │      Configuration Management   │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Key Design Patterns

### Frontend Patterns
1. **Layout Pattern**: Ant Design Layout with fixed sidebar, sticky header, scrollable content
2. **Context Provider Pattern**: State management through React Context
3. **Component Composition**: Reusable UI components with clear boundaries
4. **TypeScript First**: Strong typing throughout the application
5. **Hooks Pattern**: Custom hooks for business logic and state
6. **Theme Integration**: Ant Design ConfigProvider + custom design tokens for hybrid theming
7. **Navigation Pattern**: Dynamic menu-driven navigation with triggers displayed in sidebar
8. **Data Loading Pattern**: Async loading with loading states and fallback data

### Backend Patterns
1. **Command Pattern**: Tauri commands for frontend-backend communication
2. **File System Abstraction**: Clean interfaces for file operations
3. **Configuration Management**: Centralized config handling
4. **Error Handling**: Comprehensive error propagation and handling
5. **YAML Processing**: serde_yaml for parsing and serializing Espanso configs
6. **Data Transformation**: Convert YAML structures to TypeScript-friendly formats
7. **Bidirectional Data Flow**: read_espanso_file and write_espanso_file for full CRUD

## Critical Implementation Paths

### Data Flow
1. **User Action** → React Component
2. **Component** → Context Provider (state update)
3. **Context** → Tauri Invoke (backend call)
4. **Tauri Command** → File System Operation
5. **Response** → Context Update → UI Refresh

### File System Integration
- **Espanso Config**: Direct manipulation of Espanso YAML files
- **Project Files**: JSON-based project and template storage
- **Backup System**: Automatic backup of configurations

### State Management
- **Local State**: Component-level state for UI concerns
- **Context State**: Application-level state for shared data
- **Persistent State**: File-based persistence through Tauri backend

## Component Relationships

### Core Components Structure
```
App (ConfigProvider)
├── MainLayout
│   ├── Sidebar (collapsible)
│   │   ├── Dashboard
│   │   ├── Global (dynamic triggers)
│   │   │   └── Trigger items from better_replacements.yml
│   │   ├── Base (dynamic triggers)
│   │   │   └── Trigger items from base.yml
│   │   ├── AI Prompts (dynamic triggers)
│   │   │   └── Trigger items from ai_prompts.yml
│   │   ├── Projects
│   │   ├── Search
│   │   └── Settings
│   ├── Header
│   │   ├── Toggle Button
│   │   └── App Title
│   ├── Content Area
│   │   └── CategoryReplacements (dynamic content)
│   │       ├── ReplacementEditor
│   │       └── InsertionHub (right sidebar)
│   └── Footer
├── Context Providers
│   ├── ReplacementProvider (implemented)
│   │   └── Manages replacement state and operations
│   ├── ProjectProvider (implemented)
│   │   └── Manages project data and active project
│   ├── VariablesProvider (implemented)
│   │   └── Manages custom variables with categories
│   └── SavedExtensionsProvider (implemented)
│       └── Manages saved Espanso extensions
└── Page Components
    ├── Dashboard
    ├── CategoryReplacements (implemented)
    │   ├── ReplacementEditor
    │   │   └── Form-based editing with validation
    │   └── InsertionHub
    │       ├── System Variables
    │       ├── Project Variables
    │       ├── Custom Variables
    │       ├── My Saved Extensions
    │       └── Extension Builder
    ├── ExtensionBuilder (implemented)
    │   └── All Espanso extension types
    ├── SavedExtensionsManager (implemented)
    └── Settings
```

## Development Patterns

### Build Process
1. **Development**: `npm run dev` → Vite dev server + Tauri dev
2. **Type Checking**: `npm run typecheck` → TypeScript validation
3. **Production**: `./universal_build.sh --release` → Full macOS build

### Testing Strategy
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: Tauri command and file system testing
- **E2E Tests**: Full application workflow testing

### Code Organization
- **Feature-based folders**: Group by functionality, not file type
- **Shared utilities**: Common functions and types
- **Type definitions**: Centralized TypeScript interfaces
- **Constants**: Application-wide constants and configuration

## Critical Naming Convention Issues

### JSON Field Naming (IMPORTANT!)
**Always use camelCase in JSON files that interface with Rust backend**

The Rust structs use serde rename attributes to convert between JSON camelCase and Rust snake_case:
```rust
#[serde(rename = "fileName")]
file_name: String,

#[serde(rename = "isDefault")]
is_default: Option<bool>,
```

**JSON files MUST use camelCase:**
- ✅ `fileName` (not `file_name`)
- ✅ `isDefault` (not `is_default`)
- ✅ `createdAt` (not `created_at`)
- ✅ `updatedAt` (not `updated_at`)

**Files affected:**
- `~/Library/Application Support/espanso/config/categories.json`
- `~/Library/Application Support/BetterReplacementsManager/projects.json`

**Error symptoms:**
- "Failed to load categories" error in macOS build
- JSON deserialization failures in Rust backend
- Data not loading properly in UI components

**Prevention:**
- Always check JSON field names match Rust serde rename attributes
- Test with actual macOS build, not just dev server
- Add better error logging to show actual deserialization errors
