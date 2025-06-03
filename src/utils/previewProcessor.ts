import { SavedExtension } from '../types/savedExtensions';
import { parseVariable, parseDateOffset, applyDateOffset, applyFilters, formatDate as formatDateWithPattern, findAllVariables, ParsedVariable } from './variableParser';
import { CustomVariable } from '../types/variables';
import { ProjectCategory } from '../types/projectCategories';

// Enhanced validation result
export interface VariableValidationResult {
  variables: ParsedVariable[];
  undefinedVariables: ParsedVariable[];
  projectSuggestions: string[];
  preview: string;
}

// Process replacement text with variables for preview
export const processReplacementPreview = (
  text: string, 
  options?: {
    projectVariables?: Record<string, string>;
    customVariables?: CustomVariable[];
  }
): string => {
  let processed = text;
  const now = new Date();
  
  // Find all variables in the text
  const variables = findAllVariables(text);
  
  // Process each variable
  variables.forEach(variable => {
    const replacement = processVariable(variable, now, options);
    processed = processed.replace(variable.fullMatch, replacement);
  });
  
  // Process cursor position marker
  processed = processed.replace(/\$\|\$/g, '│');
  
  // Process escaped newlines
  processed = processed.replace(/\\n/g, '\n');
  
  return processed;
};

// Enhanced preview with validation - core of Phase 1
export const enhancePreviewWithValidation = (
  text: string,
  options?: {
    projectVariables?: Record<string, string>;
    customVariables?: CustomVariable[];
    projectCategories?: ProjectCategory[];
    activeProjectCategoryId?: string;
  }
): VariableValidationResult => {
  // Get existing preview result
  const preview = processReplacementPreview(text, options);
  
  // Find all variables in the text
  const variables = findAllVariables(text);
  
  // Identify undefined variables
  const undefinedVariables = variables.filter(variable => {
    // Check if variable is built-in
    if (isBuiltInVariable(variable.name)) {
      return false;
    }
    
    // Check if variable exists in project variables
    if (options?.projectVariables && options.projectVariables[variable.name]) {
      return false;
    }
    
    // Check if variable exists in custom variables
    if (options?.customVariables) {
      const customVar = options.customVariables.find(v => v.name === variable.name);
      if (customVar) {
        return false;
      }
    }
    
    // Variable is undefined
    return true;
  });
  
  // Generate project suggestions for undefined variables
  const projectSuggestions = generateQuickCreateSuggestions(
    undefinedVariables,
    options?.projectCategories || [],
    options?.activeProjectCategoryId
  );
  
  return {
    variables,
    undefinedVariables,
    projectSuggestions,
    preview,
  };
};

// Helper function to check if a variable is built-in
function isBuiltInVariable(name: string): boolean {
  const builtIns = [
    'date', 'time', 'datetime', 'year', 'month', 'day',
    'clipboard', 'cursor', 'random', 'uuid',
  ];
  return builtIns.includes(name);
}

// Generate quick-create suggestions for undefined variables
function generateQuickCreateSuggestions(
  undefinedVariables: ParsedVariable[],
  projectCategories: ProjectCategory[],
  activeProjectCategoryId?: string
): string[] {
  if (!activeProjectCategoryId || undefinedVariables.length === 0) {
    return [];
  }
  
  const activeCategory = projectCategories.find(cat => cat.id === activeProjectCategoryId);
  if (!activeCategory) {
    return [];
  }
  
  // For each undefined variable, suggest the active project category
  return undefinedVariables.map(variable => 
    `Create '${variable.name}' in ${activeCategory.name}`
  );
}

// Process a single variable
function processVariable(
  variable: ReturnType<typeof parseVariable>,
  baseDate: Date,
  options?: {
    projectVariables?: Record<string, string>;
    customVariables?: CustomVariable[];
  }
): string {
  if (!variable) return '';
  
  let result = '';
  
  // Handle different variable types
  switch (variable.name) {
    case 'date':
    case 'time':
    case 'datetime': {
      let date = new Date(baseDate);
      
      // Apply offset if present
      if (variable.parameter) {
        const offset = parseDateOffset(variable.parameter);
        if (offset) {
          date = applyDateOffset(date, offset);
        } else if (variable.parameter.includes('%')) {
          // It's a format string
          result = formatDateWithPattern(date, variable.parameter);
          break;
        }
      }
      
      // Apply default format based on variable name
      if (!result) {
        switch (variable.name) {
          case 'date':
            result = date.toLocaleDateString();
            break;
          case 'time':
            result = date.toLocaleTimeString();
            break;
          case 'datetime':
            result = date.toLocaleString();
            break;
        }
      }
      break;
    }
    
    case 'year':
      result = baseDate.getFullYear().toString();
      break;
    case 'month':
      result = (baseDate.getMonth() + 1).toString().padStart(2, '0');
      break;
    case 'day':
      result = baseDate.getDate().toString().padStart(2, '0');
      break;
    
    case 'clipboard':
      result = '[clipboard content]';
      break;
    
    case 'uuid':
      result = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      break;
    
    case 'random':
      result = Math.random().toString();
      break;
    
    default:
      // Handle form variables
      if (variable.name.startsWith('form.')) {
        const fieldName = variable.name.substring(5);
        result = `[form field: ${fieldName}]`;
      }
      // Handle project variables
      else if (variable.type === 'project' && options?.projectVariables) {
        result = options.projectVariables[variable.name] || `[${variable.name}]`;
      }
      // Handle custom variables
      else if (options?.customVariables) {
        const customVar = options.customVariables.find(v => v.name === variable.name);
        if (customVar) {
          result = customVar.value || `[${variable.name}]`;
        } else {
          result = `[${variable.name}]`;
        }
      }
      else {
        result = `[${variable.name}]`;
      }
  }
  
  // Apply filters if present
  if (variable.filters && variable.filters.length > 0) {
    result = applyFilters(result, variable.filters);
  }
  
  return result;
}

// Process saved extension syntax
export const processSavedExtension = (text: string, savedExtensions: SavedExtension[]): string => {
  let processed = text;
  
  savedExtensions.forEach(savedExt => {
    const extension = savedExt.extension;
    const pattern = new RegExp(`\\{\\{${savedExt.name}\\}\\}`, 'g');
    
    switch (extension.type) {
      case 'date':
        if ('params' in extension && extension.params?.format) {
          // Simple date format preview
          processed = processed.replace(pattern, formatDateWithPattern(new Date(), extension.params.format));
        }
        break;
      case 'choice':
        if ('params' in extension && extension.params?.values) {
          const choices = extension.params.values;
          const firstChoice = Array.isArray(choices) && choices.length > 0 
            ? (typeof choices[0] === 'string' ? choices[0] : choices[0].label)
            : 'choice';
          processed = processed.replace(pattern, `[${firstChoice}]`);
        }
        break;
      case 'random':
        if ('params' in extension && extension.params?.choices) {
          const choices = extension.params.choices;
          const firstChoice = choices.length > 0 ? choices[0] : 'random';
          processed = processed.replace(pattern, `[${firstChoice}]`);
        }
        break;
      case 'clipboard':
        processed = processed.replace(pattern, '[clipboard]');
        break;
      case 'echo':
        if ('params' in extension && extension.params?.echo) {
          processed = processed.replace(pattern, extension.params.echo);
        }
        break;
      default:
        processed = processed.replace(pattern, `[${savedExt.name}]`);
    }
  });
  
  return processed;
};

