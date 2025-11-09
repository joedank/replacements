use log::{error, info};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

mod yaml_utils;
use yaml_utils::{atomic_write, escape_yaml_value};

mod llm_api;
mod paths;
mod secure_storage;

#[derive(Debug, Serialize, Deserialize)]
struct EspansoMatch {
    trigger: String,
    replace: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    vars: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    enabled: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    case_sensitive: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    word_boundary: Option<bool>,
    #[serde(flatten)]
    #[serde(default)]
    extra: HashMap<String, Value>,
}

#[derive(Debug, Serialize, Deserialize)]
struct EspansoConfig {
    matches: Vec<EspansoMatch>,
    #[serde(skip_serializing_if = "Option::is_none")]
    global_vars: Option<Value>,
    #[serde(flatten)]
    #[serde(default)]
    extra: HashMap<String, Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Replacement {
    trigger: String,
    replace: String,
    source: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    vars: Option<Value>,
    #[serde(default)]
    metadata: HashMap<String, Value>,
}

#[derive(Debug, Deserialize)]
struct RawProject {
    id: Option<String>,
    name: String,
    description: Option<String>,
    #[serde(rename = "categoryId")]
    category_id: Option<String>,
    #[serde(rename = "isActive")]
    is_active: Option<bool>,
    #[serde(rename = "createdAt")]
    created_at: Option<String>,
    #[serde(rename = "updatedAt")]
    updated_at: Option<String>,
    #[serde(rename = "categoryValues")]
    category_values: Option<HashMap<String, HashMap<String, String>>>,
    stack: Option<String>,
    directory: Option<String>,
    #[serde(rename = "restartCommand")]
    restart_command: Option<String>,
    #[serde(rename = "logCommand")]
    log_command: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RawProjectData {
    projects: Vec<RawProject>,
    #[serde(rename = "activeProjectId", default)]
    active_project_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Project {
    id: String,
    name: String,
    description: Option<String>,
    #[serde(rename = "categoryId")]
    category_id: String,
    #[serde(rename = "isActive")]
    is_active: bool,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "updatedAt")]
    updated_at: String,
    // Category-based variable system - all project data stored here
    #[serde(rename = "categoryValues")]
    category_values:
        Option<std::collections::HashMap<String, std::collections::HashMap<String, String>>>,
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
    #[serde(rename = "categoryId")]
    category_id: Option<String>, // Links to ProjectCategory.id
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

// Project Categories structures
#[derive(Debug, Serialize, Deserialize, Clone)]
struct ProjectCategoryVariable {
    id: String,
    name: String,
    description: Option<String>,
    #[serde(rename = "defaultValue")]
    default_value: Option<String>,
    required: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ProjectCategory {
    id: String,
    name: String,
    description: Option<String>,
    icon: Option<String>,
    color: Option<String>,
    #[serde(rename = "isDefault")]
    is_default: Option<bool>,
    #[serde(rename = "fileName")]
    file_name: Option<String>,
    #[serde(rename = "variableDefinitions")]
    variable_definitions: Vec<ProjectCategoryVariable>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ProjectCategoriesData {
    categories: Vec<ProjectCategory>,
    #[serde(rename = "lastUpdated")]
    last_updated: String,
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

    let contents = fs::read_to_string(path).map_err(|e| format!("Failed to read file: {}", e))?;

    let config: EspansoConfig =
        serde_yaml::from_str(&contents).map_err(|e| format!("Failed to parse YAML: {}", e))?;

    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown");

    let replacements = config
        .matches
        .into_iter()
        .map(
            |EspansoMatch {
                 trigger,
                 replace,
                 vars,
                 enabled,
                 case_sensitive,
                 word_boundary,
                 extra,
             }| {
                let mut metadata = extra;
                if let Some(value) = enabled {
                    metadata.insert("enabled".to_string(), Value::Bool(value));
                }
                if let Some(value) = case_sensitive {
                    metadata.insert("case_sensitive".to_string(), Value::Bool(value));
                }
                if let Some(value) = word_boundary {
                    metadata.insert("word_boundary".to_string(), Value::Bool(value));
                }

                Replacement {
                    trigger,
                    replace,
                    source: file_name.to_string(),
                    vars,
                    metadata,
                }
            },
        )
        .collect();

    Ok(replacements)
}

#[tauri::command]
fn write_espanso_file(file_path: String, replacements: Vec<Replacement>) -> Result<(), String> {
    info!(
        "Writing {} replacements to Espanso file: {}",
        replacements.len(),
        file_path
    );
    let path = Path::new(&file_path);

    // Convert replacements to EspansoConfig
    let matches: Vec<EspansoMatch> = replacements
        .into_iter()
        .map(|r| {
            let mut metadata = r.metadata;
            let enabled = metadata
                .remove("enabled")
                .and_then(|value| value.as_bool());
            let case_sensitive = metadata
                .remove("case_sensitive")
                .and_then(|value| value.as_bool());
            let word_boundary = metadata
                .remove("word_boundary")
                .and_then(|value| value.as_bool());

            EspansoMatch {
                trigger: r.trigger,
                replace: r.replace,
                vars: r.vars,
                enabled,
                case_sensitive,
                word_boundary,
                extra: metadata,
            }
        })
        .collect();

    let config = EspansoConfig {
        matches,
        global_vars: None,
        extra: HashMap::new(),
    };

    // Serialize to YAML
    let yaml_string =
        serde_yaml::to_string(&config).map_err(|e| format!("Failed to serialize YAML: {}", e))?;

    // Write to file
    fs::write(path, yaml_string).map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

fn get_projects_file_path() -> PathBuf {
    use crate::paths::get_espanso_config_dir_internal;
    let espanso_config =
        get_espanso_config_dir_internal().expect("Failed to get espanso config directory");
    let config_subdir = espanso_config.join("config");

    // Ensure config subdirectory exists
    if !config_subdir.exists() {
        fs::create_dir_all(&config_subdir).expect("Failed to create espanso/config directory");
    }

    config_subdir.join("projects.json")
}

fn ensure_app_dir() -> Result<(), String> {
    let projects_path = get_projects_file_path();
    if let Some(parent) = projects_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create app directory: {}", e))?;
    }
    Ok(())
}

fn normalize_projects(
    raw_projects: Vec<RawProject>,
    mut active_project_id: Option<String>,
) -> (Vec<Project>, Option<String>, bool) {
    let mut migrated = false;
    let mut projects: Vec<Project> = Vec::with_capacity(raw_projects.len());

    for raw in raw_projects {
        let (project, changed) = normalize_project(raw);
        if changed {
            migrated = true;
        }
        projects.push(project);
    }

    if let Some(ref id) = active_project_id {
        if !projects.iter().any(|project| &project.id == id) {
            active_project_id = None;
            migrated = true;
        }
    } else if let Some(active_project) = projects.iter().find(|project| project.is_active) {
        active_project_id = Some(active_project.id.clone());
        migrated = true;
    }

    let mut ensure_active_flag_consistency = false;
    for project in &projects {
        let should_be_active = active_project_id
            .as_ref()
            .map(|id| id == &project.id)
            .unwrap_or(false);
        if project.is_active != should_be_active {
            ensure_active_flag_consistency = true;
            break;
        }
    }

    if ensure_active_flag_consistency {
        migrated = true;
        for project in projects.iter_mut() {
            let should_be_active = active_project_id
                .as_ref()
                .map(|id| id == &project.id)
                .unwrap_or(false);
            project.is_active = should_be_active;
        }
    }

    (projects, active_project_id, migrated)
}

fn archive_legacy_file(path: &Path) {
    let file_stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("projects");
    let backup_filename = format!("{file_stem}.migrated.bak.json");
    let backup_path = path.with_file_name(backup_filename);

    if let Err(rename_err) = fs::rename(path, &backup_path) {
        match fs::copy(path, &backup_path) {
            Ok(_) => {
                let _ = fs::remove_file(path);
            }
            Err(copy_err) => {
                log::error!(
                    "Failed to archive legacy projects file {}: rename error: {}, copy error: {}",
                    path.display(),
                    rename_err,
                    copy_err
                );
            }
        }
    }
}

fn migrate_legacy_project_file() -> Result<Option<ProjectData>, String> {
    let legacy_candidates = [
        "projects.json",
        "projects.legacy.json",
        "projects.backup.json",
    ];

    for filename in legacy_candidates {
        let Ok(legacy_path) = paths::get_app_data_file_path(filename) else {
            continue;
        };

        if !legacy_path.exists() {
            continue;
        }

        let contents = fs::read_to_string(&legacy_path)
            .map_err(|e| format!("Failed to read legacy projects file: {}", e))?;

        if contents.trim().is_empty() {
            continue;
        }

        let parsed_raw: Result<RawProjectData, _> = serde_json::from_str(&contents);
        let (raw_projects, active_project_id) = match parsed_raw {
            Ok(data) => (data.projects, data.active_project_id),
            Err(_) => {
                let parsed_list: Vec<RawProject> = serde_json::from_str(&contents)
                    .map_err(|e| format!("Failed to parse legacy projects data: {}", e))?;
                (parsed_list, None)
            }
        };

        if raw_projects.is_empty() {
            continue;
        }

        let (projects, active_project_id, migrated) =
            normalize_projects(raw_projects, active_project_id);

        let data = ProjectData {
            projects,
            active_project_id,
        };

        save_project_data(&data)?;
        archive_legacy_file(&legacy_path);

        if migrated {
            info!(
                "Migrated legacy projects file {} to category-aware schema.",
                filename
            );
        } else {
            info!(
                "Legacy projects file {} already conformed to new schema.",
                filename
            );
        }

        return Ok(Some(data));
    }

    Ok(None)
}

fn load_project_data() -> Result<ProjectData, String> {
    ensure_app_dir()?;
    let projects_path = get_projects_file_path();

    if !projects_path.exists() {
        if let Some(migrated) = migrate_legacy_project_file()? {
            return Ok(migrated);
        }
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

    let raw_data: RawProjectData = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse projects data: {}", e))?;
    let RawProjectData {
        projects: raw_projects,
        active_project_id: raw_active_project_id,
    } = raw_data;

    if raw_projects.is_empty() {
        if let Some(migrated) = migrate_legacy_project_file()? {
            return Ok(migrated);
        }
    }

    let (projects, active_project_id, migrated) =
        normalize_projects(raw_projects, raw_active_project_id);

    let data = ProjectData {
        projects,
        active_project_id,
    };

    if migrated {
        save_project_data(&data)?;
    }

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

fn normalize_project(raw: RawProject) -> (Project, bool) {
    fn first_non_empty(map: Option<&HashMap<String, String>>, keys: &[&str]) -> Option<String> {
        map.and_then(|m| {
            for key in keys {
                if let Some(value) = m.get(*key) {
                    if !value.trim().is_empty() {
                        return Some(value.clone());
                    }
                }
            }
            None
        })
    }

    fn ensure_field(map: &mut HashMap<String, String>, key: &str, value: &str) -> bool {
        match map.get(key) {
            Some(existing) if existing == value => false,
            Some(existing) if value.trim().is_empty() && !existing.trim().is_empty() => false,
            _ => {
                map.insert(key.to_string(), value.to_string());
                true
            }
        }
    }

    let RawProject {
        id: raw_id,
        name,
        description,
        category_id,
        is_active,
        created_at,
        updated_at,
        category_values: raw_category_values,
        stack,
        directory,
        restart_command,
        log_command,
    } = raw;

    let migration_timestamp = chrono::Utc::now().to_rfc3339();
    let mut changed = false;

    let id = raw_id.unwrap_or_else(|| {
        changed = true;
        Uuid::new_v4().to_string()
    });

    let created_at = created_at.unwrap_or_else(|| {
        changed = true;
        migration_timestamp.clone()
    });

    let mut updated_at = updated_at.unwrap_or_else(|| {
        changed = true;
        migration_timestamp.clone()
    });

    let is_active = is_active.unwrap_or(false);

    let has_dev_fields = stack
        .as_ref()
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false)
        || directory
            .as_ref()
            .map(|s| !s.trim().is_empty())
            .unwrap_or(false)
        || restart_command
            .as_ref()
            .map(|s| !s.trim().is_empty())
            .unwrap_or(false)
        || log_command
            .as_ref()
            .map(|s| !s.trim().is_empty())
            .unwrap_or(false);

    let mut category_id = category_id.unwrap_or_else(|| "".to_string());
    if category_id.trim().is_empty() {
        category_id = if has_dev_fields {
            "development".to_string()
        } else {
            "general".to_string()
        };
        changed = true;
    }

    let mut category_values = match raw_category_values {
        Some(values) => values,
        None => {
            changed = true;
            HashMap::new()
        }
    };

    let inserted_general = !category_values.contains_key("general");
    let general_entry = category_values
        .entry("general".to_string())
        .or_insert_with(HashMap::new);
    if inserted_general {
        changed = true;
    }

    let name_value = if !name.trim().is_empty() {
        name.clone()
    } else {
        first_non_empty(
            Some(&*general_entry),
            &["project_name", "active_project_name"],
        )
        .unwrap_or_else(|| "Unnamed Project".to_string())
    };

    if ensure_field(general_entry, "project_name", &name_value) {
        changed = true;
    }
    if ensure_field(general_entry, "active_project_name", &name_value) {
        changed = true;
    }

    let description_value = description.clone().unwrap_or_else(|| {
        first_non_empty(Some(&*general_entry), &["project_description"]).unwrap_or_default()
    });
    if ensure_field(general_entry, "project_description", &description_value) {
        changed = true;
    }

    let normalized_description = if description_value.trim().is_empty() {
        None
    } else {
        Some(description_value.clone())
    };
    if normalized_description != description {
        changed = true;
    }

    let stack_value = stack.unwrap_or_else(|| {
        first_non_empty(
            category_values.get("development"),
            &["tech_stack", "active_project_stack"],
        )
        .unwrap_or_default()
    });

    let directory_value = directory.unwrap_or_else(|| {
        first_non_empty(
            category_values.get("development"),
            &["directory", "active_project_directory"],
        )
        .unwrap_or_default()
    });

    let restart_value = restart_command.unwrap_or_else(|| {
        first_non_empty(
            category_values.get("development"),
            &["restart_command", "active_project_restart_cmd"],
        )
        .unwrap_or_default()
    });

    let log_value = log_command.unwrap_or_else(|| {
        first_non_empty(
            category_values.get("development"),
            &["log_command", "active_project_log_cmd"],
        )
        .unwrap_or_default()
    });

    if has_dev_fields
        || category_id == "development"
        || !stack_value.trim().is_empty()
        || !directory_value.trim().is_empty()
        || !restart_value.trim().is_empty()
        || !log_value.trim().is_empty()
    {
        let inserted_development = !category_values.contains_key("development");
        let development_entry = category_values
            .entry("development".to_string())
            .or_insert_with(HashMap::new);
        if inserted_development {
            changed = true;
        }

        if ensure_field(development_entry, "tech_stack", &stack_value) {
            changed = true;
        }
        if ensure_field(development_entry, "active_project_stack", &stack_value) {
            changed = true;
        }

        if ensure_field(development_entry, "directory", &directory_value) {
            changed = true;
        }
        if ensure_field(
            development_entry,
            "active_project_directory",
            &directory_value,
        ) {
            changed = true;
        }

        if ensure_field(development_entry, "restart_command", &restart_value) {
            changed = true;
        }
        if ensure_field(
            development_entry,
            "active_project_restart_cmd",
            &restart_value,
        ) {
            changed = true;
        }

        if ensure_field(development_entry, "log_command", &log_value) {
            changed = true;
        }
        if ensure_field(development_entry, "active_project_log_cmd", &log_value) {
            changed = true;
        }
    }

    let mut final_name = name;
    if final_name != name_value {
        final_name = name_value.clone();
        changed = true;
    }

    if changed {
        updated_at = chrono::Utc::now().to_rfc3339();
    }

    (
        Project {
            id,
            name: final_name,
            description: normalized_description,
            category_id,
            is_active,
            created_at,
            updated_at,
            category_values: Some(category_values),
        },
        changed,
    )
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
            if let Some(description) = obj.get("description") {
                if description.is_null() {
                    project.description = None;
                } else if let Some(desc_str) = description.as_str() {
                    project.description = Some(desc_str.to_string());
                }
            }
            if let Some(cat_id) = obj.get("categoryId").and_then(|v| v.as_str()) {
                project.category_id = cat_id.to_string();
            }
            // Handle category values
            if let Some(cat_vals) = obj.get("categoryValues").and_then(|v| v.as_object()) {
                let mut cat_vals_map = std::collections::HashMap::new();
                for (cat_id, cat_data) in cat_vals {
                    if let Some(cat_obj) = cat_data.as_object() {
                        let mut var_vals_map = std::collections::HashMap::new();
                        for (var_id, value) in cat_obj {
                            if let Some(val_str) = value.as_str() {
                                var_vals_map.insert(var_id.clone(), val_str.to_string());
                            }
                        }
                        cat_vals_map.insert(cat_id.clone(), var_vals_map);
                    }
                }
                project.category_values = Some(cat_vals_map);
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
    use crate::paths::get_espanso_file_path;
    let espanso_path = get_espanso_file_path("project_active_vars.yml")?;

    let mut yaml_content = format!(
        r#"# Generated active project variables for: {}
global_vars:"#,
        escape_yaml_value(&project.name)
    );

    // Process category variables
    if let Some(category_values) = &project.category_values {
        // Load project categories to get variable definitions
        if let Ok(categories_data) = load_project_categories_data() {
            for (category_id, variable_values) in category_values {
                // Find the category definition
                if let Some(category) = categories_data
                    .categories
                    .iter()
                    .find(|c| c.id == *category_id)
                {
                    // Process each variable in this category
                    for variable_def in &category.variable_definitions {
                        if let Some(value) = variable_values.get(&variable_def.id) {
                            // Only include variables that have values set
                            if !value.trim().is_empty() {
                                let escaped_value = escape_yaml_value(value);
                                // Check if the value is a multi-line string starting with |
                                if escaped_value.starts_with('|') {
                                    // For multi-line strings, we need to adjust the indentation
                                    // The escape_yaml_value already adds 2 spaces, but we need 8 total for proper YAML structure
                                    let lines: Vec<&str> = escaped_value.lines().collect();
                                    yaml_content.push_str(&format!(
                                        r#"
  - name: {}
    type: echo
    params:
      echo: {}"#,
                                        variable_def.name,
                                        lines[0] // This is the "|" character
                                    ));
                                    // Add the remaining lines with proper indentation (8 spaces total)
                                    for line in lines.iter().skip(1) {
                                        yaml_content.push_str(&format!("\n      {}", line));
                                    }
                                } else {
                                    // For single-line strings, use the original format
                                    yaml_content.push_str(&format!(
                                        r#"
  - name: {}
    type: echo
    params:
      echo: {}"#,
                                        variable_def.name, escaped_value
                                    ));
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    yaml_content.push_str("\n");

    // Validate YAML before writing
    serde_yaml::from_str::<serde_yaml::Value>(&yaml_content)
        .map_err(|e| format!("Generated invalid YAML: {}", e))?;

    // Use atomic write for safety
    atomic_write(&espanso_path, &yaml_content)
        .map_err(|e| format!("Failed to write Espanso project vars: {}", e))?;

    // Also update the project selector
    update_project_selector()?;

    Ok(())
}

fn update_project_selector() -> Result<(), String> {
    let data = load_project_data()?;
    use crate::paths::get_espanso_file_path;
    let selector_path = get_espanso_file_path("project_selector.yml")?;

    // Build the choices for the selector
    let mut choices = vec![];
    for project in &data.projects {
        choices.push(format!(
            r#"          - label: {}
            id: "{}""#,
            escape_yaml_value(&project.name),
            project.id
        ));
    }

    let yaml_content = format!(
        r#"# Generated project selector for quick switching
matches:
  - trigger: ":project"
    replace: "{{{{project_choice}}}}"
    vars:
      - name: project_choice
        type: choice
        params:
          values:
{}
"#,
        choices.join("\n")
    );

    atomic_write(&selector_path, &yaml_content)
        .map_err(|e| format!("Failed to write project selector: {}", e))?;

    Ok(())
}

#[tauri::command]
fn handle_project_selection(project_id: String) -> Result<(), String> {
    set_active_project(Some(project_id))
}

#[tauri::command]
fn clear_project_espanso_config() -> Result<(), String> {
    use crate::paths::get_espanso_file_path;
    let espanso_path = get_espanso_file_path("project_active_vars.yml")?;

    // Write an empty config file with a comment
    let empty_content =
        "# No active project - project variables will not be available\nglobal_vars: []\n";

    atomic_write(&espanso_path, empty_content)
        .map_err(|e| format!("Failed to clear project config: {}", e))?;

    info!("Cleared project Espanso config");
    Ok(())
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
    use crate::paths::get_espanso_config_dir_internal;
    let config_dir = get_espanso_config_dir_internal()?;
    Ok(config_dir.join("config").join("categories.json"))
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
                    category_id: Some("general".to_string()),
                    description: Some("Global text replacements".to_string()),
                    icon: "FileTextOutlined".to_string(),
                    color: None,
                    is_default: Some(true),
                },
                Category {
                    id: "2".to_string(),
                    name: "Base".to_string(),
                    file_name: "base.yml".to_string(),
                    category_id: Some("general".to_string()),
                    description: Some("Base replacements and snippets".to_string()),
                    icon: "CodeOutlined".to_string(),
                    color: None,
                    is_default: Some(true),
                },
                Category {
                    id: "3".to_string(),
                    name: "AI Prompts".to_string(),
                    file_name: "ai_prompts.yml".to_string(),
                    category_id: Some("development".to_string()),
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
    fs::write(&file_path, json).map_err(|e| format!("Failed to write categories file: {}", e))?;

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
    if data
        .categories
        .iter()
        .any(|c| c.file_name == category.file_name)
    {
        return Err("A category with this file name already exists".to_string());
    }

    // Create the YAML file for the new category
    use crate::paths::get_espanso_file_path;
    let yaml_path = get_espanso_file_path(&category.file_name)?;

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
        use crate::paths::get_espanso_file_path;
        let yaml_path = get_espanso_file_path(&category.file_name)?;

        if yaml_path.exists() {
            fs::remove_file(&yaml_path)
                .map_err(|e| format!("Failed to delete category file: {}", e))?;
        }
    }

    data.categories.retain(|c| c.id != id);
    save_categories_data(&data)
}

// Project Categories management functions
fn get_project_categories_file_path() -> Result<PathBuf, String> {
    use crate::paths::get_espanso_config_dir_internal;
    let espanso_config = get_espanso_config_dir_internal()?;
    let config_subdir = espanso_config.join("config");

    // Ensure config subdirectory exists
    if !config_subdir.exists() {
        fs::create_dir_all(&config_subdir)
            .map_err(|e| format!("Failed to create espanso/config directory: {}", e))?;
    }

    Ok(config_subdir.join("project_categories.json"))
}

fn load_project_categories_data() -> Result<ProjectCategoriesData, String> {
    let file_path = get_project_categories_file_path()?;

    if file_path.exists() {
        let content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read project categories file: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse project categories data: {}", e))
    } else {
        // Return default categories if file doesn't exist
        let default_categories = vec![
            ProjectCategory {
                id: "general".to_string(),
                name: "General".to_string(),
                description: Some("Basic project information".to_string()),
                icon: Some("InfoCircleOutlined".to_string()),
                color: Some("#1890ff".to_string()),
                is_default: Some(true),
                file_name: Some("project_general.yml".to_string()),
                variable_definitions: vec![
                    ProjectCategoryVariable {
                        id: "project_name".to_string(),
                        name: "project_name".to_string(),
                        description: Some("The name of your project".to_string()),
                        default_value: None,
                        required: Some(false),
                    },
                    ProjectCategoryVariable {
                        id: "active_project_name".to_string(),
                        name: "active_project_name".to_string(),
                        description: Some(
                            "The name of the active project (legacy compatibility)".to_string(),
                        ),
                        default_value: None,
                        required: Some(false),
                    },
                    ProjectCategoryVariable {
                        id: "project_description".to_string(),
                        name: "project_description".to_string(),
                        description: Some("A brief description of the project".to_string()),
                        default_value: None,
                        required: Some(false),
                    },
                ],
            },
            ProjectCategory {
                id: "development".to_string(),
                name: "Development".to_string(),
                description: Some("Development-related variables".to_string()),
                icon: Some("CodeOutlined".to_string()),
                color: Some("#52c41a".to_string()),
                is_default: Some(true),
                file_name: Some("project_development.yml".to_string()),
                variable_definitions: vec![
                    ProjectCategoryVariable {
                        id: "tech_stack".to_string(),
                        name: "tech_stack".to_string(),
                        description: Some("Technology stack used".to_string()),
                        default_value: Some("TypeScript".to_string()),
                        required: Some(false),
                    },
                    ProjectCategoryVariable {
                        id: "active_project_stack".to_string(),
                        name: "active_project_stack".to_string(),
                        description: Some("Technology stack (legacy compatibility)".to_string()),
                        default_value: Some("TypeScript".to_string()),
                        required: Some(false),
                    },
                    ProjectCategoryVariable {
                        id: "directory".to_string(),
                        name: "directory".to_string(),
                        description: Some("Project directory path".to_string()),
                        default_value: None,
                        required: Some(false),
                    },
                    ProjectCategoryVariable {
                        id: "active_project_directory".to_string(),
                        name: "active_project_directory".to_string(),
                        description: Some("Project directory (legacy compatibility)".to_string()),
                        default_value: None,
                        required: Some(false),
                    },
                    ProjectCategoryVariable {
                        id: "restart_command".to_string(),
                        name: "restart_command".to_string(),
                        description: Some("Command to restart the project".to_string()),
                        default_value: Some("npm run dev".to_string()),
                        required: Some(false),
                    },
                    ProjectCategoryVariable {
                        id: "active_project_restart_cmd".to_string(),
                        name: "active_project_restart_cmd".to_string(),
                        description: Some("Restart command (legacy compatibility)".to_string()),
                        default_value: Some("npm run dev".to_string()),
                        required: Some(false),
                    },
                    ProjectCategoryVariable {
                        id: "log_command".to_string(),
                        name: "log_command".to_string(),
                        description: Some("Command to view logs".to_string()),
                        default_value: Some("npm run logs".to_string()),
                        required: Some(false),
                    },
                    ProjectCategoryVariable {
                        id: "active_project_log_cmd".to_string(),
                        name: "active_project_log_cmd".to_string(),
                        description: Some("Log command (legacy compatibility)".to_string()),
                        default_value: Some("npm run logs".to_string()),
                        required: Some(false),
                    },
                ],
            },
        ];

        Ok(ProjectCategoriesData {
            categories: default_categories,
            last_updated: chrono::Utc::now().to_rfc3339(),
        })
    }
}

fn save_project_categories_data(data: &ProjectCategoriesData) -> Result<(), String> {
    let file_path = get_project_categories_file_path()?;

    // Ensure directory exists
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create project categories directory: {}", e))?;
    }

    let json = serde_json::to_string_pretty(data)
        .map_err(|e| format!("Failed to serialize project categories data: {}", e))?;

    fs::write(&file_path, json)
        .map_err(|e| format!("Failed to write project categories file: {}", e))?;

    Ok(())
}

#[tauri::command]
fn read_project_categories() -> Result<ProjectCategoriesData, String> {
    load_project_categories_data()
}

#[tauri::command]
fn write_project_categories(data: ProjectCategoriesData) -> Result<(), String> {
    // Load existing data to compare for new/updated categories
    let existing_data = load_project_categories_data().unwrap_or_else(|_| ProjectCategoriesData {
        categories: vec![],
        last_updated: chrono::Utc::now().to_rfc3339(),
    });

    use crate::paths::get_espanso_match_dir_internal;
    let espanso_match_dir = get_espanso_match_dir_internal()?;

    // Create/update YAML files for all categories
    for category in &data.categories {
        if let Some(file_name) = &category.file_name {
            let yaml_path = espanso_match_dir.join(file_name);

            // Check if this is a new category or if it's being updated
            let existing_category = existing_data
                .categories
                .iter()
                .find(|c| c.id == category.id);
            let should_create_file = existing_category.is_none() || !yaml_path.exists();

            if should_create_file {
                // Create initial YAML content with category description
                let mut yaml_content = format!("# {}\n", category.name);
                if let Some(desc) = &category.description {
                    yaml_content.push_str(&format!("# {}\n", desc));
                }
                yaml_content.push_str("matches:\n  # Add your replacements here\n");

                atomic_write(&yaml_path, &yaml_content).map_err(|e| {
                    format!(
                        "Failed to create YAML file for category '{}': {}",
                        category.name, e
                    )
                })?;

                info!(
                    "Created YAML file for category '{}': {:?}",
                    category.name, yaml_path
                );
            }
        }
    }

    // Remove YAML files for deleted categories
    for existing_category in &existing_data.categories {
        if !data.categories.iter().any(|c| c.id == existing_category.id) {
            if let Some(file_name) = &existing_category.file_name {
                let yaml_path = espanso_match_dir.join(file_name);
                if yaml_path.exists() {
                    fs::remove_file(&yaml_path).map_err(|e| {
                        format!(
                            "Failed to delete YAML file for category '{}': {}",
                            existing_category.name, e
                        )
                    })?;
                    info!(
                        "Deleted YAML file for category '{}': {:?}",
                        existing_category.name, yaml_path
                    );
                }
            }
        }
    }

    save_project_categories_data(&data)
}

// Custom variables management functions
fn get_custom_variables_file_path() -> Result<PathBuf, String> {
    use crate::paths::get_app_data_file_path;
    get_app_data_file_path("custom_variables.json")
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
    use crate::paths::get_app_data_file_path;
    get_app_data_file_path("saved_extensions.json")
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
    if let Some(index) = data
        .extensions
        .iter()
        .position(|e| e.id == extension_data.id)
    {
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

// AI Prompts management
#[derive(Debug, Serialize, Deserialize)]
struct AIPromptsData {
    prompts: AIPrompts,
    #[serde(rename = "useCustom")]
    use_custom: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct AIPrompts {
    #[serde(rename = "generateReplacement")]
    generate_replacement: GenerateReplacementPrompts,
    #[serde(rename = "improveReplacement")]
    improve_replacement: ImproveReplacementPrompts,
    #[serde(rename = "generateExtension")]
    generate_extension: GenerateExtensionPrompts,
}

#[derive(Debug, Serialize, Deserialize)]
struct GenerateReplacementPrompts {
    system: String,
    user: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ImproveReplacementPrompts {
    system: String,
    #[serde(rename = "userWithInstructions")]
    user_with_instructions: String,
    #[serde(rename = "userWithoutInstructions")]
    user_without_instructions: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct GenerateExtensionPrompts {
    system: String,
    script: String,
    shell: String,
    form: String,
}

fn get_ai_prompts_file_path() -> Result<PathBuf, String> {
    use crate::paths::get_app_data_file_path;
    get_app_data_file_path("ai_prompts.json")
}

fn load_ai_prompts_data() -> Result<AIPromptsData, String> {
    let file_path = get_ai_prompts_file_path()?;

    if file_path.exists() {
        let content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read AI prompts file: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse AI prompts data: {}", e))
    } else {
        // Return default prompts if file doesn't exist
        Ok(create_default_ai_prompts())
    }
}

fn save_ai_prompts_data(data: &AIPromptsData) -> Result<(), String> {
    let file_path = get_ai_prompts_file_path()?;

    // Ensure directory exists
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create AI prompts directory: {}", e))?;
    }

    let json = serde_json::to_string_pretty(data)
        .map_err(|e| format!("Failed to serialize AI prompts data: {}", e))?;
    fs::write(&file_path, json).map_err(|e| format!("Failed to write AI prompts file: {}", e))?;

    Ok(())
}

fn create_default_ai_prompts() -> AIPromptsData {
    AIPromptsData {
        prompts: AIPrompts {
            generate_replacement: GenerateReplacementPrompts {
                system: "You are an expert at creating text replacements for Espanso. \nGenerate a concise, useful text replacement based on the user's description.\nIf the description mentions specific variables or provides context about available variables, use them appropriately with the {{variable_name}} syntax.\nReturn ONLY the replacement text, no explanations or additional formatting.\nMake the replacement practical and ready to use.".to_string(),
                user: "Create a text replacement for: {description}".to_string(),
            },
            improve_replacement: ImproveReplacementPrompts {
                system: "You are an expert at improving text replacements.\nEnhance the given text while maintaining its core purpose.\nReturn ONLY the improved text, no explanations.".to_string(),
                user_with_instructions: "Improve this text according to these instructions: \"{instructions}\"\n\nOriginal text: {original}".to_string(),
                user_without_instructions: "Improve this text to be more professional and polished: {original}".to_string(),
            },
            generate_extension: GenerateExtensionPrompts {
                system: "You are an expert at creating Espanso extensions.\nGenerate the requested extension configuration as valid JSON.\nEnsure the output is properly formatted and follows Espanso's extension schema.".to_string(),
                script: "Generate a script that: {description}\nReturn a JSON object with: { interpreter: \"python\" or \"node\", script: \"the script code\", args: [] }".to_string(),
                shell: "Generate a shell command that: {description}\nReturn a JSON object with: { cmd: \"the command\", shell: \"bash\" }".to_string(),
                form: "Generate a form for: {description}\nReturn a JSON object with: { title: \"form title\", fields: [{ name: \"field_name\", type: \"text\", label: \"Field Label\" }] }".to_string(),
            },
        },
        use_custom: false,
    }
}

#[tauri::command]
fn read_ai_prompts() -> Result<AIPromptsData, String> {
    load_ai_prompts_data()
}

#[tauri::command]
fn write_ai_prompts(prompts: AIPrompts, use_custom: bool) -> Result<(), String> {
    let data = AIPromptsData {
        prompts,
        use_custom,
    };
    save_ai_prompts_data(&data)
}

// LLM Config management
fn get_llm_configs_file_path() -> Result<PathBuf, String> {
    use crate::paths::get_app_data_file_path;
    get_app_data_file_path("llm_configs.json")
}

fn load_llm_configs_data() -> Result<secure_storage::LLMConfigData, String> {
    let file_path = get_llm_configs_file_path()?;

    if file_path.exists() {
        let content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read LLM configs file: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse LLM configs data: {}", e))
    } else {
        // Return default empty data if file doesn't exist
        Ok(secure_storage::LLMConfigData {
            configs: vec![],
            last_updated: chrono::Utc::now().to_rfc3339(),
        })
    }
}

fn save_llm_configs_data(data: &secure_storage::LLMConfigData) -> Result<(), String> {
    let file_path = get_llm_configs_file_path()?;

    // Ensure directory exists
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create LLM configs directory: {}", e))?;
    }

    let json = serde_json::to_string_pretty(data)
        .map_err(|e| format!("Failed to serialize LLM configs data: {}", e))?;
    fs::write(&file_path, json).map_err(|e| format!("Failed to write LLM configs file: {}", e))?;

    Ok(())
}

#[tauri::command]
fn read_llm_configs() -> Result<secure_storage::LLMConfigData, String> {
    load_llm_configs_data()
}

#[tauri::command]
fn write_llm_configs(data: secure_storage::LLMConfigData) -> Result<(), String> {
    save_llm_configs_data(&data)
}

#[tauri::command]
fn migrate_replacement_categories_to_project_categories() -> Result<(), String> {
    info!("Starting migration from replacement categories to project categories");

    // Load existing replacement categories
    let existing_categories =
        load_categories_data().unwrap_or_else(|_| CategoriesData { categories: vec![] });

    // Load existing project categories
    let mut project_categories_data = load_project_categories_data()?;

    let mut migrated_count = 0;

    // Migrate each replacement category that doesn't already exist in project categories
    for old_category in existing_categories.categories {
        // Skip default categories (they should already exist in project categories)
        if old_category.is_default.unwrap_or(false) {
            continue;
        }

        // Check if this category already exists in project categories
        let exists = project_categories_data.categories.iter().any(|pc| {
            pc.file_name.as_ref() == Some(&old_category.file_name) || pc.name == old_category.name
        });

        if !exists {
            // Create new project category from replacement category
            let new_project_category = ProjectCategory {
                id: format!("migrated_{}", old_category.id),
                name: old_category.name.clone(),
                description: old_category.description.clone(),
                icon: Some(old_category.icon.clone()),
                color: old_category.color.clone(),
                is_default: Some(false),
                file_name: Some(old_category.file_name.clone()),
                variable_definitions: vec![], // Start with empty variable definitions
            };

            project_categories_data
                .categories
                .push(new_project_category);
            migrated_count += 1;

            info!(
                "Migrated category '{}' with file '{}'",
                old_category.name, old_category.file_name
            );
        }
    }

    // Save updated project categories
    if migrated_count > 0 {
        project_categories_data.last_updated = chrono::Utc::now().to_rfc3339();
        save_project_categories_data(&project_categories_data)?;
        info!(
            "Migration completed: {} categories migrated",
            migrated_count
        );
    } else {
        info!("Migration completed: no new categories to migrate");
    }

    Ok(())
}

#[tauri::command]
fn list_espanso_yaml_files() -> Result<Vec<String>, String> {
    use crate::paths::get_espanso_match_dir_internal;
    let espanso_match_dir = get_espanso_match_dir_internal()?;

    if !espanso_match_dir.exists() {
        return Ok(vec![]);
    }

    let mut yaml_files = vec![];

    // Read directory and filter for .yml files
    let entries = fs::read_dir(&espanso_match_dir)
        .map_err(|e| format!("Failed to read Espanso match directory: {}", e))?;

    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.is_file() {
                if let Some(extension) = path.extension() {
                    if extension == "yml" || extension == "yaml" {
                        if let Some(file_name) = path.file_name() {
                            if let Some(file_name_str) = file_name.to_str() {
                                yaml_files.push(file_name_str.to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    yaml_files.sort();
    Ok(yaml_files)
}

#[tauri::command]
fn delete_espanso_yaml_file(file_name: String) -> Result<(), String> {
    use crate::paths::get_espanso_file_path;
    let file_path = get_espanso_file_path(&file_name)?;

    if !file_path.exists() {
        return Err(format!("File {} not found", file_name));
    }

    // Don't allow deleting certain protected files
    let protected_files = vec![
        "project_active_vars.yml",
        "project_global_vars.yml",
        "project_selector.yml",
        "categories.json",
    ];

    if protected_files.contains(&file_name.as_str()) {
        return Err(format!("Cannot delete protected file: {}", file_name));
    }

    fs::remove_file(&file_path).map_err(|e| format!("Failed to delete file: {}", e))?;

    info!("Deleted Espanso YAML file: {}", file_name);
    Ok(())
}

#[tauri::command]
fn select_yaml_file() -> Result<Option<String>, String> {
    use rfd::FileDialog;

    let file = FileDialog::new()
        .set_title("Select YAML File to Import")
        .add_filter("YAML files", &["yml", "yaml"])
        .add_filter("All files", &["*"])
        .pick_file();

    Ok(file.map(|p| p.display().to_string()))
}

#[tauri::command]
fn ensure_project_categories_have_filenames() -> Result<(), String> {
    info!("Ensuring all project categories have fileName fields and YAML files");

    let mut data = load_project_categories_data()?;
    let mut updated = false;

    use crate::paths::get_espanso_match_dir_internal;
    let espanso_match_dir = get_espanso_match_dir_internal()?;

    for category in &mut data.categories {
        let mut category_updated = false;

        // Add fileName if missing
        if category.file_name.is_none() {
            // Generate fileName from category name or use fallback based on id
            let file_name = if category.name.is_empty() {
                format!("{}.yml", category.id)
            } else {
                format!(
                    "{}.yml",
                    category
                        .name
                        .to_lowercase()
                        .replace(' ', "_")
                        .replace("-", "_")
                )
            };

            category.file_name = Some(file_name.clone());
            category_updated = true;

            info!(
                "Added fileName '{}' to category '{}'",
                file_name, category.name
            );
        }

        // Create YAML file if it doesn't exist
        if let Some(file_name) = &category.file_name {
            let yaml_path = espanso_match_dir.join(file_name);

            if !yaml_path.exists() {
                // Create initial YAML content with category description
                let mut yaml_content = format!("# {}\n", category.name);
                if let Some(desc) = &category.description {
                    yaml_content.push_str(&format!("# {}\n", desc));
                }
                yaml_content.push_str("matches:\n  # Add your replacements here\n  # Example:\n  # - trigger: \":hello\"\n  #   replace: \"Hello, World!\"\n");

                atomic_write(&yaml_path, &yaml_content).map_err(|e| {
                    format!(
                        "Failed to create YAML file for category '{}': {}",
                        category.name, e
                    )
                })?;

                info!(
                    "Created YAML file for category '{}': {:?}",
                    category.name, yaml_path
                );
                category_updated = true;
            }
        }

        if category_updated {
            updated = true;
        }
    }

    if updated {
        data.last_updated = chrono::Utc::now().to_rfc3339();
        save_project_categories_data(&data)?;
        info!("Updated project categories with fileName fields and created missing YAML files");
    } else {
        info!("All project categories already have fileName fields and YAML files");
    }

    Ok(())
}

/// Get the current platform name for frontend use
#[tauri::command]
fn get_current_platform() -> String {
    if cfg!(target_os = "macos") {
        "macos".to_string()
    } else if cfg!(target_os = "windows") {
        "windows".to_string()
    } else {
        "linux".to_string()
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                        file_name: None,
                    }),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
                ])
                .level(log::LevelFilter::Debug)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            read_espanso_file,
            write_espanso_file,
            get_projects,
            create_project,
            update_project,
            delete_project,
            set_active_project,
            handle_project_selection,
            clear_project_espanso_config,
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
            increment_extension_usage,
            // LLM API commands
            llm_api::generate_with_llm,
            llm_api::validate_llm_config,
            secure_storage::store_llm_api_key,
            secure_storage::get_llm_api_key,
            secure_storage::delete_llm_api_key,
            secure_storage::check_llm_api_key,
            read_llm_configs,
            write_llm_configs,
            read_ai_prompts,
            write_ai_prompts,
            // Project Categories commands
            read_project_categories,
            write_project_categories,
            migrate_replacement_categories_to_project_categories,
            ensure_project_categories_have_filenames,
            list_espanso_yaml_files,
            delete_espanso_yaml_file,
            select_yaml_file,
            get_current_platform,
            paths::get_espanso_config_dir,
            paths::get_espanso_match_dir,
            paths::get_app_data_dir,
            paths::initialize_app_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_preserve_vars() {
        let yaml = r#"matches:
  - trigger: ":test"
    replace: "value"
    vars:
      - name: var1
        type: echo
        params:
          echo: "hello"
"#;
        let config: EspansoConfig = serde_yaml::from_str(yaml).unwrap();
        assert!(config.matches[0].vars.is_some());

        let output = serde_yaml::to_string(&config).unwrap();
        assert!(output.contains("vars:"));
        assert!(output.contains("var1"));
    }

    #[test]
    fn test_preserve_enabled_flag() {
        let yaml = r#"matches:
  - trigger: ":test"
    replace: "value"
    enabled: false
"#;
        let config: EspansoConfig = serde_yaml::from_str(yaml).unwrap();
        assert_eq!(config.matches[0].enabled, Some(false));

        let output = serde_yaml::to_string(&config).unwrap();
        assert!(output.contains("enabled: false"));
    }
}
