import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Card,
  Button,
  Input,
  Space,
  Typography,
  Empty,
  Modal,
  message,
  Badge,
  Dropdown,
  Tag,
  Flex,
  Layout,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  SaveOutlined,
  MoreOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { homeDir } from '@tauri-apps/api/path';
import type { MenuProps } from 'antd';
import { InsertionHub } from '../common';
import { processReplacementPreview, processSavedExtension } from '../../utils/previewProcessor';
import { useSavedExtensions } from '../../contexts/SavedExtensionsContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useProjects } from '../../contexts/ProjectContext';
import { useVariables } from '../../contexts/VariablesContext';
import { PROJECT_VARIABLE_MAPPINGS } from '../../types/project';
import { CustomVariable } from '../../types/variables';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Search } = Input;

interface Replacement {
  trigger: string;
  replace: string;
  source: string;
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

interface CategoryReplacementsProps {
  categoryId: string;
}

export const CategoryReplacements: React.FC<CategoryReplacementsProps> = ({ categoryId }) => {
  const [category, setCategory] = useState<Category | null>(null);
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [filteredReplacements, setFilteredReplacements] = useState<Replacement[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editingTrigger, setEditingTrigger] = useState('');
  const [editingReplace, setEditingReplace] = useState('');
  const [originalTrigger, setOriginalTrigger] = useState('');
  const [originalReplace, setOriginalReplace] = useState('');
  const [isNewReplacement, setIsNewReplacement] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  
  const textAreaRef = useRef<any>(null);
  const { savedExtensions } = useSavedExtensions();
  const { activeProject } = useProjects();
  const { categories: variableCategories } = useVariables();
  
  // Debounce the replacement text for preview processing
  const debouncedReplaceText = useDebounce(editingReplace, 150);

  // Memoize preview content to avoid hooks in conditional rendering
  const previewContent = useMemo(() => {
    if (!debouncedReplaceText) {
      return <Text type="secondary" style={{ fontStyle: 'italic' }}>(empty)</Text>;
    }
    
    // Build project variables object
    const projectVariables: Record<string, string> = {};
    if (activeProject) {
      projectVariables[PROJECT_VARIABLE_MAPPINGS.name] = activeProject.name;
      projectVariables[PROJECT_VARIABLE_MAPPINGS.stack] = activeProject.stack;
      projectVariables[PROJECT_VARIABLE_MAPPINGS.directory] = activeProject.directory;
      projectVariables[PROJECT_VARIABLE_MAPPINGS.restartCommand] = activeProject.restartCommand;
      projectVariables[PROJECT_VARIABLE_MAPPINGS.logCommand] = activeProject.logCommand;
      
      // Add custom project variables
      if (activeProject.customVariables) {
        Object.entries(activeProject.customVariables).forEach(([key, value]) => {
          projectVariables[`project_${key}`] = value;
        });
      }
    }
    
    // Build custom variables array
    const customVariables: CustomVariable[] = [];
    variableCategories.forEach(category => {
      category.variables.forEach(variable => {
        customVariables.push(variable);
      });
    });
    
    let preview = processReplacementPreview(debouncedReplaceText, {
      projectVariables,
      customVariables,
    });
    preview = processSavedExtension(preview, savedExtensions);
    return preview;
  }, [debouncedReplaceText, savedExtensions, activeProject, variableCategories]);

  useEffect(() => {
    // Clear editing state when category changes
    setSelectedIndex(null);
    setEditingTrigger('');
    setEditingReplace('');
    setOriginalTrigger('');
    setOriginalReplace('');
    setIsNewReplacement(true);
    setSearchText('');
    
    loadCategoryAndReplacements();
  }, [categoryId]);

  useEffect(() => {
    // Filter replacements based on search text
    if (searchText) {
      const filtered = replacements.filter(r => 
        r.trigger.toLowerCase().includes(searchText.toLowerCase()) ||
        r.replace.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredReplacements(filtered);
    } else {
      setFilteredReplacements(replacements);
    }
  }, [searchText, replacements]);

  const loadCategoryAndReplacements = async () => {
    try {
      // Load category info
      const categories = await invoke<Category[]>('get_categories');
      const cat = categories.find(c => c.id === categoryId);
      if (cat) {
        setCategory(cat);
        
        // Load replacements for this category - use full path
        const homeDirPath = await homeDir();
        const filePath = `${homeDirPath}/Library/Application Support/espanso/match/${cat.fileName}`;
        const data = await invoke<Replacement[]>('read_espanso_file', { filePath });
        setReplacements(data);
      }
    } catch (error) {
      console.error('Failed to load category replacements:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      message.error(`Failed to load replacements: ${error}`);
    }
  };

  const handleSelectReplacement = (index: number) => {
    const replacement = filteredReplacements[index];
    setSelectedIndex(index);
    setEditingTrigger(replacement.trigger);
    setEditingReplace(replacement.replace);
    setOriginalTrigger(replacement.trigger);
    setOriginalReplace(replacement.replace);
    setIsNewReplacement(false);
  };

  const handleCreateNew = () => {
    setSelectedIndex(null);
    setEditingTrigger('');
    setEditingReplace('');
    setOriginalTrigger('');
    setOriginalReplace('');
    setIsNewReplacement(true);
  };

  const hasChanges = () => {
    if (isNewReplacement) {
      // For new replacements, enable save when both fields have content
      return editingTrigger.trim() !== '' && editingReplace.trim() !== '';
    } else {
      // For existing replacements, enable save only when values have actually changed
      return (editingTrigger !== originalTrigger || editingReplace !== originalReplace) &&
             editingTrigger.trim() !== '' && editingReplace.trim() !== '';
    }
  };

  const handleDelete = async (index: number) => {
    if (!category) {
      message.error('No category selected');
      return;
    }

    Modal.confirm({
      title: 'Delete Replacement',
      content: 'Are you sure you want to delete this replacement?',
      onOk: async () => {
        try {
          const newReplacements = [...replacements];
          newReplacements.splice(index, 1);
          
          const homeDirPath = await homeDir();
          const filePath = `${homeDirPath}/Library/Application Support/espanso/match/${category.fileName}`;
          
          console.log('Deleting from file path:', filePath);
          console.log('Updated replacements array:', newReplacements);
          
          await invoke('write_espanso_file', {
            filePath,
            replacements: newReplacements,
          });
          
          setReplacements(newReplacements);
          message.success('Replacement deleted successfully');
        } catch (error) {
          console.error('Failed to delete replacement:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          message.error(`Failed to delete replacement: ${error}`);
        }
      },
    });
  };

  const handleSave = async () => {
    if (!editingTrigger.trim() || !editingReplace.trim()) {
      message.error('Please fill in both trigger and replacement text');
      return;
    }

    if (!category) {
      message.error('No category selected');
      return;
    }

    try {
      const newReplacements = [...replacements];
      
      const homeDirPath = await homeDir();
      const filePath = `${homeDirPath}/Library/Application Support/espanso/match/${category.fileName}`;
      
      console.log('Saving to file path:', filePath);
      console.log('New replacements array:', newReplacements);

      if (isNewReplacement) {
        // Create new
        newReplacements.push({
          trigger: editingTrigger,
          replace: editingReplace,
          source: filePath,
        });
      } else if (selectedIndex !== null) {
        // Update existing - find original index in full replacements array
        const originalIndex = replacements.findIndex(r => r.trigger === filteredReplacements[selectedIndex].trigger);
        if (originalIndex !== -1) {
          newReplacements[originalIndex] = {
            ...newReplacements[originalIndex],
            trigger: editingTrigger,
            replace: editingReplace,
          };
        }
      }
      
      await invoke('write_espanso_file', {
        filePath,
        replacements: newReplacements,
      });
      
      setReplacements(newReplacements);
      message.success(isNewReplacement ? 'Replacement created' : 'Replacement updated');
      
      // Reset form
      setSelectedIndex(null);
      setEditingTrigger('');
      setEditingReplace('');
      setOriginalTrigger('');
      setOriginalReplace('');
      setIsNewReplacement(false);
    } catch (error) {
      console.error('Failed to save replacement:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      message.error(`Failed to save replacement: ${error}`);
    }
  };

  const handleCopy = (replacement: Replacement) => {
    navigator.clipboard.writeText(replacement.trigger);
    message.success('Trigger copied to clipboard');
  };

  const getDropdownItems = (replacement: Replacement): MenuProps['items'] => [
    {
      key: 'copy',
      label: 'Copy Trigger',
      icon: <CopyOutlined />,
      onClick: () => handleCopy(replacement),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => {
        // Find original index in full replacements array
        const originalIndex = replacements.findIndex(r => r.trigger === replacement.trigger);
        if (originalIndex !== -1) {
          handleDelete(originalIndex);
        }
      },
    },
  ];

  const handleVariableInsert = (variable: string) => {
    if (textAreaRef.current) {
      const textarea = textAreaRef.current.resizableTextArea?.textArea;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = editingReplace.substring(0, start) + variable + editingReplace.substring(end);
        setEditingReplace(newValue);
        
        // Set cursor position after the inserted variable
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + variable.length, start + variable.length);
        }, 0);
      }
    }
  };



  if (!category) {
    return (
      <div style={{ padding: '24px' }}>
        <Empty description="Category not found" />
      </div>
    );
  }

  return (
    <Layout style={{ height: '100%', background: 'transparent' }}>
      <Layout.Content style={{ height: '100%', overflow: 'hidden' }}>
        <div style={{ 
          padding: '24px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <Card 
        style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        bodyStyle={{
          padding: '24px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Title level={4} style={{ margin: 0 }}>{category.name} Replacements</Title>
                {category.description && (
                  <Text type="secondary">{category.description}</Text>
                )}
              </div>
              <Space>
                <Search
                  placeholder="Search replacements..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 300 }}
                  allowClear
                />
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateNew}>
                  New Replacement
                </Button>
              </Space>
            </div>
            <div>
              <Text type="secondary">
                File: <Text code>{category.fileName}</Text> • 
                Total: <Badge count={replacements.length} showZero style={{ backgroundColor: '#52c41a' }} />
              </Text>
            </div>
          </Space>
        </div>

        {filteredReplacements.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              searchText ? 'No replacements found' : 'No replacements yet'
            }
          >
            {!searchText && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateNew}>
                Create First Replacement
              </Button>
            )}
          </Empty>
        ) : (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0
          }}>
            <div 
              className="horizontal-scrollbar"
              style={{ 
                padding: '8px 0 16px 0',
                marginBottom: '24px',
                borderBottom: '1px solid #f0f0f0',
                flexShrink: 0,
                maxHeight: '60px'
              }}
            >
              <Flex gap={8} style={{ minWidth: 'max-content' }}>
                {filteredReplacements.map((replacement, index) => (
                  <Tag.CheckableTag
                    key={`${replacement.trigger}-${index}`}
                    checked={selectedIndex === index}
                    onChange={() => handleSelectReplacement(index)}
                    style={{
                      padding: '4px 12px',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      borderRadius: '6px',
                    }}
                  >
                    <Space size={4}>
                      <span>{replacement.trigger}</span>
                      <Dropdown
                        menu={{ items: getDropdownItems(replacement) }}
                        trigger={['click']}
                      >
                        <Button 
                          type="text" 
                          size="small" 
                          icon={<MoreOutlined />}
                          style={{ 
                            padding: 0, 
                            width: '16px', 
                            height: '16px',
                            minWidth: 'unset'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Dropdown>
                    </Space>
                  </Tag.CheckableTag>
                ))}
              </Flex>
            </div>

            <div 
              className="custom-scrollbar"
              style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px',
                overflow: 'auto',
                paddingRight: '8px'
              }}
            >
              <div>
                <Text strong>Trigger:</Text>
                <Input
                  value={editingTrigger}
                  onChange={(e) => setEditingTrigger(e.target.value)}
                  placeholder="Enter trigger (e.g., :example, /cmd, #tag)"
                  style={{ marginTop: '8px' }}
                />
              </div>
              
              <div>
                <Text strong>Replacement Text:</Text>
                <TextArea
                  ref={textAreaRef}
                  value={editingReplace}
                  onChange={(e) => setEditingReplace(e.target.value)}
                  placeholder="Enter replacement text"
                  style={{ marginTop: '8px', minHeight: '120px' }}
                  autoSize={{ minRows: 4, maxRows: 10 }}
                />
              </div>

              <div>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Space>
                    <Button 
                      type="primary" 
                      icon={<SaveOutlined />}
                      onClick={handleSave}
                      disabled={!hasChanges()}
                    >
                      {isNewReplacement ? 'Create' : 'Update'}
                    </Button>
                    {(selectedIndex !== null || isNewReplacement) && (
                      <Button 
                        onClick={() => {
                          setSelectedIndex(null);
                          setEditingTrigger('');
                          setEditingReplace('');
                          setOriginalTrigger('');
                          setOriginalReplace('');
                          setIsNewReplacement(false);
                        }}
                      >
                        Clear
                      </Button>
                    )}
                    <Button
                      icon={<EyeOutlined />}
                      onClick={() => setShowPreview(!showPreview)}
                      type={showPreview ? 'primary' : 'default'}
                    >
                      {showPreview ? 'Hide Preview' : 'Show Preview'}
                    </Button>
                  </Space>
                  
                  {showPreview && (
                    <Card 
                      size="small"
                      title={
                        <Space>
                          <EyeOutlined style={{ color: '#1890ff' }} />
                          <Text style={{ fontSize: '14px', fontWeight: 500 }}>Live Preview</Text>
                        </Space>
                      }
                      style={{ 
                        borderColor: '#1890ff',
                        backgroundColor: 'var(--color-surface-secondary)',
                      }}
                    >
                      <div style={{ 
                        whiteSpace: 'pre-wrap', 
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        color: 'var(--color-text-primary)',
                        padding: '8px',
                        backgroundColor: 'var(--color-surface-primary)',
                        borderRadius: '4px',
                        minHeight: '60px',
                        maxHeight: '200px',
                        overflow: 'auto'
                      }}>
                        {previewContent}
                      </div>
                    </Card>
                  )}
                </Space>
              </div>
            </div>
          </div>
        )}
      </Card>
        </div>
      </Layout.Content>
      <Layout.Sider
        width={320}
        style={{
          background: 'transparent',
          marginLeft: '16px',
        }}
      >
        <InsertionHub onInsert={handleVariableInsert} />
      </Layout.Sider>
    </Layout>
  );
};