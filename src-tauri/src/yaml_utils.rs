/// YAML utility functions for safe value escaping and file operations
use std::fs;
use std::io::Write;
use std::path::Path;
use tempfile::NamedTempFile;

/// Escapes a string value for safe YAML output
pub fn escape_yaml_value(value: &str) -> String {
    if value.is_empty() {
        return "''".to_string();
    }

    // Check if value needs escaping
    let needs_escaping = value.contains(':')
        || value.contains('|')
        || value.contains('>')
        || value.contains('-')
        || value.contains('*')
        || value.contains('&')
        || value.contains('!')
        || value.contains('%')
        || value.contains('@')
        || value.contains('`')
        || value.contains('#')
        || value.contains('\n')
        || value.contains('\t')
        || value.contains('"')
        || value.contains('\'')
        || value.starts_with(' ')
        || value.ends_with(' ')
        || value == "true"
        || value == "false"
        || value == "null"
        || value == "~"
        || value.parse::<f64>().is_ok(); // pure numbers

    if !needs_escaping {
        return value.to_string();
    }

    // For multiline strings, use literal style
    if value.contains('\n') {
        let lines: Vec<&str> = value.split('\n').collect();
        let indented_lines: Vec<String> = lines.iter().map(|line| format!("  {}", line)).collect();
        return format!("|\n{}", indented_lines.join("\n"));
    }

    // For single-line strings with special chars, use single quotes
    // Escape single quotes by doubling them
    format!("'{}'", value.replace('\'', "''"))
}

/// Atomically writes content to a file using a temporary file and rename
pub fn atomic_write<P: AsRef<Path>>(path: P, content: &str) -> Result<(), String> {
    let path = path.as_ref();

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory: {}", e))?;
    }

    // Create a temporary file in the same directory as the target
    let dir = path.parent().unwrap_or(Path::new("."));
    let temp_file = NamedTempFile::new_in(dir)
        .map_err(|e| format!("Failed to create temporary file: {}", e))?;

    // Write content to temporary file
    {
        let mut file = temp_file.as_file();
        file.write_all(content.as_bytes())
            .map_err(|e| format!("Failed to write to temporary file: {}", e))?;
        file.sync_all()
            .map_err(|e| format!("Failed to sync temporary file: {}", e))?;
    }

    // Atomically move temporary file to target location
    temp_file
        .persist(path)
        .map_err(|e| format!("Failed to move temporary file to target: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_escape_yaml_value() {
        // Empty string
        assert_eq!(escape_yaml_value(""), "''");

        // Simple string (no escaping needed)
        assert_eq!(escape_yaml_value("hello"), "hello");

        // String with colon
        assert_eq!(escape_yaml_value("key: value"), "'key: value'");

        // String with single quote
        assert_eq!(escape_yaml_value("don't"), "'don''t'");

        // Boolean strings
        assert_eq!(escape_yaml_value("true"), "'true'");
        assert_eq!(escape_yaml_value("false"), "'false'");

        // Numeric string
        assert_eq!(escape_yaml_value("123"), "'123'");

        // Multiline string
        assert_eq!(escape_yaml_value("line1\nline2"), "|\n  line1\n  line2");

        // String with leading/trailing spaces
        assert_eq!(escape_yaml_value(" hello "), "' hello '");
    }
}
