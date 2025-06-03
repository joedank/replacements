import React, { useState } from 'react';
import {
  Typography,
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Popconfirm,
  Alert,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  CodeOutlined,
  MailOutlined,
  TeamOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  ApiOutlined,
  GlobalOutlined,
  BulbOutlined,
  ToolOutlined,
  HeartOutlined,
  RocketOutlined,
  StarOutlined,
  FolderOutlined,
  TagOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useProjectCategories } from '../../contexts/ProjectCategoriesContext';
import { ProjectCategory, ProjectCategoryVariable } from '../../types/projectCategories';

const { Title, Text } = Typography;

const iconOptions = [
  { name: 'InfoCircleOutlined', icon: <InfoCircleOutlined />, label: 'Info' },
  { name: 'CodeOutlined', icon: <CodeOutlined />, label: 'Code' },
  { name: 'MailOutlined', icon: <MailOutlined />, label: 'Mail' },
  { name: 'TeamOutlined', icon: <TeamOutlined />, label: 'Team' },
  { name: 'FileTextOutlined', icon: <FileTextOutlined />, label: 'File' },
  { name: 'DatabaseOutlined', icon: <DatabaseOutlined />, label: 'Database' },
  { name: 'ApiOutlined', icon: <ApiOutlined />, label: 'API' },
  { name: 'GlobalOutlined', icon: <GlobalOutlined />, label: 'Global' },
  { name: 'BulbOutlined', icon: <BulbOutlined />, label: 'Bulb' },
  { name: 'ToolOutlined', icon: <ToolOutlined />, label: 'Tool' },
  { name: 'RocketOutlined', icon: <RocketOutlined />, label: 'Rocket' },
  { name: 'HeartOutlined', icon: <HeartOutlined />, label: 'Heart' },
  { name: 'StarOutlined', icon: <StarOutlined />, label: 'Star' },
  { name: 'FolderOutlined', icon: <FolderOutlined />, label: 'Folder' },
  { name: 'TagOutlined', icon: <TagOutlined />, label: 'Tag' },
  { name: 'UserOutlined', icon: <UserOutlined />, label: 'User' },
];

const colorOptions = [
  { value: '#1890ff', label: 'Blue' },
  { value: '#52c41a', label: 'Green' },
  { value: '#faad14', label: 'Gold' },
  { value: '#f5222d', label: 'Red' },
  { value: '#722ed1', label: 'Purple' },
  { value: '#eb2f96', label: 'Magenta' },
  { value: '#13c2c2', label: 'Cyan' },
  { value: '#fa8c16', label: 'Orange' },
];

const getIconComponent = (iconName: string) => {
  const iconOption = iconOptions.find(opt => opt.name === iconName);
  return iconOption ? iconOption.icon : <InfoCircleOutlined />;
};

