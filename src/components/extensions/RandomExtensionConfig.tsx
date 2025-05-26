import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Space, List, Typography, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { RandomExtension } from '../../types/extensions';

const { Text } = Typography;

interface RandomExtensionConfigProps {
  extension?: RandomExtension;
  onChange: (extension: RandomExtension) => void;
  onVariableNameChange: (name: string) => void;
}

export const RandomExtensionConfig: React.FC<RandomExtensionConfigProps> = ({
  extension,
  onChange,
  onVariableNameChange
}) => {
  const [variableName, setVariableName] = useState(extension?.name || 'random_value');
  const [choices, setChoices] = useState<string[]>(extension?.params.choices || ['Option 1', 'Option 2']);

  useEffect(() => {
    onVariableNameChange(variableName);
  }, [variableName, onVariableNameChange]);

  useEffect(() => {
    onChange({
      name: variableName,
      type: 'random',
      params: {
        choices
      }
    });
  }, [variableName, choices, onChange]);
  const addChoice = () => {
    setChoices([...choices, `Option ${choices.length + 1}`]);
  };

  const updateChoice = (index: number, newValue: string) => {
    const newChoices = [...choices];
    newChoices[index] = newValue;
    setChoices(newChoices);
  };

  const removeChoice = (index: number) => {
    setChoices(choices.filter((_, i) => i !== index));
  };

  return (
    <Form layout="vertical">
      <Alert
        message="Random Extension"
        description="Randomly selects one value from a list of choices each time the replacement is triggered."
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
          placeholder="random_value"
          addonBefore="{{"
          addonAfter="}}"
        />
      </Form.Item>

      <Form.Item 
        label="Choices" 
        required
        help="Add at least 2 choices for random selection"
      >
        <List
          dataSource={choices}
          renderItem={(choice, index) => (
            <List.Item
              actions={[
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeChoice(index)}
                  disabled={choices.length <= 2}
                />
              ]}
            >
              <Input
                value={choice}
                onChange={(e) => updateChoice(index, e.target.value)}
                placeholder={`Choice ${index + 1}`}
                style={{ width: '100%' }}
              />
            </List.Item>
          )}
        />
        <Button
          type="dashed"
          onClick={addChoice}
          icon={<PlusOutlined />}
          style={{ width: '100%', marginTop: 8 }}
        >
          Add Choice
        </Button>
      </Form.Item>

      <Form.Item>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Text type="secondary">Preview:</Text>
          <div style={{ 
            padding: '8px 12px', 
            background: 'var(--color-bg-secondary)', 
            borderRadius: 4,
            fontFamily: 'monospace'
          }}>
            {`{{random choices="${choices.join(', ')}"}}`}
          </div>
        </Space>
      </Form.Item>

      <Alert
        message="Example Output"
        description={`One of: ${choices.join(', ')}`}
        type="success"
        showIcon
      />
    </Form>
  );
};