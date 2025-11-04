# Tauri v2 Path APIs and IPC Patterns Research

**Research Date**: 2025-11-02
**Topic**: Path utilities, IPC patterns, error handling, and TypeScript/Rust integration for Tauri v2
**Purpose**: Inform Phase 1.5 implementation for exposing path utilities to frontend

---

## Executive Summary

Tauri v2 provides both **frontend path APIs** (`@tauri-apps/api/path`) and **backend path utilities**. The recommended approach for BRM is to:

1. **Use Tauri's built-in frontend path APIs** for most path operations (avoid custom commands)
2. **Create minimal custom commands** only for BRM-specific path logic
3. **Implement proper error handling** using custom error types with `thiserror`
4. **Cache path values** in frontend Context to minimize IPC calls
5. **Follow Tauri v2 naming conventions** (snake_case Rust → camelCase TypeScript)

---

## Tauri v2 Built-in Path APIs

### Frontend Path Module (`@tauri-apps/api/path`)

Tauri v2 provides comprehensive path utilities directly in TypeScript:

```typescript
import {
  appConfigDir,
  appDataDir,
  appLocalDataDir,
  appCacheDir,
  appLogDir,
  homeDir,
  join,
  resolve,
  normalize,
  basename,
  dirname,
  extname,
  isAbsolute
} from '@tauri-apps/api/path';

// Example usage:
const configPath = await appConfigDir(); // Returns: ~/Library/Application Support/com.josephmcmyne.betterreplacementsmanager
const filePath = await join(configPath, 'projects.json');
```

**Key Benefits:**
- **No custom commands needed** for common path operations
- **Cross-platform by default** - handles Windows/macOS/Linux differences
- **Type-safe** - Returns `Promise<string>`
- **Cached internally** by Tauri runtime
- **Secure** - Respects ACL permissions

**Available Path Functions:**

| Function | Description | macOS Example |
|----------|-------------|---------------|
| `appConfigDir()` | App config directory | `~/Library/Application Support/[bundle.identifier]` |
| `appDataDir()` | App data directory | `~/Library/Application Support/[bundle.identifier]` |
| `appLocalDataDir()` | App local data | `~/Library/Application Support/[bundle.identifier]` |
| `appCacheDir()` | App cache directory | `~/Library/Caches/[bundle.identifier]` |
| `appLogDir()` | App log directory | `~/Library/Logs/[bundle.identifier]` |
| `homeDir()` | User home directory | `~` |
| `join(...paths)` | Join path segments | Platform-aware |
| `resolve(path)` | Resolve to absolute | Handles `.` and `..` |
| `normalize(path)` | Normalize path | Removes redundant separators |
| `basename(path)` | Extract filename | Cross-platform |
| `dirname(path)` | Extract directory | Cross-platform |
| `extname(path)` | Extract extension | `.yml`, `.json`, etc. |
| `isAbsolute(path)` | Check if absolute | Platform-aware |

### Backend Path Module (Rust)

Tauri provides Rust-side path utilities via the `tauri::Manager` trait:

```rust
use tauri::Manager;

#[tauri::command]
fn some_command(app: tauri::AppHandle) -> Result<String, String> {
    let config_dir = app.path()
        .app_config_dir()
        .map_err(|e| e.to_string())?;

    Ok(config_dir.display().to_string())
}
```

**Built-in Rust Path Methods:**
- `app.path().app_config_dir()`
- `app.path().app_data_dir()`
- `app.path().app_local_data_dir()`
- `app.path().app_cache_dir()`
- `app.path().app_log_dir()`
- `app.path().home_dir()`
- `app.path().temp_dir()`
- `app.path().resource_dir()`

---

## IPC Command Patterns and Best Practices

### Error Handling Pattern (Recommended)

**Use `thiserror` crate for custom error types:**

