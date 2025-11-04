use log::{info, warn};
use std::fs;
use std::path::PathBuf;
use std::process::Command;

// ========== Espanso CLI Detection ==========

/// Try to get the Espanso config path by executing the `espanso path` CLI command
///
/// This allows us to detect custom Espanso installations and respect user configurations.
/// Falls back to hardcoded platform-specific paths if the CLI command fails.
fn get_espanso_path_from_cli() -> Result<PathBuf, String> {
    let command_name = if cfg!(target_os = "windows") {
        "espanso.exe"
    } else {
        "espanso"
    };

    let output = Command::new(command_name)
        .arg("path")
        .output()
        .map_err(|e| {
            format!(
                "Failed to execute espanso command: {}. Is Espanso installed?",
                e
            )
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Espanso command failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    // Parse first line: "Config: /path/to/espanso"
    for line in stdout.lines() {
        if line.starts_with("Config:") {
            let config_path = line.trim_start_matches("Config:").trim();
            return Ok(PathBuf::from(config_path));
        }
    }

    Err("Could not parse espanso path output".to_string())
}

// ========== Internal Path Functions (return PathBuf) ==========

/// Internal: Get the Espanso configuration directory for the current platform
///
/// This function first tries to detect the Espanso path via the `espanso path` CLI command.
/// If that fails (e.g., Espanso not installed), it falls back to platform-specific defaults.
///
/// Returns:
/// - macOS: ~/Library/Application Support/espanso
/// - Windows: %APPDATA%\espanso
/// - Linux: ~/.config/espanso (or $XDG_CONFIG_HOME/espanso)
pub fn get_espanso_config_dir_internal() -> Result<PathBuf, String> {
    // Try CLI detection first
    match get_espanso_path_from_cli() {
        Ok(path) => {
            info!("Using Espanso path from CLI: {}", path.display());
            // Ensure directory exists
            if !path.exists() {
                fs::create_dir_all(&path)
                    .map_err(|e| format!("Failed to create Espanso config directory: {}", e))?;
            }
            return Ok(path);
        }
        Err(e) => {
            warn!(
                "Could not get path from Espanso CLI: {}. Using hardcoded platform paths.",
                e
            );
            // Fall through to hardcoded logic below
        }
    }

    // Fallback to hardcoded platform-specific paths
    let base_dir = if cfg!(target_os = "macos") {
        // macOS: ~/Library/Application Support/espanso
        dirs::home_dir()
            .ok_or_else(|| "Could not find home directory".to_string())?
            .join("Library")
            .join("Application Support")
            .join("espanso")
    } else if cfg!(target_os = "windows") {
        // Windows: %APPDATA%\espanso
        dirs::config_dir()
            .ok_or_else(|| "Could not find AppData directory".to_string())?
            .join("espanso")
    } else {
        // Linux: ~/.config/espanso
        dirs::config_dir()
            .ok_or_else(|| "Could not find config directory".to_string())?
            .join("espanso")
    };

    info!("Using hardcoded Espanso path: {}", base_dir.display());

    // Ensure directory exists
    if !base_dir.exists() {
        fs::create_dir_all(&base_dir)
            .map_err(|e| format!("Failed to create Espanso config directory: {}", e))?;
    }

    Ok(base_dir)
}

/// Internal: Get the Espanso match directory (where YAML files are stored)
///
/// Returns the path to the espanso/match directory
pub fn get_espanso_match_dir_internal() -> Result<PathBuf, String> {
    let config_dir = get_espanso_config_dir_internal()?;
    let match_dir = config_dir.join("match");

    // Ensure directory exists
    if !match_dir.exists() {
        fs::create_dir_all(&match_dir)
            .map_err(|e| format!("Failed to create Espanso match directory: {}", e))?;
    }

    Ok(match_dir)
}

/// Internal: Get the application data directory for BetterReplacementsManager
///
/// Returns:
/// - macOS: ~/Library/Application Support/BetterReplacementsManager
/// - Windows: %APPDATA%\BetterReplacementsManager
/// - Linux: ~/.config/BetterReplacementsManager
pub fn get_app_data_dir_internal() -> Result<PathBuf, String> {
    let base_dir = if cfg!(target_os = "macos") {
        // macOS: ~/Library/Application Support/BetterReplacementsManager
        dirs::home_dir()
            .ok_or_else(|| "Could not find home directory".to_string())?
            .join("Library")
            .join("Application Support")
            .join("BetterReplacementsManager")
    } else if cfg!(target_os = "windows") {
        // Windows: %APPDATA%\BetterReplacementsManager
        dirs::config_dir()
            .ok_or_else(|| "Could not find AppData directory".to_string())?
            .join("BetterReplacementsManager")
    } else {
        // Linux: ~/.config/BetterReplacementsManager
        dirs::config_dir()
            .ok_or_else(|| "Could not find config directory".to_string())?
            .join("BetterReplacementsManager")
    };

    // Ensure directory exists
    if !base_dir.exists() {
        fs::create_dir_all(&base_dir)
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    }

    Ok(base_dir)
}

// ========== File Initialization System ==========

/// Initialize required Espanso YAML files if they don't exist
///
/// Creates the following files with empty structure if missing:
/// - base.yml
/// - better_replacements.yml
/// - ai_prompts.yml
///
/// This ensures first-time users have the required files without manual setup.
/// Existing files are never overwritten.
fn initialize_espanso_files() -> Result<(), String> {
    let match_dir = get_espanso_match_dir_internal()?;

    let required_files = vec!["base.yml", "better_replacements.yml", "ai_prompts.yml"];

    let default_content = "matches: []\n";

    for filename in required_files {
        let file_path = match_dir.join(filename);

        if !file_path.exists() {
            info!("Creating missing Espanso file: {}", filename);
            fs::write(&file_path, default_content)
                .map_err(|e| format!("Failed to create {}: {}", filename, e))?;
        } else {
            info!("Espanso file already exists: {}", filename);
        }
    }

    Ok(())
}

/// Initialize the espanso/config directory if it doesn't exist
///
/// This ensures the config subdirectory exists for storing app metadata files
/// like project_categories.json
fn initialize_config_directory() -> Result<(), String> {
    let espanso_config = get_espanso_config_dir_internal()?;
    let config_subdir = espanso_config.join("config");

    if !config_subdir.exists() {
        info!("Creating espanso/config directory");
        fs::create_dir_all(&config_subdir)
            .map_err(|e| format!("Failed to create espanso/config directory: {}", e))?;
    } else {
        info!("espanso/config directory already exists");
    }

    Ok(())
}

// ========== Tauri Commands (return String for frontend) ==========

/// Tauri command: Get the Espanso configuration directory path as string
#[tauri::command]
pub fn get_espanso_config_dir() -> Result<String, String> {
    get_espanso_config_dir_internal().map(|p| p.display().to_string())
}

/// Tauri command: Get the Espanso match directory path as string
#[tauri::command]
pub fn get_espanso_match_dir() -> Result<String, String> {
    get_espanso_match_dir_internal().map(|p| p.display().to_string())
}

/// Tauri command: Get the application data directory path as string
#[tauri::command]
pub fn get_app_data_dir() -> Result<String, String> {
    get_app_data_dir_internal().map(|p| p.display().to_string())
}

/// Tauri command: Initialize all required Espanso files
///
/// This command should be called on app startup to ensure all required
/// YAML files and directories exist. It creates missing files but never overwrites existing ones.
#[tauri::command]
pub fn initialize_app_files() -> Result<(), String> {
    info!("Initializing app files...");

    // Create YAML match files
    initialize_espanso_files()?;

    // Create config directory for metadata files
    initialize_config_directory()?;

    info!("App files initialized successfully");
    Ok(())
}

// ========== Helper Functions (use internal versions) ==========

/// Get the path to a specific file in the Espanso match directory
pub fn get_espanso_file_path(filename: &str) -> Result<PathBuf, String> {
    let match_dir = get_espanso_match_dir_internal()?;
    Ok(match_dir.join(filename))
}

/// Get the path to a specific file in the app data directory
pub fn get_app_data_file_path(filename: &str) -> Result<PathBuf, String> {
    let data_dir = get_app_data_dir_internal()?;
    Ok(data_dir.join(filename))
}

/// Check if a path exists and is accessible
pub fn path_exists(path: &PathBuf) -> bool {
    path.exists()
}

/// Get the current platform as a string
pub fn get_platform_name() -> &'static str {
    if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "windows") {
        "windows"
    } else {
        "linux"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_platform_name() {
        let platform = get_platform_name();
        assert!(platform == "macos" || platform == "windows" || platform == "linux");
    }

    #[test]
    fn test_espanso_config_dir() {
        let result = get_espanso_config_dir_internal();
        assert!(result.is_ok());

        let path = result.unwrap();
        assert!(path.to_string_lossy().contains("espanso"));
    }

    #[test]
    fn test_app_data_dir() {
        let result = get_app_data_dir_internal();
        assert!(result.is_ok());

        let path = result.unwrap();
        assert!(path.to_string_lossy().contains("BetterReplacementsManager"));
    }

    #[test]
    fn test_espanso_file_path() {
        let result = get_espanso_file_path("test.yml");
        assert!(result.is_ok());

        let path = result.unwrap();
        assert!(path.to_string_lossy().contains("test.yml"));
        assert!(path.to_string_lossy().contains("match"));
    }

    #[test]
    fn test_app_data_file_path() {
        let result = get_app_data_file_path("projects.json");
        assert!(result.is_ok());

        let path = result.unwrap();
        assert!(path.to_string_lossy().contains("projects.json"));
        assert!(path.to_string_lossy().contains("BetterReplacementsManager"));
    }
}
