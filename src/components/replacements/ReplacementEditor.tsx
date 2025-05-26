import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Input, Button, Space, Typography, message, Empty, Spin, Layout } from 'antd';
import { SaveOutlined, DeleteOutlined } from '@ant-design/icons';
import { useReplacements } from '../../contexts/ReplacementContext';
import { InsertionHub } from '../common';

const { TextArea } = Input;
const { Text } = Typography;

export const ReplacementEditor: React.FC = () => {
  const {
    selectedReplacement,
    saving,
    updateReplacement,
    deleteReplacement,
  } = useReplacements();

  const [form] = Form.useForm();
  const [hasChanges, setHasChanges] = useState(false);
  const [originalValues, setOriginalValues] = useState<{ trigger: string; replace: string } | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [lastCursorPosition, setLastCursorPosition] = useState<number>(0);

  // Update form when selection changes
  useEffect(() => {
    if (selectedReplacement) {
      const values = {
        trigger: selectedReplacement.replacement.trigger,
        replace: selectedReplacement.replacement.replace,
      };
      form.setFieldsValue(values);
      setOriginalValues(values);
      setHasChanges(false);
    } else {
      form.resetFields();
      setOriginalValues(null);
    }
  }, [selectedReplacement, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await updateReplacement(values.trigger, values.replace);
      message.success('Replacement saved successfully!');
      // Update original values after successful save
      setOriginalValues(values);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save replacement:', error);
      message.error('Failed to save replacement');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteReplacement();
      message.success('Replacement deleted successfully!');
    } catch (error) {
      console.error('Failed to delete replacement:', error);
      message.error('Failed to delete replacement');
    }
  };

  const handleFormChange = (_: any, allValues: any) => {
    // Only enable save button if values are actually different from originals
    if (originalValues) {
      const hasActualChanges = 
        allValues.trigger !== originalValues.trigger || 
        allValues.replace !== originalValues.replace;
      setHasChanges(hasActualChanges);
    }
  };

  const handleVariableInsert = (variable: string) => {
    const currentValue = form.getFieldValue('replace') || '';
    const textarea = textAreaRef.current;
    
    // Use last cursor position if textarea doesn't have focus
    const start = textarea?.selectionStart ?? lastCursorPosition;
    const end = textarea?.selectionEnd ?? lastCursorPosition;
    
    // Insert at cursor position or at end
    const newValue = 
      currentValue.substring(0, start) + 
      variable + 
      currentValue.substring(end);
    
    form.setFieldsValue({ replace: newValue });
    
    // Set cursor position after inserted text
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const newPosition = start + variable.length;
        textarea.setSelectionRange(newPosition, newPosition);
        setLastCursorPosition(newPosition);
      }
    }, 10);
    
    // Trigger form change detection
    handleFormChange(null, form.getFieldsValue());
  };


  if (!selectedReplacement) {
    return (
      <Card>
        <Empty
          description="Select a trigger from the sidebar to edit"
          style={{ padding: '60px 0' }}
        />
      </Card>
    );
  }

  const categoryColors = {
    global: '#4a00ff',
    base: '#10b981',
    ai: '#f59e0b',
  };

  return (
    <Layout style={{ height: '100%', background: 'transparent' }}>
      <Layout style={{ background: 'transparent' }}>
        <Layout.Content style={{ padding: '24px', overflow: 'auto' }}>
          <Card
          title={
        <Space>
          <Text strong>Edit Replacement</Text>
          <Text
            style={{
              color: categoryColors[selectedReplacement.category],
              fontSize: '14px',
            }}
          >
            ({selectedReplacement.category})
          </Text>
        </Space>
      }
      extra={
        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            disabled={!hasChanges}
            loading={saving}
          >
            Save
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleDelete}
            loading={saving}
          >
            Delete
          </Button>
        </Space>
      }
    >
      <Spin spinning={saving}>
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleFormChange}
        >
          <Form.Item
            name="trigger"
            label="Trigger"
            rules={[
              { required: true, message: 'Please enter a trigger' },
              { min: 2, message: 'Trigger must be at least 2 characters' },
            ]}
          >
            <Input
              placeholder="e.g., :hello, /cmd, #tag"
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Form.Item
            name="replace"
            label="Replacement Text"
            rules={[{ required: true, message: 'Please enter replacement text' }]}
          >
            <TextArea
              ref={textAreaRef}
              rows={10}
              placeholder="Enter the text that will replace the trigger..."
              style={{ fontFamily: 'monospace' }}
              onBlur={(e) => {
                // Store cursor position when textarea loses focus
                setLastCursorPosition(e.target.selectionStart || 0);
              }}
              onFocus={(e) => {
                // Update cursor position when focused
                setLastCursorPosition(e.target.selectionStart || 0);
              }}
              onChange={(e) => {
                // Track cursor position during typing
                setLastCursorPosition(e.target.selectionStart || 0);
              }}
            />
          </Form.Item>

          <Form.Item>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Tip: Use the Insertion Hub sidebar on the right to add variables, extensions, and special characters. 
              Use \n for line breaks and $|$ to set cursor position.
            </Text>
          </Form.Item>
        </Form>
      </Spin>
          </Card>
        </Layout.Content>
        <InsertionHub onInsert={handleVariableInsert} />
      </Layout>
    </Layout>
  );
};