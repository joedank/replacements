import React, { useState, useEffect } from 'react';
import {
  Card,
  Input,
  Space,
  Typography,
  Tag,
  Empty,
  Alert,
  Spin,
} from 'antd';
import {
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

const { Title, Text } = Typography;

interface ProjectCategoryVariableEditorProps {
  projectId: string;
  selectedCategoryId: string; // The currently selected category
  categoryValues: Record<string, Record<string, string>>; // categoryId -> variableId -> value
  onChange: (categoryValues: Record<string, Record<string, string>>) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  InfoCircleOutlined: <InfoCircleOutlined />,
  CodeOutlined: <CodeOutlined />,
  MailOutlined: <MailOutlined />,
  TeamOutlined: <TeamOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  DatabaseOutlined: <DatabaseOutlined />,
  ApiOutlined: <ApiOutlined />,
  GlobalOutlined: <GlobalOutlined />,
  BulbOutlined: <BulbOutlined />,
  ToolOutlined: <ToolOutlined />,
  HeartOutlined: <HeartOutlined />,
  RocketOutlined: <RocketOutlined />,
  StarOutlined: <StarOutlined />,
  FolderOutlined: <FolderOutlined />,
  TagOutlined: <TagOutlined />,
  UserOutlined: <UserOutlined />,
};

const getIcon = (iconName?: string) => {
  if (!iconName) return <InfoCircleOutlined />;
  return iconMap[iconName] || <InfoCircleOutlined />;
};

export const ProjectCategoryVariableEditor: React.FC<ProjectCategoryVariableEditorProps> = ({
  selectedCategoryId,
  categoryValues,
  onChange,
}) => {
  const { categories, loading } = useProjectCategories();
  const [localValues, setLocalValues] = useState<Record<string, Record<string, string>>>(categoryValues);
  
  // Find the selected category
  const selectedCategory = (categories || []).find(c => c.id === selectedCategoryId);
  
  // Normalize selected category to ensure variableDefinitions exists
  const safeCategory = selectedCategory ? {
    ...selectedCategory,
    variableDefinitions: selectedCategory.variableDefinitions ?? [],
  } : null;

  // Use a simple approach - each form will be created inline in the render

  // Update local values when categoryValues prop changes
  useEffect(() => {
    setLocalValues(categoryValues);
  }, [categoryValues]);

  // Handle value changes
  const handleValueChange = (categoryId: string, variableId: string, value: string) => {
    const newValues = {
      ...localValues,
      [categoryId]: {
        ...localValues[categoryId],
        [variableId]: value,
      },
    };
    setLocalValues(newValues);
    onChange(newValues);
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  if (!selectedCategoryId) {
    return (
      <Card>
        <Empty
          description="Please select a category to configure variables"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  if (!safeCategory) {
    return (
      <Card>
        <Empty
          description="Selected category not found"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ marginBottom: 16 }}>
        <Space>
          {getIcon(safeCategory.icon)}
          <Title level={4} style={{ margin: 0 }}>
            {safeCategory.name} Variables
          </Title>
          {safeCategory.isDefault && <Tag color="blue">Default</Tag>}
        </Space>
      </div>
      
      <Alert
        message="Variable Context"
        description="These variables will be available to AI when generating replacements for this project. Variables can be referenced using {{variable_name}} syntax."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {safeCategory.description && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          {safeCategory.description}
        </Text>
      )}

      {safeCategory.variableDefinitions.length === 0 ? (
        <Empty
          description={`No variables defined for ${safeCategory.name}`}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          {safeCategory.variableDefinitions.map(varDef => {
            const currentValue = localValues[safeCategory.id]?.[varDef.id] || varDef.defaultValue || '';
            return (
              <div key={varDef.id}>
                <div style={{ marginBottom: 8 }}>
                  <Space>
                    <Tag>{`{{${varDef.name}}}`}</Tag>
                    {varDef.required && <Tag color="red">Required</Tag>}
                  </Space>
                </div>
                {varDef.description && (
                  <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>
                    {varDef.description}
                  </div>
                )}
                <Input.TextArea
                  rows={2}
                  value={currentValue}
                  placeholder={varDef.defaultValue || `Enter ${varDef.name}`}
                  onChange={(e) => handleValueChange(safeCategory.id, varDef.id, e.target.value)}
                />
              </div>
            );
          })}
        </Space>
      )}
    </Card>
  );
};