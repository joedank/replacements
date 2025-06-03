import React, { useState } from 'react';
import { Layout, Tree, Input, Tooltip, Typography } from 'antd';
import { 
  ProjectOutlined,
  CalendarOutlined,
  UserOutlined,
  SearchOutlined,
  PushpinOutlined,
  PushpinFilled,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  FolderOutlined,
  TagOutlined,
  CodeOutlined,
  FileTextOutlined,
  RobotOutlined,
  BulbOutlined,
  DatabaseOutlined,
  ApiOutlined,
  ThunderboltOutlined,
  HeartOutlined,
  StarOutlined,
  CrownOutlined
} from '@ant-design/icons';
import type { TreeDataNode } from 'antd';
import { useProjects } from '../../contexts/ProjectContext';
import { useVariables } from '../../contexts/VariablesContext';
import { useProjectCategories } from '../../contexts/ProjectCategoriesContext';
import { VariablesManager } from '../variables/VariablesManager';
import { getCategoryValue } from '../../utils/projectHelpers';

const { Sider } = Layout;
const { Search } = Input;
const { Text } = Typography;

interface VariablesPanelProps {
  onVariableSelect?: (variable: string) => void;
}

export const VariablesPanel: React.FC<VariablesPanelProps> = ({ onVariableSelect }) => {
  const [collapsed, setCollapsed] = useState(true);
  const [pinned, setPinned] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(['project', 'datetime']);
  const [showManager, setShowManager] = useState(false);
  
  const { activeProject } = useProjects();
  const { categories } = useVariables();
  const { categories: projectCategories } = useProjectCategories();

  // Get live preview for variables
  const getVariablePreview = (variable: string): string => {
    const now = new Date();
    const previews: Record<string, string> = {
      '{{active_project_name}}': activeProject?.name || 'My Project',
      '{{active_project_stack}}': activeProject ? getCategoryValue(activeProject, 'tech_stack') || getCategoryValue(activeProject, 'active_project_stack') || 'React, TypeScript' : 'React, TypeScript',
      '{{active_project_directory}}': activeProject ? getCategoryValue(activeProject, 'directory') || getCategoryValue(activeProject, 'active_project_directory') || '/path/to/project' : '/path/to/project',
      '{{active_project_restart_cmd}}': activeProject ? getCategoryValue(activeProject, 'restart_command') || getCategoryValue(activeProject, 'active_project_restart_cmd') || 'npm run dev' : 'npm run dev',
      '{{active_project_log_cmd}}': activeProject ? getCategoryValue(activeProject, 'log_command') || getCategoryValue(activeProject, 'active_project_log_cmd') || 'npm run logs' : 'npm run logs',
      '{{date}}': now.toLocaleDateString(),
      '{{time}}': now.toLocaleTimeString(),
      '{{datetime}}': now.toLocaleString(),
      '{{year}}': now.getFullYear().toString(),
      '{{month}}': String(now.getMonth() + 1).padStart(2, '0'),
      '{{day}}': String(now.getDate()).padStart(2, '0'),
      '{{user_name}}': 'Current User',
      '{{user_email}}': 'user@example.com',
      '{{clipboard}}': 'Current clipboard content',
    };
    
    // Add active project's category variables
    if (activeProject?.categoryValues && projectCategories) {
      projectCategories.forEach(category => {
        const categoryValues = activeProject.categoryValues?.[category.id] || {};
        category.variableDefinitions.forEach(varDef => {
          const value = categoryValues[varDef.id] || varDef.defaultValue;
          if (value) {
            previews[`{{${varDef.name}}}`] = value;
          }
        });
      });
    }
    
    return previews[variable] || variable;
  };

  // Helper to create clickable variable node
  const createVariableNode = (variable: string, key: string, preview?: string) => ({
    title: (
      <Tooltip title={preview || getVariablePreview(variable)}>
        <span 
          style={{ cursor: 'pointer' }}
          onMouseDown={(e) => {
            e.preventDefault(); // Prevent focus loss
            onVariableSelect?.(variable);
          }}
        >
          {variable}
        </span>
      </Tooltip>
    ),
    key,
    isLeaf: true,
  });

  // Get icon component from string name
  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, React.ReactElement> = {
      FolderOutlined: <FolderOutlined />,
      TagOutlined: <TagOutlined />,
      UserOutlined: <UserOutlined />,
      CodeOutlined: <CodeOutlined />,
      FileTextOutlined: <FileTextOutlined />,
      RobotOutlined: <RobotOutlined />,
      BulbOutlined: <BulbOutlined />,
      SettingOutlined: <SettingOutlined />,
      DatabaseOutlined: <DatabaseOutlined />,
      ApiOutlined: <ApiOutlined />,
      ThunderboltOutlined: <ThunderboltOutlined />,
      HeartOutlined: <HeartOutlined />,
      StarOutlined: <StarOutlined />,
      CrownOutlined: <CrownOutlined />,
      ProjectOutlined: <ProjectOutlined />,
      CalendarOutlined: <CalendarOutlined />,
    };
    return iconMap[iconName] || <FolderOutlined />;
  };

  // Build tree data with built-in and custom variables
  const builtInCategories: TreeDataNode[] = [
    {
      title: 'Project',
      key: 'project',
      icon: <ProjectOutlined />,
      children: [
        createVariableNode('{{active_project_name}}', 'active_project_name'),
        createVariableNode('{{active_project_stack}}', 'active_project_stack'),
        createVariableNode('{{active_project_directory}}', 'active_project_directory'),
        createVariableNode('{{active_project_restart_cmd}}', 'active_project_restart_cmd'),
        createVariableNode('{{active_project_log_cmd}}', 'active_project_log_cmd'),
        // Add category variables for active project
        ...(activeProject?.categoryValues && projectCategories ? 
          projectCategories.flatMap(category => {
            const categoryValues = activeProject.categoryValues?.[category.id] || {};
            return category.variableDefinitions
              .filter(varDef => categoryValues[varDef.id] || varDef.defaultValue)
              .map(varDef => 
                createVariableNode(`{{${varDef.name}}}`, `category_${category.id}_${varDef.id}`)
              );
          }) : []
        ),
      ],
    },
    {
      title: 'Date & Time',
      key: 'datetime',
      icon: <CalendarOutlined />,
      children: [
        createVariableNode('{{date}}', 'date'),
        createVariableNode('{{time}}', 'time'),
        createVariableNode('{{datetime}}', 'datetime'),
      ],
    },
    {
      title: 'User Context',
      key: 'user',
      icon: <UserOutlined />,
      children: [
        createVariableNode('{{user_name}}', 'user_name'),
        createVariableNode('{{user_email}}', 'user_email'),
        createVariableNode('{{clipboard}}', 'clipboard'),
      ],
    },
  ];

  // Add custom categories
  const customCategories: TreeDataNode[] = categories.map(category => ({
    title: category.name,
    key: `custom_${category.id}`,
    icon: getIconComponent(category.icon),
    children: category.variables.map(variable => 
      createVariableNode(variable.value, `custom_${category.id}_${variable.id}`, variable.preview)
    ),
  }));

  const treeData: TreeDataNode[] = [...builtInCategories, ...customCategories];

  // Filter tree data based on search
  const filterTreeData = (data: TreeDataNode[], searchValue: string): TreeDataNode[] => {
    if (!searchValue) return data;
    
    return data.reduce((filtered, node) => {
      const nodeMatches = node.key?.toString().toLowerCase().includes(searchValue.toLowerCase());
      const filteredChildren = node.children ? filterTreeData(node.children, searchValue) : [];
      
      if (nodeMatches || filteredChildren.length > 0) {
        filtered.push({
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children,
        });
      }
      
      return filtered;
    }, [] as TreeDataNode[]);
  };

  const filteredData = filterTreeData(treeData, searchValue);

  return (
    <>
      <Sider 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        collapsible
        trigger={null}
        width={280}
        style={{ 
          background: 'transparent',
          borderRight: '1px solid #f0f0f0',
          position: pinned ? 'sticky' : 'relative',
          top: pinned ? 0 : 'auto',
          height: pinned ? '100vh' : 'auto',
          zIndex: pinned ? 10 : 'auto',
        }}
      >
        <div style={{ padding: collapsed ? '16px 8px' : '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {!collapsed && (
              <>
                <Text strong style={{ fontSize: 16 }}>Variables</Text>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Tooltip title="Manage variables">
                    <div 
                      onClick={() => setShowManager(true)}
                      style={{ cursor: 'pointer' }}
                    >
                      <SettingOutlined />
                    </div>
                  </Tooltip>
                  <Tooltip title={pinned ? "Unpin panel" : "Pin panel"}>
                    <div 
                      onClick={() => setPinned(!pinned)}
                      style={{ cursor: 'pointer' }}
                    >
                      {pinned ? <PushpinFilled /> : <PushpinOutlined />}
                    </div>
                  </Tooltip>
                  <div onClick={() => setCollapsed(true)} style={{ cursor: 'pointer' }}>
                    <MenuFoldOutlined />
                  </div>
                </div>
              </>
            )}
            {collapsed && (
              <div onClick={() => setCollapsed(false)} style={{ cursor: 'pointer', textAlign: 'center', width: '100%' }}>
                <MenuUnfoldOutlined />
              </div>
            )}
          </div>
          
          {!collapsed && (
            <>
              <Search
                placeholder="Search variables..."
                prefix={<SearchOutlined />}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                style={{ marginBottom: 16 }}
                allowClear
              />
              
              <div style={{ flex: 1, overflow: 'auto' }}>
                <Tree
                  treeData={filteredData}
                  defaultExpandedKeys={expandedKeys}
                  expandedKeys={expandedKeys}
                  onExpand={setExpandedKeys}
                  showIcon
                  selectable={false}
                  style={{ background: 'transparent' }}
                />
                
                {activeProject && (
                  <div style={{ marginTop: 16, padding: 12, background: '#f0f0ff', borderRadius: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Active Project:
                    </Text>
                    <br />
                    <Text strong style={{ fontSize: 14 }}>
                      {activeProject.name}
                    </Text>
                  </div>
                )}
              </div>
              
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Click variables to insert
                </Text>
              </div>
            </>
          )}
          
          {collapsed && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text type="secondary" style={{ writingMode: 'vertical-rl' }}>Variables</Text>
            </div>
          )}
        </div>
      </Sider>
      
      <VariablesManager
        visible={showManager}
        onClose={() => setShowManager(false)}
      />
    </>
  );
};