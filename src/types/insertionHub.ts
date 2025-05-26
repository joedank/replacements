import { Project } from './project';

export type InsertionAction = 'insert' | 'builder';

export interface InsertionItem {
  key: string;
  label: string;
  value: string;
  action?: InsertionAction; // default 'insert'
  category: string;
  icon?: React.ReactNode | string;
  preview?: (activeProject?: Project) => string; // called with activeProject to render live preview
  builderType?: string; // For builder actions, specify which builder to open
  quickSettings?: boolean; // For date/time variables that support quick settings
  isFavorite?: boolean;
}

export interface InsertionCategory {
  key: string;
  label: string;
  icon?: React.ReactNode | string;
  order?: number;
}

export const INSERTION_CATEGORIES: InsertionCategory[] = [
  { key: 'favorites', label: 'Favorites', icon: 'StarFilled', order: 0 },
  { key: 'system', label: 'System', icon: 'SettingOutlined', order: 1 },
  { key: 'datetime', label: 'Date & Time', icon: 'CalendarOutlined', order: 2 },
  { key: 'custom', label: 'Custom', icon: 'UserOutlined', order: 3 },
  { key: 'extensions', label: 'Extensions', icon: 'ApiOutlined', order: 4 },
];

// Helper function to format date preview
export const getDatePreview = (format?: string, offset?: number): string => {
  const date = new Date();
  if (offset) {
    date.setDate(date.getDate() + offset);
  }
  
  if (!format || format === '%Y-%m-%d') {
    return date.toLocaleDateString();
  } else if (format === '%H:%M:%S') {
    return date.toLocaleTimeString();
  } else {
    return date.toLocaleString();
  }
};