```rust
// In src-tauri/Cargo.toml
[dependencies]
thiserror = "1.0"

// In src-tauri/src/error.rs
use thiserror::Error;

#[derive(Debug, Error, serde::Serialize)]
pub enum PathError {
    #[error("Path not found: {0}")]
    NotFound(String),

    #[error("Invalid path: {0}")]
    InvalidPath(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("IO error: {0}")]
    IoError(String),
}

impl From<std::io::Error> for PathError {
    fn from(err: std::io::Error) -> Self {
        PathError::IoError(err.to_string())
    }
}

// Usage in commands:
#[tauri::command]
fn get_custom_path(app: tauri::AppHandle) -> Result<String, PathError> {
    let path = app.path()
        .app_config_dir()
        .map_err(|_| PathError::NotFound("Config directory".to_string()))?;

    Ok(path.display().to_string())
}
```

**Frontend TypeScript handling:**

```typescript
import { invoke } from '@tauri-apps/api/core';

try {
  const path = await invoke<string>('get_custom_path');
  console.log('Path:', path);
} catch (error) {
  // Error is serialized from Rust PathError
  console.error('Failed to get path:', error);
  // Handle specific error types if needed
}
```

### Async Command Pattern

**Prefer async commands** for non-blocking operations:

```rust
#[tauri::command]
async fn async_path_operation(app: tauri::AppHandle) -> Result<String, String> {
    // Heavy work happens on async task
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    let path = app.path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    Ok(path.display().to_string())
}
```

### Parameter Naming Convention

**CRITICAL**: Tauri automatically converts Rust `snake_case` to TypeScript `camelCase`:

```rust
// Rust backend:
#[tauri::command]
fn get_espanso_file_path(file_name: String) -> Result<String, String> {
    // ...
}

// TypeScript frontend:
import { invoke } from '@tauri-apps/api/core';

const path = await invoke<string>('get_espanso_file_path', {
    fileName: 'projects.json'  // camelCase, not file_name
});
```

**Your existing `paths.rs` already follows this pattern correctly:**
- Rust: `file_name: &str` → TypeScript: `fileName: string`
- Rust: `get_espanso_config_dir()` → TypeScript: `getEspansoConfigDir()`

### Command Registration Pattern

**Register all commands in a single `generate_handler!` call:**

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // Path commands
            get_espanso_config_dir,
            get_espanso_match_dir,
            get_app_data_dir,
            // ... other commands
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## Caching Strategy for Path Values

### Frontend Context Pattern (Recommended)

**Create a `PathContext` to cache path values:**

```typescript
// src/contexts/PathContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface PathContextType {
  espansoConfigDir: string | null;
  espansoMatchDir: string | null;
  appDataDir: string | null;
  isLoading: boolean;
  error: string | null;
  refreshPaths: () => Promise<void>;
}

const PathContext = createContext<PathContextType | undefined>(undefined);

export const PathProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [espansoConfigDir, setEspansoConfigDir] = useState<string | null>(null);
  const [espansoMatchDir, setEspansoMatchDir] = useState<string | null>(null);
  const [appDataDir, setAppDataDir] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPaths = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load all paths in parallel
      const [espansoConfig, espansoMatch, appData] = await Promise.all([
        invoke<string>('get_espanso_config_dir'),
        invoke<string>('get_espanso_match_dir'),
        invoke<string>('get_app_data_dir'),
      ]);

      setEspansoConfigDir(espansoConfig);
      setEspansoMatchDir(espansoMatch);
      setAppDataDir(appData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load paths');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPaths();
  }, []);

  const refreshPaths = async () => {
    await loadPaths();
  };

  return (
    <PathContext.Provider
      value={{
        espansoConfigDir,
        espansoMatchDir,
        appDataDir,
        isLoading,
        error,
        refreshPaths,
      }}
    >
      {children}
    </PathContext.Provider>
  );
};

export const usePaths = () => {
  const context = useContext(PathContext);
  if (!context) {
    throw new Error('usePaths must be used within PathProvider');
  }
  return context;
};
```

**Benefits:**
- **Single IPC call per session** - paths loaded once on app start
- **Type-safe** - TypeScript Context provides autocomplete
- **Error handling** - Centralized error state
- **Refresh capability** - Can reload if needed
- **No prop drilling** - Available anywhere via hook

### Usage in Components

