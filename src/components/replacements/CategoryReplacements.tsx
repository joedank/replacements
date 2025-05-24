import React, { useState, useEffect } from 'react';
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
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  SaveOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { homeDir } from '@tauri-apps/api/path';
import type { MenuProps } from 'antd';

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
  const [isNewReplacement, setIsNewReplacement] = useState(false);

  useEffect(() => {
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
    setIsNewReplacement(false);
  };

  const handleCreateNew = () => {
    setSelectedIndex(null);
    setEditingTrigger('');
    setEditingReplace('');
    setIsNewReplacement(true);
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

  if (!category) {
    return (
      <div style={{ padding: '24px' }}>
        <Empty description="Category not found" />
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '24px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
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
          flexDirection: 'column'
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
          <>
            <div 
              className="horizontal-scrollbar"
              style={{ 
                padding: '8px 0 16px 0',
                marginBottom: '24px',
                borderBottom: '1px solid #f0f0f0'
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

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <Text strong>Trigger:</Text>
                <Input
                  value={editingTrigger}
                  onChange={(e) => setEditingTrigger(e.target.value)}
                  placeholder="Enter trigger (e.g., :example)"
                  style={{ marginTop: '8px' }}
                  prefix=":"
                />
              </div>
              
              <div style={{ flex: 1 }}>
                <Text strong>Replacement Text:</Text>
                <TextArea
                  value={editingReplace}
                  onChange={(e) => setEditingReplace(e.target.value)}
                  placeholder="Enter replacement text"
                  style={{ marginTop: '8px', minHeight: '120px' }}
                  autoSize={{ minRows: 4, maxRows: 10 }}
                />
              </div>

              <div>
                <Space>
                  <Button 
                    type="primary" 
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                    disabled={!editingTrigger.trim() || !editingReplace.trim()}
                  >
                    {isNewReplacement ? 'Create' : 'Update'}
                  </Button>
                  {(selectedIndex !== null || isNewReplacement) && (
                    <Button 
                      onClick={() => {
                        setSelectedIndex(null);
                        setEditingTrigger('');
                        setEditingReplace('');
                        setIsNewReplacement(false);
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </Space>
              </div>
            </div>
          </>
        )}
      </Card>

    </div>
  );
};