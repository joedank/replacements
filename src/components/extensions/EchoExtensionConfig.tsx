import React, { useState, useEffect } from 'react';
import { Form, Input, Alert, Typography, Space } from 'antd';
import type { EchoExtension } from '../../types/extensions';

const { TextArea } = Input;
const { Text: AntText } = Typography;

interface EchoExtensionConfigProps {
  extension?: EchoExtension;
  onChange: (extension: EchoExtension) => void;
  onVariableNameChange: (name: string) => void;
}

export const EchoExtensionConfig: React.FC<EchoExtensionConfigProps> = ({
  extension,
  onChange,
  onVariableNameChange
}) => {
  const [variableName, setVariableName] = useState(extension?.name || 'echo_text');
  const [echoText, setEchoText] = useState(extension?.params.echo || '');

  useEffect(() => {
    onVariableNameChange(variableName);
  }, [variableName, onVariableNameChange]);

  useEffect(() => {
    onChange({
      name: variableName,
      type: 'echo',
      params: {
        echo: echoText
      }
    });
  }, [variableName, echoText, onChange]);

  return (
    <Form layout="vertical">
      <Alert
        message="Echo Extension"
        description="Outputs a fixed text value. Useful for escaping special characters or inserting literal text."
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
          placeholder="echo_text"
          addonBefore="{{"
          addonAfter="}}"
        />
      </Form.Item>

      <Form.Item 
        label="Text to Echo" 
        required
        help="This text will be inserted exactly as written, with special characters escaped"
      >
        <TextArea
          value={echoText}
          onChange={(e) => setEchoText(e.target.value)}
          placeholder="Enter the text to echo..."
          rows={4}
        />
      </Form.Item>

      <Form.Item>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <AntText type="secondary">Preview:</AntText>
          <div style={{ 
            padding: '8px 12px', 
            background: 'var(--color-bg-secondary)', 
            borderRadius: 4,
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}>
            {`{{echo "${echoText.replace(/"/g, '\\"')}"}}`}
          </div>
        </Space>
      </Form.Item>

      <Alert
        message="Use Cases"
        description={
          <Space direction="vertical" size="small">
            <AntText>• Insert text with special Espanso characters like {'{{ or $'}</AntText>
            <AntText>• Preserve exact formatting and whitespace</AntText>
            <AntText>• Insert code snippets without variable expansion</AntText>
          </Space>
        }
        type="success"
        showIcon
      />

      <Alert
        message="Note"
        description="The echo extension is particularly useful when you need to insert text that contains Espanso syntax characters without them being interpreted as variables."
        type="warning"
        showIcon
        style={{ marginTop: 16 }}
      />
    </Form>
  );
};