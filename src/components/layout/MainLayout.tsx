import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Typography, theme, Select, Space, Avatar, Badge } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
  FileTextOutlined,
  ProjectOutlined,
  FileOutlined,
  SettingOutlined,
  SearchOutlined,
  FolderOpenOutlined,
  EditOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import * as Icons from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useReplacements } from '../../contexts/ReplacementContext';
import { useProjects } from '../../contexts/ProjectContext';
import { useProjectCategories } from '../../contexts/ProjectCategoriesContext';
import { useCategories } from '../../contexts/CategoriesContext';
import { getCategoryValue } from '../../utils/projectHelpers';

const { Header, Sider, Content, Footer } = Layout;
const { Title } = Typography;

interface MainLayoutProps {
  children: React.ReactNode;
}


type MenuItem = Required<MenuProps>['items'][number];

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(['dashboard']);
  
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  
  const {
    selectMenuItem
  } = useReplacements();
  
  const {
    filteredProjects,
    activeProject,
    selectedCategoryId,
    loadProjects,
    setActiveProject,
    setSelectedCategory
  } = useProjects();
  
  const { categories: projectCategories } = useProjectCategories();
  const { categories: replacementCategories } = useCategories();

  // Load projects on component mount
  // Note: Replacements auto-load in ReplacementContext when paths are ready
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    const key = e.key;
    setSelectedKeys([key]);

    // Handle category selection
    if (key.startsWith('category-')) {
      selectMenuItem(key);
    } else {
      // Handle other menu items
      selectMenuItem(key);
    }
  };

  // Get icon component from icon name
  const getIconComponent = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent /> : <FileTextOutlined />;
  };

  const menuItems: MenuItem[] = [
    {
      key: 'dashboard',
      icon: <HomeOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'replacements',
      icon: <EditOutlined />,
      label: 'Replacements',
      children: replacementCategories
        .filter(cat => cat.fileName) // Only filter by fileName existence
        .map((category) => ({
          key: `category-${category.fileName?.replace('.yml', '')}`,
          icon: getIconComponent(category.icon || 'FileTextOutlined'),
          label: category.name,
        })),
    },
    {
      key: 'projects',
      icon: <ProjectOutlined />,
      label: 'Projects',
    },
    {
      key: 'templates',
      icon: <FileOutlined />,
      label: 'AI Templates',
      children: [
        {
          key: 'prompt-library',
          label: 'Prompt Library',
        },
        {
          key: 'template-editor',
          label: 'Template Editor',
        },
      ],
    },
    {
      key: 'search',
      icon: <SearchOutlined />,
      label: 'Search & Filter',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      children: [
        {
          key: 'general-settings',
          label: 'General',
        },
        {
          key: 'api-settings',
          label: 'API Configuration',
        },
        {
          key: 'ai-prompts-settings',
          label: 'AI Prompts',
        },
        {
          key: 'project-category-settings',
          label: 'Project Categories',
        },
        {
          key: 'espanso-config',
          label: 'Espanso Config',
        },
        {
          key: 'preferences',
          label: 'Preferences',
        },
        {
          key: 'import-export',
          label: 'Import/Export',
        },
      ],
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE and Edge
        }}
        width={240}
      >
        <div style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 16px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}>
          {!collapsed && (
            <Space align="center" size={12}>
              <Avatar
                size={40}
                icon={<SwapOutlined style={{ fontSize: '20px' }} />}
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#764ba2',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  border: '2px solid rgba(255, 255, 255, 0.3)'
                }}
              />
              <div>
                <Title level={4} style={{
                  margin: 0,
                  color: '#fff',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                }}>
                  BRM
                </Title>
                <span style={{
                  fontSize: '10px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  letterSpacing: '0.5px',
                  fontWeight: 500
                }}>
                  Better Replacements
                </span>
              </div>
            </Space>
          )}
          {collapsed && (
            <Badge
              dot
              color="#52c41a"
              offset={[-5, 5]}
              style={{ width: '100%' }}
            >
              <Avatar
                size={40}
                icon={<SwapOutlined style={{ fontSize: '20px' }} />}
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#764ba2',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  border: '2px solid rgba(255, 255, 255, 0.3)'
                }}
              />
            </Badge>
          )}
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          style={{ borderRight: 0 }}
          onClick={handleMenuClick}
        />
      </Sider>
      
      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            padding: '0 16px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '16px',
                width: 64,
                height: 64,
              }}
            />
            
            <Title level={3} style={{ margin: 0, marginLeft: '16px' }}>
              BetterReplacementsManager
            </Title>
          </div>
          
          <Space>
            <Select
              style={{ width: 200 }}
              placeholder={selectedCategoryId ? undefined : "All categories"}
              value={selectedCategoryId || undefined}
              onChange={(value) => setSelectedCategory(value || null)}
              allowClear
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={[
                {
                  label: 'All categories',
                  value: '',
                },
                ...projectCategories.map(category => ({
                  label: category.name,
                  value: category.id,
                }))
              ]}
              suffixIcon={<FolderOpenOutlined />}
            />
            
            <Select
              style={{ width: 250 }}
              placeholder="Select active project"
              value={activeProject?.id || undefined}
              onChange={(value) => setActiveProject(value || null)}
              allowClear
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={[
                {
                  label: 'No active project',
                  value: '',
                },
                ...filteredProjects.map(project => ({
                  label: project.name,
                  value: project.id,
                  title: getCategoryValue(project, 'project_description') || 'No description',
                }))
              ]}
              suffixIcon={<ProjectOutlined />}
            />
          </Space>
        </Header>
        
        <Content
          style={{
            margin: '16px',
            padding: 0,
            height: 'calc(100vh - 64px - 70px - 32px)', // Header + Footer + margins
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </Content>
        
        <Footer
          style={{
            textAlign: 'center',
            background: colorBgContainer,
            borderTop: '1px solid #f0f0f0',
            padding: '12px 16px',
          }}
        >
          BetterReplacementsManager ©{new Date().getFullYear()} - Text Replacement & AI Template Manager
        </Footer>
      </Layout>
    </Layout>
  );
};

export default MainLayout;