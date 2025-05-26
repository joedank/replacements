import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Alert, Typography, Space, Button, List } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ScriptExtension } from '../../types/extensions';

const { Text } = Typography;

interface ScriptExtensionConfigProps {
  extension?: ScriptExtension;
  onChange: (extension: ScriptExtension) => void;
  onVariableNameChange: (name: string) => void;
}

const scriptLanguages = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript (Node.js)' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'perl', label: 'Perl' },
  { value: 'bash', label: 'Bash' },
  { value: 'powershell', label: 'PowerShell' },
];

export const ScriptExtensionConfig: React.FC<ScriptExtensionConfigProps> = ({
  extension,
  onChange,
  onVariableNameChange
}) => {
  const [variableName, setVariableName] = useState(extension?.name || 'script_output');
  const [interpreter, setInterpreter] = useState(extension?.params.interpreter || 'python');
  const [script, setScript] = useState(extension?.params.script || '');
  const [args, setArgs] = useState<string[]>(extension?.params.args || []);

  useEffect(() => {
    onVariableNameChange(variableName);
  }, [variableName, onVariableNameChange]);

  useEffect(() => {
    onChange({
      name: variableName,
      type: 'script',
      params: {
        interpreter,
        script,
        args
      }
    });
  }, [variableName, interpreter, script, args, onChange]);

  const addArg = () => {
    setArgs([...args, '']);
  };

  const updateArg = (index: number, newValue: string) => {
    const newArgs = [...args];
    newArgs[index] = newValue;
    setArgs(newArgs);
  };

  const removeArg = (index: number) => {
    setArgs(args.filter((_, i) => i !== index));
  };

  return (
    <Form layout="vertical">
      <Alert
        message="Script Extension"
        description="Executes a script file and inserts its output. Scripts must be placed in Espanso's scripts directory."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form.Item
        label="Variable Name"
        required
      >
        <Input
          value={variableName}
          onChange={(e) => setVariableName(e.target.value)}
          placeholder="script_output"
          addonBefore="{{"
          addonAfter="}}"
        />
      </Form.Item>

      <Form.Item 
        label="Script Language/Interpreter" 
        required
        help="Select the interpreter or enter a custom command"
      >
        <Select
          value={interpreter}
          onChange={(value) => setInterpreter(value)}
          options={scriptLanguages}
          allowClear
          placeholder="Select or type custom interpreter"
          showSearch
          mode="tags"
          maxTagCount={1}
        />
      </Form.Item>

      <Form.Item 
        label="Script Filename" 
        required
        help="Name of the script file in Espanso's scripts directory"
      >
        <Input
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="example.py"
        />
      </Form.Item>

      <Form.Item 
        label="Script Arguments" 
        help="Arguments to pass to the script"
      >
        <List
          dataSource={args}
          renderItem={(arg, index) => (
            <List.Item
              actions={[
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeArg(index)}
                />
              ]}
            >
              <Input
                value={arg}
                onChange={(e) => updateArg(index, e.target.value)}
                placeholder={`Argument ${index + 1}`}
                style={{ width: '100%' }}
              />
            </List.Item>
          )}
        />
        <Button
          type="dashed"
          onClick={addArg}
          icon={<PlusOutlined />}
          style={{ width: '100%', marginTop: 8 }}
        >
          Add Argument
        </Button>
      </Form.Item>

      <Form.Item>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Text type="secondary">Preview:</Text>
          <div style={{ 
            padding: '8px 12px', 
            background: 'var(--color-bg-secondary)', 
            borderRadius: 4,
            fontFamily: 'monospace',
            fontSize: '12px',
            overflowX: 'auto'
          }}>
            {`{{script interpreter="${interpreter}" script="${script}"${
              args.length ? ` args="${args.join(' ')}"` : ''
            }}}`}
          </div>
        </Space>
      </Form.Item>

      <Alert
        message="Script Location"
        description={
          <Space direction="vertical" size="small">
            <Text>Scripts must be placed in one of these directories:</Text>
            <Text code>~/.config/espanso/scripts/</Text>
            <Text code>~/Library/Application Support/espanso/scripts/</Text>
            <Text type="secondary">The script output will replace the trigger text.</Text>
          </Space>
        }
        type="warning"
        showIcon
      />

      <Alert
        message="Security Note"
        description="Scripts have full system access. Only use scripts from trusted sources."
        type="error"
        showIcon
        style={{ marginTop: 16 }}
      />
    </Form>
  );
};