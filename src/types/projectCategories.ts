export interface ProjectCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string; // Icon name from Ant Design icons
  color?: string;
  isDefault?: boolean; // For categories that shouldn't be deleted
  fileName?: string; // Associated YAML file name
  variableDefinitions: ProjectCategoryVariable[];
}

export interface ProjectCategoryVariable {
  id: string;
  name: string; // Variable name without {{ }}
  description?: string;
  defaultValue?: string;
  required?: boolean;
}

// Default categories that come with the app
export const DEFAULT_PROJECT_CATEGORIES: ProjectCategory[] = [
  {
    id: 'general',
    name: 'Base Replacements',
    description: 'Basic text replacements and project information',
    icon: 'InfoCircleOutlined',
    color: '#1890ff',
    isDefault: true,
    fileName: 'base.yml',
    variableDefinitions: [
      {
        id: 'project_name',
        name: 'project_name',
        description: 'The name of your project',
        required: true,
      },
      {
        id: 'project_description',
        name: 'project_description',
        description: 'A brief description of the project',
      },
    ],
  },
  {
    id: 'development',
    name: 'Development',
    description: 'Development-related variables',
    icon: 'CodeOutlined',
    color: '#52c41a',
    isDefault: true,
    fileName: 'project_development.yml',
    variableDefinitions: [
      {
        id: 'tech_stack',
        name: 'tech_stack',
        description: 'Technology stack used',
        defaultValue: 'TypeScript',
      },
      {
        id: 'directory',
        name: 'directory',
        description: 'Project directory path',
      },
      {
        id: 'restart_command',
        name: 'restart_command',
        description: 'Command to restart the project',
        defaultValue: 'npm run dev',
      },
      {
        id: 'log_command',
        name: 'log_command',
        description: 'Command to view logs',
        defaultValue: 'npm run logs',
      },
    ],
  },
];

// Structure for storing category values per project
export interface ProjectCategoryValues {
  projectId: string;
  categoryValues: Record<string, Record<string, string>>; // categoryId -> variableId -> value
}