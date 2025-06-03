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
  Select,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  CodeOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { useProjects } from '../../contexts/ProjectContext';
import { useProjectCategories } from '../../contexts/ProjectCategoriesContext';
import { Project, DEFAULT_PROJECT_VALUES } from '../../types/project';
import { ProjectCategoryVariableEditor } from './ProjectCategoryVariableEditor';
import { ErrorBoundary } from '../common';
import { getCategoryValue } from '../../utils/projectHelpers';
import type { MenuProps } from 'antd';

const { Title, Text, Paragraph } = Typography;

export const Projects: React.FC = () => {
  const {
    filteredProjects,
    activeProject,
    loading,
    createProject,
    updateProject,
    deleteProject,
    setActiveProject,
  } = useProjects();
  
  const { categories } = useProjectCategories();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  
  // State for category-based variable management
  const [categoryValues, setCategoryValues] = useState<Record<string, Record<string, string>>>({});
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const handleCreate = () => {
    console.log('handleCreate called, categories:', categories);
    
    // Ensure we have categories before allowing project creation
    if (categories.length === 0) {
      message.error('Please create at least one project category before creating projects. Go to Settings → Project Categories.');
      return;
    }
    
    setEditingProject(null);
    form.resetFields();
    setCategoryValues({});
    
    // Set default values including the first available category
    const defaultCategory = categories.find(c => c.isDefault) || categories[0];
    console.log('Default category:', defaultCategory);
    
    const initialValues = {
      ...DEFAULT_PROJECT_VALUES,
      categoryId: defaultCategory?.id || '',
    };
    console.log('Initial values:', initialValues);
    
    form.setFieldsValue(initialValues);
    setSelectedCategoryId(defaultCategory?.id || '');
    setIsModalOpen(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    form.setFieldsValue(project);
    
    // Load project's category values and set selected category
    setCategoryValues(project.categoryValues || {});
    setSelectedCategoryId(project.categoryId);
    
    setIsModalOpen(true);
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
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
      // Prepare project data with category values
      const projectData = {
        ...values,
        categoryValues: categoryValues,
      };
      
      if (editingProject) {
        await updateProject(editingProject.id, projectData);
        message.success('Project updated successfully');
      } else {
        await createProject({ ...projectData, isActive: false });
        message.success('Project created successfully');
      }
      setIsModalOpen(false);
    } catch (error) {
      message.error('Failed to save project');
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
  const searchFilteredProjects = filteredProjects.filter(project => {
    const searchLower = searchText.toLowerCase();
    const description = project.description || '';
    const stack = getCategoryValue(project, 'tech_stack') || getCategoryValue(project, 'active_project_stack');
    
    return (
      project.name.toLowerCase().includes(searchLower) ||
      description.toLowerCase().includes(searchLower) ||
      stack.toLowerCase().includes(searchLower)
    );
  });


  const renderStackTags = (project: Project) => {
    const stack = getCategoryValue(project, 'tech_stack') || getCategoryValue(project, 'active_project_stack');
    if (!stack) return null;
    
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
    <div 
      style={{ 
        height: '100%', 
        overflow: 'auto',
        padding: '24px',
      }}
      className="custom-scrollbar"
    >
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

        {searchFilteredProjects.length === 0 ? (
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
            dataSource={searchFilteredProjects}
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
                          {project.description || 'No description'}
                        </Paragraph>
                        {renderStackTags(project)}
                      </Space>
                    }
                  />
                  <div style={{ marginTop: 16 }}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      {getCategoryValue(project, 'directory') || getCategoryValue(project, 'active_project_directory') ? (
                        <Space>
                          <FolderOpenOutlined />
                          <Text type="secondary" copyable={{ text: getCategoryValue(project, 'directory') || getCategoryValue(project, 'active_project_directory') }}>
                            {getCategoryValue(project, 'directory') || getCategoryValue(project, 'active_project_directory')}
                          </Text>
                        </Space>
                      ) : null}
                      <Space split="|">
                        {getCategoryValue(project, 'restart_command') || getCategoryValue(project, 'active_project_restart_cmd') ? (
                          <Space>
                            <Text type="secondary">Restart:</Text>
                            <Text type="secondary" code>
                              {getCategoryValue(project, 'restart_command') || getCategoryValue(project, 'active_project_restart_cmd')}
                            </Text>
                          </Space>
                        ) : null}
                        {getCategoryValue(project, 'log_command') || getCategoryValue(project, 'active_project_log_cmd') ? (
                          <Space>
                            <Text type="secondary">Logs:</Text>
                            <Text type="secondary" code>
                              {getCategoryValue(project, 'log_command') || getCategoryValue(project, 'active_project_log_cmd')}
                            </Text>
                          </Space>
                        ) : null}
                      </Space>
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
        width={1000}
        style={{ top: 20 }}
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
            help="Optional description to help identify what this project is for"
          >
            <Input.TextArea 
              placeholder="Brief description of the project..." 
              rows={3}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="categoryId"
            label="Category"
            rules={[
              { required: true, message: 'Please select a category' },
              {
                validator: (_, value) => {
                  if (value && !categories.find(c => c.id === value)) {
                    return Promise.reject('Please select a valid category');
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <Select
              placeholder="Select project category"
              onChange={handleCategoryChange}
              options={categories.map(cat => ({
                label: cat.name,
                value: cat.id,
              }))}
            />
          </Form.Item>

          <Divider>Project Variables</Divider>
          
          <div style={{ marginBottom: 24 }}>
            <ErrorBoundary>
              <ProjectCategoryVariableEditor
                projectId={editingProject?.id || 'new'}
                selectedCategoryId={selectedCategoryId}
                categoryValues={categoryValues}
                onChange={setCategoryValues}
              />
            </ErrorBoundary>
          </div>

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