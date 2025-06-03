use serde::{Deserialize, Serialize};
use reqwest;
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LLMConfig {
    pub provider: String, // "openai", "anthropic", "local", etc.
    pub api_url: String,
    pub model: String,
    pub temperature: f32,
    pub max_tokens: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LLMRequest {
    pub prompt: String,
    pub system_prompt: Option<String>,
    pub context: Option<HashMap<String, String>>,
    pub config: LLMConfig,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LLMResponse {
    pub text: String,
    pub usage: Option<TokenUsage>,
    pub model: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenUsage {
    pub prompt_tokens: i32,
    pub completion_tokens: i32,
    pub total_tokens: i32,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    temperature: f32,
    max_tokens: i32,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenAIMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenAIResponse {
    choices: Vec<OpenAIChoice>,
    usage: OpenAIUsage,
    model: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenAIChoice {
    message: OpenAIMessage,
    finish_reason: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenAIUsage {
    prompt_tokens: i32,
    completion_tokens: i32,
    total_tokens: i32,
}

pub async fn call_llm(api_key: &str, request: LLMRequest) -> Result<LLMResponse, String> {
    let client = reqwest::Client::new();
    
    // Build messages array
    let mut messages = vec![];
    
    if let Some(system) = request.system_prompt {
        messages.push(OpenAIMessage {
            role: "system".to_string(),
            content: system,
        });
    }
    
    messages.push(OpenAIMessage {
        role: "user".to_string(),
        content: request.prompt,
    });
    
    let openai_request = OpenAIRequest {
        model: request.config.model.clone(),
        messages,
        temperature: request.config.temperature,
        max_tokens: request.config.max_tokens,
    };
    
    let response = client
        .post(&request.config.api_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&openai_request)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;
    
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        eprintln!("API request failed with status {}: {}", status, error_text);
        eprintln!("Request URL: {}", request.config.api_url);
        eprintln!("Model: {}", request.config.model);
        return Err(format!("API request failed with status {}: {}", status, error_text));
    }
    
    let openai_response: OpenAIResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    let text = openai_response
        .choices
        .first()
        .map(|c| c.message.content.clone())
        .unwrap_or_default();
    
    let usage = Some(TokenUsage {
        prompt_tokens: openai_response.usage.prompt_tokens,
        completion_tokens: openai_response.usage.completion_tokens,
        total_tokens: openai_response.usage.total_tokens,
    });
    
    Ok(LLMResponse {
        text,
        usage,
        model: openai_response.model,
    })
}

// Commands for Tauri
#[tauri::command]
pub async fn generate_with_llm(
    api_key: String,
    request: LLMRequest,
) -> Result<LLMResponse, String> {
    call_llm(&api_key, request).await
}

#[tauri::command]
pub fn validate_llm_config(config: LLMConfig) -> Result<bool, String> {
    // Basic validation
    if config.api_url.is_empty() {
        return Err("API URL is required".to_string());
    }
    
    if config.model.is_empty() {
        return Err("Model name is required".to_string());
    }
    
    if config.temperature < 0.0 || config.temperature > 2.0 {
        return Err("Temperature must be between 0 and 2".to_string());
    }
    
    if config.max_tokens < 1 || config.max_tokens > 32000 {
        return Err("Max tokens must be between 1 and 32000".to_string());
    }
    
    Ok(true)
}