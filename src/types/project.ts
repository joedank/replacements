export interface Project {
  id: string;
  name: string;
  description: string;
  stack: string;
  directory: string;
  restartCommand: string;
  logCommand: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  customVariables?: Record<string, string>; // key -> value mapping
}

export interface ProjectVariable {
  key: string;
  value: string;
  description?: string;
}

export const PROJECT_VARIABLE_MAPPINGS = {
  name: 'active_project_name',
  stack: 'active_project_stack',
  directory: 'active_project_directory',
  restartCommand: 'active_project_restart_cmd',
  logCommand: 'active_project_log_cmd',
} as const;

export const DEFAULT_PROJECT_VALUES = {
  stack: 'TypeScript',
  restartCommand: 'npm run dev',
  logCommand: 'npm run logs',
} as const;