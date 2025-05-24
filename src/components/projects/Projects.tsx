import React, { useState } from 'react';
import {
  Card,
  Button,
  List,
  Space,
  Modal,
  Form,
  Input,
  Typography,
  Tag,
  message,
  Empty,
  Badge,
  Dropdown,
  Divider,
  Checkbox,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  RocketOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  CodeOutlined,
  MoreOutlined,
  ConsoleSqlOutlined,
} from '@ant-design/icons';
import { useProjects } from '../../contexts/ProjectContext';
import { useVariables } from '../../contexts/VariablesContext';
import { Project, DEFAULT_PROJECT_VALUES } from '../../types/project';
import { invoke } from '@tauri-apps/api/core';
import type { MenuProps } from 'antd';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export const Projects: React.FC = () => {
  const {
    projects,
    activeProject,
    loading,
    createProject,
    updateProject,
    deleteProject,
    setActiveProject,
  } = useProjects();
  
  const { categories } = useVariables();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  const handleCreate = () => {
    setEditingProject(null);
    form.resetFields();
    form.setFieldsValue(DEFAULT_PROJECT_VALUES);
    setIsModalOpen(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    
    // Convert custom variables to array format for the select
    const customVarKeys = project.customVariables 
      ? Object.keys(project.customVariables).map(key => `{{${key}}}`)
      : [];
    
    form.setFieldsValue({
      ...project,
      customVariables: customVarKeys,
    });
    
    // Set the actual values after a small delay to ensure form is ready
    setTimeout(() => {
      if (project.customVariables) {
        form.setFieldsValue({
          customVariables: project.customVariables,
        });
      }
    }, 100);
    
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Delete Project',
      content: 'Are you sure you want to delete this project?',
      onOk: async () => {
        await deleteProject(id);
        message.success('Project deleted successfully');
      },
    });
  };

  const handleSetActive = async (id: string) => {
    await setActiveProject(id === activeProject?.id ? null : id);
    message.success(
      id === activeProject?.id
        ? 'Project deactivated'
        : 'Project activated successfully'
    );
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingProject) {
        await updateProject(editingProject.id, values);
        message.success('Project updated successfully');
      } else {
        await createProject({ ...values, isActive: false });
        message.success('Project created successfully');
      }
      setIsModalOpen(false);
    } catch (error) {
      message.error('Failed to save project');
    }
  };

  const handleBrowseDirectory = async () => {
    try {
      const selected = await invoke<string | null>('open_directory_dialog');
      
      if (selected) {
        form.setFieldsValue({ directory: selected });
      }
    } catch (error) {
      console.error('Failed to open directory picker:', error);
    }
  };

  const getDropdownItems = (project: Project): MenuProps['items'] => [
    {
      key: 'activate',
      label: project.id === activeProject?.id ? 'Deactivate' : 'Activate',
      icon: <CheckCircleOutlined />,
      onClick: () => handleSetActive(project.id),
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: <EditOutlined />,
      onClick: () => handleEdit(project),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => handleDelete(project.id),
    },
  ];

  // Filter projects based on search
  const filteredProjects = projects.filter(project => {
    const searchLower = searchText.toLowerCase();
    return (
      project.name.toLowerCase().includes(searchLower) ||
      project.description.toLowerCase().includes(searchLower) ||
      project.stack.toLowerCase().includes(searchLower)
    );
  });

  const renderStackTags = (stack: string) => {
    const stacks = stack.split(',').map(s => s.trim()).filter(s => s);
    return (
      <Space wrap>
        {stacks.map((s, index) => (
          <Tag key={index} color="blue" icon={<CodeOutlined />}>
            {s}
          </Tag>
        ))}
      </Space>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>Projects</Title>
          <Space>
            <Input
              placeholder="Search projects..."
              prefix={<SearchOutlined />}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              New Project
            </Button>
          </Space>
        </div>

        {filteredProjects.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" align="center">
                <Text>{searchText ? 'No projects found' : 'No projects yet'}</Text>
                <Text type="secondary">
                  {searchText ? 'Try a different search term' : 'Create your first project to get started'}
                </Text>
              </Space>
            }
          >
            {!searchText && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                Create Project
              </Button>
            )}
          </Empty>
        ) : (
          <List
            itemLayout="vertical"
            size="large"
            loading={loading}
            dataSource={filteredProjects}
            renderItem={(project) => (
              <List.Item
                key={project.id}
                extra={
                  project.id === activeProject?.id && (
                    <Badge
                      status="success"
                      text="Active"
                      style={{ fontWeight: 'bold' }}
                    />
                  )
                }
              >
                <div style={{ position: 'relative' }}>
                  <List.Item.Meta
                    title={
                      <Space size="middle">
                        <Text strong style={{ fontSize: 18 }}>{project.name}</Text>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Paragraph 
                          ellipsis={{ rows: 2, expandable: true }} 
                          style={{ margin: 0 }}
                        >
                          {project.description}
                        </Paragraph>
                        {renderStackTags(project.stack)}
                      </Space>
                    }
                  />
                  <div style={{ marginTop: 16 }}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Space>
                        <FolderOpenOutlined />
                        <Text type="secondary" copyable={{ text: project.directory }}>
                          {project.directory}
                        </Text>
                      </Space>
                      <Space split="|">
                        <Space>
                          <RocketOutlined />
                          <Text type="secondary" code>
                            {project.restartCommand}
                          </Text>
                        </Space>
                        <Space>
                          <ConsoleSqlOutlined />
                          <Text type="secondary" code>
                            {project.logCommand}
                          </Text>
                        </Space>
                      </Space>
                      {project.customVariables && Object.keys(project.customVariables).length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <Text type="secondary" style={{ marginRight: 8 }}>Custom Variables:</Text>
                          {Object.entries(project.customVariables).map(([key, value]) => (
                            <Tag key={key} color="purple">
                              {`{{${key}}}`}: {value}
                            </Tag>
                          ))}
                        </div>
                      )}
                    </Space>
                  </div>
                  <Dropdown
                    menu={{ items: getDropdownItems(project) }}
                    trigger={['click']}
                    placement="bottomRight"
                  >
                    <Button 
                      type="text" 
                      icon={<MoreOutlined />} 
                      style={{ 
                        position: 'absolute', 
                        bottom: 0, 
                        right: 0 
                      }}
                    />
                  </Dropdown>
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>

      <Modal
        title={editingProject ? 'Edit Project' : 'Create Project'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={DEFAULT_PROJECT_VALUES}
        >
          <Form.Item
            name="name"
            label="Project Name"
            rules={[{ required: true, message: 'Please enter project name' }]}
          >
            <Input placeholder="My Awesome Project" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <TextArea 
              rows={3} 
              placeholder="Brief description of the project"
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Form.Item
            name="stack"
            label="Technology Stack"
            rules={[{ required: true, message: 'Please enter technology stack' }]}
            extra="Separate multiple technologies with commas (e.g., React, TypeScript, Node.js)"
          >
            <Input
              placeholder="React, TypeScript, Node.js"
              prefix={<RocketOutlined />}
            />
          </Form.Item>

          <Form.Item
            name="directory"
            label="Project Directory"
            rules={[{ required: true, message: 'Please enter project directory' }]}
          >
            <Input
              placeholder="/path/to/project"
              prefix={<FolderOpenOutlined />}
              suffix={
                <Button
                  type="text"
                  size="small"
                  icon={<FolderOpenOutlined />}
                  onClick={handleBrowseDirectory}
                >
                  Browse
                </Button>
              }
            />
          </Form.Item>

          <Form.Item
            name="restartCommand"
            label="Restart Command"
            rules={[{ required: true, message: 'Please enter restart command' }]}
          >
            <Input placeholder="npm run dev" />
          </Form.Item>

          <Form.Item
            name="logCommand"
            label="Log Command"
            rules={[{ required: true, message: 'Please enter log command' }]}
          >
            <Input
              placeholder="npm run logs"
              prefix={<FileTextOutlined />}
            />
          </Form.Item>

          <Divider>Custom Variables</Divider>
          
          {(() => {
            const projectVarsCategory = categories.find(c => c.id === 'project-variables');
            if (!projectVarsCategory || projectVarsCategory.variables.length === 0) {
              return (
                <div style={{ marginBottom: 24, textAlign: 'center' }}>
                  <Text type="secondary">
                    No custom project variables available. Create them in the Variables Manager.
                  </Text>
                </div>
              );
            }
            
            return (
              <Space direction="vertical" style={{ width: '100%', marginBottom: 24 }}>
                <Text type="secondary">
                  Select which custom variables to include with this project:
                </Text>
                {projectVarsCategory.variables.map(variable => {
                  const varKey = variable.value.replace(/[{}]/g, '');
                  return (
                    <div key={variable.id} style={{ marginBottom: 16 }}>
                      <Space style={{ marginBottom: 8 }}>
                        <Checkbox
                          checked={form.getFieldValue(['customVariables', varKey]) !== undefined}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const currentValues = form.getFieldValue('customVariables') || {};
                            if (checked) {
                              form.setFieldsValue({
                                customVariables: {
                                  ...currentValues,
                                  [varKey]: variable.preview || '',
                                }
                              });
                            } else {
                              delete currentValues[varKey];
                              form.setFieldsValue({ customVariables: currentValues });
                            }
                          }}
                        >
                          <Text code>{variable.value}</Text>
                          <Text type="secondary">- {variable.name}</Text>
                        </Checkbox>
                      </Space>
                      
                      <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) => 
                          prevValues.customVariables?.[varKey] !== currentValues.customVariables?.[varKey]
                        }
                      >
                        {({ getFieldValue }) => {
                          const hasValue = getFieldValue(['customVariables', varKey]) !== undefined;
                          if (!hasValue) return null;
                          
                          return (
                            <Form.Item
                              name={['customVariables', varKey]}
                              label={<Text type="secondary">Value for this project:</Text>}
                              rules={[{ required: true, message: 'Please enter a value' }]}
                              style={{ marginLeft: 24 }}
                            >
                              <Input placeholder={variable.preview || `Value for ${variable.name}`} />
                            </Form.Item>
                          );
                        }}
                      </Form.Item>
                    </div>
                  );
                })}
              </Space>
            );
          })()}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingProject ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};