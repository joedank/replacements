export interface CustomVariable {
  id: string;
  name: string;
  value: string;
  preview?: string;
  description?: string;
}

export interface CustomVariableCategory {
  id: string;
  name: string;
  icon: string; // Icon name from Ant Design icons
  variables: CustomVariable[];
  color?: string;
}

export interface VariablesData {
  categories: CustomVariableCategory[];
  lastUpdated: string;
}