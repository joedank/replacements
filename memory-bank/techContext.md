# Tech Context: BetterReplacementsManager

## Technology Stack

### Frontend Technologies
- **React 18.2.0**: Modern React with concurrent features
- **TypeScript 5.0+**: Strict typing configuration
- **Vite 4.0+**: Fast build tool and dev server
- **Ant Design**: Professional UI component library with modern design system
- **@ant-design/icons**: Comprehensive icon library for interface elements

### Backend Technologies
- **Rust**: System programming language for Tauri backend
- **Tauri 2.0**: Cross-platform app framework with native capabilities
- **serde**: Serialization/deserialization for data handling
- **Cargo**: Rust package manager and build system

### Development Tools
- **npm**: Package management and script running
- **TypeScript Compiler**: Type checking and compilation
- **ESLint/Prettier**: Code formatting and linting (future addition)

## Development Setup

### Prerequisites
- **Node.js**: Version 18+ with npm
- **Rust**: Latest stable via rustup
- **Xcode**: For macOS development and code signing
- **macOS**: Development environment requirement

### Project Structure
```
BetterReplacementsManager/
├── src/                 # React frontend source
├── src-tauri/          # Rust backend source
├── dist/               # Built frontend assets
├── node_modules/       # npm dependencies
├── memory-bank/        # Project documentation and context
└── build artifacts     # .app and .dmg files in target/
```

### Build Configuration
- **Development**: Vite dev server on port 1420
- **Production**: Static files built to dist/
- **Tauri**: Native app bundling with proper icons
- **Universal Build**: Script for macOS .app and .dmg generation

## Technical Constraints

### Platform Limitations
- **macOS Only**: Initial release targets macOS exclusively
- **System Integration**: Requires proper macOS app permissions
- **File Access**: Limited to allowed directories for security

### Performance Considerations
- **Bundle Size**: Minimize frontend bundle for fast loading
- **Memory Usage**: Efficient state management and cleanup
- **File Operations**: Async operations to prevent UI blocking

### Security Requirements
- **File System Access**: Controlled access to Espanso directories
- **Configuration Safety**: Backup before modifying configs
- **User Data**: Secure handling of user templates and snippets

## Dependencies

### Frontend Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "antd": "^5.0.0",
  "@ant-design/icons": "^5.0.0"
}
```

### Development Dependencies
```json
{
  "@tauri-apps/cli": "^2.0.0",
  "@tauri-apps/api": "^2.0.0",
  "@types/react": "^18.2.0",
  "@types/react-dom": "^18.2.0",
  "@vitejs/plugin-react": "^4.0.0",
  "typescript": "^5.0.0",
  "vite": "^4.0.0"
}
```

### Backend Dependencies (Cargo.toml)
```toml
[dependencies]
tauri = { version = "2.0", features = ["macos-private-api"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

## Tool Usage Patterns

### Development Workflow
1. **Start Development**: `npm run dev` - Opens Tauri window with hot reload
2. **Type Checking**: `npm run typecheck` - Validates TypeScript
3. **Production Build**: `./universal_build.sh --release` - Creates .app/.dmg

### Code Quality
- **TypeScript**: Strict mode enabled with comprehensive type checking
- **File Structure**: Feature-based organization over file-type grouping
- **Error Handling**: Comprehensive error boundaries and validation

### Integration Points
- **Tauri Commands**: Frontend-backend communication via invoke()
- **File System**: Controlled access through Tauri's secure APIs
- **Configuration**: JSON/YAML file manipulation through Rust backend
- **Native APIs**: macOS-specific features through Tauri's native bindings
- **UI Components**: Ant Design ConfigProvider for consistent theming across application

## Future Technical Considerations
- **React Router**: Navigation system for multi-page application structure
- **State Management**: Advanced state management if complexity grows beyond Context API
- **Testing Framework**: Jest/Vitest for frontend, Rust testing for backend
- **Linting**: ESLint and Prettier integration for code consistency
