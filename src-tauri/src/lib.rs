use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
struct EspansoMatch {
    trigger: String,
    replace: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct EspansoConfig {
    matches: Vec<EspansoMatch>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Replacement {
    trigger: String,
    replace: String,
    source: String,
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn read_espanso_file(file_path: String) -> Result<Vec<Replacement>, String> {
    let path = Path::new(&file_path);
    
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }
    
    let contents = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    let config: EspansoConfig = serde_yaml::from_str(&contents)
        .map_err(|e| format!("Failed to parse YAML: {}", e))?;
    
    let file_name = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown");
    
    let replacements = config.matches
        .into_iter()
        .map(|m| Replacement {
            trigger: m.trigger,
            replace: m.replace,
            source: file_name.to_string(),
        })
        .collect();
    
    Ok(replacements)
}

#[tauri::command]
fn write_espanso_file(file_path: String, replacements: Vec<Replacement>) -> Result<(), String> {
    let path = Path::new(&file_path);
    
    // Convert replacements to EspansoConfig
    let matches: Vec<EspansoMatch> = replacements
        .into_iter()
        .map(|r| EspansoMatch {
            trigger: r.trigger,
            replace: r.replace,
        })
        .collect();
    
    let config = EspansoConfig { matches };
    
    // Serialize to YAML
    let yaml_string = serde_yaml::to_string(&config)
        .map_err(|e| format!("Failed to serialize YAML: {}", e))?;
    
    // Write to file
    fs::write(path, yaml_string)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_espanso_file, write_espanso_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
