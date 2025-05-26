import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  Space,
  Typography,
  Card,
  List,
  Switch,
  Divider,
  Empty,
  message,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  UnorderedListOutlined,
  DragOutlined,
} from '@ant-design/icons';
import { ChoiceExtension, ChoiceValue } from '../../types/extensions';

const { Text } = Typography;

interface ChoiceExtensionConfigProps {
  extension?: ChoiceExtension;
  onChange: (extension: ChoiceExtension) => void;
  onVariableNameChange: (name: string) => void;
}

export const ChoiceExtensionConfig: React.FC<ChoiceExtensionConfigProps> = ({
  extension,
  onChange,
  onVariableNameChange,
}) => {
  const [form] = Form.useForm();
  const [choiceForm] = Form.useForm();
  const [values, setValues] = useState<(string | ChoiceValue)[]>(
    extension?.params.values || []
  );
  const [useAdvanced, setUseAdvanced] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    // Check if any value has an ID to determine if advanced mode should be on
    const hasAdvanced = values.some(v => typeof v === 'object' && v.id);
    setUseAdvanced(hasAdvanced);
  }, []);

  useEffect(() => {
    const ext: ChoiceExtension = {
      name: form.getFieldValue('name') || 'choice',
      type: 'choice',
      params: {
        values,
      },
    };
    onChange(ext);
  }, [values, form, onChange]);

  const handleAddChoice = () => {
    choiceForm.validateFields().then(formValues => {
      const newChoice = useAdvanced
        ? { label: formValues.label, id: formValues.id || formValues.label }
        : formValues.label;

      if (editingIndex !== null) {
        const newValues = [...values];
        newValues[editingIndex] = newChoice;
        setValues(newValues);
        setEditingIndex(null);
      } else {
        setValues([...values, newChoice]);
      }
      
      choiceForm.resetFields();
      message.success(editingIndex !== null ? 'Choice updated' : 'Choice added');
    }).catch(() => {
      message.error('Please fill in the required fields');
    });
  };

  const handleEditChoice = (index: number) => {
    const value = values[index];
    if (typeof value === 'string') {
      choiceForm.setFieldsValue({ label: value });
    } else {
      choiceForm.setFieldsValue({ label: value.label, id: value.id });
    }
    setEditingIndex(index);
  };

  const handleDeleteChoice = (index: number) => {
    const newValues = values.filter((_, i) => i !== index);
    setValues(newValues);
    message.success('Choice removed');
  };

  const handleMoveChoice = (index: number, direction: 'up' | 'down') => {
    const newValues = [...values];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < values.length) {
      [newValues[index], newValues[newIndex]] = [newValues[newIndex], newValues[index]];
      setValues(newValues);
    }
  };

  const convertToAdvanced = () => {
    const newValues = values.map(v => 
      typeof v === 'string' ? { label: v, id: v } : v
    );
    setValues(newValues);
    setUseAdvanced(true);
  };

  const convertToSimple = () => {
    const newValues = values.map(v => 
      typeof v === 'object' ? v.label : v
    );
    setValues(newValues);
    setUseAdvanced(false);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        name: extension?.name || 'choice',
      }}
      onValuesChange={(_, values) => {
        if (values.name) {
          onVariableNameChange(values.name);
        }
      }}
    >
      <Form.Item
        name="name"
        label="Variable Name"
        rules={[{ required: true, message: 'Please enter a variable name' }]}
      >
        <Input
          placeholder="e.g., options, selection, menu"
          prefix={<UnorderedListOutlined />}
        />
      </Form.Item>

      <Card 
        title="Choice Options" 
        size="small"
        extra={
          <Space>
            <Text type="secondary">Advanced Mode</Text>
            <Switch
              checked={useAdvanced}
              onChange={(checked) => {
                if (checked) {
                  convertToAdvanced();
                } else {
                  convertToSimple();
                }
              }}
            />
          </Space>
        }
      >
        <Form form={choiceForm} layout="vertical">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Form.Item
                name="label"
                label="Choice Label"
                style={{ marginBottom: 0, flex: 1 }}
                rules={[{ required: true, message: 'Please enter a label' }]}
              >
                <Input placeholder="Enter choice text" />
              </Form.Item>
              
              {useAdvanced && (
                <Form.Item
                  name="id"
                  label="Choice ID"
                  style={{ marginBottom: 0, flex: 1 }}
                  help="Optional: Different value when selected"
                >
                  <Input placeholder="Enter ID (optional)" />
                </Form.Item>
              )}
              
              <Form.Item label=" " style={{ marginBottom: 0 }}>
                <Space>
                  <Button
                    type="primary"
                    icon={editingIndex !== null ? <EditOutlined /> : <PlusOutlined />}
                    onClick={handleAddChoice}
                  >
                    {editingIndex !== null ? 'Update' : 'Add'}
                  </Button>
                  
                  {editingIndex !== null && (
                    <Button
                      onClick={() => {
                        setEditingIndex(null);
                        choiceForm.resetFields();
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </Space>
              </Form.Item>
            </div>
            
            {useAdvanced && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                In advanced mode, you can specify different IDs for each choice. 
                The label is shown to users, while the ID is the actual value inserted.
              </Text>
            )}
          </Space>
        </Form>

        <Divider />

        {values.length === 0 ? (
          <Empty description="No choices added yet" />
        ) : (
          <List
            dataSource={values}
            renderItem={(item, index) => (
              <List.Item
                actions={[
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleEditChoice(index)}
                  />,
                  <Popconfirm
                    title="Delete this choice?"
                    onConfirm={() => handleDeleteChoice(index)}
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                    />
                  </Popconfirm>,
                  <Button
                    type="text"
                    size="small"
                    icon={<DragOutlined />}
                    disabled={index === 0}
                    onClick={() => handleMoveChoice(index, 'up')}
                  />,
                  <Button
                    type="text"
                    size="small"
                    icon={<DragOutlined style={{ transform: 'rotate(180deg)' }} />}
                    disabled={index === values.length - 1}
                    onClick={() => handleMoveChoice(index, 'down')}
                  />,
                ]}
              >
                {typeof item === 'string' ? (
                  <Text>{item}</Text>
                ) : (
                  <Space>
                    <Text>{item.label}</Text>
                    {item.id !== item.label && (
                      <>
                        <Text type="secondary">→</Text>
                        <Text code>{item.id}</Text>
                      </>
                    )}
                  </Space>
                )}
              </List.Item>
            )}
          />
        )}

        <div style={{ marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            When triggered, Espanso will show a dialog with these choices. 
            The selected value will replace the variable.
          </Text>
        </div>
      </Card>
    </Form>
  );
};