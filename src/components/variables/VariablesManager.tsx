import React, { useState } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Button, 
  Space, 
  Typography, 
  List, 
  Popconfirm,
  Select,
  message,
  Tabs,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  FolderOutlined,
  TagOutlined,
  UserOutlined,
  CodeOutlined,
  FileTextOutlined,
  RobotOutlined,
  BulbOutlined,
  SettingOutlined,
  DatabaseOutlined,
  ApiOutlined,
  ThunderboltOutlined,
  HeartOutlined,
  StarOutlined,
  CrownOutlined
} from '@ant-design/icons';
import { useVariables } from '../../contexts/VariablesContext';
import { useProjects } from '../../contexts/ProjectContext';
import { useReplacements } from '../../contexts/ReplacementContext';
import { CustomVariable, CustomVariableCategory } from '../../types/variables';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface VariablesManagerProps {
  visible: boolean;
  onClose: () => void;
}

const ICON_OPTIONS = [
  { value: 'FolderOutlined', label: 'Folder', icon: <FolderOutlined /> },
  { value: 'TagOutlined', label: 'Tag', icon: <TagOutlined /> },
  { value: 'UserOutlined', label: 'User', icon: <UserOutlined /> },
  { value: 'CodeOutlined', label: 'Code', icon: <CodeOutlined /> },
  { value: 'FileTextOutlined', label: 'File Text', icon: <FileTextOutlined /> },
  { value: 'RobotOutlined', label: 'Robot', icon: <RobotOutlined /> },
  { value: 'BulbOutlined', label: 'Bulb', icon: <BulbOutlined /> },
  { value: 'SettingOutlined', label: 'Settings', icon: <SettingOutlined /> },
  { value: 'DatabaseOutlined', label: 'Database', icon: <DatabaseOutlined /> },
  { value: 'ApiOutlined', label: 'API', icon: <ApiOutlined /> },
  { value: 'ThunderboltOutlined', label: 'Thunder', icon: <ThunderboltOutlined /> },
  { value: 'HeartOutlined', label: 'Heart', icon: <HeartOutlined /> },
  { value: 'StarOutlined', label: 'Star', icon: <StarOutlined /> },
  { value: 'CrownOutlined', label: 'Crown', icon: <CrownOutlined /> },
];