```typescript
import { usePaths } from '@/contexts/PathContext';

const MyComponent: React.FC = () => {
  const { espansoConfigDir, isLoading, error } = usePaths();

  if (isLoading) return <div>Loading paths...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>Espanso config: {espansoConfigDir}</div>;
};
```

---

## Cross-Platform Path Handling

### Platform Detection

**Current implementation in `paths.rs` is correct:**

```rust
pub fn get_espanso_config_dir() -> Result<PathBuf, String> {
    let base_dir = if cfg!(target_os = "macos") {
        dirs::home_dir()
            .ok_or_else(|| "Could not find home directory".to_string())?
            .join("Library")
            .join("Application Support")
            .join("espanso")
    } else if cfg!(target_os = "windows") {
        dirs::config_dir()
            .ok_or_else(|| "Could not find AppData directory".to_string())?
            .join("espanso")
    } else {
        dirs::config_dir()
            .ok_or_else(|| "Could not find config directory".to_string())?
            .join("espanso")
    };

    // Ensure directory exists
    if !base_dir.exists() {
        fs::create_dir_all(&base_dir)
            .map_err(|e| format!("Failed to create Espanso config directory: {}", e))?;
    }

    Ok(base_dir)
}
```

**Best Practices:**
- Use `cfg!(target_os = "...")` for compile-time platform detection
- Use `dirs` crate for platform-standard directories
- Always use `PathBuf.join()` for path construction (handles separators)
- Create directories if they don't exist
- Return clear error messages with context

### Path Separator Handling

**Never hard-code path separators:**

```rust
// BAD - Windows will fail
let path = format!("{}/match/file.yml", config_dir);

// GOOD - Cross-platform
let path = config_dir.join("match").join("file.yml");
```

**Frontend path construction:**

```typescript
import { join } from '@tauri-apps/api/path';

// Use Tauri's join utility
const filePath = await join(espansoMatchDir, 'better_replacements.yml');
```

---

## Recommendations for Phase 1.5 Implementation

### 1. Use Tauri's Built-in Path APIs First

**Instead of creating custom commands for standard paths:**

```typescript
// AVOID creating custom commands for these:
// invoke('get_home_dir')
// invoke('get_temp_dir')
// invoke('join_paths', { paths: [...] })

// USE Tauri's built-in APIs:
import { homeDir, join } from '@tauri-apps/api/path';

const home = await homeDir();
const filePath = await join(home, 'Documents', 'file.txt');
```

### 2. Create Commands Only for BRM-Specific Logic

**Keep existing commands in `paths.rs` for BRM-specific paths:**

```rust
// These are BRM-specific, so keep as commands:
#[tauri::command]
pub fn get_espanso_config_dir() -> Result<String, String> { ... }

#[tauri::command]
pub fn get_espanso_match_dir() -> Result<String, String> { ... }

#[tauri::command]
pub fn get_app_data_dir() -> Result<String, String> { ... }
```

**Expose them as strings (not PathBuf) for TypeScript compatibility:**

```rust
// Current implementation is correct:
#[tauri::command]
pub fn get_espanso_config_dir() -> Result<String, String> {
    let path = get_espanso_config_dir_internal()?;
    Ok(path.display().to_string())
}

// Internal function returns PathBuf for Rust-side usage:
fn get_espanso_config_dir_internal() -> Result<PathBuf, String> {
    // ... implementation
}
```

### 3. Implement Custom Error Type

**Create `src-tauri/src/error.rs`:**

```rust
use thiserror::Error;

#[derive(Debug, Error, serde::Serialize)]
pub enum BrmError {
    #[error("Path not found: {0}")]
    PathNotFound(String),

    #[error("Invalid path: {0}")]
    InvalidPath(String),

    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("IO error: {0}")]
    IoError(String),

    #[error("YAML parse error: {0}")]
    YamlError(String),

    #[error("JSON parse error: {0}")]
    JsonError(String),
}

impl From<std::io::Error> for BrmError {
    fn from(err: std::io::Error) -> Self {
        BrmError::IoError(err.to_string())
    }
}

impl From<serde_yaml::Error> for BrmError {
    fn from(err: serde_yaml::Error) -> Self {
        BrmError::YamlError(err.to_string())
    }
}

impl From<serde_json::Error> for BrmError {
    fn from(err: serde_json::Error) -> Self {
        BrmError::JsonError(err.to_string())
    }
}
```

