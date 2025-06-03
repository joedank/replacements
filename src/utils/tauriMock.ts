import { mockCategories, mockProjects, mockReplacements } from './mockData';

// Check if we're running in Tauri
export const isTauri = () => {
  return typeof window !== 'undefined' && window.__TAURI__ !== undefined;
};

// Mock invoke function for development
export const mockInvoke = async (cmd: string, args?: any): Promise<any> => {
  console.log(`Mock invoke called: ${cmd}`, args);
  
  // Add a small delay to simulate async behavior
  await new Promise(resolve => setTimeout(resolve, 100));
  
  switch (cmd) {
    case 'read_project_categories':
      return mockCategories;
      
    case 'get_projects':
      return mockProjects;
      
    case 'read_espanso_file':
      return mockReplacements;
      
    case 'write_project_categories':
    case 'write_projects':
    case 'write_espanso_file':
      console.log(`Mock write operation: ${cmd}`, args);
      return { success: true };
      
    case 'create_project':
      const newProject = {
        ...args,
        id: `proj_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockProjects.projects.push(newProject);
      return newProject;
      
    case 'update_project':
      const index = mockProjects.projects.findIndex(p => p.id === args.id);
      if (index !== -1) {
        mockProjects.projects[index] = {
          ...mockProjects.projects[index],
          ...args.updates,
          updatedAt: new Date().toISOString(),
        };
      }
      return { success: true };
      
    case 'delete_project':
      mockProjects.projects = mockProjects.projects.filter(p => p.id !== args.id);
      return { success: true };
      
    case 'open_directory_dialog':
      return '/mock/directory/path';
      
    default:
      console.warn(`Unhandled mock invoke command: ${cmd}`);
      return null;
  }
};

// Export a wrapper that uses real invoke in Tauri, mock otherwise
export const safeInvoke = async (cmd: string, args?: any): Promise<any> => {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke(cmd, args);
  } else {
    return mockInvoke(cmd, args);
  }
};