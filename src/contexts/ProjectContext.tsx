import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Project } from '../types/project';

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  loading: boolean;
  error: string | null;
  loadProjects: () => Promise<void>;
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setActiveProject: (id: string | null) => Promise<void>;
  generateEspansoConfig: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const projectData = await invoke<{ projects: Project[]; activeProjectId: string | null }>('get_projects');
      setProjects(projectData.projects);
      const active = projectData.projects.find(p => p.id === projectData.activeProjectId) || null;
      setActiveProjectState(active);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      setError(null);
      const newProject: Project = {
        ...projectData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await invoke('create_project', { project: newProject });
      await loadProjects();
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      setLoading(true);
      setError(null);
      await invoke('update_project', { id, updates });
      await loadProjects();
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await invoke('delete_project', { id });
      if (activeProject?.id === id) {
        await setActiveProject(null);
      }
      await loadProjects();
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const setActiveProject = async (id: string | null) => {
    try {
      setLoading(true);
      setError(null);
      await invoke('set_active_project', { id });
      const project = id ? projects.find(p => p.id === id) || null : null;
      setActiveProjectState(project);
      if (project) {
        await generateEspansoConfig();
      }
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const generateEspansoConfig = async () => {
    if (!activeProject) return;
    
    try {
      // The Rust backend handles the YAML generation in set_active_project
      // This function is kept for API consistency but the actual work
      // is done when setting the active project
    } catch (err) {
      setError(err as string);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const value: ProjectContextType = {
    projects,
    activeProject,
    loading,
    error,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    setActiveProject,
    generateEspansoConfig,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};