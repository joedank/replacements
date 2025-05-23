import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Typography, theme } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
  FileTextOutlined,
  ProjectOutlined,
  FileOutlined,
  SettingOutlined,
  SearchOutlined,
  CodeOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useReplacements } from '../../contexts/ReplacementContext';

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
    globalReplacements, 
    baseReplacements, 
    aiReplacements,
    loading,
    loadReplacements,
    selectReplacement,
    selectMenuItem 
  } = useReplacements();

  // Load replacements on component mount
  useEffect(() => {
    loadReplacements();
  }, [loadReplacements]);

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    const key = e.key;
    setSelectedKeys([key]);

    // Handle trigger selection
    if (key.startsWith('global-')) {
      const index = parseInt(key.replace('global-', ''));
      selectReplacement('global', index);
    } else if (key.startsWith('base-')) {
      const index = parseInt(key.replace('base-', ''));
      selectReplacement('base', index);
    } else if (key.startsWith('ai-')) {
      const index = parseInt(key.replace('ai-', ''));
      selectReplacement('ai', index);
    } else {
      // Handle other menu items
      selectMenuItem(key);
    }
  };

  const menuItems: MenuItem[] = [
    {
      key: 'dashboard',
      icon: <HomeOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'global',
      icon: <FileTextOutlined />,
      label: loading ? 'Global (loading...)' : `Global (${globalReplacements.length})`,
      children: globalReplacements.map((replacement, index) => ({
        key: `global-${index}`,
        label: (
          <span style={{ 
            fontFamily: 'monospace', 
            fontSize: '12px',
            color: '#595959',
            paddingLeft: '8px'
          }}>
            {replacement.trigger}
          </span>
        ),
      })),
    },
    {
      key: 'base',
      icon: <CodeOutlined />,
      label: loading ? 'Base (loading...)' : `Base (${baseReplacements.length})`,
      children: baseReplacements.map((replacement, index) => ({
        key: `base-${index}`,
        label: (
          <span style={{ 
            fontFamily: 'monospace', 
            fontSize: '12px',
            color: '#595959',
            paddingLeft: '8px'
          }}>
            {replacement.trigger}
          </span>
        ),
      })),
    },
    {
      key: 'ai-prompts',
      icon: <RobotOutlined />,
      label: loading ? 'AI Prompts (loading...)' : `AI Prompts (${aiReplacements.length})`,
      children: aiReplacements.map((replacement, index) => ({
        key: `ai-${index}`,
        label: (
          <span style={{ 
            fontFamily: 'monospace', 
            fontSize: '12px',
            color: '#595959',
            paddingLeft: '8px'
          }}>
            {replacement.trigger}
          </span>
        ),
      })),
    },
    {
      key: 'projects',
      icon: <ProjectOutlined />,
      label: 'Projects',
      children: [
        {
          key: 'project-list',
          label: 'All Projects',
        },
        {
          key: 'project-create',
          label: 'Create Project',
        },
      ],
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
        className="custom-sidebar"
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
            borderBottom: '1px solid #f0f0f0',
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}
        >
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
        </Header>
        
        <Content
          style={{
            margin: '16px',
            padding: '24px',
            minHeight: 'calc(100vh - 64px - 70px - 32px)', // Header + Footer + margins
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: 'auto',
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