**Update commands to use `BrmError`:**

```rust
use crate::error::BrmError;

#[tauri::command]
pub fn get_espanso_config_dir() -> Result<String, BrmError> {
    let path = get_espanso_config_dir_internal()
        .map_err(|e| BrmError::PathNotFound(format!("Espanso config: {}", e)))?;
    Ok(path.display().to_string())
}
```

### 4. Create PathContext for Frontend Caching

**Add to `src/contexts/PathContext.tsx`:**

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface PathContextType {
  espansoConfigDir: string | null;
  espansoMatchDir: string | null;
  appDataDir: string | null;
  isLoading: boolean;
  error: string | null;
  refreshPaths: () => Promise<void>;

  // Helper functions
  getEspansoFilePath: (filename: string) => Promise<string>;
  getAppDataFilePath: (filename: string) => Promise<string>;
}

const PathContext = createContext<PathContextType | undefined>(undefined);

export const PathProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [espansoConfigDir, setEspansoConfigDir] = useState<string | null>(null);
  const [espansoMatchDir, setEspansoMatchDir] = useState<string | null>(null);
  const [appDataDir, setAppDataDir] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPaths = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [espansoConfig, espansoMatch, appData] = await Promise.all([
        invoke<string>('get_espanso_config_dir'),
        invoke<string>('get_espanso_match_dir'),
        invoke<string>('get_app_data_dir'),
      ]);

      setEspansoConfigDir(espansoConfig);
      setEspansoMatchDir(espansoMatch);
      setAppDataDir(appData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load paths');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPaths();
  }, []);

  const refreshPaths = async () => {
    await loadPaths();
  };

  // Helper to construct full file path for Espanso files
  const getEspansoFilePath = async (filename: string): Promise<string> => {
    if (!espansoMatchDir) throw new Error('Espanso match directory not loaded');

    // Use Tauri's path join utility
    const { join } = await import('@tauri-apps/api/path');
    return join(espansoMatchDir, filename);
  };

  // Helper to construct full file path for app data files
  const getAppDataFilePath = async (filename: string): Promise<string> => {
    if (!appDataDir) throw new Error('App data directory not loaded');

    const { join } = await import('@tauri-apps/api/path');
    return join(appDataDir, filename);
  };

  return (
    <PathContext.Provider
      value={{
        espansoConfigDir,
        espansoMatchDir,
        appDataDir,
        isLoading,
        error,
        refreshPaths,
        getEspansoFilePath,
        getAppDataFilePath,
      }}
    >
      {children}
    </PathContext.Provider>
  );
};

export const usePaths = () => {
  const context = useContext(PathContext);
  if (!context) {
    throw new Error('usePaths must be used within PathProvider');
  }
  return context;
};
```

**Add provider to App.tsx:**

```typescript
import { PathProvider } from '@/contexts/PathContext';

function App() {
  return (
    <PathProvider>
      <ThemeProvider>
        <ReplacementProvider>
          {/* ... rest of app */}
        </ReplacementProvider>
      </ThemeProvider>
    </PathProvider>
  );
}
```

### 5. TypeScript Type Definitions

**Create `src/types/paths.ts`:**

```typescript
export interface PathInfo {
  espansoConfigDir: string;
  espansoMatchDir: string;
  appDataDir: string;
}

export interface PathError {
  message: string;
  kind: 'PathNotFound' | 'InvalidPath' | 'PermissionDenied' | 'IoError';
}

export type PathResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: PathError;
};
```

### 6. Expose Commands in Tauri

**Update `src-tauri/src/lib.rs` to include path commands:**

```rust
mod paths;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // Existing commands...

            // Path commands
            paths::get_espanso_config_dir,
            paths::get_espanso_match_dir,
            paths::get_app_data_dir,
            paths::get_espanso_file_path,
            paths::get_app_data_file_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Make functions public in `src-tauri/src/paths.rs`:**

