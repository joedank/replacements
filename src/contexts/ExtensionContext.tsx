import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Extension } from '../types/extensions';

interface ExtensionContextType {
  // Extension templates that can be used
  extensionTemplates: Extension[];
  
  // Actions
  createExtensionTemplate: (extension: Extension) => void;
  updateExtensionTemplate: (id: string, extension: Extension) => void;
  deleteExtensionTemplate: (id: string) => void;
  
  // Helper to convert extension to Espanso variable format
  extensionToVariable: (extension: Extension) => any;
}

const ExtensionContext = createContext<ExtensionContextType | undefined>(undefined);

export const useExtensions = () => {
  const context = useContext(ExtensionContext);
  if (!context) {
    throw new Error('useExtensions must be used within an ExtensionProvider');
  }
  return context;
};

interface ExtensionProviderProps {
  children: ReactNode;
}

export const ExtensionProvider: React.FC<ExtensionProviderProps> = ({ children }) => {
  const [extensionTemplates, setExtensionTemplates] = useState<Extension[]>([
    // Some default templates
    {
      name: 'today',
      type: 'date',
      params: {
        format: '%Y-%m-%d',
      },
    },
    {
      name: 'clipboard',
      type: 'clipboard',
    },
  ]);

  const createExtensionTemplate = (extension: Extension) => {
    setExtensionTemplates(prev => [...prev, extension]);
  };

  const updateExtensionTemplate = (id: string, extension: Extension) => {
    setExtensionTemplates(prev => 
      prev.map(ext => ext.name === id ? extension : ext)
    );
  };

  const deleteExtensionTemplate = (id: string) => {
    setExtensionTemplates(prev => prev.filter(ext => ext.name !== id));
  };

  // Convert extension to Espanso variable format
  const extensionToVariable = (extension: Extension): any => {
    const base = {
      name: extension.name,
      type: extension.type,
    };

    // Add params if they exist
    if ('params' in extension && extension.params) {
      return { ...base, params: extension.params };
    }

    return base;
  };

  const value: ExtensionContextType = {
    extensionTemplates,
    createExtensionTemplate,
    updateExtensionTemplate,
    deleteExtensionTemplate,
    extensionToVariable,
  };

  return (
    <ExtensionContext.Provider value={value}>
      {children}
    </ExtensionContext.Provider>
  );
};