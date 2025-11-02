import React, { useState } from 'react';
import { Card, Typography, theme, Tooltip } from 'antd';
import { 
  CopyOutlined, 
  ToolOutlined, 
  SettingOutlined,
  StarOutlined,
  StarFilled,
  CalendarOutlined,
  ClockCircleOutlined,
  TagOutlined,
  ApiOutlined,
  UserOutlined,
  EditOutlined,
  EnterOutlined,
  MenuUnfoldOutlined,
  ProjectOutlined,
  CodeOutlined,
  FolderOutlined,
  UnorderedListOutlined,
  ThunderboltOutlined,
  FormOutlined,
  CodeSandboxOutlined,
} from '@ant-design/icons';
import { InsertionItem } from '../../types/insertionHub';
import { useProjects } from '../../contexts/ProjectContext';

const { Text } = Typography;

interface VariableCardProps {
  item: InsertionItem;
  onInsert: (value: string) => void;
  onOpenBuilder?: (item: InsertionItem) => void;
}

// Icon mapping for string icons
const iconMap: Record<string, React.ReactNode> = {
  CalendarOutlined: <CalendarOutlined />,
  ClockCircleOutlined: <ClockCircleOutlined />,
  TagOutlined: <TagOutlined />,
  ApiOutlined: <ApiOutlined />,
  UserOutlined: <UserOutlined />,
  StarOutlined: <StarOutlined />,
  StarFilled: <StarFilled />,
  ToolOutlined: <ToolOutlined />,
  CopyOutlined: <CopyOutlined />,
  SettingOutlined: <SettingOutlined />,
  EditOutlined: <EditOutlined />,
  EnterOutlined: <EnterOutlined />,
  MenuUnfoldOutlined: <MenuUnfoldOutlined />,
  ProjectOutlined: <ProjectOutlined />,
  CodeOutlined: <CodeOutlined />,
  FolderOutlined: <FolderOutlined />,
  UnorderedListOutlined: <UnorderedListOutlined />,
  ThunderboltOutlined: <ThunderboltOutlined />,
  FormOutlined: <FormOutlined />,
  CodeSandboxOutlined: <CodeSandboxOutlined />,
};

const getIcon = (icon?: React.ReactNode | string): React.ReactNode => {
  if (!icon) return null;
  if (typeof icon === 'string') {
    return iconMap[icon] || null;
  }
  return icon;
};

export const VariableCard: React.FC<VariableCardProps> = ({ 
  item, 
  onInsert, 
  onOpenBuilder
}) => {
  const { activeProject } = useProjects();
  const [dateFormat] = useState('%Y-%m-%d');
  const [dateOffset] = useState(0);
  const {
    token: { colorBorder, colorTextSecondary },
  } = theme.useToken();

  const previewText = item.preview ? item.preview(activeProject || undefined) : item.value;

  const handleInsert = () => {
    if (item.quickSettings && (item.key === 'date' || item.key === 'time' || item.key === 'datetime')) {
      // Build the variable with format and offset
      let value = `{{${item.key}`;
      if (dateFormat !== '%Y-%m-%d') {
        value += `:format=${dateFormat}`;
      }
      if (dateOffset !== 0) {
        value += `${dateFormat !== '%Y-%m-%d' ? ',' : ':'}offset=${dateOffset}`;
      }
      value += '}}';
      onInsert(value);
    } else {
      onInsert(item.value);
    }
  };


  const cardStyle: React.CSSProperties = {
    marginBottom: 8,
    borderColor: colorBorder,
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const cardHoverStyle: React.CSSProperties = {
    borderColor: '#1890ff',
    boxShadow: '0 2px 8px rgba(24, 144, 255, 0.15)',
  };

  const handleCardClick = () => {
    if (item.action === 'builder' && onOpenBuilder) {
      onOpenBuilder(item);
    } else if (item.quickSettings) {
      // For quick settings items, we'll still need a way to access settings
      // For now, just insert with default format
      handleInsert();
    } else {
      handleInsert();
    }
  };

  return (
    <Card
      size="small"
      style={cardStyle}
      onMouseEnter={(e) => {
        Object.assign(e.currentTarget.style, cardHoverStyle);
      }}
      onMouseLeave={(e) => {
        Object.assign(e.currentTarget.style, cardStyle);
      }}
      onClick={handleCardClick}
      bodyStyle={{ padding: '12px 16px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Icon and label */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          {getIcon(item.icon)}
          <div style={{ flex: 1 }}>
            {item.description ? (
              <Tooltip title={item.description} placement="left">
                <Text strong style={{ fontSize: 14 }}>{item.label}</Text>
              </Tooltip>
            ) : item.category === 'extensions' && previewText ? (
              <Tooltip title={previewText} placement="left">
                <Text strong style={{ fontSize: 14 }}>{item.label}</Text>
              </Tooltip>
            ) : (
              <Text strong style={{ fontSize: 14 }}>{item.label}</Text>
            )}
            {previewText && item.category !== 'extensions' && (
              <Text 
                type="secondary" 
                style={{ 
                  fontSize: 12, 
                  display: 'block',
                  marginTop: 3,
                  color: colorTextSecondary 
                }}
              >
                {previewText}
              </Text>
            )}
          </div>
        </div>

        {/* Special indicators for builder/settings items */}
        {item.action === 'builder' && (
          <ToolOutlined style={{ color: colorTextSecondary, fontSize: 16 }} />
        )}
        {item.quickSettings && (
          <SettingOutlined style={{ color: colorTextSecondary, fontSize: 16 }} />
        )}
      </div>
    </Card>
  );
};