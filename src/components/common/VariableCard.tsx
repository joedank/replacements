import React, { useState } from 'react';
import { Card, Button, Space, Popover, Form, Select, Typography, theme, Tooltip } from 'antd';
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
import { COMMON_DATE_FORMATS, COMMON_DATE_OFFSETS } from '../../types/extensions';

const { Text } = Typography;

interface VariableCardProps {
  item: InsertionItem;
  onInsert: (value: string) => void;
  onOpenBuilder?: (item: InsertionItem) => void;
  onToggleFavorite?: (key: string) => void;
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
  onOpenBuilder,
  onToggleFavorite 
}) => {
  const { activeProject } = useProjects();
  const [dateFormat, setDateFormat] = useState('%Y-%m-%d');
  const [dateOffset, setDateOffset] = useState(0);
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

  const dateSettingsContent = (
    <div style={{ width: 250 }}>
      <Form layout="vertical" size="small">
        <Form.Item label="Format" style={{ marginBottom: 12 }}>
          <Select
            value={dateFormat}
            onChange={setDateFormat}
            style={{ width: '100%' }}
            size="small"
          >
            {COMMON_DATE_FORMATS.map(fmt => (
              <Select.Option key={fmt.value} value={fmt.value}>
                <Space>
                  <Text code style={{ fontSize: 11 }}>{fmt.value}</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>{fmt.label}</Text>
                </Space>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        
        <Form.Item label="Offset" style={{ marginBottom: 12 }}>
          <Select
            value={dateOffset}
            onChange={setDateOffset}
            style={{ width: '100%' }}
            size="small"
          >
            {COMMON_DATE_OFFSETS.map(offset => (
              <Select.Option key={offset.value} value={offset.value}>
                {offset.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        
        <Button type="primary" size="small" block onClick={handleInsert}>
          Insert
        </Button>
      </Form>
    </div>
  );

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
      bodyStyle={{ padding: '8px 12px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Icon and label */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          {getIcon(item.icon)}
          <div style={{ flex: 1 }}>
            {item.category === 'extensions' && previewText ? (
              <Tooltip title={previewText} placement="left">
                <Text strong style={{ fontSize: 13 }}>{item.label}</Text>
              </Tooltip>
            ) : (
              <Text strong style={{ fontSize: 13 }}>{item.label}</Text>
            )}
            {previewText && item.category !== 'extensions' && (
              <Text 
                type="secondary" 
                style={{ 
                  fontSize: 11, 
                  display: 'block',
                  marginTop: 2,
                  color: colorTextSecondary 
                }}
              >
                {previewText}
              </Text>
            )}
          </div>
        </div>

        {/* Actions */}
        <Space size={4}>
          {onToggleFavorite && (
            <Button
              type="text"
              size="small"
              icon={item.isFavorite ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(item.key);
              }}
            />
          )}
          
          {item.quickSettings ? (
            <Popover
              content={dateSettingsContent}
              title="Date/Time Settings"
              trigger="click"
              placement="left"
            >
              <Button
                type="primary"
                size="small"
                icon={<SettingOutlined />}
                onClick={(e) => e.stopPropagation()}
              >
                Insert
              </Button>
            </Popover>
          ) : item.action === 'builder' ? (
            <Button
              size="small"
              icon={<ToolOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenBuilder) {
                  onOpenBuilder(item);
                }
              }}
              style={{ color: colorTextSecondary }}
            >
              Open builder
            </Button>
          ) : (
            <Button
              type="primary"
              size="small"
              icon={<CopyOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleInsert();
              }}
            >
              Insert
            </Button>
          )}
        </Space>
      </div>
    </Card>
  );
};