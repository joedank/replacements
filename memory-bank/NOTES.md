# BRM Development Notes

This file maintains persistent context across development sessions. Agents and the main conversation can update this file to track progress, decisions, and important information.

---

## Current Work Session

**Active Task**: Setting up Claude Code agent system
**Status**: In Progress
**Next Steps**:
- Complete agent infrastructure setup
- Test agents with crossplatformChecklist.md workflow
- Refine agent prompts based on experience

---

## Active Decisions

### Technology Stack
- **UI Library**: Ant Design 5.25.2 (chosen for comprehensive components and TypeScript support)
- **TypeScript**: Strict mode enabled (enforces type safety)
- **Platform Strategy**: macOS-first, cross-platform future (Windows/Linux)
- **Parameter Naming**: camelCase for frontend-backend communication (Rust snake_case auto-converts)

### Development Workflow
- **Build Command**: `./universal_build.sh` (universal binary for macOS)
- **Debug Build**: `./universal_build.sh --debug` (includes DevTools)
- **Type Checking**: `npm run typecheck` (run before commits)
- **No Web UI**: Desktop app only - test in built application

### Architecture Patterns
- **State Management**: React Context API (ReplacementContext, ThemeContext)
- **Frontend-Backend**: Tauri invoke commands with explicit types
- **File Organization**: Feature-based components in `src/components/FeatureName/`

---

## Research Index

Research findings are documented in detail here and summarized in main conversation:

### Completed Research
- [Claude Code Agent Patterns](research/claude-code-agents.md) - How to use agents effectively
- [Cross-Platform Development](../crossplatformChecklist.md) - Platform-specific requirements

### Planned Research
- UI Libraries Comparison (if considering alternatives to Ant Design)
- Tauri Best Practices (deep dive on Tauri v2 patterns)
- Testing Strategies (E2E testing for Tauri apps)

---

## Known Issues

### Current Issues
- None documented yet

### Platform-Specific Issues
- **Windows**: Not yet supported - path handling and file system differences need addressing
- **Linux**: Not yet supported - desktop integration and packaging need research

---

## Agent System

### Available Agents
- **@planner** - Research and plan features (`.claude/agents/planner.md`)
- **@frontend-expert** - TypeScript/React/Ant Design specialist (`.claude/agents/frontend-expert.md`)
- **@backend-expert** - Rust/Tauri specialist (`.claude/agents/backend-expert.md`)
- **@code-reviewer** - Quality and security reviewer (`.claude/agents/code-reviewer.md`)
- **@researcher** - Library and pattern research (`.claude/agents/researcher.md`)

### Agent Workflow Pattern
1. **Research Phase**: Use @planner or @researcher to gather information
2. **Implementation Phase**: Use @frontend-expert + @backend-expert in parallel
3. **Review Phase**: Use @code-reviewer before finalizing
4. **Integration**: Main conversation handles final integration and testing

### Context Management
- Agents return concise summaries (1,000-2,000 tokens)
- Detailed findings saved to `/memory-bank/research/`
- Main conversation stays focused and clean
- Use `/compact` when conversation grows large

---

## Cross-Platform Development Notes

### macOS (Current Platform)
- **Status**: Fully supported
- **Build Target**: Universal binary (ARM64 + Intel)
- **Testing**: Active development and testing
- **Distribution**: DMG installer created by build script

### Windows (Future Target)
- **Status**: Not yet supported
- **Key Requirements**:
  - Path handling (backslash vs forward slash)
  - Registry access patterns (if needed)
  - MSI installer setup
  - Test on Windows VM or hardware
- **Research Needed**: Tauri Windows-specific APIs and best practices

### Linux (Future Target)
- **Status**: Not yet supported
- **Key Requirements**:
  - Desktop entry files
  - AppImage/Deb/RPM packaging
  - Wayland vs X11 compatibility
  - Distribution-specific testing
- **Research Needed**: Linux desktop integration patterns

---

## Code Quality Standards

### TypeScript
- Strict mode enabled
- No `any` types without justification
- Explicit return types on functions
- Types in separate `.types.ts` files

### React
- Follow Rules of Hooks
- Use `memo` for expensive components
- Proper dependency arrays in useEffect/useMemo/useCallback
- Error boundaries where appropriate

### Rust
- No `unwrap()` in production code
- Proper error handling with `Result<T, String>`
- Efficient iterator usage
- Clear error messages

### Security
- Validate all user inputs
- Sanitize file paths (prevent directory traversal)
- Handle malformed YAML gracefully
- No sensitive data in logs

---

## Future Enhancements

Ideas for future development:

### Short Term
- [ ] Complete cross-platform support (Windows, Linux)
- [ ] Add automated testing (unit + integration)
- [ ] Improve error handling and user feedback
- [ ] Add keyboard shortcuts for common actions

### Long Term
- [ ] Cloud sync functionality
- [ ] Import/export from other text replacement tools
- [ ] Plugin system for custom extensions
- [ ] Advanced text transformation rules

---

## Useful Commands

### Development
```bash
# Type check
npm run typecheck

# Build debug (with DevTools)
./universal_build.sh --debug

# Build release
./universal_build.sh --release

# View logs
tail -f ~/Library/Logs/com.josephmcmyne.betterreplacementsmanager/*.log
```

### Agent Invocation
```
# Explicit agent usage
"Use @planner to research [feature]"
"Use @researcher to compare [options]"

# Agents auto-invoke based on context
"I need to implement [feature]" → @planner may auto-activate
```

---

## Notes for Future Sessions

- Update this file regularly to maintain context across sessions
- Document important decisions and their rationale
- Keep research findings organized in `/memory-bank/research/`
- Clean up completed tasks periodically
- Archive old notes to keep file focused on current work

---

**Last Updated**: 2025-11-02
**Last Updated By**: Claude Code Agent Setup
