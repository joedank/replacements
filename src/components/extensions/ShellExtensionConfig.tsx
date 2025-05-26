import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Alert, Typography, Space, Switch } from 'antd';
import type { ShellExtension } from '../../types/extensions';

const { TextArea } = Input;
const { Text } = Typography;

interface ShellExtensionConfigProps {
  extension?: ShellExtension;
  onChange: (extension: ShellExtension) => void;
  onVariableNameChange: (name: string) => void;
}

const commonShells = [
  { value: 'bash', label: 'Bash' },
  { value: 'sh', label: 'Shell (sh)' },
  { value: 'zsh', label: 'Z Shell (zsh)' },
  { value: 'powershell', label: 'PowerShell' },
  { value: 'cmd', label: 'Command Prompt (cmd)' },
];

export const ShellExtensionConfig: React.FC<ShellExtensionConfigProps> = ({
  extension,
  onChange,
  onVariableNameChange
}) => {
  const [variableName, setVariableName] = useState(extension?.name || 'shell_output');
  const [cmd, setCmd] = useState(extension?.params.cmd || '');
  const [shell, setShell] = useState(extension?.params.shell || undefined);
  const [trim, setTrim] = useState(extension?.params.trim !== false);

  useEffect(() => {
    onVariableNameChange(variableName);
  }, [variableName, onVariableNameChange]);

  useEffect(() => {
    onChange({
      name: variableName,
      type: 'shell',
      params: {
        cmd,
        shell,
        trim
      }
    });
  }, [variableName, cmd, shell, trim, onChange]);

  return (
    <Form layout="vertical">
      <Alert
        message="Shell Extension"
        description="Executes a shell command and inserts its output. Use with caution as commands have system access."
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
          placeholder="shell_output"
          addonBefore="{{"
          addonAfter="}}"
        />
      </Form.Item>

      <Form.Item 
        label="Shell Command" 
        required
        help="The command to execute in the shell"
      >
        <TextArea
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          placeholder="echo 'Hello, World!' | tr '[:lower:]' '[:upper:]'"
          rows={3}
          style={{ fontFamily: 'monospace' }}
        />
      </Form.Item>

      <Form.Item 
        label="Shell Type" 
        help="Specify which shell to use (optional)"
      >
        <Select
          value={shell}
          onChange={(value) => setShell(value)}
          options={commonShells}
          allowClear
          placeholder="Default system shell"
        />
      </Form.Item>

      <Form.Item label="Trim Output">
        <Space>
          <Switch
            checked={trim}
            onChange={(checked) => setTrim(checked)}
          />
          <Text type="secondary">Remove leading/trailing whitespace from output</Text>
        </Space>
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
            {`{{shell cmd="${cmd.replace(/"/g, '\\"')}"${
              shell ? ` shell="${shell}"` : ''
            }${
              !trim ? ' trim="false"' : ''
            }}}`}
          </div>
        </Space>
      </Form.Item>

      <Alert
        message="Common Use Cases"
        description={
          <Space direction="vertical" size="small">
            <Text>• Get current date/time: <Text code>date +%Y-%m-%d</Text></Text>
            <Text>• Get username: <Text code>whoami</Text></Text>
            <Text>• Get working directory: <Text code>pwd</Text></Text>
            <Text>• Get git branch: <Text code>git branch --show-current</Text></Text>
          </Space>
        }
        type="success"
        showIcon
      />

      <Alert
        message="Security Warning"
        description="Shell commands have full system access. Never use untrusted commands or user input in shell commands."
        type="error"
        showIcon
        style={{ marginTop: 16 }}
      />
    </Form>
  );
};