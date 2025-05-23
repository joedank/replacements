import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Button,
  Input,
  Space,
  Typography,
  Empty,
  Modal,
  Form,
  message,
  Tooltip,
  Badge,
  Dropdown,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  CodeOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import type { MenuProps } from 'antd';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Search } = Input;

interface Replacement {
  trigger: string;
  replace: string;
  source: string;
}

interface Category {
  id: string;
  name: string;
  fileName: string;
  description?: string;
  icon: string;
  color?: string;
  isDefault?: boolean;
}

interface CategoryReplacementsProps {
  categoryId: string;
}

export const CategoryReplacements: React.FC<CategoryReplacementsProps> = ({ categoryId }) => {
  const [category, setCategory] = useState<Category | null>(null);
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [filteredReplacements, setFilteredReplacements] = useState<Replacement[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReplacement, setEditingReplacement] = useState<Replacement | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadCategoryAndReplacements();
  }, [categoryId]);

  useEffect(() => {
    // Filter replacements based on search text
    if (searchText) {
      const filtered = replacements.filter(r => 
        r.trigger.toLowerCase().includes(searchText.toLowerCase()) ||
        r.replace.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredReplacements(filtered);
    } else {
      setFilteredReplacements(replacements);
    }
  }, [searchText, replacements]);

  const loadCategoryAndReplacements = async () => {
    setLoading(true);
    try {
      // Load category info
      const categories = await invoke<Category[]>('get_categories');
      const cat = categories.find(c => c.id === categoryId);
      if (cat) {
        setCategory(cat);
        
        // Load replacements for this category
        const filePath = `/Volumes/4TB/Users/josephmcmyne/Library/Application Support/espanso/match/${cat.fileName}`;
        const data = await invoke<Replacement[]>('read_espanso_file', { filePath });
        setReplacements(data);
      }
    } catch (error) {
      console.error('Failed to load category replacements:', error);
      message.error('Failed to load replacements');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingReplacement(null);
    setEditingIndex(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (replacement: Replacement, index: number) => {
    setEditingReplacement(replacement);
    setEditingIndex(index);
    form.setFieldsValue({
      trigger: replacement.trigger,
      replace: replacement.replace,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (index: number) => {
    Modal.confirm({
      title: 'Delete Replacement',
      content: 'Are you sure you want to delete this replacement?',
      onOk: async () => {
        try {
          const newReplacements = [...replacements];
          newReplacements.splice(index, 1);
          
          await invoke('write_espanso_file', {
            filePath: replacements[0]?.source || `/Volumes/4TB/Users/josephmcmyne/Library/Application Support/espanso/match/${category?.fileName}`,
            replacements: newReplacements,
          });
          
          setReplacements(newReplacements);
          message.success('Replacement deleted successfully');
        } catch (error) {
          message.error('Failed to delete replacement');
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      const newReplacements = [...replacements];
      
      if (editingIndex !== null) {
        // Update existing
        newReplacements[editingIndex] = {
          ...newReplacements[editingIndex],
          trigger: values.trigger,
          replace: values.replace,
        };
      } else {
        // Create new
        const filePath = `/Volumes/4TB/Users/josephmcmyne/Library/Application Support/espanso/match/${category?.fileName}`;
        newReplacements.push({
          trigger: values.trigger,
          replace: values.replace,
          source: filePath,
        });
      }
      
      await invoke('write_espanso_file', {
        filePath: newReplacements[0]?.source || `/Volumes/4TB/Users/josephmcmyne/Library/Application Support/espanso/match/${category?.fileName}`,
        replacements: newReplacements,
      });
      
      setReplacements(newReplacements);
      setIsModalOpen(false);
      message.success(editingIndex !== null ? 'Replacement updated' : 'Replacement created');
    } catch (error) {
      message.error('Failed to save replacement');
    }
  };

  const handleCopy = (replacement: Replacement) => {
    navigator.clipboard.writeText(replacement.trigger);
    message.success('Trigger copied to clipboard');
  };

  const getDropdownItems = (replacement: Replacement, index: number): MenuProps['items'] => [
    {
      key: 'edit',
      label: 'Edit',
      icon: <EditOutlined />,
      onClick: () => handleEdit(replacement, index),
    },
    {
      key: 'copy',
      label: 'Copy Trigger',
      icon: <CopyOutlined />,
      onClick: () => handleCopy(replacement),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => handleDelete(index),
    },
  ];

  if (!category) {
    return (
      <div style={{ padding: '24px' }}>
        <Empty description="Category not found" />
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '24px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Card 
        style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        bodyStyle={{
          padding: '24px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Title level={4} style={{ margin: 0 }}>{category.name} Replacements</Title>
                {category.description && (
                  <Text type="secondary">{category.description}</Text>
                )}
              </div>
              <Space>
                <Search
                  placeholder="Search replacements..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 300 }}
                  allowClear
                />
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                  New Replacement
                </Button>
              </Space>
            </div>
            <div>
              <Text type="secondary">
                File: <Text code>{category.fileName}</Text> • 
                Total: <Badge count={replacements.length} showZero style={{ backgroundColor: '#52c41a' }} />
              </Text>
            </div>
          </Space>
        </div>

        {filteredReplacements.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              searchText ? 'No replacements found' : 'No replacements yet'
            }
          >
            {!searchText && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                Create First Replacement
              </Button>
            )}
          </Empty>
        ) : (
          <div 
            className="custom-scrollbar"
            style={{ 
              flex: 1, 
              overflow: 'auto',
              marginTop: '16px',
              paddingRight: '4px',
            }}>
            <List
              loading={loading}
              itemLayout="horizontal"
              dataSource={filteredReplacements}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} replacements`,
                pageSizeOptions: ['10', '20', '50', '100']
              }}
              renderItem={(replacement, index) => (
              <List.Item
                actions={[
                  <Dropdown
                    menu={{ items: getDropdownItems(replacement, index) }}
                    trigger={['click']}
                  >
                    <Button type="text" icon={<MoreOutlined />} />
                  </Dropdown>
                ]}
              >
                <List.Item.Meta
                  avatar={<CodeOutlined style={{ fontSize: '24px', color: '#1890ff' }} />}
                  title={
                    <Space>
                      <Text code strong style={{ fontSize: '16px' }}>
                        {replacement.trigger}
                      </Text>
                      <Tooltip title="Copy trigger">
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => handleCopy(replacement)}
                        />
                      </Tooltip>
                    </Space>
                  }
                  description={
                    <Paragraph
                      ellipsis={{ rows: 2, expandable: true }}
                      style={{ margin: 0, whiteSpace: 'pre-wrap' }}
                    >
                      {replacement.replace}
                    </Paragraph>
                  }
                />
              </List.Item>
            )}
            />
          </div>
        )}
      </Card>

      <Modal
        title={editingReplacement ? 'Edit Replacement' : 'Create Replacement'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="trigger"
            label="Trigger"
            rules={[
              { required: true, message: 'Please enter trigger' },
              { pattern: /^[^\s]+$/, message: 'Trigger cannot contain spaces' }
            ]}
            extra="The text that will trigger the replacement (no spaces allowed)"
          >
            <Input placeholder=":example" prefix=":" />
          </Form.Item>

          <Form.Item
            name="replace"
            label="Replacement Text"
            rules={[{ required: true, message: 'Please enter replacement text' }]}
            extra="The text that will replace the trigger"
          >
            <TextArea
              rows={6}
              placeholder="This is the replacement text"
              showCount
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingReplacement ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};