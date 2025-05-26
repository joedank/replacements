import React, { useEffect } from 'react';
import { Form, Alert, Typography, Space } from 'antd';
import type { ClipboardExtension } from '../../types/extensions';

const { Text } = Typography;

interface ClipboardExtensionConfigProps {
  onChange: (extension: ClipboardExtension) => void;
  onVariableNameChange: (name: string) => void;
}

export const ClipboardExtensionConfig: React.FC<ClipboardExtensionConfigProps> = ({
  onChange,
  onVariableNameChange
}) => {
  // Clipboard extension doesn't need configuration, just insert {{clipboard}}
  useEffect(() => {
    onChange({
      name: 'clipboard',
      type: 'clipboard',
      params: {}
    });
    onVariableNameChange('clipboard');
  }, [onChange, onVariableNameChange]);
  return (
    <Form layout="vertical">
      <Alert
        message="Clipboard Extension"
        description="Inserts the current clipboard content at the cursor position."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form.Item>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Text strong>How it works:</Text>
          <Text type="secondary">
            When triggered, this extension will paste whatever is currently in your clipboard.
            This is useful for creating replacements that transform or wrap clipboard content.
          </Text>
        </Space>
      </Form.Item>

      <Form.Item>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Text type="secondary">Syntax:</Text>
          <div style={{ 
            padding: '8px 12px', 
            background: 'var(--color-bg-secondary)', 
            borderRadius: 4,
            fontFamily: 'monospace'
          }}>
            {'{{clipboard}}'}
          </div>
        </Space>
      </Form.Item>

      <Alert
        message="Example Usage"
        description={
          <Space direction="vertical" size="small">
            <Text>Create a markdown link wrapper:</Text>
            <Text code>{'[{{clipboard}}]({{clipboard}})'}</Text>
            <Text type="secondary">
              With "https://example.com" in clipboard → [https://example.com](https://example.com)
            </Text>
          </Space>
        }
        type="success"
        showIcon
      />

      <Alert
        message="Pro Tip"
        description="Combine with other extensions or text to create powerful transformations of clipboard content."
        type="warning"
        showIcon
        style={{ marginTop: 16 }}
      />
    </Form>
  );
};