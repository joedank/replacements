import React, { createContext, useContext, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

/**
 * Platform types supported by the application
 */
export type Platform = 'macos' | 'windows' | 'linux';

/**
 * PathContext provides centralized access to all platform-specific paths
 * Loads paths once on app startup and caches them for instant access
 */
interface PathContextType {
  platform: Platform | null;
  espansoConfigDir: string | null;
  espansoMatchDir: string | null;
  appDataDir: string | null;
  isLoading: boolean;
  error: string | null;

  // Helper functions for display and debugging
  getDisplayPath: (type: 'espanso' | 'appData') => string;
}

const PathContext = createContext<PathContextType | undefined>(undefined);

export const PathProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [espansoConfigDir, setEspansoConfigDir] = useState<string | null>(null);
  const [espansoMatchDir, setEspansoMatchDir] = useState<string | null>(null);
  const [appDataDir, setAppDataDir] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPaths = async () => {
      try {
        // Initialize required files BEFORE loading paths
        // This ensures first-time users have all necessary YAML files
        await invoke('initialize_app_files');
        console.log('App files initialized');

        // Load all paths in parallel - single IPC burst (4 calls total)
        const [platformName, espansoConfig, espansoMatch, appData] = await Promise.all([
          invoke<string>('get_current_platform'),
          invoke<string>('get_espanso_config_dir'),
          invoke<string>('get_espanso_match_dir'),
          invoke<string>('get_app_data_dir'),
        ]);

        setPlatform(platformName as Platform);
        setEspansoConfigDir(espansoConfig);
        setEspansoMatchDir(espansoMatch);
        setAppDataDir(appData);

        // Log for debugging during development
        console.log('PathContext loaded:', {
          platform: platformName,
          espansoConfig,
          espansoMatch,
          appData
        });
      } catch (err) {
        console.error('Failed to load paths:', err);
        setError(err instanceof Error ? err.message : 'Failed to load paths');
      } finally {
        setIsLoading(false);
      }
    };

    loadPaths();
  }, []); // Only run once on mount

  // Get display-friendly path for UI (shows platform-specific pattern)
  const getDisplayPath = (type: 'espanso' | 'appData'): string => {
    if (!platform) return '';

    switch (type) {
      case 'espanso':
        switch (platform) {
          case 'macos':
            return '~/Library/Application Support/espanso';
          case 'windows':
            return '%APPDATA%\\espanso';
          case 'linux':
            return '~/.config/espanso';
        }
        break;
      case 'appData':
        switch (platform) {
          case 'macos':
            return '~/Library/Application Support/BetterReplacementsManager';
          case 'windows':
            return '%APPDATA%\\BetterReplacementsManager';
          case 'linux':
            return '~/.config/BetterReplacementsManager';
        }
        break;
    }
    return '';
  };

  return (
    <PathContext.Provider
      value={{
        platform,
        espansoConfigDir,
        espansoMatchDir,
        appDataDir,
        isLoading,
        error,
        getDisplayPath,
      }}
    >
      {children}
    </PathContext.Provider>
  );
};

/**
 * Hook to access path context from any component
 * @throws Error if used outside of PathProvider
 * @returns PathContextType with all paths and helper functions
 *
 * @example
 * const { espansoMatchDir, platform } = usePaths();
 * if (espansoMatchDir) {
 *   const filePath = `${espansoMatchDir}/${fileName}`;
 * }
 */
export const usePaths = () => {
  const context = useContext(PathContext);
  if (!context) {
    throw new Error('usePaths must be used within PathProvider');
  }
  return context;
};