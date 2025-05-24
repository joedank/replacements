// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Initialize console logging for development
    #[cfg(debug_assertions)]
    env_logger::init();
    
    better_replacements_manager::run()
}
