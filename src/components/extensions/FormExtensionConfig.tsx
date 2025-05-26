import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Alert, Typography, Space, Button, List, Card, Switch, InputNumber, Collapse } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import type { FormExtension, FormField } from '../../types/extensions';

const { Text } = Typography;
const { Panel } = Collapse;

interface FormExtensionConfigProps {
  extension?: FormExtension;
  onChange: (extension: FormExtension) => void;
  onVariableNameChange: (name: string) => void;
}

const fieldTypes = [
  { value: 'text', label: 'Text Input' },
  { value: 'multiline', label: 'Multiline Text' },
  { value: 'choice', label: 'Dropdown Choice' },
  { value: 'list', label: 'List Selection' },
];

export const FormExtensionConfig: React.FC<FormExtensionConfigProps> = ({
  extension,
  onChange,
  onVariableNameChange
}) => {
  const [variableName, setVariableName] = useState(extension?.name || 'form');
  const [title, setTitle] = useState(extension?.params.title || '');
  const [fields, setFields] = useState<FormField[]>(extension?.params.fields || []);

  useEffect(() => {
    onVariableNameChange(variableName);
  }, [variableName, onVariableNameChange]);

  useEffect(() => {
    onChange({
      name: variableName,
      type: 'form',
      params: {
        title,
        fields
      }
    });
  }, [variableName, title, fields, onChange]);

  const addField = () => {
    const newField: FormField = {
      name: `field_${fields.length + 1}`,
      type: 'text',
      label: 'New Field'
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    setFields(newFields);
  };

  const addChoice = (fieldIndex: number) => {
    const field = fields[fieldIndex];
    if (!field) return;
    
    const newChoices = [...(field.choices || []), ''];
    updateField(fieldIndex, { choices: newChoices });
  };

  const updateChoice = (fieldIndex: number, choiceIndex: number, newValue: string) => {
    const field = fields[fieldIndex];
    if (!field) return;
    
    const newChoices = [...(field.choices || [])];
    newChoices[choiceIndex] = newValue;
    updateField(fieldIndex, { choices: newChoices });
  };

  const removeChoice = (fieldIndex: number, choiceIndex: number) => {
    const field = fields[fieldIndex];
    if (!field) return;
    
    const newChoices = (field.choices || []).filter((_, i) => i !== choiceIndex);
    updateField(fieldIndex, { choices: newChoices });
  };

  return (
    <Form layout="vertical">
      <Alert
        message="Form Extension"
        description="Creates an interactive form dialog that collects user input before inserting the replacement."
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
          placeholder="form"
          addonBefore="{{"
          addonAfter="}}"
        />
      </Form.Item>

      <Form.Item 
        label="Form Title" 
        help="Title displayed at the top of the form dialog"
      >
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter form details"
        />
      </Form.Item>

      <Form.Item 
        label="Form Fields" 
        required
        help="Define the fields that will appear in the form"
      >
        <Collapse accordion>
          {fields.map((field, index) => (
            <Panel
              key={index}
              header={
                <Space>
                  <Text strong>{field.label || field.name}</Text>
                  <Text type="secondary">({field.type})</Text>
                </Space>
              }
              extra={
                <Space onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="text"
                    size="small"
                    icon={<ArrowUpOutlined />}
                    onClick={() => moveField(index, 'up')}
                    disabled={index === 0}
                  />
                  <Button
                    type="text"
                    size="small"
                    icon={<ArrowDownOutlined />}
                    onClick={() => moveField(index, 'down')}
                    disabled={index === fields.length - 1}
                  />
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeField(index)}
                  />
                </Space>
              }
            >
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Input
                  value={field.name}
                  onChange={(e) => updateField(index, { name: e.target.value })}
                  placeholder="Variable name (e.g., username)"
                  addonBefore="Name"
                />
                
                <Input
                  value={field.label || ''}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  placeholder="Display label"
                  addonBefore="Label"
                />
                
                <Select
                  value={field.type}
                  onChange={(type) => updateField(index, { type: type as FormField['type'] })}
                  options={fieldTypes}
                  style={{ width: '100%' }}
                />

                {field.type === 'text' && (
                  <>
                    <Input
                      value={field.default || ''}
                      onChange={(e) => updateField(index, { default: e.target.value })}
                      placeholder="Default value"
                      addonBefore="Default"
                    />
                    <Space>
                      <Switch
                        checked={field.multiline}
                        onChange={(multiline) => updateField(index, { multiline })}
                      />
                      <Text>Multiline</Text>
                    </Space>
                  </>
                )}

                {field.type === 'multiline' && (
                  <>
                    <Input.TextArea
                      value={field.default || ''}
                      onChange={(e) => updateField(index, { default: e.target.value })}
                      placeholder="Default value"
                      rows={2}
                    />
                    <InputNumber
                      value={field.rows}
                      onChange={(rows) => updateField(index, { rows: rows as number | undefined })}
                      placeholder="Number of rows"
                      min={1}
                      max={20}
                      style={{ width: '100%' }}
                      addonBefore="Rows"
                    />
                  </>
                )}

                {(field.type === 'choice' || field.type === 'list') && (
                  <Card title="Options" size="small">
                    <List
                      dataSource={field.choices || []}
                      renderItem={(choice, choiceIndex) => (
                        <List.Item
                          actions={[
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={() => removeChoice(index, choiceIndex)}
                            />
                          ]}
                        >
                          <Input
                            value={choice}
                            onChange={(e) => updateChoice(index, choiceIndex, e.target.value)}
                            placeholder={`Option ${choiceIndex + 1}`}
                            size="small"
                            style={{ width: '100%' }}
                          />
                        </List.Item>
                      )}
                    />
                    <Button
                      type="dashed"
                      onClick={() => addChoice(index)}
                      icon={<PlusOutlined />}
                      size="small"
                      style={{ width: '100%', marginTop: 8 }}
                    >
                      Add Option
                    </Button>
                  </Card>
                )}
              </Space>
            </Panel>
          ))}
        </Collapse>
        
        <Button
          type="dashed"
          onClick={addField}
          icon={<PlusOutlined />}
          style={{ width: '100%', marginTop: 16 }}
        >
          Add Field
        </Button>
      </Form.Item>

      <Form.Item>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Text type="secondary">Usage in replacement:</Text>
          <div style={{ 
            padding: '8px 12px', 
            background: 'var(--color-bg-secondary)', 
            borderRadius: 4,
            fontFamily: 'monospace',
            fontSize: '12px'
          }}>
            {fields.map(field => (
              <div key={field.name}>{`{{${field.name}}}`}</div>
            ))}
          </div>
        </Space>
      </Form.Item>

      <Alert
        message="How Forms Work"
        description={
          <Space direction="vertical" size="small">
            <Text>1. When the trigger is typed, a form dialog appears</Text>
            <Text>2. User fills in the form fields</Text>
            <Text>3. Field values are available as variables in the replacement</Text>
            <Text>4. Use {`{{field_name}}`} to insert field values</Text>
          </Space>
        }
        type="success"
        showIcon
      />
    </Form>
  );
};