import React, { useState, useMemo, useEffect } from 'react';
import { 
  Input, 
  Menu,
  Typography, 
  Space, 
  Button,
  theme,
  Empty,
  Divider,
  Alert,
} from 'antd';
import { 
  SearchOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  StarFilled,
  SettingOutlined,
  CalendarOutlined,
  UserOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import { useProjects } from '../../contexts/ProjectContext';
import { useVariables } from '../../contexts/VariablesContext';
import { useSavedExtensions } from '../../contexts/SavedExtensionsContext';
import { useProjectCategories } from '../../contexts/ProjectCategoriesContext';
import { VariableCard } from './VariableCard';
import { ExtensionBuilder } from '../extensions';
import { SavedExtensionsManager } from '../extensions';
import { 
  InsertionItem, 
  INSERTION_CATEGORIES,
} from '../../types/insertionHub';
import { ExtensionType } from '../../types/extensions';

const { Search } = Input;
const { Text } = Typography;

interface InsertionHubProps {
  onInsert: (value: string) => void;
}


export const InsertionHub: React.FC<InsertionHubProps> = ({ onInsert }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('system');
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderType, setBuilderType] = useState<ExtensionType>('date');
  const [showExtensionsManager, setShowExtensionsManager] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  const { activeProject } = useProjects();
  const { categories: customVarCategories } = useVariables();
  const { savedExtensions } = useSavedExtensions();
  const { categories: projectCategories } = useProjectCategories();
  
  const {
    token: { colorBgContainer, colorBorder },
  } = theme.useToken();

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('insertionHub_favorites');
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }
  }, []);

  // Save favorites to localStorage
  const toggleFavorite = (key: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(key)) {
      newFavorites.delete(key);
    } else {
      newFavorites.add(key);
    }
    setFavorites(newFavorites);
    localStorage.setItem('insertionHub_favorites', JSON.stringify(Array.from(newFavorites)));
  };

  // Build all insertion items
  const allItems = useMemo((): InsertionItem[] => {
    const items: InsertionItem[] = [];

    // System variables
    items.push(
      {
        key: 'clipboard',
        label: 'Clipboard',
        value: '{{clipboard}}',
        category: 'system',
        icon: 'CopyOutlined',
        preview: () => 'Current clipboard content',
      },
      {
        key: 'cursor',
        label: 'Cursor',
        value: '$|$',
        category: 'system',
        icon: 'EditOutlined',
        preview: () => 'Cursor position after expansion',
      },
      {
        key: 'newline',
        label: 'New Line',
        value: '\\n',
        category: 'system',
        icon: 'EnterOutlined',
        preview: () => 'Line break',
      },
      {
        key: 'tab',
        label: 'Tab',
        value: '\\t',
        category: 'system',
        icon: 'MenuUnfoldOutlined',
        preview: () => 'Tab character',
      },
    );

    // Date & Time variables
    items.push(
      {
        key: 'date',
        label: 'Date',
        value: '{{date}}',
        category: 'datetime',
        icon: 'CalendarOutlined',
        preview: () => 'Current date',
        quickSettings: true,
      },
      {
        key: 'time',
        label: 'Time',
        value: '{{time}}',
        category: 'datetime',
        icon: 'ClockCircleOutlined',
        preview: () => 'Current time',
        quickSettings: true,
      },
      {
        key: 'datetime',
        label: 'Date & Time',
        value: '{{datetime}}',
        category: 'datetime',
        icon: 'CalendarOutlined',
        preview: () => 'Current date and time',
        quickSettings: true,
      },
      {
        key: 'timestamp',
        label: 'Timestamp',
        value: '{{date:format=%s}}',
        category: 'datetime',
        icon: 'ClockCircleOutlined',
        preview: () => 'Unix timestamp',
      },
    );

    // Project-aware variables (in system category)
    if (activeProject && activeProject.categoryId && activeProject.categoryValues && projectCategories) {
      // Only include variables from the project's category
      const projectCategory = projectCategories.find(cat => cat.id === activeProject.categoryId);
      if (projectCategory) {
        const categoryValues = activeProject.categoryValues?.[projectCategory.id] || {};
        projectCategory.variableDefinitions.forEach(varDef => {
          const value = categoryValues[varDef.id] || varDef.defaultValue;
          if (value) {
            items.push({
              key: `project-cat-${projectCategory.id}-${varDef.id}`,
              label: varDef.description || varDef.name,
              value: `{{${varDef.name}}}`,
              category: 'system',
              icon: 'ProjectOutlined',
              preview: () => value || 'Not set',
            });
          }
        });
        
      }
    }

    // Custom variables
    customVarCategories.forEach(category => {
      category.variables.forEach(variable => {
        items.push({
          key: `custom-${variable.id}`,
          label: variable.name,
          value: variable.value,
          category: 'custom',
          icon: 'UserOutlined',
          preview: () => variable.preview || variable.value,
        });
      });
    });

    // Extension builders
    items.push(
      {
        key: 'ext-choice',
        label: 'Choice',
        value: '',
        category: 'extensions',
        icon: 'UnorderedListOutlined',
        action: 'builder',
        builderType: 'choice',
        preview: () => 'Interactive choice from list',
      },
      {
        key: 'ext-random',
        label: 'Random',
        value: '',
        category: 'extensions',
        icon: 'ThunderboltOutlined',
        action: 'builder',
        builderType: 'random',
        preview: () => 'Random selection from list',
      },
      {
        key: 'ext-form',
        label: 'Form',
        value: '',
        category: 'extensions',
        icon: 'FormOutlined',
        action: 'builder',
        builderType: 'form',
        preview: () => 'Interactive form input',
      },
      {
        key: 'ext-shell',
        label: 'Shell Command',
        value: '',
        category: 'extensions',
        icon: 'CodeSandboxOutlined',
        action: 'builder',
        builderType: 'shell',
        preview: () => 'Execute shell command',
      },
      {
        key: 'ext-script',
        label: 'Script',
        value: '',
        category: 'extensions',
        icon: 'CodeOutlined',
        action: 'builder',
        builderType: 'script',
        preview: () => 'Run custom script',
      },
    );

    // Add saved extensions
    savedExtensions.forEach(saved => {
      items.push({
        key: `saved-${saved.id}`,
        label: saved.name,
        value: `{{${saved.extension.name}}}`,
        category: 'extensions',
        icon: saved.isFavorite ? 'StarFilled' : 'ApiOutlined',
        preview: () => saved.description || `${saved.extension.type} extension`,
      });
    });

    // Mark favorites
    return items.map(item => ({
      ...item,
      isFavorite: favorites.has(item.key),
    }));
  }, [activeProject, customVarCategories, savedExtensions, favorites]);

  // Filter items by category and search
  const filteredItems = useMemo(() => {
    let items = allItems;

    // Filter by category
    if (selectedCategory === 'favorites') {
      items = items.filter(item => item.isFavorite);
    } else {
      items = items.filter(item => item.category === selectedCategory);
    }

    // Filter by search
    if (searchValue) {
      const search = searchValue.toLowerCase();
      items = items.filter(item =>
        item.label.toLowerCase().includes(search) ||
        item.value.toLowerCase().includes(search) ||
        (item.preview && item.preview(activeProject || undefined)?.toLowerCase().includes(search))
      );
    }

    return items;
  }, [allItems, selectedCategory, searchValue, activeProject]);

  // Get categories with counts
  const categoriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    // Count items per category
    allItems.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + 1;
      if (item.isFavorite) {
        counts['favorites'] = (counts['favorites'] || 0) + 1;
      }
    });

    return INSERTION_CATEGORIES.map(cat => ({
      ...cat,
      count: counts[cat.key] || 0,
    }));
  }, [allItems]);

  const handleOpenBuilder = (item: InsertionItem) => {
    if (item.builderType) {
      setBuilderType(item.builderType as ExtensionType);
      setShowBuilder(true);
    }
  };

  const handleInsertFromBuilder = (value: string) => {
    onInsert(value);
    setShowBuilder(false);
  };

  const menuItems = categoriesWithCounts.map(cat => ({
    key: cat.key,
    icon: cat.icon === 'StarFilled' ? <StarFilled /> :
          cat.icon === 'SettingOutlined' ? <SettingOutlined /> :
          cat.icon === 'CalendarOutlined' ? <CalendarOutlined /> :
          cat.icon === 'UserOutlined' ? <UserOutlined /> :
          cat.icon === 'ApiOutlined' ? <ApiOutlined /> : null,
    label: (
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{cat.label}</span>
        <Text type="secondary" style={{ fontSize: 12 }}>{cat.count}</Text>
      </span>
    ),
    disabled: cat.count === 0,
  }));


  return (
    <>
      <div 
        style={{ 
          width: collapsed ? 60 : 320,
          background: colorBgContainer,
          borderLeft: `1px solid ${colorBorder}`,
          overflow: 'hidden',
          transition: 'width 0.2s ease',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ 
          padding: collapsed ? '16px 8px' : '16px', 
          borderBottom: `1px solid ${colorBorder}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {!collapsed && (
              <>
                <Text strong style={{ fontSize: 16 }}>Insertion Hub</Text>
                <Space>
                  <Button 
                    type="text"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => setShowBuilder(true)}
                  />
                  <Button 
                    type="text"
                    size="small"
                    icon={<SettingOutlined />}
                    onClick={() => setShowExtensionsManager(true)}
                  />
                  <Button
                    type="text"
                    size="small"
                    icon={<MenuFoldOutlined />}
                    onClick={() => setCollapsed(true)}
                  />
                </Space>
              </>
            )}
            {collapsed && (
              <Button
                type="text"
                icon={<MenuUnfoldOutlined />}
                onClick={() => setCollapsed(false)}
                style={{ margin: '0 auto' }}
              />
            )}
          </div>
        </div>

        {!collapsed && (
          <>
            {/* Category Menu */}
            <Menu
              mode="inline"
              selectedKeys={[selectedCategory]}
              onClick={(e) => setSelectedCategory(e.key)}
              items={menuItems}
              style={{ borderRight: 0, borderBottom: `1px solid ${colorBorder}`, flexShrink: 0 }}
            />

            {/* Search */}
            <div style={{ padding: '12px 16px', flexShrink: 0 }}>
              <Search
                placeholder="Search variables..."
                prefix={<SearchOutlined />}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                allowClear
                size="small"
              />
            </div>

            <Divider style={{ margin: '0 16px', minWidth: 'auto', width: 'auto', flexShrink: 0 }} />

            {/* No Active Project Alert */}
            {!activeProject && selectedCategory === 'system' && (
              <Alert
                message="No Active Project"
                description="Select a project to enable project variables"
                type="info"
                showIcon
                closable
                style={{ margin: '0 16px 8px', flexShrink: 0 }}
              />
            )}

            {/* Variable List */}
            <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 16px', minHeight: 0 }}>
              {filteredItems.length === 0 ? (
                <Empty 
                  description={
                    selectedCategory === 'favorites' 
                      ? "No favorites yet. Star items to add them here."
                      : "No items found"
                  }
                  style={{ marginTop: 48 }}
                />
              ) : (
                filteredItems.map(item => (
                  <VariableCard
                    key={item.key}
                    item={item}
                    onInsert={onInsert}
                    onOpenBuilder={handleOpenBuilder}
                    onToggleFavorite={toggleFavorite}
                  />
                ))
              )}
            </div>
          </>
        )}

        {collapsed && (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            writingMode: 'vertical-rl',
          }}>
            <Text type="secondary">Insertion Hub</Text>
          </div>
        )}
      </div>

      {/* Extension Builder Modal */}
      <ExtensionBuilder
        visible={showBuilder}
        onClose={() => setShowBuilder(false)}
        onInsert={handleInsertFromBuilder}
        initialType={builderType}
      />

      {/* Saved Extensions Manager Modal */}
      <SavedExtensionsManager
        visible={showExtensionsManager}
        onClose={() => setShowExtensionsManager(false)}
      />
    </>
  );
};