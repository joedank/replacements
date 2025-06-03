/**
 * Variable validation utilities for BRM
 * Ensures variable names follow safe patterns and don't conflict with reserved names
 */

// Constants for validation rules
export const MAX_KEY_LENGTH = 50;
export const RESERVED_PREFIXES = ['active_project_', 'form.'] as const;

// Character whitelist: letters, numbers, underscores only
export const VALID_KEY_PATTERN = /^[a-zA-Z0-9_]+$/;

// Characters that break Espanso parsing
export const FORBIDDEN_CHARS = [':', '|', '{', '}', ' ', '\t', '\n'];

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

/**
 * Validates a variable key against all rules
 */
export function validateVariableKey(key: string, existingKeys: string[] = []): ValidationResult {
  // Check if empty
  if (!key || key.trim().length === 0) {
    return { isValid: false, error: 'Variable name cannot be empty' };
  }

  // Check length
  if (key.length > MAX_KEY_LENGTH) {
    return { 
      isValid: false, 
      error: `Variable name must be ${MAX_KEY_LENGTH} characters or less (currently ${key.length})` 
    };
  }

  // Check for forbidden characters
  for (const char of FORBIDDEN_CHARS) {
    if (key.includes(char)) {
      const charName = char === ' ' ? 'spaces' : 
                      char === '\t' ? 'tabs' : 
                      char === '\n' ? 'newlines' : `'${char}'`;
      return { 
        isValid: false, 
        error: `Variable names cannot contain ${charName}` 
      };
    }
  }

  // Check against valid pattern
  if (!VALID_KEY_PATTERN.test(key)) {
    return { 
      isValid: false, 
      error: 'Variable names can only contain letters, numbers, and underscores' 
    };
  }

  // Check reserved prefixes
  for (const prefix of RESERVED_PREFIXES) {
    if (key.toLowerCase().startsWith(prefix)) {
      return { 
        isValid: false, 
        error: `Variables starting with '${prefix}' are reserved for system use` 
      };
    }
  }

  // Check for case-insensitive duplicates
  const lowerKey = key.toLowerCase();
  const duplicate = existingKeys.find(k => k.toLowerCase() === lowerKey && k !== key);
  if (duplicate) {
    return { 
      isValid: true, // Allow but warn
      warning: `Similar variable '${duplicate}' already exists. This may cause confusion.` 
    };
  }

  return { isValid: true };
}

/**
 * Validates a variable value for YAML safety
 */
export function validateVariableValue(value: string): ValidationResult {
  // Values can be empty
  if (!value) {
    return { isValid: true };
  }

  // Check for YAML special characters that need escaping
  const yamlSpecialChars = [':', '|', '>', '-', '*', '&', '!', '%', '@', '`'];
  const needsEscaping = yamlSpecialChars.some(char => value.includes(char)) || 
                       value.includes('\n') || // multiline
                       value.startsWith(' ') || // leading space
                       value.endsWith(' '); // trailing space

  if (needsEscaping) {
    return { 
      isValid: true,
      warning: 'This value contains special characters and will be automatically escaped for YAML compatibility'
    };
  }

  return { isValid: true };
}

/**
 * Escapes a value for safe YAML output
 */
export function escapeYamlValue(value: string): string {
  if (!value) return "''";

  // Check if value needs escaping
  const needsEscaping = 
    value.includes(':') ||
    value.includes('|') ||
    value.includes('>') ||
    value.includes('-') ||
    value.includes('*') ||
    value.includes('&') ||
    value.includes('!') ||
    value.includes('%') ||
    value.includes('@') ||
    value.includes('`') ||
    value.includes('#') ||
    value.includes('\n') ||
    value.includes('\t') ||
    value.includes('"') ||
    value.includes("'") ||
    value.startsWith(' ') ||
    value.endsWith(' ') ||
    value === 'true' ||
    value === 'false' ||
    value === 'null' ||
    value === '~' ||
    /^\d+$/.test(value); // pure numbers

  if (!needsEscaping) {
    return value;
  }

  // For multiline strings, use literal style
  if (value.includes('\n')) {
    // Ensure proper indentation for YAML literal blocks
    const lines = value.split('\n');
    const indentedLines = lines.map(line => '  ' + line).join('\n');
    return `|\n${indentedLines}`;
  }

  // For single-line strings with special chars, use single quotes
  // Escape single quotes by doubling them
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Checks if a variable key would conflict with built-in project variables
 */
export function isProjectVariable(key: string): boolean {
  return key.toLowerCase().startsWith('active_project_');
}

/**
 * Sanitizes a variable key to make it valid
 * This is for suggesting corrections, not automatic fixing
 */
export function suggestValidKey(key: string): string {
  // Replace invalid characters with underscores
  let sanitized = key.replace(/[^a-zA-Z0-9_]/g, '_');
  
  // Ensure it starts with a letter or underscore
  if (/^\d/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }
  
  // Truncate if too long
  if (sanitized.length > MAX_KEY_LENGTH) {
    sanitized = sanitized.substring(0, MAX_KEY_LENGTH);
  }
  
  // Remove reserved prefixes
  for (const prefix of RESERVED_PREFIXES) {
    if (sanitized.toLowerCase().startsWith(prefix)) {
      sanitized = sanitized.substring(prefix.length);
      if (!sanitized) sanitized = 'custom_variable';
    }
  }
  
  return sanitized;
}