import { Project } from '../types/project';

/**
 * Helper function to get value from category variables
 * @param project - The project to extract variables from
 * @param variableId - The variable ID to look for
 * @returns The variable value or empty string if not found
 */
export const getCategoryValue = (project: Project, variableId: string): string => {
  if (!project.categoryValues) return '';
  
  for (const categoryId in project.categoryValues) {
    const categoryVariables = project.categoryValues[categoryId];
    if (categoryVariables[variableId]) {
      return categoryVariables[variableId];
    }
  }
  return '';
};

/**
 * Legacy compatibility: Get project stack from category variables
 */
export const getProjectStack = (project: Project): string => {
  return getCategoryValue(project, 'tech_stack') || getCategoryValue(project, 'active_project_stack') || '';
};

/**
 * Legacy compatibility: Get project description from category variables
 */
export const getProjectDescription = (project: Project): string => {
  return getCategoryValue(project, 'project_description') || '';
};

/**
 * Legacy compatibility: Get project directory from category variables
 */
export const getProjectDirectory = (project: Project): string => {
  return getCategoryValue(project, 'directory') || getCategoryValue(project, 'active_project_directory') || '';
};

/**
 * Legacy compatibility: Get project restart command from category variables
 */
export const getProjectRestartCommand = (project: Project): string => {
  return getCategoryValue(project, 'restart_command') || getCategoryValue(project, 'active_project_restart_cmd') || '';
};

/**
 * Legacy compatibility: Get project log command from category variables
 */
export const getProjectLogCommand = (project: Project): string => {
  return getCategoryValue(project, 'log_command') || getCategoryValue(project, 'active_project_log_cmd') || '';
};