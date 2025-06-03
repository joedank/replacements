import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Project } from '../types/project';

interface ProjectContextType {
  projects: Project[];
  filteredProjects: Project[];
  activeProject: Project | null;
  selectedCategoryId: string | null;
  loading: boolean;
  error: string | null;
  loadProjects: () => Promise<void>;
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setActiveProject: (id: string | null) => Promise<void>;
  setSelectedCategory: (categoryId: string | null) => void;
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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const switchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter projects based on selected category
  const filteredProjects = selectedCategoryId 
    ? projects.filter(p => p.categoryId === selectedCategoryId)
    : projects;

  const loadProjects = useCallback(async () => {
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
  }, []);

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

  const setActiveProject = useCallback(async (id: string | null) => {
    // Clear any pending switches
    if (switchTimeoutRef.current) {
      clearTimeout(switchTimeoutRef.current);
    }

    // Debounce rapid switches
    
    switchTimeoutRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Handle no project case explicitly
        if (id === null) {
          await invoke('set_active_project', { id: null });
          setActiveProjectState(null);
          // Clear Espanso config when no project is active
          await invoke('clear_project_espanso_config');
        } else {
          await invoke('set_active_project', { id });
          const project = projects.find(p => p.id === id) || null;
          setActiveProjectState(project);
          
          // Only generate config if we have a valid project
          if (project) {
            await generateEspansoConfig();
          }
        }
      } catch (err) {
        setError(err as string);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce
  }, [projects]);

  const generateEspansoConfig = async () => {
    if (!activeProject) {
      console.warn('No active project to generate config for');
      return;
    }
    
    try {
      // The Rust backend handles the YAML generation in set_active_project
      // This function is kept for API consistency but the actual work
      // is done when setting the active project
      // Additional validation could be added here if needed
    } catch (err) {
      setError(err as string);
    }
  };

  const setSelectedCategory = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    // If active project is not in the new category, clear it
    if (categoryId && activeProject && activeProject.categoryId !== categoryId) {
      setActiveProject(null);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (switchTimeoutRef.current) {
        clearTimeout(switchTimeoutRef.current);
      }
    };
  }, []);

  const value: ProjectContextType = {
    projects,
    filteredProjects,
    activeProject,
    selectedCategoryId,
    loading,
    error,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    setActiveProject,
    setSelectedCategory,
    generateEspansoConfig,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};