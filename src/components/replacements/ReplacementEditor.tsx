import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Space, Typography, message, Empty, Spin } from 'antd';
import { SaveOutlined, DeleteOutlined } from '@ant-design/icons';
import { useReplacements } from '../../contexts/ReplacementContext';

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

  // Update form when selection changes
  useEffect(() => {
    if (selectedReplacement) {
      form.setFieldsValue({
        trigger: selectedReplacement.replacement.trigger,
        replace: selectedReplacement.replacement.replace,
      });
      setHasChanges(false);
    } else {
      form.resetFields();
    }
  }, [selectedReplacement, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await updateReplacement(values.trigger, values.replace);
      message.success('Replacement saved successfully!');
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

  const handleFormChange = () => {
    setHasChanges(true);
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
              rows={10}
              placeholder="Enter the text that will replace the trigger..."
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Form.Item>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Tip: Use \n for line breaks, $|$ for cursor position, and {`{{date}}`} for dynamic variables
            </Text>
          </Form.Item>
        </Form>
      </Spin>
    </Card>
  );
};