```rust
// Change from internal functions to public commands:
#[tauri::command]
pub fn get_espanso_config_dir() -> Result<String, String> {
    get_espanso_config_dir_internal()
        .map(|p| p.display().to_string())
}

#[tauri::command]
pub fn get_espanso_match_dir() -> Result<String, String> {
    get_espanso_match_dir_internal()
        .map(|p| p.display().to_string())
}

#[tauri::command]
pub fn get_app_data_dir() -> Result<String, String> {
    get_app_data_dir_internal()
        .map(|p| p.display().to_string())
}

#[tauri::command]
pub fn get_espanso_file_path(file_name: String) -> Result<String, String> {
    get_espanso_file_path_internal(&file_name)
        .map(|p| p.display().to_string())
}

#[tauri::command]
pub fn get_app_data_file_path(file_name: String) -> Result<String, String> {
    get_app_data_file_path_internal(&file_name)
        .map(|p| p.display().to_string())
}

// Keep internal functions returning PathBuf:
fn get_espanso_config_dir_internal() -> Result<PathBuf, String> {
    // ... existing implementation
}

fn get_espanso_match_dir_internal() -> Result<PathBuf, String> {
    // ... existing implementation
}

fn get_app_data_dir_internal() -> Result<PathBuf, String> {
    // ... existing implementation
}

fn get_espanso_file_path_internal(filename: &str) -> Result<PathBuf, String> {
    // ... existing implementation
}

fn get_app_data_file_path_internal(filename: &str) -> Result<PathBuf, String> {
    // ... existing implementation
}
```

---

## Testing Considerations

### Unit Tests (Rust)

**Test path functions with different platforms:**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_espanso_config_dir() {
        let result = get_espanso_config_dir_internal();
        assert!(result.is_ok());

        let path = result.unwrap();
        assert!(path.to_string_lossy().contains("espanso"));
    }

    #[test]
    fn test_cross_platform_paths() {
        let result = get_app_data_dir_internal();
        assert!(result.is_ok());

        let path = result.unwrap();

        #[cfg(target_os = "macos")]
        assert!(path.to_string_lossy().contains("Library/Application Support"));

        #[cfg(target_os = "windows")]
        assert!(path.to_string_lossy().contains("AppData"));

        #[cfg(target_os = "linux")]
        assert!(path.to_string_lossy().contains(".config"));
    }
}
```

### Integration Tests (TypeScript)

**Test PathContext in component tests:**

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { PathProvider, usePaths } from '@/contexts/PathContext';

describe('PathContext', () => {
  it('loads paths on mount', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PathProvider>{children}</PathProvider>
    );

    const { result } = renderHook(() => usePaths(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.espansoConfigDir).not.toBeNull();
      expect(result.current.appDataDir).not.toBeNull();
    });
  });
});
```

---

## Security Considerations

### Path Validation

**Always validate user-provided paths:**

```rust
use std::path::Path;

fn validate_path(path: &str) -> Result<(), String> {
    let path = Path::new(path);

    // Prevent directory traversal
    if path.to_string_lossy().contains("..") {
        return Err("Path traversal not allowed".to_string());
    }

    // Check if path is within allowed directories
    let allowed_dirs = vec![
        get_espanso_config_dir_internal()?,
        get_app_data_dir_internal()?,
    ];

    for allowed in allowed_dirs {
        if path.starts_with(&allowed) {
            return Ok(());
        }
    }

    Err("Path outside allowed directories".to_string())
}
```

### ACL Permissions

**Configure Tauri ACL for path commands:**

```json
// src-tauri/capabilities/default.json
{
  "identifier": "default",
  "permissions": [
    "core:path:allow-app-config-dir",
    "core:path:allow-app-data-dir",
    "core:path:allow-app-cache-dir",
    "core:path:allow-app-log-dir",
    "core:path:allow-home-dir",
    "core:path:allow-join",
    "core:path:allow-resolve",
    "core:path:allow-normalize"
  ]
}
```

