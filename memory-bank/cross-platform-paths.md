# Cross-Platform Path Reference

## Confirmed Espanso Configuration Paths

### Official Documentation
According to the official Espanso documentation (https://espanso.org/docs/configuration/basics/):

| Platform | Espanso Config Directory | Environment Variable |
|----------|-------------------------|---------------------|
| **macOS** | `~/Library/Application Support/espanso` | `$HOME/Library/Application Support/espanso` |
| **Windows** | `%APPDATA%\espanso` | `C:\Users\{username}\AppData\Roaming\espanso` |
| **Linux** | `~/.config/espanso` | `$XDG_CONFIG_HOME/espanso` or `$HOME/.config/espanso` |

### Directory Structure
All platforms use the same internal structure:
```
espanso/
├── config/     # Configuration files (how Espanso behaves)
│   └── default.yml
└── match/      # Match definitions (what Espanso expands)
    ├── base.yml
    ├── better_replacements.yml
    ├── ai_prompts.yml
    └── project_active_vars.yml
```

### Quick Discovery Command
Users can find their config path using: `espanso path`

---

## BetterReplacementsManager App Data Paths

| Platform | App Data Directory | Notes |
|----------|-------------------|-------|
| **macOS** | `~/Library/Application Support/BetterReplacementsManager` | Standard macOS app location |
| **Windows** | `%APPDATA%\BetterReplacementsManager` | Roaming app data |
| **Linux** | `~/.config/BetterReplacementsManager` | XDG Base Directory spec |

### App Data Files
All platforms store these files in the app data directory:
- `projects.json` - Project configurations
- `categories.json` - Category definitions
- `project_categories.json` - Project-category mappings
- `custom_variables.json` - User-defined variables
- `saved_extensions.json` - Extension configurations
- `ai_prompts.json` - AI prompt templates
- `llm_configs.json` - LLM configuration settings

---

## Platform Detection

### Rust (Compile-time)
```rust
cfg!(target_os = "macos")    // true on macOS
cfg!(target_os = "windows")  // true on Windows
cfg!(target_os = "linux")    // true on Linux
```

### TypeScript (Runtime via Tauri)
```typescript
// After implementing get_current_platform command
const platform = await invoke('get_current_platform');
// Returns: "macos" | "windows" | "linux"
```

---

## Path Construction Best Practices

### ✅ DO: Use PathBuf in Rust
```rust
use std::path::PathBuf;

let config_dir = get_espanso_config_dir()?;
let match_dir = config_dir.join("match");
let file_path = match_dir.join("base.yml");
```

### ✅ DO: Handle Missing Directories
```rust
use std::fs;

if !config_dir.exists() {
    fs::create_dir_all(&config_dir)?;
}
```

### ❌ DON'T: Hardcode Separators
```rust
// BAD - Won't work on Windows
let path = format!("{}/match/base.yml", config_dir);

// GOOD - Works everywhere
let path = config_dir.join("match").join("base.yml");
```

### ❌ DON'T: Assume Paths Exist
```rust
// BAD - May panic
let contents = fs::read_to_string(path).unwrap();

// GOOD - Handle errors
let contents = fs::read_to_string(&path)
    .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
```

---

## Implementation Notes

### Phase 1 Implementation Order
1. **paths.rs module** - Centralized path utilities
2. **Platform detection** - Runtime platform identification
3. **Backend refactoring** - Replace 26 hardcoded paths
4. **Frontend utilities** - TypeScript path helpers
5. **Frontend refactoring** - Replace 8 hardcoded paths

### Testing Considerations
- Primary testing on macOS (development platform)
- Document Windows/Linux testing requirements
- Use CI/CD for cross-platform validation

### Migration Path
No migration needed - fresh installations will use correct paths for each platform automatically.

---

## Common Issues & Solutions

### Issue: Espanso not installed
**Solution**: Check if Espanso directory exists, create if missing or show helpful error

### Issue: Path permissions
**Solution**: Use Tauri's built-in permission system, request necessary permissions

### Issue: Case sensitivity
**Solution**: Always use lowercase for file/directory names we create

### Issue: Unicode in paths
**Solution**: Use Rust's PathBuf which handles Unicode correctly

---

## References

- [Espanso Configuration Docs](https://espanso.org/docs/configuration/basics/)
- [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html)
- [Tauri Path API](https://v2.tauri.app/reference/javascript/api/namespacecore/)
- [Rust std::path Documentation](https://doc.rust-lang.org/std/path/)