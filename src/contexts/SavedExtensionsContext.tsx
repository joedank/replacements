import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { message } from 'antd';
import {
  SavedExtension,
  SavedExtensionCategory,
  SavedExtensionsData,
  SavedExtensionFilters,
  createSavedExtension,
  updateSavedExtension,
  incrementUsageCount
} from '../types/savedExtensions';
import { Extension } from '../types/extensions';

interface SavedExtensionsContextType {
  // Data
  savedExtensions: SavedExtension[];
  categories: SavedExtensionCategory[];
  settings: SavedExtensionsData['settings'];
  loading: boolean;
  
  // Actions
  saveExtension: (name: string, extension: Extension, options?: {
    description?: string;
    category?: string;
    tags?: string[];
  }) => Promise<SavedExtension>;
  updateExtension: (id: string, updates: Partial<Omit<SavedExtension, 'id' | 'createdAt'>>) => Promise<void>;
  deleteExtension: (id: string) => Promise<void>;
  useExtension: (id: string) => Promise<SavedExtension>;
  
  // Filtering and search
  filterExtensions: (filters: SavedExtensionFilters) => SavedExtension[];
  toggleFavorite: (id: string) => Promise<void>;
  
  // Categories
  createCategory: (category: Omit<SavedExtensionCategory, 'id'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<SavedExtensionCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  // Bulk operations
  exportExtensions: () => Promise<string>;
  importExtensions: (data: SavedExtensionsData) => Promise<void>;
  
  // Utilities
  refreshData: () => Promise<void>;
}

const SavedExtensionsContext = createContext<SavedExtensionsContextType | undefined>(undefined);

export const useSavedExtensions = () => {
  const context = useContext(SavedExtensionsContext);
  if (!context) {
    throw new Error('useSavedExtensions must be used within a SavedExtensionsProvider');
  }
  return context;
};

interface SavedExtensionsProviderProps {
  children: ReactNode;
}

export const SavedExtensionsProvider: React.FC<SavedExtensionsProviderProps> = ({ children }) => {
  const [data, setData] = useState<SavedExtensionsData>({
    extensions: [],
    categories: [],
    settings: {
      autoSaveOnCreate: false,
      showUsageStats: true,
    },
  });
  const [loading, setLoading] = useState(true);

  // Load data from backend
  const loadData = async () => {
    try {
      setLoading(true);
      const result = await invoke<SavedExtensionsData>('read_saved_extensions');
      setData(result);
    } catch (error) {
      console.error('Failed to load saved extensions:', error);
      message.error('Failed to load saved extensions');
    } finally {
      setLoading(false);
    }
  };

  // Save data to backend
  const saveData = async (newData: SavedExtensionsData) => {
    try {
      await invoke('write_saved_extensions', { data: newData });
      setData(newData);
    } catch (error) {
      console.error('Failed to save extensions data:', error);
      message.error('Failed to save extensions data');
      throw error;
    }
  };

  // Initialize data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Save extension
  const saveExtension = async (
    name: string,
    extension: Extension,
    options?: {
      description?: string;
      category?: string;
      tags?: string[];
    }
  ): Promise<SavedExtension> => {
    const savedExtension = createSavedExtension(name, extension, options);
    
    try {
      await invoke('save_extension', { extensionData: savedExtension });
      await loadData(); // Refresh data
      message.success(`Extension "${name}" saved successfully!`);
      return savedExtension;
    } catch (error) {
      console.error('Failed to save extension:', error);
      message.error('Failed to save extension');
      throw error;
    }
  };

  // Update extension
  const updateExtension = async (
    id: string,
    updates: Partial<Omit<SavedExtension, 'id' | 'createdAt'>>
  ) => {
    const existingExtension = data.extensions.find(e => e.id === id);
    if (!existingExtension) {
      throw new Error(`Extension with ID ${id} not found`);
    }

    const updatedExtension = updateSavedExtension(existingExtension, updates);
    
    try {
      await invoke('save_extension', { extensionData: updatedExtension });
      await loadData(); // Refresh data
      message.success('Extension updated successfully!');
    } catch (error) {
      console.error('Failed to update extension:', error);
      message.error('Failed to update extension');
      throw error;
    }
  };

  // Delete extension
  const deleteExtension = async (id: string) => {
    try {
      await invoke('delete_saved_extension', { extensionId: id });
      await loadData(); // Refresh data
      message.success('Extension deleted successfully!');
    } catch (error) {
      console.error('Failed to delete extension:', error);
      message.error('Failed to delete extension');
      throw error;
    }
  };

  // Use extension (increment usage count)
  const useExtension = async (id: string): Promise<SavedExtension> => {
    try {
      await invoke('increment_extension_usage', { extensionId: id });
      await loadData(); // Refresh data
      
      const extension = data.extensions.find(e => e.id === id);
      if (!extension) {
        throw new Error(`Extension with ID ${id} not found`);
      }
      
      return incrementUsageCount(extension);
    } catch (error) {
      console.error('Failed to update extension usage:', error);
      throw error;
    }
  };

  // Filter extensions
  const filterExtensions = (filters: SavedExtensionFilters): SavedExtension[] => {
    let filtered = [...data.extensions];

    // Filter by category
    if (filters.category) {
      filtered = filtered.filter(ext => ext.category === filters.category);
    }

    // Filter by extension type
    if (filters.extensionType) {
      filtered = filtered.filter(ext => ext.extension.type === filters.extensionType);
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(ext =>
        ext.name.toLowerCase().includes(query) ||
        ext.description?.toLowerCase().includes(query) ||
        ext.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by favorites
    if (filters.favoritesOnly) {
      filtered = filtered.filter(ext => ext.isFavorite);
    }

    // Sort
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (filters.sortBy) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'createdAt':
            aValue = new Date(a.createdAt);
            bValue = new Date(b.createdAt);
            break;
          case 'updatedAt':
            aValue = new Date(a.updatedAt);
            bValue = new Date(b.updatedAt);
            break;
          case 'usageCount':
            aValue = a.usageCount;
            bValue = b.usageCount;
            break;
          default:
            return 0;
        }

        if (filters.sortOrder === 'desc') {
          return aValue < bValue ? 1 : -1;
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });
    }

    return filtered;
  };

