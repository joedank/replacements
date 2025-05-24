import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Popconfirm,
  message,
  Typography,
  Tag,
} from 'antd';
import { invoke } from '@tauri-apps/api/core';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  CodeOutlined,
  RobotOutlined,
  ToolOutlined,
  ApiOutlined,
  DatabaseOutlined,
  CloudOutlined,
  ExperimentOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  FireOutlined,
  RocketOutlined,
  StarOutlined,
  HeartOutlined,
  SmileOutlined,
  TrophyOutlined,
  FlagOutlined,
  BookOutlined,
  FolderOutlined,
  TagOutlined,
  PushpinOutlined,
  MailOutlined,
  NotificationOutlined,
  SettingOutlined,
  SafetyOutlined,
  LockOutlined,
  KeyOutlined,
  GlobalOutlined,
  EnvironmentOutlined,
  DesktopOutlined,
  MobileOutlined,
  TabletOutlined,
  LaptopOutlined,
  CoffeeOutlined,
  TeamOutlined,
  UserOutlined,
  SolutionOutlined,
  BugOutlined,
  AlertOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface Category {
  id: string;
  name: string;
  fileName: string;
  description?: string;
  icon: string;
  color?: string;
  isDefault?: boolean;
}

// Available icons for selection
const AVAILABLE_ICONS = [
  { name: 'FileTextOutlined', icon: <FileTextOutlined />, label: 'File Text' },
  { name: 'CodeOutlined', icon: <CodeOutlined />, label: 'Code' },
  { name: 'RobotOutlined', icon: <RobotOutlined />, label: 'Robot' },
  { name: 'ToolOutlined', icon: <ToolOutlined />, label: 'Tool' },
  { name: 'ApiOutlined', icon: <ApiOutlined />, label: 'API' },
  { name: 'DatabaseOutlined', icon: <DatabaseOutlined />, label: 'Database' },
  { name: 'CloudOutlined', icon: <CloudOutlined />, label: 'Cloud' },
  { name: 'ExperimentOutlined', icon: <ExperimentOutlined />, label: 'Experiment' },
  { name: 'BulbOutlined', icon: <BulbOutlined />, label: 'Bulb' },
  { name: 'ThunderboltOutlined', icon: <ThunderboltOutlined />, label: 'Thunderbolt' },
  { name: 'FireOutlined', icon: <FireOutlined />, label: 'Fire' },
  { name: 'RocketOutlined', icon: <RocketOutlined />, label: 'Rocket' },
  { name: 'StarOutlined', icon: <StarOutlined />, label: 'Star' },
  { name: 'HeartOutlined', icon: <HeartOutlined />, label: 'Heart' },
  { name: 'SmileOutlined', icon: <SmileOutlined />, label: 'Smile' },
  { name: 'TrophyOutlined', icon: <TrophyOutlined />, label: 'Trophy' },
  { name: 'FlagOutlined', icon: <FlagOutlined />, label: 'Flag' },
  { name: 'BookOutlined', icon: <BookOutlined />, label: 'Book' },
  { name: 'FolderOutlined', icon: <FolderOutlined />, label: 'Folder' },
  { name: 'TagOutlined', icon: <TagOutlined />, label: 'Tag' },
  { name: 'PushpinOutlined', icon: <PushpinOutlined />, label: 'Pushpin' },
  { name: 'MailOutlined', icon: <MailOutlined />, label: 'Mail' },
  { name: 'NotificationOutlined', icon: <NotificationOutlined />, label: 'Notification' },
  { name: 'SettingOutlined', icon: <SettingOutlined />, label: 'Setting' },
  { name: 'SafetyOutlined', icon: <SafetyOutlined />, label: 'Safety' },
  { name: 'LockOutlined', icon: <LockOutlined />, label: 'Lock' },
  { name: 'KeyOutlined', icon: <KeyOutlined />, label: 'Key' },
  { name: 'GlobalOutlined', icon: <GlobalOutlined />, label: 'Global' },
  { name: 'EnvironmentOutlined', icon: <EnvironmentOutlined />, label: 'Environment' },
  { name: 'DesktopOutlined', icon: <DesktopOutlined />, label: 'Desktop' },
  { name: 'MobileOutlined', icon: <MobileOutlined />, label: 'Mobile' },
  { name: 'TabletOutlined', icon: <TabletOutlined />, label: 'Tablet' },
  { name: 'LaptopOutlined', icon: <LaptopOutlined />, label: 'Laptop' },
  { name: 'CoffeeOutlined', icon: <CoffeeOutlined />, label: 'Coffee' },
  { name: 'TeamOutlined', icon: <TeamOutlined />, label: 'Team' },
  { name: 'UserOutlined', icon: <UserOutlined />, label: 'User' },
  { name: 'SolutionOutlined', icon: <SolutionOutlined />, label: 'Solution' },
  { name: 'BugOutlined', icon: <BugOutlined />, label: 'Bug' },
  { name: 'AlertOutlined', icon: <AlertOutlined />, label: 'Alert' },
  { name: 'QuestionCircleOutlined', icon: <QuestionCircleOutlined />, label: 'Question' },
  { name: 'CheckCircleOutlined', icon: <CheckCircleOutlined />, label: 'Check' },
  { name: 'CloseCircleOutlined', icon: <CloseCircleOutlined />, label: 'Close' },
  { name: 'InfoCircleOutlined', icon: <InfoCircleOutlined />, label: 'Info' },
  { name: 'WarningOutlined', icon: <WarningOutlined />, label: 'Warning' },
];

