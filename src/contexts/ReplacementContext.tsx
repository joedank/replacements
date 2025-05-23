import React, { createContext, useContext, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface Replacement {
  trigger: string;
  replace: string;
  source: string;
}

interface SelectedReplacement {
  replacement: Replacement;
  category: 'global' | 'base' | 'ai';
  index: number;
}

interface ReplacementContextType {
  // All replacements by category
  globalReplacements: Replacement[];
  baseReplacements: Replacement[];
  aiReplacements: Replacement[];
  
  // Selected replacement
  selectedReplacement: SelectedReplacement | null;
  
  // Selected menu item
  selectedMenuItem: string;
  
  // Loading states
  loading: boolean;
  saving: boolean;
  
  // Actions
  loadReplacements: () => Promise<void>;
  selectReplacement: (category: 'global' | 'base' | 'ai', index: number) => void;
  selectMenuItem: (menuItem: string) => void;
  updateReplacement: (trigger: string, replace: string) => Promise<void>;
  createReplacement: (category: 'global' | 'base' | 'ai', trigger: string, replace: string) => Promise<void>;
  deleteReplacement: () => Promise<void>;
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
  const [selectedReplacement, setSelectedReplacement] = useState<SelectedReplacement | null>(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState<string>('dashboard');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const selectReplacement = useCallback((category: 'global' | 'base' | 'ai', index: number) => {
    let replacements: Replacement[];
    switch (category) {
      case 'global':
        replacements = globalReplacements;
        break;
      case 'base':
        replacements = baseReplacements;
        break;
      case 'ai':
        replacements = aiReplacements;
        break;
    }

    if (index >= 0 && index < replacements.length) {
      setSelectedReplacement({
        replacement: replacements[index],
        category,
        index,
      });
      // Clear the selected menu item when selecting a replacement
      setSelectedMenuItem('');
    }
  }, [globalReplacements, baseReplacements, aiReplacements]);

  const selectMenuItem = useCallback((menuItem: string) => {
    setSelectedMenuItem(menuItem);
    // Clear selected replacement when changing to non-trigger menu items
    if (!menuItem.includes('-') || ['general-settings', 'espanso-config', 'preferences', 'import-export', 'project-list', 'project-create', 'prompt-library', 'template-editor'].includes(menuItem)) {
      setSelectedReplacement(null);
    }
  }, []);

  const updateReplacement = useCallback(async (trigger: string, replace: string) => {
    if (!selectedReplacement) return;

    setSaving(true);
    try {
      const { category, index } = selectedReplacement;
      let replacements: Replacement[];
      let setReplacements: React.Dispatch<React.SetStateAction<Replacement[]>>;

      switch (category) {
        case 'global':
          replacements = [...globalReplacements];
          setReplacements = setGlobalReplacements;
          break;
        case 'base':
          replacements = [...baseReplacements];
          setReplacements = setBaseReplacements;
          break;
        case 'ai':
          replacements = [...aiReplacements];
          setReplacements = setAiReplacements;
          break;
      }

      // Update the replacement in the array
      replacements[index] = {
        ...replacements[index],
        trigger,
        replace,
      };

      // Save to file
      await invoke('write_espanso_file', {
        filePath: FILE_PATHS[category],
        replacements,
      });

      // Update state
      setReplacements(replacements);

      // Update selected replacement
      setSelectedReplacement({
        ...selectedReplacement,
        replacement: replacements[index],
      });
    } catch (error) {
      console.error('Failed to update replacement:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [selectedReplacement, globalReplacements, baseReplacements, aiReplacements]);

  const createReplacement = useCallback(async (category: 'global' | 'base' | 'ai', trigger: string, replace: string) => {
    setSaving(true);
    try {
      let replacements: Replacement[];
      let setReplacements: React.Dispatch<React.SetStateAction<Replacement[]>>;

      switch (category) {
        case 'global':
          replacements = [...globalReplacements];
          setReplacements = setGlobalReplacements;
          break;
        case 'base':
          replacements = [...baseReplacements];
          setReplacements = setBaseReplacements;
          break;
        case 'ai':
          replacements = [...aiReplacements];
          setReplacements = setAiReplacements;
          break;
      }

      // Add new replacement
      const newReplacement: Replacement = {
        trigger,
        replace,
        source: FILE_PATHS[category],
      };
      replacements.push(newReplacement);

      // Save to file
      await invoke('write_espanso_file', {
        filePath: FILE_PATHS[category],
        replacements,
      });

      // Update state
      setReplacements(replacements);

      // Select the new replacement
      setSelectedReplacement({
        replacement: newReplacement,
        category,
        index: replacements.length - 1,
      });
    } catch (error) {
      console.error('Failed to create replacement:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [globalReplacements, baseReplacements, aiReplacements]);

  const deleteReplacement = useCallback(async () => {
    if (!selectedReplacement) return;

    setSaving(true);
    try {
      const { category, index } = selectedReplacement;
      let replacements: Replacement[];
      let setReplacements: React.Dispatch<React.SetStateAction<Replacement[]>>;

      switch (category) {
        case 'global':
          replacements = [...globalReplacements];
          setReplacements = setGlobalReplacements;
          break;
        case 'base':
          replacements = [...baseReplacements];
          setReplacements = setBaseReplacements;
          break;
        case 'ai':
          replacements = [...aiReplacements];
          setReplacements = setAiReplacements;
          break;
      }

      // Remove the replacement
      replacements.splice(index, 1);

      // Save to file
      await invoke('write_espanso_file', {
        filePath: FILE_PATHS[category],
        replacements,
      });

      // Update state
      setReplacements(replacements);

      // Clear selection
      setSelectedReplacement(null);
    } catch (error) {
      console.error('Failed to delete replacement:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [selectedReplacement, globalReplacements, baseReplacements, aiReplacements]);

  const value: ReplacementContextType = {
    globalReplacements,
    baseReplacements,
    aiReplacements,
    selectedReplacement,
    selectedMenuItem,
    loading,
    saving,
    loadReplacements,
    selectReplacement,
    selectMenuItem,
    updateReplacement,
    createReplacement,
    deleteReplacement,
  };

  return (
    <ReplacementContext.Provider value={value}>
      {children}
    </ReplacementContext.Provider>
  );
};