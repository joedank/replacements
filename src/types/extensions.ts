// Base types for all Espanso extensions
export type ExtensionType = 
  | 'date' 
  | 'choice' 
  | 'random' 
  | 'clipboard' 
  | 'echo' 
  | 'script' 
  | 'shell' 
  | 'form';

// Base extension interface
export interface BaseExtension {
  name: string;
  type: ExtensionType;
}

// Date Extension
export interface DateExtension extends BaseExtension {
  type: 'date';
  params: {
    format: string;
    offset?: number;
    locale?: string;
  };
}

// Choice Extension
export interface ChoiceValue {
  label: string;
  id?: string;
}

export interface ChoiceExtension extends BaseExtension {
  type: 'choice';
  params: {
    values: (string | ChoiceValue)[];
  };
}

// Random Extension
export interface RandomExtension extends BaseExtension {
  type: 'random';
  params: {
    choices: string[];
  };
}

// Clipboard Extension
export interface ClipboardExtension extends BaseExtension {
  type: 'clipboard';
  params?: {};
}

// Echo Extension
export interface EchoExtension extends BaseExtension {
  type: 'echo';
  params: {
    echo: string;
  };
}

// Script Extension
export interface ScriptExtension extends BaseExtension {
  type: 'script';
  params: {
    interpreter: string;
    script: string;
    args?: string[];
    debug?: boolean;
  };
}

// Shell Extension
export interface ShellExtension extends BaseExtension {
  type: 'shell';
  params: {
    cmd: string;
    shell?: 'cmd' | 'powershell' | 'pwsh' | 'wsl' | 'sh' | 'bash';
    trim?: boolean;
    debug?: boolean;
  };
}

// Form Field Types
export interface FormField {
  name: string;
  type: 'text' | 'choice' | 'list' | 'multiline';
  label?: string;
  default?: string;
  multiline?: boolean;
  rows?: number;
  choices?: string[];
  params?: {
    multiline?: boolean;
    values?: string[];
  };
}

// Form Extension
export interface FormExtension extends BaseExtension {
  type: 'form';
  params: {
    title?: string;
    layout?: string;
    fields?: FormField[];
  };
}

// Union type for all extensions
export type Extension = 
  | DateExtension 
  | ChoiceExtension 
  | RandomExtension 
  | ClipboardExtension 
  | EchoExtension 
  | ScriptExtension 
  | ShellExtension 
  | FormExtension;

// Helper type guards
export const isDateExtension = (ext: Extension): ext is DateExtension => ext.type === 'date';
export const isChoiceExtension = (ext: Extension): ext is ChoiceExtension => ext.type === 'choice';
export const isRandomExtension = (ext: Extension): ext is RandomExtension => ext.type === 'random';
export const isClipboardExtension = (ext: Extension): ext is ClipboardExtension => ext.type === 'clipboard';
export const isEchoExtension = (ext: Extension): ext is EchoExtension => ext.type === 'echo';
export const isScriptExtension = (ext: Extension): ext is ScriptExtension => ext.type === 'script';
export const isShellExtension = (ext: Extension): ext is ShellExtension => ext.type === 'shell';
export const isFormExtension = (ext: Extension): ext is FormExtension => ext.type === 'form';

// Extension metadata for UI
export const EXTENSION_METADATA: Record<ExtensionType, {
  label: string;
  description: string;
  icon: string;
  color: string;
}> = {
  date: {
    label: 'Date & Time',
    description: 'Insert dynamic dates and times with custom formats',
    icon: 'CalendarOutlined',
    color: '#1890ff',
  },
  choice: {
    label: 'Choice',
    description: 'Let users choose from a list of options',
    icon: 'UnorderedListOutlined',
    color: '#52c41a',
  },
  random: {
    label: 'Random',
    description: 'Randomly select from a list of choices',
    icon: 'ThunderboltOutlined',
    color: '#fa8c16',
  },
  clipboard: {
    label: 'Clipboard',
    description: 'Insert current clipboard content',
    icon: 'CopyOutlined',
    color: '#722ed1',
  },
  echo: {
    label: 'Echo',
    description: 'Insert a fixed value',
    icon: 'MessageOutlined',
    color: '#13c2c2',
  },
  script: {
    label: 'Script',
    description: 'Run a script and use its output',
    icon: 'CodeOutlined',
    color: '#fa541c',
  },
  shell: {
    label: 'Shell',
    description: 'Execute shell commands',
    icon: 'CodeSandboxOutlined',
    color: '#2f54eb',
  },
  form: {
    label: 'Form',
    description: 'Create input forms for complex replacements',
    icon: 'FormOutlined',
    color: '#eb2f96',
  },
};

// Common date formats for quick selection
export const COMMON_DATE_FORMATS = [
  { label: 'ISO Date (2023-03-15)', value: '%Y-%m-%d' },
  { label: 'US Date (03/15/2023)', value: '%m/%d/%Y' },
  { label: 'EU Date (15/03/2023)', value: '%d/%m/%Y' },
  { label: 'Long Date (March 15, 2023)', value: '%B %d, %Y' },
  { label: 'Time (14:30)', value: '%H:%M' },
  { label: 'Time 12h (2:30 PM)', value: '%I:%M %p' },
  { label: 'Full DateTime', value: '%Y-%m-%d %H:%M:%S' },
  { label: 'Day of Week (Wednesday)', value: '%A' },
  { label: 'Month (March)', value: '%B' },
  { label: 'Year (2023)', value: '%Y' },
];

// Common offsets for date extension
export const COMMON_DATE_OFFSETS = [
  { label: 'Now', value: 0 },
  { label: 'Tomorrow', value: 86400 },
  { label: 'Yesterday', value: -86400 },
  { label: 'Next Week', value: 604800 },
  { label: 'Last Week', value: -604800 },
  { label: 'Next Month', value: 2592000 },
  { label: 'Last Month', value: -2592000 },
];