  // Toggle favorite
  const toggleFavorite = async (id: string) => {
    const extension = data.extensions.find(e => e.id === id);
    if (!extension) {
      throw new Error(`Extension with ID ${id} not found`);
    }

    await updateExtension(id, { isFavorite: !extension.isFavorite });
  };

  // Category management
  const createCategory = async (categoryData: Omit<SavedExtensionCategory, 'id'>) => {
    const newCategory: SavedExtensionCategory = {
      ...categoryData,
      id: `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    const newData = {
      ...data,
      categories: [...data.categories, newCategory],
    };

    await saveData(newData);
    message.success(`Category "${categoryData.name}" created successfully!`);
  };

  const updateCategory = async (id: string, updates: Partial<SavedExtensionCategory>) => {
    const newData = {
      ...data,
      categories: data.categories.map(cat =>
        cat.id === id ? { ...cat, ...updates } : cat
      ),
    };

    await saveData(newData);
    message.success('Category updated successfully!');
  };

  const deleteCategory = async (id: string) => {
    // Move extensions from this category to 'personal'
    const newData = {
      ...data,
      categories: data.categories.filter(cat => cat.id !== id),
      extensions: data.extensions.map(ext =>
        ext.category === id ? { ...ext, category: 'personal' } : ext
      ),
    };

    await saveData(newData);
    message.success('Category deleted successfully!');
  };

  // Export/Import
  const exportExtensions = async (): Promise<string> => {
    return JSON.stringify(data, null, 2);
  };

  const importExtensions = async (importData: SavedExtensionsData) => {
    // Merge with existing data, avoiding ID conflicts
    const existingIds = new Set(data.extensions.map(e => e.id));
    const newExtensions = importData.extensions.filter(e => !existingIds.has(e.id));

    const mergedData = {
      ...data,
      extensions: [...data.extensions, ...newExtensions],
      categories: [
        ...data.categories,
        ...importData.categories.filter(c => 
          !data.categories.some(existing => existing.id === c.id)
        )
      ],
    };

    await saveData(mergedData);
    message.success(`Imported ${newExtensions.length} new extensions!`);
  };

  const refreshData = async () => {
    await loadData();
  };

  const contextValue: SavedExtensionsContextType = {
    // Data
    savedExtensions: data.extensions,
    categories: data.categories,
    settings: data.settings,
    loading,

    // Actions
    saveExtension,
    updateExtension,
    deleteExtension,
    useExtension,

    // Filtering and search
    filterExtensions,
    toggleFavorite,

    // Categories
    createCategory,
    updateCategory,
    deleteCategory,

    // Bulk operations
    exportExtensions,
    importExtensions,

    // Utilities
    refreshData,
  };

  return (
    <SavedExtensionsContext.Provider value={contextValue}>
      {children}
    </SavedExtensionsContext.Provider>
  );
};