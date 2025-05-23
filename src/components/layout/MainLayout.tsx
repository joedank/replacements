import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Typography, theme, Select, Space } from 'antd';
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
} from '@ant-design/icons';
import * as Icons from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useReplacements } from '../../contexts/ReplacementContext';
import { useProjects } from '../../contexts/ProjectContext';
import { invoke } from '@tauri-apps/api/core';

const { Header, Sider, Content, Footer } = Layout;
const { Title } = Typography;

interface MainLayoutProps {
  children: React.ReactNode;
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

type MenuItem = Required<MenuProps>['items'][number];

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(['dashboard']);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  
  const { 
    loadReplacements,
    selectMenuItem 
  } = useReplacements();
  
  const {
    projects,
    activeProject,
    loadProjects,
    setActiveProject
  } = useProjects();

  // Load categories
  const loadCategories = async () => {
    try {
      const data = await invoke<Category[]>('get_categories');
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  // Load replacements, projects, and categories on component mount
  useEffect(() => {
    loadReplacements();
    loadProjects();
    loadCategories();
  }, [loadReplacements, loadProjects]);

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
      children: categories.map((category) => ({
        key: `category-${category.id}`,
        icon: getIconComponent(category.icon),
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
          key: 'category-settings',
          label: 'Categories',
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
          borderBottom: '1px solid #f0f0f0',
        }}>
          {!collapsed && (
            <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
              BRM
            </Title>
          )}
          {collapsed && (
            <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
              B
            </Title>
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
                ...projects.map(project => ({
                  label: project.name,
                  value: project.id,
                  title: project.description,
                }))
              ]}
              suffixIcon={<FolderOpenOutlined />}
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