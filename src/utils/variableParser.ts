// Advanced variable parser for Espanso-like syntax

export interface ParsedVariable {
  fullMatch: string;
  name: string;
  parameter?: string;
  filters?: string[];
  type: 'basic' | 'parameterized' | 'filtered' | 'form' | 'project' | 'custom';
}

// Parse a variable with all its components
export function parseVariable(variable: string): ParsedVariable | null {
  // Match {{variable_name:parameter|filter1|filter2}}
  const match = variable.match(/^\{\{([^:|}]+)(?::([^|}]+))?(?:\|(.+))?\}\}$/);
  if (!match) return null;

  const [fullMatch, name, parameter, filterString] = match;
  const filters = filterString ? filterString.split('|') : undefined;

  // Determine type
  let type: ParsedVariable['type'] = 'basic';
  if (parameter && filters) {
    type = 'filtered'; // has both parameter and filters
  } else if (parameter) {
    type = 'parameterized';
  } else if (filters) {
    type = 'filtered';
  } else if (name.startsWith('form.')) {
    type = 'form';
  } else if (name.startsWith('active_project_') || name.startsWith('project_')) {
    type = 'project';
  } else if (!isBuiltInVariable(name)) {
    type = 'custom';
  }

  return {
    fullMatch,
    name,
    parameter,
    filters,
    type,
  };
}

// Check if a variable is built-in
function isBuiltInVariable(name: string): boolean {
  const builtIns = [
    'date', 'time', 'datetime', 'year', 'month', 'day',
    'clipboard', 'cursor', 'random', 'uuid',
  ];
  return builtIns.includes(name);
}

// Parse date offset syntax (e.g., +2d, -1w, +3M)
export interface DateOffset {
  value: number;
  unit: 'd' | 'w' | 'M' | 'y' | 'h' | 'm' | 's';
}

export function parseDateOffset(offset: string): DateOffset | null {
  const match = offset.match(/^([+-]?\d+)([dwMyhms])$/);
  if (!match) return null;

  const [, valueStr, unit] = match;
  return {
    value: parseInt(valueStr, 10),
    unit: unit as DateOffset['unit'],
  };
}

// Apply date offset to a date
export function applyDateOffset(date: Date, offset: DateOffset): Date {
  const result = new Date(date);
  
  switch (offset.unit) {
    case 's': // seconds
      result.setSeconds(result.getSeconds() + offset.value);
      break;
    case 'm': // minutes
      result.setMinutes(result.getMinutes() + offset.value);
      break;
    case 'h': // hours
      result.setHours(result.getHours() + offset.value);
      break;
    case 'd': // days
      result.setDate(result.getDate() + offset.value);
      break;
    case 'w': // weeks
      result.setDate(result.getDate() + (offset.value * 7));
      break;
    case 'M': // months
      result.setMonth(result.getMonth() + offset.value);
      break;
    case 'y': // years
      result.setFullYear(result.getFullYear() + offset.value);
      break;
  }
  
  return result;
}

// Apply filters to a value
export function applyFilters(value: string, filters: string[]): string {
  let result = value;
  
  for (const filter of filters) {
    switch (filter.toLowerCase()) {
      case 'lower':
      case 'lowercase':
        result = result.toLowerCase();
        break;
      case 'upper':
      case 'uppercase':
        result = result.toUpperCase();
        break;
      case 'trim':
        result = result.trim();
        break;
      case 'capitalize':
        result = result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
        break;
      case 'title':
        result = result.replace(/\w\S*/g, (txt) => 
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
        break;
      case 'snake':
        result = result.replace(/\s+/g, '_').toLowerCase();
        break;
      case 'kebab':
        result = result.replace(/\s+/g, '-').toLowerCase();
        break;
      case 'camel':
        result = result.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
          index === 0 ? word.toLowerCase() : word.toUpperCase()
        ).replace(/\s+/g, '');
        break;
      case 'pascal':
        result = result.replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => 
          word.toUpperCase()
        ).replace(/\s+/g, '');
        break;
      case 'reverse':
        result = result.split('').reverse().join('');
        break;
      case 'length':
        result = result.length.toString();
        break;
      default:
        // Handle parameterized filters like slice:0:5
        if (filter.startsWith('slice:')) {
          const params = filter.split(':').slice(1);
          const start = parseInt(params[0] || '0', 10);
          const end = params[1] ? parseInt(params[1], 10) : undefined;
          result = result.slice(start, end);
        } else if (filter.startsWith('replace:')) {
          const params = filter.split(':').slice(1);
          if (params.length >= 2) {
            const [search, replace] = params;
            result = result.replace(new RegExp(search, 'g'), replace);
          }
        }
    }
  }
  
  return result;
}

// Format date with strftime-like syntax
export function formatDate(date: Date, format: string): string {
  const pad = (n: number, width = 2) => n.toString().padStart(width, '0');
  
  const replacements: Record<string, string> = {
    // Year
    '%Y': date.getFullYear().toString(),
    '%y': date.getFullYear().toString().slice(-2),
    
    // Month
    '%m': pad(date.getMonth() + 1),
    '%B': date.toLocaleString('default', { month: 'long' }),
    '%b': date.toLocaleString('default', { month: 'short' }),
    
    // Day
    '%d': pad(date.getDate()),
    '%e': date.getDate().toString(),
    
    // Weekday
    '%A': date.toLocaleString('default', { weekday: 'long' }),
    '%a': date.toLocaleString('default', { weekday: 'short' }),
    '%w': date.getDay().toString(),
    
    // Time
    '%H': pad(date.getHours()),
    '%I': pad(date.getHours() % 12 || 12),
    '%M': pad(date.getMinutes()),
    '%S': pad(date.getSeconds()),
    '%p': date.getHours() >= 12 ? 'PM' : 'AM',
    
    // Date/Time combinations
    '%F': `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    '%T': `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
    '%D': `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear().toString().slice(-2)}`,
    
    // Other
    '%n': '\n',
    '%t': '\t',
    '%%': '%',
  };
  
  let result = format;
  for (const [token, replacement] of Object.entries(replacements)) {
    result = result.replace(new RegExp(token, 'g'), replacement);
  }
  
  return result;
}

// Find all variables in a text
export function findAllVariables(text: string): ParsedVariable[] {
  const variablePattern = /\{\{[^}]+\}\}/g;
  const matches = text.match(variablePattern) || [];
  
  return matches
    .map(match => parseVariable(match))
    .filter((v): v is ParsedVariable => v !== null);
}