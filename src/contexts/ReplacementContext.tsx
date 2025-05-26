import React, { createContext, useContext, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

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

const FILE_PATHS = {
  global: '/Volumes/4TB/Users/josephmcmyne/Library/Application Support/espanso/match/better_replacements.yml',
  base: '/Volumes/4TB/Users/josephmcmyne/Library/Application Support/espanso/match/base.yml',
  ai: '/Volumes/4TB/Users/josephmcmyne/Library/Application Support/espanso/match/ai_prompts.yml',
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
      // Load Global replacements
      try {
        const global = await invoke<Replacement[]>('read_espanso_file', {
          filePath: FILE_PATHS.global
        });
        setGlobalReplacements(global);
      } catch (error) {
        console.error('Failed to load global replacements:', error);
        // Use mock data for development
        setGlobalReplacements([
          { trigger: '#end', replace: 'Best regards,\\nJoseph', source: FILE_PATHS.global },
          { trigger: '/tar', replace: 'tar -czf archive.tar.gz', source: FILE_PATHS.global },
          { trigger: '#proj', replace: 'Project: ', source: FILE_PATHS.global },
          { trigger: '#mem', replace: 'Memory Bank Update', source: FILE_PATHS.global },
          { trigger: '#context', replace: 'Context: ', source: FILE_PATHS.global },
        ]);
      }

      // Load Base replacements
      try {
        const base = await invoke<Replacement[]>('read_espanso_file', {
          filePath: FILE_PATHS.base
        });
        setBaseReplacements(base);
      } catch (error) {
        console.error('Failed to load base replacements:', error);
        // Use mock data for development
        setBaseReplacements([
          { trigger: ':espanso', replace: 'Espanso - Text Expander', source: FILE_PATHS.base },
          { trigger: ':date', replace: '{{date}}', source: FILE_PATHS.base },
          { trigger: ':time', replace: '{{time}}', source: FILE_PATHS.base },
          { trigger: ':now', replace: '{{date}} {{time}}', source: FILE_PATHS.base },
        ]);
      }

      // Load AI replacements
      try {
        const ai = await invoke<Replacement[]>('read_espanso_file', {
          filePath: FILE_PATHS.ai
        });
        setAiReplacements(ai);
      } catch (error) {
        console.error('Failed to load AI replacements:', error);
        // Use mock data for development
        setAiReplacements([
          { trigger: ':debug-help', replace: 'Help me debug this code:\\n\\n```\\n$|$\\n```', source: FILE_PATHS.ai },
          { trigger: ':code-review', replace: 'Please review this code for best practices:\\n\\n```\\n$|$\\n```', source: FILE_PATHS.ai },
          { trigger: ':explain', replace: 'Can you explain how this works?\\n\\n$|$', source: FILE_PATHS.ai },
          { trigger: ':refactor', replace: 'Please refactor this code to be more efficient:\\n\\n```\\n$|$\\n```', source: FILE_PATHS.ai },
        ]);
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