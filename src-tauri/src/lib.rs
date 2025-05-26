use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use log::{error, info};

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

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Project {
    id: String,
    name: String,
    description: String,
    stack: String,
    directory: String,
    #[serde(rename = "restartCommand")]
    restart_command: String,
    #[serde(rename = "logCommand")]
    log_command: String,
    #[serde(rename = "isActive")]
    is_active: bool,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "updatedAt")]
    updated_at: String,
    #[serde(rename = "customVariables")]
    custom_variables: Option<std::collections::HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ProjectData {
    projects: Vec<Project>,
    #[serde(rename = "activeProjectId")]
    active_project_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Category {
    id: String,
    name: String,
    #[serde(rename = "fileName")]
    file_name: String,
    description: Option<String>,
    icon: String,
    color: Option<String>,
    #[serde(rename = "isDefault")]
    is_default: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
struct CategoriesData {
    categories: Vec<Category>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct CustomVariable {
    id: String,
    name: String,
    value: String,
    preview: Option<String>,
    description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct CustomVariableCategory {
    id: String,
    name: String,
    icon: String,
    variables: Vec<CustomVariable>,
    color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct VariablesData {
    categories: Vec<CustomVariableCategory>,
    #[serde(rename = "lastUpdated")]
    last_updated: String,
}

// Saved Extensions structures
#[derive(Debug, Serialize, Deserialize, Clone)]
struct SavedExtension {
    id: String,
    name: String,
    description: Option<String>,
    category: Option<String>,
    tags: Option<Vec<String>>,
    extension: Value, // JSON representation of the extension
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "updatedAt")]
    updated_at: String,
    #[serde(rename = "usageCount")]
    usage_count: i32,
    #[serde(rename = "isFavorite")]
    is_favorite: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct SavedExtensionCategory {
    id: String,
    name: String,
    description: Option<String>,
    color: Option<String>,
    icon: Option<String>,
    order: i32,
}

#[derive(Debug, Serialize, Deserialize)]
struct SavedExtensionSettings {
    #[serde(rename = "defaultCategory")]
    default_category: Option<String>,
    #[serde(rename = "autoSaveOnCreate")]
    auto_save_on_create: bool,
    #[serde(rename = "showUsageStats")]
    show_usage_stats: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct SavedExtensionsData {
    extensions: Vec<SavedExtension>,
    categories: Vec<SavedExtensionCategory>,
    settings: SavedExtensionSettings,
    #[serde(rename = "lastUpdated")]
    last_updated: String,
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn read_espanso_file(file_path: String) -> Result<Vec<Replacement>, String> {
    info!("Reading Espanso file: {}", file_path);
    let path = Path::new(&file_path);
    
    if !path.exists() {
        error!("File not found: {}", file_path);
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
    info!("Writing {} replacements to Espanso file: {}", replacements.len(), file_path);
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

fn get_projects_file_path() -> PathBuf {
    let home_dir = dirs::home_dir().expect("Could not find home directory");
    home_dir.join("Library")
        .join("Application Support")
        .join("BetterReplacementsManager")
        .join("projects.json")
}

fn ensure_app_dir() -> Result<(), String> {
    let projects_path = get_projects_file_path();
    if let Some(parent) = projects_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create app directory: {}", e))?;
    }
    Ok(())
}

fn load_project_data() -> Result<ProjectData, String> {
    ensure_app_dir()?;
    let projects_path = get_projects_file_path();
    
    if !projects_path.exists() {
        // Create default data
        let default_data = ProjectData {
            projects: vec![],
            active_project_id: None,
        };
        save_project_data(&default_data)?;
        return Ok(default_data);
    }
    
    let contents = fs::read_to_string(&projects_path)
        .map_err(|e| format!("Failed to read projects file: {}", e))?;
    
    let data: ProjectData = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse projects data: {}", e))?;
    
    Ok(data)
}

fn save_project_data(data: &ProjectData) -> Result<(), String> {
    ensure_app_dir()?;
    let projects_path = get_projects_file_path();
    
    let json_string = serde_json::to_string_pretty(data)
        .map_err(|e| format!("Failed to serialize project data: {}", e))?;
    
    fs::write(&projects_path, json_string)
        .map_err(|e| format!("Failed to write projects file: {}", e))?;
    
    Ok(())
}

#[tauri::command]
fn get_projects() -> Result<ProjectData, String> {
    load_project_data()
}

#[tauri::command]
fn create_project(project: Project) -> Result<(), String> {
    info!("Creating new project: {}", project.name);
    let mut data = load_project_data()?;
    data.projects.push(project);
    save_project_data(&data)?;
    update_project_selector()?;
    Ok(())
}

#[tauri::command]
fn update_project(id: String, updates: Value) -> Result<(), String> {
    let mut data = load_project_data()?;
    
    if let Some(project) = data.projects.iter_mut().find(|p| p.id == id) {
        // Update fields from the updates JSON value
        if let Some(obj) = updates.as_object() {
            if let Some(name) = obj.get("name").and_then(|v| v.as_str()) {
                project.name = name.to_string();
            }
            if let Some(desc) = obj.get("description").and_then(|v| v.as_str()) {
                project.description = desc.to_string();
            }
            if let Some(stack) = obj.get("stack").and_then(|v| v.as_str()) {
                project.stack = stack.to_string();
            }
            if let Some(dir) = obj.get("directory").and_then(|v| v.as_str()) {
                project.directory = dir.to_string();
            }
            if let Some(cmd) = obj.get("restartCommand").and_then(|v| v.as_str()) {
                project.restart_command = cmd.to_string();
            }
            if let Some(cmd) = obj.get("logCommand").and_then(|v| v.as_str()) {
                project.log_command = cmd.to_string();
            }
            if let Some(custom_vars) = obj.get("customVariables").and_then(|v| v.as_object()) {
                let mut vars_map = std::collections::HashMap::new();
                for (key, value) in custom_vars {
                    if let Some(val_str) = value.as_str() {
                        vars_map.insert(key.clone(), val_str.to_string());
                    }
                }
                project.custom_variables = Some(vars_map);
            }
            // Update timestamp
            project.updated_at = chrono::Utc::now().to_rfc3339();
        }
        save_project_data(&data)
    } else {
        Err("Project not found".to_string())
    }
}

#[tauri::command]
fn delete_project(id: String) -> Result<(), String> {
    let mut data = load_project_data()?;
    data.projects.retain(|p| p.id != id);
    
    // Clear active project if it was deleted
    if data.active_project_id == Some(id.clone()) {
        data.active_project_id = None;
    }
    
    save_project_data(&data)?;
    update_project_selector()?;
    Ok(())
}

#[tauri::command]
fn set_active_project(id: Option<String>) -> Result<(), String> {
    info!("Setting active project: {:?}", id);
    let mut data = load_project_data()?;
    
    // Verify project exists if id is provided
    if let Some(ref project_id) = id {
        if !data.projects.iter().any(|p| p.id == *project_id) {
            return Err("Project not found".to_string());
        }
    }
    
    data.active_project_id = id;
    save_project_data(&data)?;
    
    // Update Espanso config for active project
    if let Some(active_id) = &data.active_project_id {
        if let Some(project) = data.projects.iter().find(|p| p.id == *active_id) {
            update_espanso_project_vars(project)?;
        }
    }
    
    Ok(())
}

fn update_espanso_project_vars(project: &Project) -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let espanso_path = home_dir.join("Library")
        .join("Application Support")
        .join("espanso")
        .join("match")
        .join("project_active_vars.yml");
    
    let mut yaml_content = format!(r#"# Generated active project variables for: {}
global_vars:
  - name: active_project_name
    type: echo
    params:
      echo: "{}"
  
  - name: active_project_stack
    type: echo
    params:
      echo: "{}"
  
  - name: active_project_directory
    type: echo
    params:
      echo: "{}"
  
  - name: active_project_restart_cmd
    type: echo
    params:
      echo: "{}"
  
  - name: active_project_log_cmd
    type: echo
    params:
      echo: "{}"
"#, project.name, project.name, project.stack, project.directory, project.restart_command, project.log_command);
    
    // Add custom variables if they exist
    if let Some(custom_vars) = &project.custom_variables {
        for (key, value) in custom_vars {
            yaml_content.push_str(&format!(r#"  
  - name: {}
    type: echo
    params:
      echo: "{}"
"#, key, value));
        }
    }
    
    fs::write(&espanso_path, yaml_content)
        .map_err(|e| format!("Failed to write Espanso project vars: {}", e))?;
    
    // Also update the project selector
    update_project_selector()?;
    
    Ok(())
}

fn update_project_selector() -> Result<(), String> {
    let data = load_project_data()?;
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let selector_path = home_dir.join("Library")
        .join("Application Support")
        .join("espanso")
        .join("match")
        .join("project_selector.yml");
    
    // Build the choices for the selector
    let mut choices = vec![];
    for project in &data.projects {
        choices.push(format!(r#"          - label: "{}"
            id: "{}""#, project.name, project.id));
    }
    
    let yaml_content = format!(r#"# Generated project selector for quick switching
matches:
  - trigger: ":project"
    replace: "{{{{project_choice}}}}"
    vars:
      - name: project_choice
        type: choice
        params:
          values:
{}
"#, choices.join("\n"));
    
    fs::write(&selector_path, yaml_content)
        .map_err(|e| format!("Failed to write project selector: {}", e))?;
    
    Ok(())
}

#[tauri::command]
fn handle_project_selection(project_id: String) -> Result<(), String> {
    set_active_project(Some(project_id))
}

#[tauri::command]
fn open_directory_dialog() -> Result<Option<String>, String> {
    use rfd::FileDialog;
    
    let folder = FileDialog::new()
        .set_title("Select Project Directory")
        .pick_folder();
    
    Ok(folder.map(|p| p.display().to_string()))
}

// Category management functions
fn get_categories_file_path() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    Ok(home_dir.join("Library")
        .join("Application Support")
        .join("espanso")
        .join("config")
        .join("categories.json"))
}

fn load_categories_data() -> Result<CategoriesData, String> {
    let file_path = get_categories_file_path()?;
    
    if file_path.exists() {
        let content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read categories file: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse categories data: {}", e))
    } else {
        // Return default categories if file doesn't exist
        Ok(CategoriesData {
            categories: vec![
                Category {
                    id: "1".to_string(),
                    name: "Global".to_string(),
                    file_name: "better_replacements.yml".to_string(),
                    description: Some("Global text replacements".to_string()),
                    icon: "FileTextOutlined".to_string(),
                    color: None,
                    is_default: Some(true),
                },
                Category {
                    id: "2".to_string(),
                    name: "Base".to_string(),
                    file_name: "base.yml".to_string(),
                    description: Some("Base replacements and snippets".to_string()),
                    icon: "CodeOutlined".to_string(),
                    color: None,
                    is_default: Some(true),
                },
                Category {
                    id: "3".to_string(),
                    name: "AI Prompts".to_string(),
                    file_name: "ai_prompts.yml".to_string(),
                    description: Some("AI-related prompts and templates".to_string()),
                    icon: "RobotOutlined".to_string(),
                    color: None,
                    is_default: Some(true),
                },
            ],
        })
    }
}

fn save_categories_data(data: &CategoriesData) -> Result<(), String> {
    let file_path = get_categories_file_path()?;
    
    // Ensure directory exists
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create categories directory: {}", e))?;
    }
    
    let json = serde_json::to_string_pretty(data)
        .map_err(|e| format!("Failed to serialize categories data: {}", e))?;
    fs::write(&file_path, json)
        .map_err(|e| format!("Failed to write categories file: {}", e))?;
    
    Ok(())
}

#[tauri::command]
fn get_categories() -> Result<Vec<Category>, String> {
    let data = load_categories_data()?;
    Ok(data.categories)
}

#[tauri::command]
fn create_category(category: Category) -> Result<(), String> {
    let mut data = load_categories_data()?;
    
    // Check if file name already exists
    if data.categories.iter().any(|c| c.file_name == category.file_name) {
        return Err("A category with this file name already exists".to_string());
    }
    
    // Create the YAML file for the new category
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let yaml_path = home_dir.join("Library")
        .join("Application Support")
        .join("espanso")
        .join("match")
        .join(&category.file_name);
    
    if !yaml_path.exists() {
        let initial_content = "matches:\n  # Add your replacements here\n";
        fs::write(&yaml_path, initial_content)
            .map_err(|e| format!("Failed to create category file: {}", e))?;
    }
    
    data.categories.push(category);
    save_categories_data(&data)
}

#[tauri::command]
fn update_category(id: String, updates: Value) -> Result<(), String> {
    let mut data = load_categories_data()?;
    
    if let Some(category) = data.categories.iter_mut().find(|c| c.id == id) {
        // Don't allow updating default categories
        if category.is_default.unwrap_or(false) {
            return Err("Cannot update default categories".to_string());
        }
        
        if let Some(obj) = updates.as_object() {
            if let Some(name) = obj.get("name").and_then(|v| v.as_str()) {
                category.name = name.to_string();
            }
            if let Some(desc) = obj.get("description").and_then(|v| v.as_str()) {
                category.description = Some(desc.to_string());
            }
            if let Some(icon) = obj.get("icon").and_then(|v| v.as_str()) {
                category.icon = icon.to_string();
            }
            if let Some(color) = obj.get("color").and_then(|v| v.as_str()) {
                category.color = Some(color.to_string());
            }
        }
        save_categories_data(&data)
    } else {
        Err("Category not found".to_string())
    }
}

#[tauri::command]
fn delete_category(id: String) -> Result<(), String> {
    let mut data = load_categories_data()?;
    
    // Find the category to delete
    if let Some(category) = data.categories.iter().find(|c| c.id == id) {
        // Don't allow deleting default categories
        if category.is_default.unwrap_or(false) {
            return Err("Cannot delete default categories".to_string());
        }
        
        // Delete the YAML file
        let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
        let yaml_path = home_dir.join("Library")
            .join("Application Support")
            .join("espanso")
            .join("match")
            .join(&category.file_name);
        
        if yaml_path.exists() {
            fs::remove_file(&yaml_path)
                .map_err(|e| format!("Failed to delete category file: {}", e))?;
        }
    }
    
    data.categories.retain(|c| c.id != id);
    save_categories_data(&data)
}

// Custom variables management functions
fn get_custom_variables_file_path() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    Ok(home_dir.join("Library")
        .join("Application Support")
        .join("BetterReplacementsManager")
        .join("custom_variables.json"))
}

fn load_custom_variables_data() -> Result<VariablesData, String> {
    let file_path = get_custom_variables_file_path()?;
    
    if file_path.exists() {
        let content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read custom variables file: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse custom variables data: {}", e))
    } else {
        // Return default empty data if file doesn't exist
        Ok(VariablesData {
            categories: vec![],
            last_updated: chrono::Utc::now().to_rfc3339(),
        })
    }
}

fn save_custom_variables_data(data: &VariablesData) -> Result<(), String> {
    let file_path = get_custom_variables_file_path()?;
    
    // Ensure directory exists
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create custom variables directory: {}", e))?;
    }
    
    let json = serde_json::to_string_pretty(data)
        .map_err(|e| format!("Failed to serialize custom variables data: {}", e))?;
    fs::write(&file_path, json)
        .map_err(|e| format!("Failed to write custom variables file: {}", e))?;
    
    Ok(())
}

#[tauri::command]
fn read_custom_variables() -> Result<VariablesData, String> {
    load_custom_variables_data()
}

#[tauri::command]
fn write_custom_variables(data: VariablesData) -> Result<(), String> {
    save_custom_variables_data(&data)
}

// Saved extensions management functions
fn get_saved_extensions_file_path() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    Ok(home_dir.join("Library")
        .join("Application Support")
        .join("BetterReplacementsManager")
        .join("saved_extensions.json"))
}

fn load_saved_extensions_data() -> Result<SavedExtensionsData, String> {
    let file_path = get_saved_extensions_file_path()?;
    
    if file_path.exists() {
        let content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read saved extensions file: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse saved extensions data: {}", e))
    } else {
        // Return default data with built-in categories if file doesn't exist
        Ok(create_default_saved_extensions_data())
    }
}

fn save_saved_extensions_data(data: &SavedExtensionsData) -> Result<(), String> {
    let file_path = get_saved_extensions_file_path()?;
    
    // Ensure directory exists
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create saved extensions directory: {}", e))?;
    }
    
    let json = serde_json::to_string_pretty(data)
        .map_err(|e| format!("Failed to serialize saved extensions data: {}", e))?;
    fs::write(&file_path, json)
        .map_err(|e| format!("Failed to write saved extensions file: {}", e))?;
    
    Ok(())
}

fn create_default_saved_extensions_data() -> SavedExtensionsData {
    SavedExtensionsData {
        extensions: vec![],
        categories: vec![
            SavedExtensionCategory {
                id: "development".to_string(),
                name: "Development".to_string(),
                description: Some("Scripts and commands for development tasks".to_string()),
                color: Some("#1890ff".to_string()),
                icon: Some("CodeOutlined".to_string()),
                order: 1,
            },
            SavedExtensionCategory {
                id: "productivity".to_string(),
                name: "Productivity".to_string(),
                description: Some("Templates and forms for daily workflows".to_string()),
                color: Some("#52c41a".to_string()),
                icon: Some("ThunderboltOutlined".to_string()),
                order: 2,
            },
            SavedExtensionCategory {
                id: "communication".to_string(),
                name: "Communication".to_string(),
                description: Some("Email templates, meeting notes, etc.".to_string()),
                color: Some("#722ed1".to_string()),
                icon: Some("MessageOutlined".to_string()),
                order: 3,
            },
            SavedExtensionCategory {
                id: "system".to_string(),
                name: "System".to_string(),
                description: Some("System commands and utilities".to_string()),
                color: Some("#fa8c16".to_string()),
                icon: Some("SettingOutlined".to_string()),
                order: 4,
            },
            SavedExtensionCategory {
                id: "personal".to_string(),
                name: "Personal".to_string(),
                description: Some("Personal templates and shortcuts".to_string()),
                color: Some("#eb2f96".to_string()),
                icon: Some("UserOutlined".to_string()),
                order: 5,
            },
            SavedExtensionCategory {
                id: "utilities".to_string(),
                name: "Utilities".to_string(),
                description: Some("Utility extensions and helpers".to_string()),
                color: Some("#13c2c2".to_string()),
                icon: Some("ToolOutlined".to_string()),
                order: 6,
            },
            SavedExtensionCategory {
                id: "text-processing".to_string(),
                name: "Text Processing".to_string(),
                description: Some("Text manipulation and formatting".to_string()),
                color: Some("#fa541c".to_string()),
                icon: Some("FontSizeOutlined".to_string()),
                order: 7,
            },
            SavedExtensionCategory {
                id: "work".to_string(),
                name: "Work".to_string(),
                description: Some("Work-related templates and tools".to_string()),
                color: Some("#2f54eb".to_string()),
                icon: Some("BankOutlined".to_string()),
                order: 8,
            },
        ],
        settings: SavedExtensionSettings {
            default_category: Some("personal".to_string()),
            auto_save_on_create: false,
            show_usage_stats: true,
        },
        last_updated: chrono::Utc::now().to_rfc3339(),
    }
}

#[tauri::command]
fn read_saved_extensions() -> Result<SavedExtensionsData, String> {
    load_saved_extensions_data()
}

#[tauri::command]
fn write_saved_extensions(data: SavedExtensionsData) -> Result<(), String> {
    save_saved_extensions_data(&data)
}

#[tauri::command]
fn save_extension(extension_data: SavedExtension) -> Result<(), String> {
    let mut data = load_saved_extensions_data()?;
    
    // Check if extension with this ID already exists
    if let Some(index) = data.extensions.iter().position(|e| e.id == extension_data.id) {
        // Update existing extension
        data.extensions[index] = extension_data;
    } else {
        // Add new extension
        data.extensions.push(extension_data);
    }
    
    data.last_updated = chrono::Utc::now().to_rfc3339();
    save_saved_extensions_data(&data)
}

#[tauri::command]
fn delete_saved_extension(extension_id: String) -> Result<(), String> {
    let mut data = load_saved_extensions_data()?;
    data.extensions.retain(|e| e.id != extension_id);
    data.last_updated = chrono::Utc::now().to_rfc3339();
    save_saved_extensions_data(&data)
}

#[tauri::command]
fn increment_extension_usage(extension_id: String) -> Result<(), String> {
    let mut data = load_saved_extensions_data()?;
    
    if let Some(extension) = data.extensions.iter_mut().find(|e| e.id == extension_id) {
        extension.usage_count += 1;
        extension.updated_at = chrono::Utc::now().to_rfc3339();
        data.last_updated = chrono::Utc::now().to_rfc3339();
        save_saved_extensions_data(&data)
    } else {
        Err(format!("Extension with ID {} not found", extension_id))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new()
            .targets([
                tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir { file_name: None }),
                tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
            ])
            .level(log::LevelFilter::Debug)
            .build())
        .invoke_handler(tauri::generate_handler![
            read_espanso_file, 
            write_espanso_file,
            get_projects,
            create_project,
            update_project,
            delete_project,
            set_active_project,
            handle_project_selection,
            open_directory_dialog,
            get_categories,
            create_category,
            update_category,
            delete_category,
            read_custom_variables,
            write_custom_variables,
            read_saved_extensions,
            write_saved_extensions,
            save_extension,
            delete_saved_extension,
            increment_extension_usage
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
