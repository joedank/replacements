import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { CustomVariable, CustomVariableCategory, VariablesData } from '../types/variables';

interface VariablesContextType {
  categories: CustomVariableCategory[];
  loading: boolean;
  addCategory: (category: Omit<CustomVariableCategory, 'id' | 'variables'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<CustomVariableCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addVariable: (categoryId: string, variable: Omit<CustomVariable, 'id'>) => Promise<void>;
  updateVariable: (categoryId: string, variableId: string, updates: Partial<CustomVariable>) => Promise<void>;
  deleteVariable: (categoryId: string, variableId: string) => Promise<void>;
  refreshVariables: () => Promise<void>;
}

const VariablesContext = createContext<VariablesContextType | undefined>(undefined);

export const useVariables = () => {
  const context = useContext(VariablesContext);
  if (!context) {
    throw new Error('useVariables must be used within a VariablesProvider');
  }
  return context;
};

interface VariablesProviderProps {
  children: ReactNode;
}

export const VariablesProvider: React.FC<VariablesProviderProps> = ({ children }) => {
  const [categories, setCategories] = useState<CustomVariableCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVariables = async () => {
    try {
      setLoading(true);
      const data = await invoke<VariablesData>('read_custom_variables');
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to load custom variables:', error);
      // Initialize with empty data if file doesn't exist
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const saveVariables = async (newCategories: CustomVariableCategory[]) => {
    const data: VariablesData = {
      categories: newCategories,
      lastUpdated: new Date().toISOString(),
    };
    
    try {
      await invoke('write_custom_variables', { data });
    } catch (error) {
      console.error('Failed to save custom variables:', error);
      throw error;
    }
  };

  const addCategory = async (categoryData: Omit<CustomVariableCategory, 'id' | 'variables'>) => {
    const newCategory: CustomVariableCategory = {
      ...categoryData,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      variables: [],
    };

    const newCategories = [...categories, newCategory];
    await saveVariables(newCategories);
    setCategories(newCategories);
  };

  const updateCategory = async (id: string, updates: Partial<CustomVariableCategory>) => {
    const newCategories = categories.map(cat => 
      cat.id === id ? { ...cat, ...updates } : cat
    );
    await saveVariables(newCategories);
    setCategories(newCategories);
  };

  const deleteCategory = async (id: string) => {
    const newCategories = categories.filter(cat => cat.id !== id);
    await saveVariables(newCategories);
    setCategories(newCategories);
  };

  const addVariable = async (categoryId: string, variableData: Omit<CustomVariable, 'id'>) => {
    const newVariable: CustomVariable = {
      ...variableData,
      id: `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    const newCategories = categories.map(cat => 
      cat.id === categoryId 
        ? { ...cat, variables: [...cat.variables, newVariable] }
        : cat
    );
    await saveVariables(newCategories);
    setCategories(newCategories);
  };

  const updateVariable = async (categoryId: string, variableId: string, updates: Partial<CustomVariable>) => {
    const newCategories = categories.map(cat => 
      cat.id === categoryId 
        ? {
            ...cat,
            variables: cat.variables.map(variable => 
              variable.id === variableId ? { ...variable, ...updates } : variable
            )
          }
        : cat
    );
    await saveVariables(newCategories);
    setCategories(newCategories);
  };

  const deleteVariable = async (categoryId: string, variableId: string) => {
    const newCategories = categories.map(cat => 
      cat.id === categoryId 
        ? { ...cat, variables: cat.variables.filter(variable => variable.id !== variableId) }
        : cat
    );
    await saveVariables(newCategories);
    setCategories(newCategories);
  };

  const refreshVariables = async () => {
    await loadVariables();
  };

  useEffect(() => {
    loadVariables();
  }, []);

  const value: VariablesContextType = {
    categories,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    addVariable,
    updateVariable,
    deleteVariable,
    refreshVariables,
  };

  return (
    <VariablesContext.Provider value={value}>
      {children}
    </VariablesContext.Provider>
  );
};