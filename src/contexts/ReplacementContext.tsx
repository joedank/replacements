import React, { createContext, useContext, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { homeDir } from '@tauri-apps/api/path';

export interface Replacement {
  trigger: string;
  replace: string;
  source: string;
}


interface VariableUsage {
  trigger: string;
  category: 'global' | 'base' | 'ai';
  replace: string;
}

interface ReplacementContextType {
  // All replacements by category
  globalReplacements: Replacement[];
  baseReplacements: Replacement[];
  aiReplacements: Replacement[];
  
  // Selected menu item
  selectedMenuItem: string;
  
  // Loading states
  loading: boolean;
  saving: boolean;
  
  // Actions
  loadReplacements: () => Promise<void>;
  selectMenuItem: (menuItem: string) => void;
  findVariableUsage: (variable: string) => VariableUsage[];
}

const ReplacementContext = createContext<ReplacementContextType | undefined>(undefined);

export const useReplacements = () => {
  const context = useContext(ReplacementContext);
  if (!context) {
    throw new Error('useReplacements must be used within a ReplacementProvider');
  }
  return context;
};


export const ReplacementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [globalReplacements, setGlobalReplacements] = useState<Replacement[]>([]);
  const [baseReplacements, setBaseReplacements] = useState<Replacement[]>([]);
  const [aiReplacements, setAiReplacements] = useState<Replacement[]>([]);
  const [selectedMenuItem, setSelectedMenuItem] = useState<string>('dashboard');
  const [loading, setLoading] = useState(false);
  const [saving] = useState(false);

  const loadReplacements = useCallback(async () => {
    setLoading(true);
    try {
      const homeDirPath = await homeDir();
      const espansoPath = `${homeDirPath}/Library/Application Support/espanso/match`;
      
      // Load Global replacements
      try {
        const globalPath = `${espansoPath}/better_replacements.yml`;
        const global = await invoke<Replacement[]>('read_espanso_file', {
          filePath: globalPath
        });
        setGlobalReplacements(global);
      } catch (error) {
        console.error('Failed to load global replacements:', error);
        setGlobalReplacements([]);
      }

      // Load Base replacements
      try {
        const basePath = `${espansoPath}/base.yml`;
        const base = await invoke<Replacement[]>('read_espanso_file', {
          filePath: basePath
        });
        setBaseReplacements(base);
      } catch (error) {
        console.error('Failed to load base replacements:', error);
        setBaseReplacements([]);
      }

      // Load AI replacements
      try {
        const aiPath = `${espansoPath}/ai_prompts.yml`;
        const ai = await invoke<Replacement[]>('read_espanso_file', {
          filePath: aiPath
        });
        setAiReplacements(ai);
      } catch (error) {
        console.error('Failed to load AI replacements:', error);
        setAiReplacements([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);


  const selectMenuItem = useCallback((menuItem: string) => {
    setSelectedMenuItem(menuItem);
  }, []);




  const findVariableUsage = useCallback((variable: string): VariableUsage[] => {
    const usages: VariableUsage[] = [];
    
    // Check all categories
    const checkReplacements = (replacements: Replacement[], category: 'global' | 'base' | 'ai') => {
      replacements.forEach(replacement => {
        if (replacement.replace.includes(variable)) {
          usages.push({
            trigger: replacement.trigger,
            category,
            replace: replacement.replace,
          });
        }
      });
    };
    
    checkReplacements(globalReplacements, 'global');
    checkReplacements(baseReplacements, 'base');
    checkReplacements(aiReplacements, 'ai');
    
    return usages;
  }, [globalReplacements, baseReplacements, aiReplacements]);

  const value: ReplacementContextType = {
    globalReplacements,
    baseReplacements,
    aiReplacements,
    selectedMenuItem,
    loading,
    saving,
    loadReplacements,
    selectMenuItem,
    findVariableUsage,
  };

  return (
    <ReplacementContext.Provider value={value}>
      {children}
    </ReplacementContext.Provider>
  );
};