---

## Performance Optimization

### 1. Load Paths Once

**Use Context to avoid repeated IPC calls:**

```typescript
// BAD - IPC call every time
const MyComponent = () => {
  const [path, setPath] = useState('');

  useEffect(() => {
    invoke<string>('get_app_data_dir').then(setPath);
  }, []); // Called on every mount
};

// GOOD - Single IPC call via Context
const MyComponent = () => {
  const { appDataDir } = usePaths(); // Cached value
};
```

### 2. Batch Path Operations

**Load all paths in parallel:**

```typescript
// Load paths concurrently
const [espansoConfig, espansoMatch, appData] = await Promise.all([
  invoke<string>('get_espanso_config_dir'),
  invoke<string>('get_espanso_match_dir'),
  invoke<string>('get_app_data_dir'),
]);
```

### 3. Minimize String Allocations (Rust)

**Use references where possible:**

```rust
// Avoid unnecessary String allocations
pub fn get_espanso_file_path(file_name: String) -> Result<String, String> {
    get_espanso_file_path_internal(&file_name) // Pass by reference
        .map(|p| p.display().to_string())
}

fn get_espanso_file_path_internal(filename: &str) -> Result<PathBuf, String> {
    let match_dir = get_espanso_match_dir_internal()?;
    Ok(match_dir.join(filename))
}
```

---

## Migration Strategy

### Phase 1: Add Commands (No Breaking Changes)

**Expose existing path functions as commands:**

1. Add `#[tauri::command]` attribute to public functions
2. Register in `invoke_handler`
3. Keep internal functions unchanged

### Phase 2: Create Frontend Context

**Add PathContext without changing existing code:**

1. Create `src/contexts/PathContext.tsx`
2. Add `PathProvider` to App.tsx
3. Components can opt-in to using `usePaths()`

### Phase 3: Migrate Components

**Gradually migrate components to use PathContext:**

```typescript
// Before:
const filePath = `/path/to/espanso/match/${fileName}`;

// After:
const { getEspansoFilePath } = usePaths();
const filePath = await getEspansoFilePath(fileName);
```

### Phase 4: Add Error Handling

**Replace `String` errors with `BrmError`:**

1. Add `thiserror` dependency
2. Create `error.rs` module
3. Update command signatures
4. Update frontend error handling

---

## Comparison: Custom Commands vs Built-in APIs

| Operation | Custom Command | Built-in API | Recommendation |
|-----------|----------------|--------------|----------------|
| Get home dir | `invoke('get_home_dir')` | `homeDir()` | Use built-in |
| Join paths | `invoke('join_paths', ...)` | `join(...paths)` | Use built-in |
| Get app config | `invoke('get_app_config_dir')` | `appConfigDir()` | Use built-in |
| Get Espanso dir | `invoke('get_espanso_config_dir')` | N/A | Custom command (BRM-specific) |
| Get BRM data dir | `invoke('get_app_data_dir')` | N/A | Custom command (BRM-specific) |

**Guideline**: Use Tauri's built-in APIs for standard operations, create custom commands only for BRM-specific logic.

---

## References

- [Tauri v2 Path API Documentation](https://v2.tauri.app/reference/javascript/api/namespacecore/)
- [Tauri v2 Calling Rust from Frontend](https://v2.tauri.app/develop/calling-rust/)
- [Tauri IPC Documentation](https://v2.tauri.app/develop/inter-process-communication/)
- [thiserror crate](https://docs.rs/thiserror/)
- [dirs crate](https://docs.rs/dirs/)
- [Tauri ACL Permissions](https://v2.tauri.app/security/capabilities/)

---

## Related Files in BRM

- `/src-tauri/src/paths.rs` - Current path utility implementation
- `/src-tauri/src/lib.rs` - Command registration
- Future: `/src/contexts/PathContext.tsx` - Frontend path cache
- Future: `/src-tauri/src/error.rs` - Custom error types

---

**Last Updated**: 2025-11-02
**Next Review**: When implementing Windows/Linux support
