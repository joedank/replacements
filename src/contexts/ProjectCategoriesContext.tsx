import React, { createContext, useContext, useState, useEffect } from 'react';
import { message } from 'antd';
import { ProjectCategory, DEFAULT_PROJECT_CATEGORIES } from '../types/projectCategories';
import { safeInvoke } from '../utils/tauriMock';

interface ProjectCategoriesContextType {
  categories: ProjectCategory[];
  loading: boolean;
  loadCategories: () => Promise<void>;
  createCategory: (category: Omit<ProjectCategory, 'id'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<ProjectCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

const ProjectCategoriesContext = createContext<ProjectCategoriesContextType | null>(null);

export const useProjectCategories = () => {
  const context = useContext(ProjectCategoriesContext);
  if (!context) {
    throw new Error('useProjectCategories must be used within ProjectCategoriesProvider');
  }
  return context;
};

interface ProjectCategoriesData {
  categories: ProjectCategory[];
  lastUpdated: string;
}

export const ProjectCategoriesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCategories = async () => {
    setLoading(true);
    try {
      // First ensure all categories have fileName fields and YAML files
      await safeInvoke('ensure_project_categories_have_filenames');
      
      const data = await safeInvoke('read_project_categories') as ProjectCategoriesData;
      // Normalize categories to ensure variableDefinitions exists
      const normalizedCategories = data.categories.map(c => ({
        ...c,
        variableDefinitions: c.variableDefinitions ?? [],
      }));
      
      // Ensure default categories are always present
      const existingIds = new Set(normalizedCategories.map(c => c.id));
      const missingDefaults = DEFAULT_PROJECT_CATEGORIES.filter(
        dc => !existingIds.has(dc.id)
      );
      const allCategories = [...normalizedCategories, ...missingDefaults];
      
      setCategories(allCategories);
    } catch (error) {
      console.error('Failed to load project categories:', error);
      // If no categories exist, use defaults
      setCategories(DEFAULT_PROJECT_CATEGORIES);
    } finally {
      setLoading(false);
    }
  };

  const saveCategories = async (newCategories: ProjectCategory[]) => {
    try {
      await safeInvoke('write_project_categories', {
        data: {
          categories: newCategories,
          lastUpdated: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to save project categories:', error);
      throw error;
    }
  };

  const createCategory = async (category: Omit<ProjectCategory, 'id'>) => {
    try {
      const newCategory: ProjectCategory = {
        ...category,
        id: `cat_${Date.now()}`,
      };
      const updatedCategories = [...categories, newCategory];
      await saveCategories(updatedCategories);
      setCategories(updatedCategories);
      message.success('Category created successfully');
    } catch (error) {
      message.error('Failed to create category');
      throw error;
    }
  };

  const updateCategory = async (id: string, updates: Partial<ProjectCategory>) => {
    try {
      const updatedCategories = categories.map(cat =>
        cat.id === id ? { ...cat, ...updates } : cat
      );
      await saveCategories(updatedCategories);
      setCategories(updatedCategories);
      message.success('Category updated successfully');
    } catch (error) {
      message.error('Failed to update category');
      throw error;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const category = categories.find(c => c.id === id);
      if (category?.isDefault) {
        message.error('Cannot delete default categories');
        return;
      }
      const updatedCategories = categories.filter(cat => cat.id !== id);
      await saveCategories(updatedCategories);
      setCategories(updatedCategories);
      message.success('Category deleted successfully');
    } catch (error) {
      message.error('Failed to delete category');
      throw error;
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  return (
    <ProjectCategoriesContext.Provider
      value={{
        categories,
        loading,
        loadCategories,
        createCategory,
        updateCategory,
        deleteCategory,
      }}
    >
      {children}
    </ProjectCategoriesContext.Provider>
  );
};