export const VariablesManager: React.FC<VariablesManagerProps> = ({ visible, onClose }) => {
  const { categories, addCategory, updateCategory, deleteCategory, addVariable, updateVariable, deleteVariable } = useVariables();
  const { projects } = useProjects();
  const { findVariableUsage } = useReplacements();
  
  const [categoryForm] = Form.useForm();
  const [variableForm] = Form.useForm();
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showVariableModal, setShowVariableModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CustomVariableCategory | null>(null);
  const [editingVariable, setEditingVariable] = useState<{ categoryId: string; variable: CustomVariable } | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('custom');

  const handleCreateCategory = async (values: any) => {
    try {
      await addCategory({
        name: values.name,
        icon: values.icon,
        color: values.color,
      });
      message.success('Category created successfully!');
      setShowCategoryModal(false);
      categoryForm.resetFields();
    } catch (error) {
      message.error('Failed to create category');
    }
  };

  const handleUpdateCategory = async (values: any) => {
    if (!editingCategory) return;
    
    try {
      await updateCategory(editingCategory.id, values);
      message.success('Category updated successfully!');
      setShowCategoryModal(false);
      setEditingCategory(null);
      categoryForm.resetFields();
    } catch (error) {
      message.error('Failed to update category');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteCategory(categoryId);
      message.success('Category deleted successfully!');
    } catch (error) {
      message.error('Failed to delete category');
    }
  };

  const handleCreateVariable = async (values: any) => {
    if (!selectedCategoryId) return;
    
    try {
      await addVariable(selectedCategoryId, {
        name: values.name,
        value: values.value,
        preview: values.preview,
        description: values.description,
      });
      message.success('Variable created successfully!');
      setShowVariableModal(false);
      variableForm.resetFields();
    } catch (error) {
      message.error('Failed to create variable');
    }
  };

  const handleUpdateVariable = async (values: any) => {
    if (!editingVariable) return;
    
    try {
      await updateVariable(editingVariable.categoryId, editingVariable.variable.id, values);
      message.success('Variable updated successfully!');
      setShowVariableModal(false);
      setEditingVariable(null);
      variableForm.resetFields();
    } catch (error) {
      message.error('Failed to update variable');
    }
  };

  const handleDeleteVariable = async (categoryId: string, variableId: string, variable: CustomVariable) => {
    // Check if variable is being used
    const usages = findVariableUsage(variable.value);
    
    if (usages.length > 0) {
      Modal.confirm({
        title: 'Variable In Use',
        content: (
          <div>
            <p>This variable is being used in {usages.length} replacement{usages.length > 1 ? 's' : ''}:</p>
            <ul style={{ maxHeight: 200, overflow: 'auto' }}>
              {usages.slice(0, 5).map((usage, index) => (
                <li key={index}>
                  <Text code>{usage.trigger}</Text> in {usage.category}
                </li>
              ))}
              {usages.length > 5 && <li>...and {usages.length - 5} more</li>}
            </ul>
            <p>Are you sure you want to delete it?</p>
          </div>
        ),
        okText: 'Delete Anyway',
        okType: 'danger',
        onOk: async () => {
          try {
            await deleteVariable(categoryId, variableId);
            message.success('Variable deleted successfully!');
          } catch (error) {
            message.error('Failed to delete variable');
          }
        },
      });
    } else {
      try {
        await deleteVariable(categoryId, variableId);
        message.success('Variable deleted successfully!');
      } catch (error) {
        message.error('Failed to delete variable');
      }
    }
  };

  const openCategoryModal = (category?: CustomVariableCategory) => {
    if (category) {
      setEditingCategory(category);
      categoryForm.setFieldsValue(category);
    } else {
      setEditingCategory(null);
      categoryForm.resetFields();
    }
    setShowCategoryModal(true);
  };

  const openVariableModal = (categoryId: string, variable?: CustomVariable) => {
    setSelectedCategoryId(categoryId);
    if (variable) {
      setEditingVariable({ categoryId, variable });
      variableForm.setFieldsValue(variable);
      
      // Check usage and show warning if used
      const usages = findVariableUsage(variable.value);
      if (usages.length > 0) {
        message.info(`This variable is used in ${usages.length} replacement${usages.length > 1 ? 's' : ''}`);
      }
    } else {
      setEditingVariable(null);
      variableForm.resetFields();
    }
    setShowVariableModal(true);
  };

  const getIconComponent = (iconName: string) => {
    const iconOption = ICON_OPTIONS.find(option => option.value === iconName);
    return iconOption ? iconOption.icon : <FolderOutlined />;
  };

  // Find or create a project variables category
  const projectVarsCategory = categories.find(c => c.id === 'project-variables') || {
    id: 'project-variables',
    name: 'Project Variables',
    icon: 'ProjectOutlined',
    variables: [],
  };

  // Create projects tab
  const projectsTab = {
    key: 'projects',
    label: (
      <Space>
        <DatabaseOutlined />
        Projects
      </Space>
    ),
    children: (
      <div>
        <Title level={4}>Project Variables</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          These variables are automatically populated based on your active project.
        </Text>
        
        <List
          dataSource={[
            { name: 'Active Project Name', value: '{{active_project_name}}', preview: projects.find(p => p.isActive)?.name || 'No active project' },
            { name: 'Project Stack', value: '{{active_project_stack}}', preview: projects.find(p => p.isActive)?.stack || 'No active project' },
            { name: 'Project Directory', value: '{{active_project_directory}}', preview: projects.find(p => p.isActive)?.directory || 'No active project' },
            { name: 'Restart Command', value: '{{active_project_restart_cmd}}', preview: projects.find(p => p.isActive)?.restartCommand || 'No active project' },
            { name: 'Log Command', value: '{{active_project_log_cmd}}', preview: projects.find(p => p.isActive)?.logCommand || 'No active project' },
          ]}
          renderItem={(variable) => {
            const usages = findVariableUsage(variable.value);
            return (
              <List.Item>
                <List.Item.Meta
                  title={
                    <Space>
                      <Text code>{variable.value}</Text>
                      <Text type="secondary">({variable.name})</Text>
                      {usages.length > 0 && (
                        <Tooltip title={`Used in ${usages.length} replacement${usages.length > 1 ? 's' : ''}`}>
                          <Text type="success" style={{ fontSize: 12 }}>
                            ✓ In use
                          </Text>
                        </Tooltip>
                      )}
                    </Space>
                  }
                  description={
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Current value: {variable.preview}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
        
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={5} style={{ margin: 0 }}>Custom Project Variables</Title>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                if (!projectVarsCategory.id.includes('project-variables')) {
                  // Create the category first
                  addCategory({
                    name: 'Project Variables',
                    icon: 'ProjectOutlined',
                    color: '#722ed1',
                  }).then(() => {
                    message.success('Project Variables category created!');
                    setActiveTab('project-variables');
                  });
                } else {
                  // Open variable modal for project variables category
                  openVariableModal('project-variables');
                }
              }}
            >
              Add Custom Variable
            </Button>
          </div>
          
          <List
            dataSource={projectVarsCategory.variables}
            renderItem={(variable) => {
              const usages = findVariableUsage(variable.value);
              return (
                <List.Item
                  actions={[
                    <Button
                      type="link"
                      icon={<EditOutlined />}
                      onClick={() => openVariableModal('project-variables', variable)}
                    />,
                    <Popconfirm
                      title="Delete Variable"
                      description="Are you sure?"
                      onConfirm={() => handleDeleteVariable('project-variables', variable.id, variable)}
                    >
                      <Button type="link" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Text code>{variable.value}</Text>
                        <Text type="secondary">({variable.name})</Text>
                        {usages.length > 0 && (
                          <Tooltip title={`Used in ${usages.length} replacement${usages.length > 1 ? 's' : ''}`}>
                            <Text type="success" style={{ fontSize: 12 }}>
                              ✓ In use
                            </Text>
                          </Tooltip>
                        )}
                      </Space>
                    }
                    description={
                      <div>
                        {variable.description && <Text type="secondary">{variable.description}</Text>}
                        {variable.preview && (
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Preview: {variable.preview}
                            </Text>
                          </div>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
            locale={{ emptyText: 'No custom project variables. Click "Add Custom Variable" to create one.' }}
          />
        </div>
        
        <div style={{ marginTop: 24 }}>
          <Title level={5}>All Projects</Title>
          <List
            dataSource={projects}
            renderItem={(project) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <Space>
                      {project.name}
                      {project.isActive && (
                        <Text type="success" style={{ fontSize: 12 }}>
                          (Active)
                        </Text>
                      )}
                    </Space>
                  }
                  description={project.stack}
                />
              </List.Item>
            )}
            locale={{ emptyText: 'No projects configured. Go to Projects to add one.' }}
          />
        </div>
      </div>
    ),
  };

  const customTabs = categories.map(category => ({
    key: category.id,
    label: (
      <Space>
        {getIconComponent(category.icon)}
        {category.name}
      </Space>
    ),
    children: (
      <div>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Title level={4} style={{ margin: 0 }}>{category.name}</Title>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => openCategoryModal(category)}
            />
            <Popconfirm
              title="Delete Category"
              description="Are you sure you want to delete this category? All variables will be lost."
              onConfirm={() => handleDeleteCategory(category.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openVariableModal(category.id)}
          >
            Add Variable
          </Button>
        </div>

        <List
          dataSource={category.variables}
          renderItem={(variable) => {
            const usages = findVariableUsage(variable.value);
            return (
              <List.Item
              actions={[
                <Tooltip title="Edit">
                  <Button
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => openVariableModal(category.id, variable)}
                  />
                </Tooltip>,
                <Tooltip title="Delete">
                  <Popconfirm
                    title="Delete Variable"
                    description="Are you sure you want to delete this variable?"
                    onConfirm={() => handleDeleteVariable(category.id, variable.id, variable)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                    />
                  </Popconfirm>
                </Tooltip>
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text code>{variable.value}</Text>
                    <Text type="secondary">({variable.name})</Text>
                    {usages.length > 0 && (
                      <Tooltip title={`Used in ${usages.length} replacement${usages.length > 1 ? 's' : ''}`}>
                        <Text type="success" style={{ fontSize: 12 }}>
                          ✓ In use
                        </Text>
                      </Tooltip>
                    )}
                  </Space>
                }
                description={
                  <div>
                    {variable.description && <Text type="secondary">{variable.description}</Text>}
                    {variable.preview && (
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Preview: {variable.preview}
                        </Text>
                      </div>
                    )}
                  </div>
                }
              />
            </List.Item>
            );
          }}
          locale={{ emptyText: 'No variables in this category. Click "Add Variable" to create one.' }}
        />
      </div>
    ),
  }));

  return (
    <>
      <Modal
        title="Variables Manager"
        open={visible}
        onCancel={onClose}
        width={800}
        footer={[
          <Button
            key="add-category"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openCategoryModal()}
            disabled={activeTab === 'projects'}
          >
            Add Category
          </Button>,
          <Button key="close" onClick={onClose}>
            Close
          </Button>
        ]}
      >
        <Tabs
          items={[projectsTab, ...customTabs]}
          type="card"
          tabPosition="top"
          activeKey={activeTab}
          onChange={setActiveTab}
        />
      </Modal>

      {/* Category Form Modal */}
      <Modal
        title={editingCategory ? 'Edit Category' : 'Create Category'}
        open={showCategoryModal}
        onCancel={() => {
          setShowCategoryModal(false);
          setEditingCategory(null);
          categoryForm.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
            categoryForm.resetFields();
          }}>
            Cancel
          </Button>,
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => categoryForm.submit()}
          >
            {editingCategory ? 'Update' : 'Create'}
          </Button>
        ]}
      >
        <Form
          form={categoryForm}
          layout="vertical"
          onFinish={editingCategory ? handleUpdateCategory : handleCreateCategory}
        >
          <Form.Item
            name="name"
            label="Category Name"
            rules={[{ required: true, message: 'Please enter a category name' }]}
          >
            <Input placeholder="e.g., Personal, Work, etc." />
          </Form.Item>

          <Form.Item
            name="icon"
            label="Icon"
            rules={[{ required: true, message: 'Please select an icon' }]}
          >
            <Select
              placeholder="Select an icon"
              options={ICON_OPTIONS.map(option => ({
                ...option,
                label: (
                  <Space>
                    {option.icon}
                    {option.label}
                  </Space>
                )
              }))}
            />
          </Form.Item>

          <Form.Item
            name="color"
            label="Color (optional)"
          >
            <Input placeholder="#4a00ff" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Variable Form Modal */}
      <Modal
        title={editingVariable ? 'Edit Variable' : 'Create Variable'}
        open={showVariableModal}
        onCancel={() => {
          setShowVariableModal(false);
          setEditingVariable(null);
          variableForm.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setShowVariableModal(false);
            setEditingVariable(null);
            variableForm.resetFields();
          }}>
            Cancel
          </Button>,
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => variableForm.submit()}
          >
            {editingVariable ? 'Update' : 'Create'}
          </Button>
        ]}
      >
        <Form
          form={variableForm}
          layout="vertical"
          onFinish={editingVariable ? handleUpdateVariable : handleCreateVariable}
        >
          <Form.Item
            name="name"
            label="Variable Name"
            rules={[{ required: true, message: 'Please enter a variable name' }]}
          >
            <Input placeholder="e.g., My Email, Company Name, etc." />
          </Form.Item>

          <Form.Item
            name="value"
            label="Variable Value"
            rules={[{ required: true, message: 'Please enter the variable value' }]}
          >
            <Input 
              placeholder="e.g., {{my_email}}, {{company_name}}, etc."
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Form.Item
            name="preview"
            label="Preview (optional)"
          >
            <Input placeholder="What this variable will display (e.g., john@example.com)" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description (optional)"
          >
            <TextArea 
              rows={3}
              placeholder="Describe what this variable is for..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};