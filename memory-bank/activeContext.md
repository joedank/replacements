# Active Context: BetterReplacementsManager

## Current Status
**Foundation Phase Complete** - Successfully established minimal, clean Tauri + React + TypeScript foundation.

## Recent Achievements
- ✅ **Project Structure**: Complete Tauri v2 + React 18 + TypeScript setup
- ✅ **Build System**: Working development and production builds
- ✅ **Icon Integration**: Full icon set integrated and working
- ✅ **Native Integration**: macOS .app and .dmg generation successful
- ✅ **Development Workflow**: `npm run dev` opens native window with React content
- ✅ **Memory Bank**: Structured documentation system established
- ✅ **Build Script Enhancement**: Build artifacts now moved to project root for easy access
- ✅ **Ant Design Integration**: Modern UI layout with sidebar, header, footer implemented
- ✅ **Theme Integration**: Resolved conflicts between design tokens and Ant Design styling
- ✅ **Dynamic Sidebar Navigation**: Implemented dynamic loading of triggers directly in sidebar menu
- ✅ **Trigger Editing**: Full editing interface for triggers and replacement text with save/delete functionality
- ✅ **State Management**: ReplacementContext manages all replacement data and selection state
- ✅ **YAML Persistence**: Tauri commands for reading and writing Espanso YAML files

## Current Work Focus
**Trigger Editing Feature Complete** - Successfully implemented the ability to click on triggers in the sidebar and edit both the trigger and replacement text. Changes are saved back to the YAML files. The implementation includes:
- ReplacementContext for state management
- ReplacementEditor component with form validation
- Full CRUD operations (update and delete implemented, create ready)
- Tauri backend integration with `write_espanso_file` command

## Next Immediate Steps
1. **Create New Replacement**: Add UI for creating new replacements in each category
2. **Search Functionality**: Implement search across all triggers and replacements
3. **Project Organization**: Create ProjectContext and project management features
4. **Import/Export**: Implement backup and restore functionality
5. **Espanso Reload**: Add integration to reload Espanso after changes

## Active Decisions & Considerations

### Architecture Decisions
- **State Management**: Using React Context API over external libraries for simplicity
- **UI Framework**: Ant Design for professional, modern interface components
- **Theme Integration**: Hybrid approach - Ant Design theming + custom design tokens for non-Ant components
- **File Storage**: JSON-based storage for project data, direct YAML manipulation for Espanso
- **Component Organization**: Feature-based folder structure rather than file-type grouping
- **Build Process**: Custom universal_build.sh script for macOS builds
- **Navigation Pattern**: Triggers displayed directly in sidebar, no separate pages needed
- **Data Loading**: Dynamic loading of YAML files on component mount with fallback data

### Development Priorities
1. **Foundation First**: Ensure solid foundation before adding complexity
2. **Type Safety**: Maintain strict TypeScript throughout development
3. **Native Integration**: Prioritize macOS native experience
4. **Clean Code**: Maintain clean, documented, testable codebase

## Important Patterns & Preferences

### Code Style
- **TypeScript First**: All new code uses TypeScript with strict types
- **Functional Components**: React functional components with hooks
- **Error Boundaries**: Comprehensive error handling patterns
- **File Naming**: kebab-case for files, PascalCase for components

### Project Intelligence
- **Build Verification**: Always run typecheck before builds
- **Icon Management**: Icons located in `src-tauri/icons/` with complete size set
- **Development Server**: Port 1420 for Vite dev server, integrated with Tauri
- **Build Artifacts**: .app and .dmg files automatically moved to project root after build
- **Design System**: Design tokens in `src/design-tokens.css` and TypeScript helpers in `src/design-tokens.ts`
- **Component Library**: UI components in `src/components/ui/` with consistent styling and TypeScript interfaces
- **Memory Management**: Regular memory bank updates for project continuity

## Recent Learnings & Insights
- **Tauri v2 Setup**: Requires proper Rust environment sourcing in build scripts
- **Icon Configuration**: Empty icon files cause build failures; need proper PNG files
- **Crate Naming**: Rust crate name must match in main.rs imports
- **Development Flow**: Tauri dev mode requires both Vite server and Rust compilation
- **Design Consistency**: CSS variables + TypeScript provides excellent developer experience for design systems
- **Component Architecture**: Feature-based organization with design tokens ensures scalable UI development
- **Ant Design Integration**: CSS import order critical - `antd/dist/reset.css` before custom styles
- **Theme Conflicts**: Avoid `!important` CSS overrides; use Ant Design's ConfigProvider for theming
- **Sidebar Navigation**: Ant Design Menu component supports dynamic children for displaying triggers
- **YAML Parsing**: `serde_yaml` crate enables direct parsing of Espanso configuration files
- **Error Handling**: Fallback mock data ensures development continues when YAML files unavailable
- **State Management**: React Context API provides clean separation between UI and data management
- **Form Validation**: Ant Design Form component handles validation for trigger/replacement editing
- **Tauri Commands**: Bidirectional communication with `read_espanso_file` and `write_espanso_file`

## Environment Notes
- **Location**: `/Volumes/4TB/Users/josephmcmyne/myProjects/BRM`
- **Rust Environment**: Requires `source ~/.cargo/env` in build scripts
- **Platform**: macOS development environment with Xcode support
- **Build Artifacts**: `.app` files in `src-tauri/target/release/bundle/macos/`

## Context Dependencies
This active context builds upon:
- **Project Brief**: Core objectives and requirements
- **Product Context**: User needs and problem solving approach  
- **System Patterns**: Architecture and design decisions
- **Tech Context**: Technology stack and tooling setup
