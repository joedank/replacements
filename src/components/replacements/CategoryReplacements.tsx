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
  Select,
  Checkbox,
  List,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  SaveOutlined,
  MoreOutlined,
  EyeOutlined,
  ExpandOutlined,
  RobotOutlined,
  ImportOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { usePaths } from '../../contexts/PathContext';
import type { MenuProps } from 'antd';
import { InsertionHub } from '../common';
import { processReplacementPreview, processSavedExtension, enhancePreviewWithValidation, VariableValidationResult } from '../../utils/previewProcessor';
import { ParsedVariable } from '../../utils/variableParser';
import { useSavedExtensions } from '../../contexts/SavedExtensionsContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useProjects } from '../../contexts/ProjectContext';
import { useVariables } from '../../contexts/VariablesContext';
import { useLLMContext } from '../../contexts/LLMContext';
import { useProjectCategories } from '../../contexts/ProjectCategoriesContext';
import { useCategories } from '../../contexts/CategoriesContext';
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
  categoryId: string; // Now represents fileName without .yml extension
}

interface PreviewContentResult {
  preview: string;
  validationResult: VariableValidationResult;
}

export const CategoryReplacements: React.FC<CategoryReplacementsProps> = ({ categoryId }) => {
  const { espansoMatchDir } = usePaths();
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
  const [showExpandedEditor, setShowExpandedEditor] = useState(false);
  const [modalReplaceText, setModalReplaceText] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiDescription, setAIDescription] = useState('');
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importedReplacements, setImportedReplacements] = useState<Replacement[]>([]);
  const [selectedImports, setSelectedImports] = useState<string[]>([]);
  const [browsedFilePath, setBrowsedFilePath] = useState<string | null>(null);
  
  const textAreaRef = useRef<any>(null);
  const modalTextAreaRef = useRef<any>(null);
  const { savedExtensions } = useSavedExtensions();
  const { activeProject } = useProjects();
  const { categories: variableCategories } = useVariables();
  const { generateReplacement, loadConfigs } = useLLMContext();
  const { categories: projectCategories } = useProjectCategories();
  const { categories: replacementCategories } = useCategories();
  
  // Debounce the replacement text for preview processing
  const debouncedReplaceText = useDebounce(editingReplace, 150);

  // Memoize preview content to avoid hooks in conditional rendering
  const previewContent = useMemo((): React.ReactElement | PreviewContentResult => {
    if (!debouncedReplaceText) {
      return <Text type="secondary" style={{ fontStyle: 'italic' }}>(empty)</Text>;
    }
    
    // Build project variables object from category values
    const projectVariables: Record<string, string> = {};
    if (activeProject) {
      // Handle new category-based structure
      if (activeProject.categoryValues && projectCategories) {
        projectCategories.forEach(category => {
          const categoryValues = activeProject.categoryValues?.[category.id] || {};
          category.variableDefinitions.forEach(varDef => {
            const value = categoryValues[varDef.id] || varDef.defaultValue;
            if (value) {
              projectVariables[varDef.name] = value;
            }
          });
        });
      }
      
      // Always include the project name for legacy compatibility
      projectVariables['active_project_name'] = activeProject.name;
    }
    
    // Build custom variables array
    const customVariables: CustomVariable[] = [];
    variableCategories.forEach(category => {
      category.variables.forEach(variable => {
        customVariables.push(variable);
      });
    });
    
    // Use enhanced validation for variable detection
    const validationResult = enhancePreviewWithValidation(debouncedReplaceText, {
      projectVariables,
      customVariables,
      projectCategories,
      activeProjectCategoryId: activeProject?.categoryId,
    });
    
    let preview = processSavedExtension(validationResult.preview, savedExtensions);
    
    // Return preview with validation info
    return { preview, validationResult };
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
    // Reload LLM configs to ensure we have the latest
    loadConfigs();
  }, [categoryId, replacementCategories, loadConfigs]);

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
      // Find category from replacement categories using fileName
      const fileName = `${categoryId}.yml`;
      const cat = replacementCategories.find(c => c.fileName === fileName);
      if (cat) {
        // Use the category directly - it already matches the Category interface
        setCategory(cat);

        // Load replacements for this category - use full path
        if (!espansoMatchDir) {
          message.error('Espanso path not loaded');
          return;
        }
        const filePath = `${espansoMatchDir}/${fileName}`;
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
          
          if (!espansoMatchDir) {
            message.error('Espanso path not loaded');
            return;
          }
          const filePath = `${espansoMatchDir}/${category.fileName}`;
          
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

      if (!espansoMatchDir) {
        message.error('Espanso path not loaded');
        return;
      }
      const filePath = `${espansoMatchDir}/${category.fileName}`;

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
    // If modal is open, insert into modal textarea
    if (showExpandedEditor && modalTextAreaRef.current) {
      const textarea = modalTextAreaRef.current.resizableTextArea?.textArea;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = modalReplaceText.substring(0, start) + variable + modalReplaceText.substring(end);
        setModalReplaceText(newValue);
        
        // Set cursor position after the inserted variable
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + variable.length, start + variable.length);
        }, 0);
      }
    } else if (textAreaRef.current) {
      // Otherwise insert into main textarea
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

  const handleOpenExpandedEditor = () => {
    setModalReplaceText(editingReplace);
    setShowExpandedEditor(true);
  };

  const handleCloseExpandedEditor = () => {
    setEditingReplace(modalReplaceText);
    setShowExpandedEditor(false);
  };

  const handleCancelExpandedEditor = () => {
    setShowExpandedEditor(false);
    setModalReplaceText('');
  };

  const handleOpenImportModal = async () => {
    try {
      // Get list of available YAML files
      const files = await invoke<string[]>('list_espanso_yaml_files');
      // Filter out the current category file and system files
      const filteredFiles = files.filter(f => 
        f !== category?.fileName && 
        !f.startsWith('project_') &&
        f !== 'categories.json'
      );
      setAvailableFiles(filteredFiles);
      setShowImportModal(true);
      setSelectedFile(null);
      setImportedReplacements([]);
      setSelectedImports([]);
    } catch (error) {
      console.error('Failed to list YAML files:', error);
      message.error('Failed to list available files');
    }
  };

  const handleSelectImportFile = async (fileName: string | null) => {
    try {
      if (!fileName) return;
      
      setSelectedFile(fileName);
      setBrowsedFilePath(null); // Clear browsed file when selecting from dropdown

      if (!espansoMatchDir) {
        message.error('Espanso path not loaded');
        return;
      }
      const filePath = `${espansoMatchDir}/${fileName}`;
      const data = await invoke<Replacement[]>('read_espanso_file', { filePath });
      setImportedReplacements(data);
      // By default, select all non-duplicate replacements
      const existingTriggers = new Set(replacements.map(r => r.trigger));
      const nonDuplicates = data.filter(r => !existingTriggers.has(r.trigger)).map(r => r.trigger);
      setSelectedImports(nonDuplicates);
    } catch (error) {
      console.error('Failed to read import file:', error);
      message.error('Failed to read selected file');
    }
  };

  const handleBrowseFile = async () => {
    try {
      const filePath = await invoke<string | null>('select_yaml_file');
      if (filePath) {
        setBrowsedFilePath(filePath);
        setSelectedFile(null); // Clear dropdown selection
        
        const data = await invoke<Replacement[]>('read_espanso_file', { filePath });
        setImportedReplacements(data);
        // By default, select all non-duplicate replacements
        const existingTriggers = new Set(replacements.map(r => r.trigger));
        const nonDuplicates = data.filter(r => !existingTriggers.has(r.trigger)).map(r => r.trigger);
        setSelectedImports(nonDuplicates);
      }
    } catch (error) {
      console.error('Failed to browse file:', error);
      message.error('Failed to browse for file');
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    Modal.confirm({
      title: 'Delete File',
      content: `Are you sure you want to delete "${fileName}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await invoke('delete_espanso_yaml_file', { fileName });
          message.success(`Deleted ${fileName}`);
          
          // Refresh the file list
          const files = await invoke<string[]>('list_espanso_yaml_files');
          const filteredFiles = files.filter(f => 
            f !== category?.fileName && 
            !f.startsWith('project_') &&
            f !== 'categories.json'
          );
          setAvailableFiles(filteredFiles);
          
          // Clear selection if the deleted file was selected
          if (selectedFile === fileName) {
            setSelectedFile(null);
            setImportedReplacements([]);
            setSelectedImports([]);
          }
        } catch (error) {
          console.error('Failed to delete file:', error);
          message.error(`Failed to delete file: ${error}`);
        }
      },
    });
  };

  const handleImport = async () => {
    if (!category || selectedImports.length === 0) {
      message.warning('Please select replacements to import');
      return;
    }

    setIsImporting(true);
    try {
      const newReplacements = [...replacements];
      if (!espansoMatchDir) {
        message.error('Espanso path not loaded');
        setIsImporting(false);
        return;
      }
      const filePath = `${espansoMatchDir}/${category.fileName}`;

      // Add selected replacements
      const replacementsToImport = importedReplacements.filter(r => 
        selectedImports.includes(r.trigger)
      );
      
      replacementsToImport.forEach(r => {
        newReplacements.push({
          trigger: r.trigger,
          replace: r.replace,
          source: filePath,
        });
      });
      
      await invoke('write_espanso_file', {
        filePath,
        replacements: newReplacements,
      });
      
      setReplacements(newReplacements);
      message.success(`Imported ${replacementsToImport.length} replacements successfully`);
      setShowImportModal(false);
    } catch (error) {
      console.error('Failed to import replacements:', error);
      message.error('Failed to import replacements');
    } finally {
      setIsImporting(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!aiDescription.trim()) {
      message.warning('Please describe what you want to generate');
      return;
    }

    setIsAIGenerating(true);
    try {
      // Build context about available variables
      const contextParts = [];
      
      if (activeProject) {
        contextParts.push(`Active project: ${activeProject.name}`);
        
        // Add category-based variables if available
        if (activeProject.categoryValues && projectCategories) {
          const projectVars: string[] = [];
          projectCategories.forEach(category => {
            const categoryValues = activeProject.categoryValues?.[category.id] || {};
            category.variableDefinitions.forEach(varDef => {
              const value = categoryValues[varDef.id] || varDef.defaultValue;
              if (value) {
                projectVars.push(`{{${varDef.name}}} - ${varDef.description || varDef.name}`);
              }
            });
          });
          if (projectVars.length > 0) {
            contextParts.push(`Project variables: ${projectVars.join(', ')}`);
          }
        }
        // Always include system variables in context
        else {
          // Build project variables from categories
          const projectVars: string[] = [`{{active_project_name}} - ${activeProject.name}`];
          
          if (activeProject.categoryValues && projectCategories) {
            projectCategories.forEach(category => {
              const categoryValues = activeProject.categoryValues?.[category.id] || {};
              category.variableDefinitions.forEach(varDef => {
                const value = categoryValues[varDef.id] || varDef.defaultValue;
                if (value) {
                  projectVars.push(`{{${varDef.name}}} - ${value}`);
                }
              });
            });
          }
          
          if (projectVars.length > 1) {
            contextParts.push(`Project variables: ${projectVars.join(', ')}`);
          }
        }
      }

      // Add custom variables context
      const allCustomVars: string[] = [];
      variableCategories.forEach(cat => {
        cat.variables.forEach(v => {
          allCustomVars.push(`{{${v.name}}} - ${v.value}`);
        });
      });
      if (allCustomVars.length > 0) {
        contextParts.push(`Available variables: ${allCustomVars.slice(0, 10).join(', ')}${allCustomVars.length > 10 ? '...' : ''}`);
      }

      const contextPrompt = contextParts.length > 0 
        ? `\n\nContext:\n${contextParts.join('\n')}\n\nUse relevant variables where appropriate.`
        : '';

      const generatedText = await generateReplacement(aiDescription + contextPrompt);
      setEditingReplace(generatedText);
      setShowAIModal(false);
      setAIDescription('');
      message.success('Replacement generated successfully!');
    } catch (error) {
      console.error('Failed to generate replacement:', error);
      message.error('Failed to generate replacement. Please check your API settings.');
    } finally {
      setIsAIGenerating(false);
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
    <div style={{ height: '100%', display: 'flex', background: 'transparent' }}>
      <div style={{ 
        flex: 1,
        height: '100%', 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
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
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* Title Section with File Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <Title level={3} style={{ margin: 0 }}>{category.name} Replacements</Title>
                {category.description && (
                  <Text type="secondary" style={{ display: 'block', marginTop: '4px' }}>
                    {category.description}
                  </Text>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <Space>
                  <Text code type="secondary">{category.fileName}</Text>
                  <Badge count={replacements.length} showZero style={{ backgroundColor: '#52c41a' }} />
                </Space>
              </div>
            </div>
            
            {/* Controls Section - Full Width */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Search
                placeholder="Search replacements..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ flex: 1 }}
                allowClear
              />
              <Button 
                icon={<ImportOutlined />} 
                onClick={handleOpenImportModal}
              >
                Import
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateNew}>
                New Replacement
              </Button>
            </div>
          </Space>
        </div>

        {filteredReplacements.length === 0 && !isNewReplacement ? (
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
            {filteredReplacements.length > 0 && (
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
            )}

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <Text strong>Replacement Text:</Text>
                  <Space>
                    <Button
                      type="text"
                      icon={<RobotOutlined />}
                      size="small"
                      onClick={() => setShowAIModal(true)}
                      title="Generate with AI"
                    >
                      AI Generate
                    </Button>
                    <Button
                      type="text"
                      icon={<ExpandOutlined />}
                      size="small"
                      onClick={handleOpenExpandedEditor}
                      title="Expand editor"
                    >
                      Expand
                    </Button>
                  </Space>
                </div>
                <div
                  className="replacement-text-container"
                  style={{ position: 'relative' }}
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget.querySelector('.copy-button') as HTMLElement;
                    if (btn) btn.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget.querySelector('.copy-button') as HTMLElement;
                    if (btn) btn.style.opacity = '0';
                  }}
                >
                  <TextArea
                    ref={textAreaRef}
                    value={editingReplace}
                    onChange={(e) => setEditingReplace(e.target.value)}
                    placeholder="Enter replacement text"
                    style={{ minHeight: '120px' }}
                    autoSize={{ minRows: 4, maxRows: 10 }}
                  />
                  <Button
                    className="copy-button"
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => {
                      navigator.clipboard.writeText(editingReplace);
                      message.success('Replacement text copied to clipboard');
                    }}
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      opacity: '0',
                      transition: 'opacity 0.2s ease',
                      backgroundColor: 'var(--color-surface-primary)',
                      border: '1px solid var(--color-border)',
                      zIndex: 1,
                    }}
                    title="Copy replacement text"
                  />
                </div>
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
                        {React.isValidElement(previewContent) ? previewContent : (() => {
                          const result = previewContent as PreviewContentResult;
                          return (
                            <>
                              {result.preview}
                              {result.validationResult.undefinedVariables.length > 0 && (
                                <div style={{ marginTop: '8px', padding: '4px 8px', backgroundColor: 'rgba(255, 193, 7, 0.1)', borderRadius: '4px' }}>
                                  <Text type="warning" style={{ fontSize: '12px' }}>
                                    Undefined variables: {result.validationResult.undefinedVariables.map((v: ParsedVariable) => v.name).join(', ')}
                                  </Text>
                                  {result.validationResult.projectSuggestions.length > 0 && (
                                    <div style={{ marginTop: '4px' }}>
                                      {result.validationResult.projectSuggestions.map((suggestion: string, index: number) => (
                                        <Tag key={index} color="warning">{suggestion}</Tag>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          );
                        })()}
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
      </div>
      <InsertionHub onInsert={handleVariableInsert} />
      
      <Modal
        title={
          <Space>
            <ExpandOutlined />
            <span>Edit Replacement Text</span>
          </Space>
        }
        open={showExpandedEditor}
        onOk={handleCloseExpandedEditor}
        onCancel={handleCancelExpandedEditor}
        width={800}
        centered
        okText="Apply"
        cancelText="Cancel"
        bodyStyle={{ padding: '24px' }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>
              Trigger: <Text code>{editingTrigger || '(not set)'}</Text>
            </Text>
          </div>
          
          <div>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>Replacement Text:</Text>
            <div
              className="replacement-text-container"
              style={{ position: 'relative' }}
              onMouseEnter={(e) => {
                const btn = e.currentTarget.querySelector('.copy-button') as HTMLElement;
                if (btn) btn.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget.querySelector('.copy-button') as HTMLElement;
                if (btn) btn.style.opacity = '0';
              }}
            >
              <TextArea
                ref={modalTextAreaRef}
                value={modalReplaceText}
                onChange={(e) => setModalReplaceText(e.target.value)}
                placeholder="Enter replacement text"
                autoSize={{ minRows: 15, maxRows: 30 }}
                style={{
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}
              />
              <Button
                className="copy-button"
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => {
                  navigator.clipboard.writeText(modalReplaceText);
                  message.success('Replacement text copied to clipboard');
                }}
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  opacity: '0',
                  transition: 'opacity 0.2s ease',
                  backgroundColor: 'var(--color-surface-primary)',
                  border: '1px solid var(--color-border)',
                  zIndex: 1,
                }}
                title="Copy replacement text"
              />
            </div>
          </div>
          
          {showPreview && (
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                <EyeOutlined style={{ marginRight: '4px' }} />
                Live Preview:
              </Text>
              <Card 
                size="small"
                style={{ 
                  backgroundColor: 'var(--color-surface-secondary)',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}
              >
                <div style={{ 
                  whiteSpace: 'pre-wrap', 
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: 'rgba(0, 0, 0, 0.88)',
                }}>
                  {processSavedExtension(processReplacementPreview(modalReplaceText, {
                    projectVariables: (() => {
                      const projectVariables: Record<string, string> = {};
                      if (activeProject) {
                        // Add project name for legacy compatibility
                        projectVariables['active_project_name'] = activeProject.name;
                        
                        // Add category variables
                        if (activeProject.categoryValues && projectCategories) {
                          projectCategories.forEach(category => {
                            const categoryValues = activeProject.categoryValues?.[category.id] || {};
                            category.variableDefinitions.forEach(varDef => {
                              const value = categoryValues[varDef.id] || varDef.defaultValue;
                              if (value) {
                                projectVariables[varDef.name] = value;
                              }
                            });
                          });
                        }
                      }
                      return projectVariables;
                    })(),
                    customVariables: variableCategories.flatMap(cat => cat.variables),
                  }), savedExtensions)}
                </div>
              </Card>
            </div>
          )}
        </Space>
      </Modal>

      <Modal
        title={
          <Space>
            <RobotOutlined />
            <span>Generate with AI</span>
          </Space>
        }
        open={showAIModal}
        onOk={handleAIGenerate}
        onCancel={() => {
          setShowAIModal(false);
          setAIDescription('');
        }}
        confirmLoading={isAIGenerating}
        okText="Generate"
        cancelText="Cancel"
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text>Describe what you want to generate. Be specific about the format and content.</Text>
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>
              Description:
            </Text>
            <TextArea
              value={aiDescription}
              onChange={(e) => setAIDescription(e.target.value)}
              placeholder="e.g., 'Email signature with my name and job title' or 'Git commit message for bug fixes' or 'SQL query to find users by email'"
              autoSize={{ minRows: 4, maxRows: 8 }}
              autoFocus
            />
          </div>
          {activeProject && (
            <div style={{ 
              padding: '12px', 
              background: 'var(--color-surface-secondary)', 
              borderRadius: '6px',
              fontSize: '12px'
            }}>
              <Text type="secondary">
                <strong>Tip:</strong> The AI knows about your active project ({activeProject.name}) 
                and available variables. It will use them automatically where appropriate.
              </Text>
            </div>
          )}
        </Space>
      </Modal>

      <Modal
        title={
          <Space>
            <ImportOutlined />
            <span>Import Replacements</span>
          </Space>
        }
        open={showImportModal}
        onOk={handleImport}
        onCancel={() => {
          setShowImportModal(false);
          setSelectedFile(null);
          setBrowsedFilePath(null);
          setImportedReplacements([]);
          setSelectedImports([]);
        }}
        confirmLoading={isImporting}
        okText="Import Selected"
        cancelText="Cancel"
        width={700}
        okButtonProps={{ disabled: selectedImports.length === 0 }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>
              Select a file to import from:
            </Text>
            <Space.Compact style={{ width: '100%' }}>
              <Select
                style={{ flex: 1 }}
                placeholder="Choose a YAML file from Espanso..."
                value={browsedFilePath ? null : selectedFile}
                onChange={handleSelectImportFile}
                options={availableFiles.map(f => ({ 
                  label: (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{f}</span>
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        danger
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(f);
                        }}
                        style={{ marginLeft: '8px' }}
                      />
                    </div>
                  ), 
                  value: f,
                  disabled: f === category?.fileName
                }))}
                notFoundContent={availableFiles.length === 0 ? "No other YAML files found" : null}
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    {availableFiles.length > 0 && (
                      <div style={{ padding: '8px', borderTop: '1px solid #f0f0f0' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Click the trash icon to delete unwanted files
                        </Text>
                      </div>
                    )}
                  </>
                )}
              />
              <Button
                icon={<FolderOpenOutlined />}
                onClick={handleBrowseFile}
                title="Browse for YAML file"
              >
                Browse
              </Button>
            </Space.Compact>
            {browsedFilePath && (
              <div style={{ marginTop: '8px' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Browsed file: <Text code>{browsedFilePath}</Text>
                </Text>
              </div>
            )}
          </div>

          {(selectedFile || browsedFilePath) && importedReplacements.length > 0 && (
            <div>
              <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>
                  Found {importedReplacements.length} replacements:
                </Text>
                <Space>
                  <Button 
                    size="small" 
                    onClick={() => setSelectedImports(importedReplacements.map(r => r.trigger))}
                  >
                    Select All
                  </Button>
                  <Button 
                    size="small" 
                    onClick={() => {
                      const existingTriggers = new Set(replacements.map(r => r.trigger));
                      const nonDuplicates = importedReplacements
                        .filter(r => !existingTriggers.has(r.trigger))
                        .map(r => r.trigger);
                      setSelectedImports(nonDuplicates);
                    }}
                  >
                    Select Non-Duplicates
                  </Button>
                  <Button 
                    size="small" 
                    onClick={() => setSelectedImports([])}
                  >
                    Clear
                  </Button>
                </Space>
              </div>
              
              <div style={{ 
                maxHeight: '300px', 
                overflow: 'auto',
                border: '1px solid #f0f0f0',
                borderRadius: '6px',
                padding: '8px'
              }}>
                <List
                  size="small"
                  dataSource={importedReplacements}
                  renderItem={(item) => {
                    const isDuplicate = replacements.some(r => r.trigger === item.trigger);
                    return (
                      <List.Item
                        style={{ 
                          padding: '8px',
                          opacity: isDuplicate ? 0.6 : 1,
                        }}
                      >
                        <Checkbox
                          checked={selectedImports.includes(item.trigger)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedImports([...selectedImports, item.trigger]);
                            } else {
                              setSelectedImports(selectedImports.filter(t => t !== item.trigger));
                            }
                          }}
                          disabled={isDuplicate}
                          style={{ marginRight: '8px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div>
                            <Text code style={{ marginRight: '8px' }}>{item.trigger}</Text>
                            {isDuplicate && (
                              <Tag color="warning" style={{ fontSize: '11px' }}>Duplicate</Tag>
                            )}
                          </div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {item.replace.length > 100 
                              ? item.replace.substring(0, 100) + '...' 
                              : item.replace}
                          </Text>
                        </div>
                      </List.Item>
                    );
                  }}
                />
              </div>
              
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {selectedImports.length} of {importedReplacements.length} selected
                {replacements.filter(r => importedReplacements.some(ir => ir.trigger === r.trigger)).length > 0 && 
                  ` (${replacements.filter(r => importedReplacements.some(ir => ir.trigger === r.trigger)).length} duplicates will be skipped)`
                }
              </Text>
            </div>
          )}

          {(selectedFile || browsedFilePath) && importedReplacements.length === 0 && (
            <Empty description="No replacements found in this file" />
          )}
        </Space>
      </Modal>
    </div>
  );
};