export const ProjectCategorySettings: React.FC = () => {
  const { categories, loading, createCategory, updateCategory, deleteCategory } = useProjectCategories();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProjectCategory | null>(null);
  const [variableModalVisible, setVariableModalVisible] = useState(false);
  const [editingVariable, setEditingVariable] = useState<{ categoryId: string; variable?: ProjectCategoryVariable } | null>(null);
  const [form] = Form.useForm();
  const [variableForm] = Form.useForm();

  const handleCreateCategory = () => {
    setEditingCategory(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditCategory = (category: ProjectCategory) => {
    setEditingCategory(category);
    form.setFieldsValue({
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color,
      fileName: category.fileName,
    });
    setModalVisible(true);
  };

  const handleSubmitCategory = async (values: any) => {
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, values);
      } else {
        // Use provided fileName or generate from category name
        const fileName = values.fileName || values.name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '.yml';
        await createCategory({
          ...values,
          fileName,
          variableDefinitions: [],
        });
      }
      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      // Error handled by context
    }
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory(id);
  };

  const handleAddVariable = (categoryId: string) => {
    setEditingVariable({ categoryId });
    variableForm.resetFields();
    setVariableModalVisible(true);
  };

  const handleEditVariable = (categoryId: string, variable: ProjectCategoryVariable) => {
    setEditingVariable({ categoryId, variable });
    variableForm.setFieldsValue(variable);
    setVariableModalVisible(true);
  };

  const handleSubmitVariable = async (values: any) => {
    if (!editingVariable) return;

    const category = categories.find(c => c.id === editingVariable.categoryId);
    if (!category) return;

    let updatedVariables: ProjectCategoryVariable[];
    
    if (editingVariable.variable) {
      // Edit existing variable
      updatedVariables = category.variableDefinitions.map(v =>
        v.id === editingVariable.variable!.id
          ? { ...v, ...values }
          : v
      );
    } else {
      // Add new variable
      const newVariable: ProjectCategoryVariable = {
        id: `var_${Date.now()}`,
        ...values,
      };
      updatedVariables = [...category.variableDefinitions, newVariable];
    }

    await updateCategory(category.id, {
      variableDefinitions: updatedVariables,
    });

    setVariableModalVisible(false);
    variableForm.resetFields();
  };

  const handleDeleteVariable = async (categoryId: string, variableId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    const updatedVariables = category.variableDefinitions.filter(v => v.id !== variableId);
    await updateCategory(category.id, {
      variableDefinitions: updatedVariables,
    });
  };

  const categoryColumns = [
    {
      title: 'Icon',
      dataIndex: 'icon',
      key: 'icon',
      width: 60,
      render: (icon: string) => (
        <span style={{ fontSize: 24 }}>
          {getIconComponent(icon)}
        </span>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ProjectCategory) => (
        <Space>
          <Text strong>{name}</Text>
          {record.isDefault && <Tag color="blue">Default</Tag>}
        </Space>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'File Name',
      dataIndex: 'fileName',
      key: 'fileName',
      render: (fileName: string) => (
        <Text code>{fileName || 'auto-generated'}</Text>
      ),
    },
    {
      title: 'Variables',
      key: 'variables',
      render: (_: any, record: ProjectCategory) => (
        <Text>{record.variableDefinitions.length} variables</Text>
      ),
    },
    {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      width: 80,
      render: (color: string) => (
        color ? (
          <div
            style={{
              width: 24,
              height: 24,
              backgroundColor: color,
              borderRadius: 4,
              border: '1px solid #d9d9d9',
            }}
          />
        ) : null
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: ProjectCategory) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditCategory(record)}
          />
          <Popconfirm
            title="Delete Category"
            description="Are you sure you want to delete this category?"
            onConfirm={() => handleDeleteCategory(record.id)}
            okText="Yes"
            cancelText="No"
            disabled={record.isDefault}
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
    <div 
      style={{ 
        height: '100%', 
        overflow: 'auto',
        padding: '24px',
      }}
      className="custom-scrollbar"
    >
      <Title level={2}>Project Category Settings</Title>
      
      <Alert
        message="Customizable Project Categories"
        description="Create custom categories to organize variables for different use cases like AI prompts, email templates, development tools, and more. Each category can have its own set of variables that will be available when that project is active."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>Project Categories</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateCategory}
          >
            New Category
          </Button>
        </div>

        <Table
          columns={categoryColumns}
          dataSource={categories}
          loading={loading}
          rowKey="id"
          pagination={false}
          expandable={{
            expandedRowRender: (record: ProjectCategory) => (
              <div style={{ padding: '16px 0' }}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Title level={5} style={{ margin: 0 }}>Category Variables</Title>
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => handleAddVariable(record.id)}
                    disabled={record.isDefault}
                  >
                    Add Variable
                  </Button>
                </div>
                {record.variableDefinitions.length > 0 ? (
                  <Table
                    size="small"
                    pagination={false}
                    dataSource={record.variableDefinitions}
                    rowKey="id"
                    columns={[
                      {
                        title: 'Variable Name',
                        dataIndex: 'name',
                        key: 'name',
                        render: (name: string) => <Tag>{`{{${name}}}`}</Tag>,
                      },
                      {
                        title: 'Description',
                        dataIndex: 'description',
                        key: 'description',
                      },
                      {
                        title: 'Default Value',
                        dataIndex: 'defaultValue',
                        key: 'defaultValue',
                        render: (value: string) => value || <Text type="secondary">None</Text>,
                      },
                      {
                        title: 'Required',
                        dataIndex: 'required',
                        key: 'required',
                        render: (required: boolean) => required ? <Tag color="red">Required</Tag> : <Tag>Optional</Tag>,
                      },
                      {
                        title: 'Actions',
                        key: 'actions',
                        width: 100,
                        render: (_: any, variable: ProjectCategoryVariable) => (
                          <Space size="small">
                            <Button
                              size="small"
                              type="text"
                              icon={<EditOutlined />}
                              onClick={() => handleEditVariable(record.id, variable)}
                              disabled={record.isDefault}
                            />
                            <Popconfirm
                              title="Delete Variable"
                              description="Are you sure?"
                              onConfirm={() => handleDeleteVariable(record.id, variable.id)}
                              disabled={record.isDefault}
                            >
                              <Button
                                size="small"
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                disabled={record.isDefault}
                              />
                            </Popconfirm>
                          </Space>
                        ),
                      },
                    ]}
                  />
                ) : (
                  <Empty
                    description="No variables defined"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </div>
            ),
          }}
        />
      </Card>

      {/* Category Modal */}
      <Modal
        title={editingCategory ? 'Edit Category' : 'Create Category'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitCategory}
        >
          <Form.Item
            name="name"
            label="Category Name"
            rules={[{ required: true, message: 'Please enter category name' }]}
          >
            <Input placeholder="e.g., Email Templates" />
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
              {iconOptions.map(({ name, icon, label }) => (
                <Select.Option key={name} value={name} label={label}>
                  <Space>
                    {icon}
                    <span>{label}</span>
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="color"
            label="Color"
          >
            <Select placeholder="Select a color" allowClear>
              {colorOptions.map(({ value, label }) => (
                <Select.Option key={value} value={value}>
                  <Space>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        backgroundColor: value,
                        borderRadius: 2,
                      }}
                    />
                    <span>{label}</span>
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="fileName"
            label="YAML File"
            help={editingCategory ? "Change the YAML file this category uses" : "Leave empty to auto-generate from category name"}
          >
            <Select
              placeholder="Select existing file or enter new name"
              allowClear
              showSearch
              optionFilterProp="label"
            >
              <Select.Option value="base.yml" label="base.yml">
                base.yml (Base Replacements)
              </Select.Option>
              <Select.Option value="better_replacements.yml" label="better_replacements.yml">
                better_replacements.yml (Better Replacements)
              </Select.Option>
              <Select.Option value="ai_prompts.yml" label="ai_prompts.yml">
                ai_prompts.yml (AI Prompts)
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingCategory ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Variable Modal */}
      <Modal
        title={editingVariable?.variable ? 'Edit Variable' : 'Add Variable'}
        open={variableModalVisible}
        onCancel={() => {
          setVariableModalVisible(false);
          variableForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={variableForm}
          layout="vertical"
          onFinish={handleSubmitVariable}
        >
          <Form.Item
            name="name"
            label="Variable Name"
            rules={[
              { required: true, message: 'Please enter variable name' },
              { pattern: /^[a-zA-Z0-9_]+$/, message: 'Only letters, numbers, and underscores allowed' },
            ]}
            help="This will be used as {{variable_name}} in replacements"
          >
            <Input placeholder="e.g., project_url" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea
              rows={2}
              placeholder="What is this variable for?"
            />
          </Form.Item>

          <Form.Item
            name="defaultValue"
            label="Default Value"
          >
            <Input placeholder="Optional default value" />
          </Form.Item>

          <Form.Item
            name="required"
            label="Required"
            valuePropName="checked"
          >
            <Select defaultValue={false}>
              <Select.Option value={true}>Yes</Select.Option>
              <Select.Option value={false}>No</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingVariable?.variable ? 'Update' : 'Add'}
              </Button>
              <Button onClick={() => setVariableModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};