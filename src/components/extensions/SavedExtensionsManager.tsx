import React, { useState, useMemo } from 'react';
import {
  Modal,
  Table,
  Button,
  Space,
  Input,
  Select,
  Tag,
  Typography,
  Tooltip,
  Popconfirm,
  message,
  Drawer,
  Form,
  Divider,
  Card,
  Upload,
  UploadProps,
} from 'antd';
import {
  StarOutlined,
  StarFilled,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ImportOutlined,
  SearchOutlined,
  FolderOutlined,
  SettingOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  ThunderboltOutlined,
  CopyOutlined,
  MessageOutlined,
  CodeOutlined,
  CodeSandboxOutlined,
  FormOutlined,
} from '@ant-design/icons';
import { useSavedExtensions } from '../../contexts/SavedExtensionsContext';
import { SavedExtension } from '../../types/savedExtensions';
import { ExtensionType, EXTENSION_METADATA } from '../../types/extensions';
import { ColumnsType } from 'antd/es/table';

const { Text } = Typography;
const { Search } = Input;
const { Option } = Select;

interface SavedExtensionsManagerProps {
  visible: boolean;
  onClose: () => void;
}

export const SavedExtensionsManager: React.FC<SavedExtensionsManagerProps> = ({
  visible,
  onClose,
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<ExtensionType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'usage' | 'created' | 'updated'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingExtension, setEditingExtension] = useState<SavedExtension | null>(null);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [form] = Form.useForm();

  // const {
  //   token: { colorBgContainer, colorBorder },
  // } = theme.useToken();

  const {
    savedExtensions,
    categories,
    updateExtension,
    deleteExtension,
    toggleFavorite,
    exportExtensions,
    importExtensions,
  } = useSavedExtensions();

  // Get icon for extension type
  const getExtensionIcon = (type: ExtensionType) => {
    const iconMap: Record<ExtensionType, React.ReactElement> = {
      date: <CalendarOutlined />,
      choice: <UnorderedListOutlined />,
      random: <ThunderboltOutlined />,
      clipboard: <CopyOutlined />,
      echo: <MessageOutlined />,
      script: <CodeOutlined />,
      shell: <CodeSandboxOutlined />,
      form: <FormOutlined />,
    };
    return iconMap[type];
  };

  // Filter and sort extensions
  const filteredAndSortedExtensions = useMemo(() => {
    let filtered = savedExtensions;

    // Apply search filter
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(ext =>
        ext.name.toLowerCase().includes(search) ||
        ext.description?.toLowerCase().includes(search) ||
        ext.tags?.some(tag => tag.toLowerCase().includes(search))
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(ext => ext.category === selectedCategory);
    }

    // Apply type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(ext => ext.extension.type === selectedType);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'usage':
          compareValue = a.usageCount - b.usageCount;
          break;
        case 'created':
          compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updated':
          compareValue = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [savedExtensions, searchText, selectedCategory, selectedType, sortBy, sortOrder]);

  // Handle edit extension
  const handleEdit = (extension: SavedExtension) => {
    setEditingExtension(extension);
    form.setFieldsValue({
      name: extension.name,
      description: extension.description,
      category: extension.category,
      tags: extension.tags,
    });
    setShowEditDrawer(true);
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editingExtension) return;

    try {
      const values = await form.validateFields();
      await updateExtension(editingExtension.id, {
        name: values.name,
        description: values.description,
        category: values.category,
        tags: values.tags,
      });
      
      setShowEditDrawer(false);
      setEditingExtension(null);
      form.resetFields();
      message.success('Extension updated successfully');
    } catch (error) {
      message.error('Failed to update extension');
    }
  };

  // Handle delete extension
  const handleDelete = async (extensionId: string) => {
    try {
      await deleteExtension(extensionId);
      message.success('Extension deleted successfully');
    } catch (error) {
      message.error('Failed to delete extension');
    }
  };

  // Handle toggle favorite
  const handleToggleFavorite = async (extensionId: string) => {
    try {
      await toggleFavorite(extensionId);
    } catch (error) {
      message.error('Failed to update favorite status');
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const data = await exportExtensions();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `saved-extensions-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success('Extensions exported successfully');
    } catch (error) {
      message.error('Failed to export extensions');
    }
  };

  // Handle import
  const handleImport: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    try {
      if (!(file instanceof File)) {
        throw new Error('Invalid file');
      }

      const text = await file.text();
      await importExtensions(JSON.parse(text));
      message.success('Extensions imported successfully');
      onSuccess?.({});
    } catch (error) {
      message.error('Failed to import extensions');
      onError?.(error as Error);
    }
  };

  // Table columns
  const columns: ColumnsType<SavedExtension> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (name, record) => (
        <Space>
          <Button
            type="text"
            icon={record.isFavorite ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
            onClick={() => handleToggleFavorite(record.id)}
            size="small"
          />
          <div>
            <div>
              <Text strong>{name}</Text>
              <span style={{ marginLeft: 8 }}>
                {getExtensionIcon(record.extension.type)}
                <Text type="secondary" style={{ marginLeft: 4, fontSize: 12 }}>
                  {EXTENSION_METADATA[record.extension.type].label}
                </Text>
              </span>
            </div>
            {record.description && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.description}
              </Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category) => {
        const categoryInfo = categories.find(c => c.id === category);
        return (
          <Tag icon={<FolderOutlined />} color="blue">
            {categoryInfo?.name || category}
          </Tag>
        );
      },
    },
    {
      title: 'Tags',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (tags: string[]) => (
        <Space wrap>
          {tags?.map(tag => (
            <Tag key={tag}>{tag}</Tag>
          )) || null}
        </Space>
      ),
    },
    {
      title: 'Usage',
      dataIndex: 'usageCount',
      key: 'usageCount',
      width: 80,
      sorter: true,
      render: (count) => (
        <Tag color={count > 10 ? 'green' : count > 5 ? 'orange' : 'default'}>
          {count}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      sorter: true,
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Delete extension"
            description="Are you sure you want to delete this extension?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                icon={<DeleteOutlined />}
                danger
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Modal
        title={
          <Space>
            <SettingOutlined />
            Manage Saved Extensions
          </Space>
        }
        open={visible}
        onCancel={onClose}
        width={1200}
        footer={[
          <Upload
            key="import"
            accept=".json"
            showUploadList={false}
            customRequest={handleImport}
          >
            <Button icon={<ImportOutlined />}>
              Import
            </Button>
          </Upload>,
          <Button
            key="export"
            icon={<ExportOutlined />}
            onClick={handleExport}
            disabled={savedExtensions.length === 0}
          >
            Export All
          </Button>,
          <Button key="close" onClick={onClose}>
            Close
          </Button>,
        ]}
      >
        {/* Filters and Search */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space wrap>
              <Search
                placeholder="Search extensions..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 250 }}
                allowClear
              />
              
              <Select
                value={selectedCategory}
                onChange={setSelectedCategory}
                style={{ width: 150 }}
                placeholder="Category"
              >
                <Option value="all">All Categories</Option>
                {categories.map(cat => (
                  <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                ))}
              </Select>
              
              <Select
                value={selectedType}
                onChange={setSelectedType}
                style={{ width: 150 }}
                placeholder="Type"
              >
                <Option value="all">All Types</Option>
                {Object.entries(EXTENSION_METADATA).map(([type, meta]) => (
                  <Option key={type} value={type}>
                    <Space>
                      {getExtensionIcon(type as ExtensionType)}
                      {meta.label}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Space>
            
            <Space>
              <Select
                value={`${sortBy}-${sortOrder}`}
                onChange={(value) => {
                  const [field, order] = value.split('-');
                  setSortBy(field as any);
                  setSortOrder(order as any);
                }}
                style={{ width: 150 }}
              >
                <Option value="name-asc">Name A-Z</Option>
                <Option value="name-desc">Name Z-A</Option>
                <Option value="usage-desc">Most Used</Option>
                <Option value="usage-asc">Least Used</Option>
                <Option value="created-desc">Newest</Option>
                <Option value="created-asc">Oldest</Option>
                <Option value="updated-desc">Recently Updated</Option>
              </Select>
            </Space>
          </Space>
        </Card>

        {/* Statistics */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space split={<Divider type="vertical" />}>
            <Text>
              <strong>Total:</strong> {savedExtensions.length}
            </Text>
            <Text>
              <strong>Showing:</strong> {filteredAndSortedExtensions.length}
            </Text>
            <Text>
              <strong>Favorites:</strong> {savedExtensions.filter(e => e.isFavorite).length}
            </Text>
            <Text>
              <strong>Total Usage:</strong> {savedExtensions.reduce((sum, e) => sum + e.usageCount, 0)}
            </Text>
          </Space>
        </Card>

        {/* Extensions Table */}
        <Table
          columns={columns}
          dataSource={filteredAndSortedExtensions}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} extensions`,
          }}
          size="small"
        />
      </Modal>

      {/* Edit Extension Drawer */}
      <Drawer
        title="Edit Extension"
        open={showEditDrawer}
        onClose={() => {
          setShowEditDrawer(false);
          setEditingExtension(null);
          form.resetFields();
        }}
        width={400}
        extra={
          <Space>
            <Button onClick={() => setShowEditDrawer(false)}>Cancel</Button>
            <Button type="primary" onClick={handleSaveEdit}>
              Save
            </Button>
          </Space>
        }
      >
        {editingExtension && (
          <Form form={form} layout="vertical">
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: 'Please enter a name' }]}
            >
              <Input placeholder="Extension name" />
            </Form.Item>

            <Form.Item name="description" label="Description">
              <Input.TextArea placeholder="Optional description" rows={3} />
            </Form.Item>

            <Form.Item name="category" label="Category">
              <Select placeholder="Select category">
                {categories.map(cat => (
                  <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="tags" label="Tags">
              <Select
                mode="tags"
                placeholder="Add tags"
                tokenSeparators={[',']}
              />
            </Form.Item>

            <Divider />

            <Card size="small" title="Extension Details">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>Type:</Text>
                  <div style={{ marginTop: 4 }}>
                    <Space>
                      {getExtensionIcon(editingExtension.extension.type)}
                      <Text>{EXTENSION_METADATA[editingExtension.extension.type].label}</Text>
                    </Space>
                  </div>
                </div>
                
                <div>
                  <Text strong>Usage Count:</Text>
                  <div style={{ marginTop: 4 }}>
                    <Tag color={editingExtension.usageCount > 10 ? 'green' : editingExtension.usageCount > 5 ? 'orange' : 'default'}>
                      {editingExtension.usageCount} times
                    </Tag>
                  </div>
                </div>
                
                <div>
                  <Text strong>Created:</Text>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary">
                      {new Date(editingExtension.createdAt).toLocaleString()}
                    </Text>
                  </div>
                </div>
                
                <div>
                  <Text strong>Last Updated:</Text>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary">
                      {new Date(editingExtension.updatedAt).toLocaleString()}
                    </Text>
                  </div>
                </div>
              </Space>
            </Card>
          </Form>
        )}
      </Drawer>
    </>
  );
};