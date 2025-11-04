use keyring::Entry;
use serde::{Deserialize, Serialize};

const SERVICE_NAME: &str = "BetterReplacementsManager";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StoredLLMConfig {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub api_url: String,
    pub model: String,
    pub temperature: f32,
    pub max_tokens: i32,
    pub is_default: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LLMConfigData {
    pub configs: Vec<StoredLLMConfig>,
    pub last_updated: String,
}

// Store API key securely in system keychain
pub fn store_api_key(config_id: &str, api_key: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, &format!("api_key_{}", config_id))
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    entry
        .set_password(api_key)
        .map_err(|e| format!("Failed to store API key: {}", e))?;

    Ok(())
}

// Retrieve API key from system keychain
pub fn get_api_key(config_id: &str) -> Result<String, String> {
    let entry = Entry::new(SERVICE_NAME, &format!("api_key_{}", config_id))
        .map_err(|e| format!("Failed to access keyring: {}", e))?;

    entry
        .get_password()
        .map_err(|e| format!("Failed to retrieve API key: {}", e))
}

// Delete API key from system keychain
pub fn delete_api_key(config_id: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, &format!("api_key_{}", config_id))
        .map_err(|e| format!("Failed to access keyring: {}", e))?;

    entry
        .delete_password()
        .map_err(|e| format!("Failed to delete API key: {}", e))?;

    Ok(())
}

// Check if API key exists
pub fn has_api_key(config_id: &str) -> bool {
    if let Ok(entry) = Entry::new(SERVICE_NAME, &format!("api_key_{}", config_id)) {
        entry.get_password().is_ok()
    } else {
        false
    }
}

// Commands for Tauri
#[tauri::command]
pub fn store_llm_api_key(config_id: String, api_key: String) -> Result<(), String> {
    store_api_key(&config_id, &api_key)
}

#[tauri::command]
pub fn get_llm_api_key(config_id: String) -> Result<String, String> {
    get_api_key(&config_id)
}

#[tauri::command]
pub fn delete_llm_api_key(config_id: String) -> Result<(), String> {
    delete_api_key(&config_id)
}

#[tauri::command]
pub fn check_llm_api_key(config_id: String) -> Result<bool, String> {
    Ok(has_api_key(&config_id))
}
