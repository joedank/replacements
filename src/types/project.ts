export interface Project {
  id: string;
  name: string;
  description?: string; // Optional project description
  categoryId: string; // Category this project belongs to
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Category-based variable system - all project data stored here
  categoryValues?: Record<string, Record<string, string>>; // categoryId -> variableId -> value
}

export interface ProjectVariable {
  key: string;
  value: string;
  description?: string;
}


export const DEFAULT_PROJECT_VALUES = {
  name: '',
  categoryId: '',
} as const;