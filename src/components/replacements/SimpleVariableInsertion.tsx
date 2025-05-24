import React from 'react';
import { Button, Tooltip } from 'antd';
import { CopyOutlined } from '@ant-design/icons';

interface SimpleVariableInsertionProps {
  variables: Array<{
    name: string;
    value: string;
    preview?: string;
  }>;
  onInsert: (variable: string) => void;
}

export const SimpleVariableInsertion: React.FC<SimpleVariableInsertionProps> = ({ 
  variables, 
  onInsert 
}) => {
  // Simple click-to-insert approach as a workaround for Tauri drag issues
  const handleInsert = (variable: string) => {
    console.log('[SimpleVariableInsertion] Inserting variable:', variable);
    onInsert(variable);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>
        Quick Insert Variables:
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {variables.map((variable) => (
          <Tooltip 
            key={variable.name} 
            title={variable.preview || `Insert ${variable.value}`}
          >
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleInsert(variable.value)}
              style={{ fontFamily: 'monospace' }}
            >
              {variable.value}
            </Button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};