export const CategorySettings: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await invoke<Category[]>('get_categories');
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      message.error(`Failed to load categories: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    form.setFieldsValue(category);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await invoke('delete_category', { id });
      await loadCategories();
      message.success('Category deleted successfully');
    } catch (error) {
      message.error('Failed to delete category');
      console.error('Error deleting category:', error);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingCategory) {
        await invoke('update_category', { id: editingCategory.id, updates: values });
        message.success('Category updated successfully');
      } else {
        // Generate file name from category name
        const fileName = values.name.toLowerCase().replace(/\s+/g, '_') + '.yml';
        const newCategory: Category = {
          ...values,
          id: Date.now().toString(),
          fileName,
          isDefault: false,
        };
        await invoke('create_category', { category: newCategory });
        message.success('Category created successfully');
      }
      await loadCategories();
      setIsModalOpen(false);
    } catch (error) {
      message.error('Failed to save category');
      console.error('Error saving category:', error);
    }
  };

  const getIconComponent = (iconName: string) => {
    const iconData = AVAILABLE_ICONS.find(i => i.name === iconName);
    return iconData ? iconData.icon : <FileTextOutlined />;
  };

  const columns: ColumnsType<Category> = [
    {
      title: 'Icon',
      dataIndex: 'icon',
      key: 'icon',
      width: 80,
      render: (icon: string) => (
        <span style={{ fontSize: '24px' }}>
          {getIconComponent(icon)}
        </span>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record) => (
        <Space>
          <Text strong>{text}</Text>
          {record.isDefault && <Tag color="blue">Default</Tag>}
        </Space>
      ),
    },
    {
      title: 'File Name',
      dataIndex: 'fileName',
      key: 'fileName',
      render: (fileName: string) => (
        <Text code>{fileName}</Text>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            disabled={record.isDefault}
          />
          <Popconfirm
            title="Delete Category"
            description="Are you sure you want to delete this category?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              disabled={record.isDefault}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>Replacement Categories</Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            New Category
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={categories}
          loading={loading}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Modal
        title={editingCategory ? 'Edit Category' : 'Create Category'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Category Name"
            rules={[
              { required: true, message: 'Please enter category name' },
              { pattern: /^[a-zA-Z0-9\s]+$/, message: 'Only letters, numbers, and spaces allowed' }
            ]}
          >
            <Input placeholder="e.g., Development Tools" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Brief description of this category"
            />
          </Form.Item>

          <Form.Item
            name="icon"
            label="Icon"
            rules={[{ required: true, message: 'Please select an icon' }]}
          >
            <Select
              placeholder="Select an icon"
              showSearch
              optionFilterProp="label"
            >
              {AVAILABLE_ICONS.map(({ name, icon, label }) => (
                <Select.Option key={name} value={name} label={label}>
                  <Space>
                    {icon}
                    <span>{label}</span>
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingCategory ? 'Update' : 'Create'}
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