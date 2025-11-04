import React, { createContext, useContext, useState, useEffect } from 'react';
import { message } from 'antd';
import { invoke } from '@tauri-apps/api/core';
import { usePaths } from './PathContext';

// Category interface matching the backend Category struct
export interface Category {
  id: string;
  name: string;
  fileName: string;
  categoryId?: string; // Links to ProjectCategory.id (e.g., 'general', 'development')
  description?: string;
  icon: string;
  color?: string;
  isDefault?: boolean;
}

interface CategoriesContextType {
  categories: Category[];
  loading: boolean;
  loadCategories: () => Promise<void>;
  createCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

const CategoriesContext = createContext<CategoriesContextType | null>(null);

export const useCategories = () => {
  const context = useContext(CategoriesContext);
  if (!context) {
    throw new Error('useCategories must be used within CategoriesProvider');
  }
  return context;
};

export const CategoriesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const { espansoConfigDir, isLoading: pathsLoading } = usePaths();

  const loadCategories = async () => {
    setLoading(true);
    try {
      // Use the backend get_categories command
      const loadedCategories = await invoke<Category[]>('get_categories');
      console.log('Loaded replacement categories:', loadedCategories);
      setCategories(loadedCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
      message.error('Failed to load categories');
      // Set defaults if loading fails
      setCategories([
        {
          id: 'global',
          name: 'Global',
          fileName: 'base.yml',
          icon: 'GlobalOutlined',
          isDefault: true,
          description: 'Global text replacements'
        },
        {
          id: 'base',
          name: 'Base',
          fileName: 'better_replacements.yml',
          icon: 'FileTextOutlined',
          isDefault: true,
          description: 'Base text replacements'
        },
        {
          id: 'ai_prompts',
          name: 'AI Prompts',
          fileName: 'ai_prompts.yml',
          icon: 'RobotOutlined',
          isDefault: true,
          description: 'AI prompt templates'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async (category: Omit<Category, 'id'>) => {
    try {
      await invoke('create_category', { category });
      await loadCategories();
      message.success('Category created successfully');
    } catch (error) {
      console.error('Failed to create category:', error);
      message.error('Failed to create category');
      throw error;
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      await invoke('update_category', { id, updates });
      await loadCategories();
      message.success('Category updated successfully');
    } catch (error) {
      console.error('Failed to update category:', error);
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
      await invoke('delete_category', { id });
      await loadCategories();
      message.success('Category deleted successfully');
    } catch (error) {
      console.error('Failed to delete category:', error);
      message.error('Failed to delete category');
      throw error;
    }
  };

  // Auto-load categories when paths are ready
  // This fixes the race condition where CategoriesContext tried to load before PathContext finished
  useEffect(() => {
    if (!pathsLoading && espansoConfigDir) {
      console.log('Paths ready, auto-loading replacement categories');
      loadCategories();
    }
  }, [pathsLoading, espansoConfigDir]);

  return (
    <CategoriesContext.Provider
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
    </CategoriesContext.Provider>
  );
};