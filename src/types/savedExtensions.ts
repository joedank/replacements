import { Extension } from './extensions';

// Saved extension with metadata for user's library
export interface SavedExtension {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  extension: Extension;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  isFavorite: boolean;
}

// Categories for organizing saved extensions
export interface SavedExtensionCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  order: number;
}

// Data structure for storing all saved extensions
export interface SavedExtensionsData {
  extensions: SavedExtension[];
  categories: SavedExtensionCategory[];
  settings: {
    defaultCategory?: string;
    autoSaveOnCreate: boolean;
    showUsageStats: boolean;
  };
}

// Filter and search options
export interface SavedExtensionFilters {
  category?: string;
  extensionType?: string;
  searchQuery?: string;
  favoritesOnly?: boolean;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'usageCount';
  sortOrder?: 'asc' | 'desc';
}

// Default categories that come pre-installed
export const DEFAULT_SAVED_EXTENSION_CATEGORIES: SavedExtensionCategory[] = [
  {
    id: 'development',
    name: 'Development',
    description: 'Scripts and commands for development tasks',
    color: '#1890ff',
    icon: 'CodeOutlined',
    order: 1,
  },
  {
    id: 'productivity',
    name: 'Productivity',
    description: 'Templates and forms for daily workflows',
    color: '#52c41a',
    icon: 'ThunderboltOutlined',
    order: 2,
  },
  {
    id: 'communication',
    name: 'Communication',
    description: 'Email templates, meeting notes, etc.',
    color: '#722ed1',
    icon: 'MessageOutlined',
    order: 3,
  },
  {
    id: 'system',
    name: 'System',
    description: 'System commands and utilities',
    color: '#fa8c16',
    icon: 'SettingOutlined',
    order: 4,
  },
  {
    id: 'personal',
    name: 'Personal',
    description: 'Personal templates and shortcuts',
    color: '#eb2f96',
    icon: 'UserOutlined',
    order: 5,
  },
];

// Helper functions
export const createSavedExtension = (
  name: string,
  extension: Extension,
  options?: {
    description?: string;
    category?: string;
    tags?: string[];
  }
): SavedExtension => {
  const now = new Date().toISOString();
  return {
    id: `saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description: options?.description,
    category: options?.category || 'personal',
    tags: options?.tags || [],
    extension,
    createdAt: now,
    updatedAt: now,
    usageCount: 0,
    isFavorite: false,
  };
};

export const updateSavedExtension = (
  savedExtension: SavedExtension,
  updates: Partial<Omit<SavedExtension, 'id' | 'createdAt'>>
): SavedExtension => {
  return {
    ...savedExtension,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
};

export const incrementUsageCount = (savedExtension: SavedExtension): SavedExtension => {
  return {
    ...savedExtension,
    usageCount: savedExtension.usageCount + 1,
    updatedAt: new Date().toISOString(),
  };
};

// Default data structure
export const createDefaultSavedExtensionsData = (): SavedExtensionsData => ({
  extensions: [],
  categories: DEFAULT_SAVED_EXTENSION_CATEGORIES,
  settings: {
    autoSaveOnCreate: false,
    showUsageStats: true,
  },
});