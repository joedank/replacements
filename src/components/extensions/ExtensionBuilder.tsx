import React, { useState, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Button,
  Space,
  message,
  Typography,
  Alert,
  Divider,
  theme,
  Input,
  Select,
  Tag,
  Dropdown,
  Card,
} from 'antd';
import {
  CalendarOutlined,
  UnorderedListOutlined,
  ThunderboltOutlined,
  CopyOutlined,
  MessageOutlined,
  CodeOutlined,
  CodeSandboxOutlined,
  FormOutlined,
  PlusOutlined,
  SaveOutlined,
  StarOutlined,
  StarFilled,
  DownOutlined,
} from '@ant-design/icons';
import { Extension, ExtensionType, EXTENSION_METADATA } from '../../types/extensions';
import { useSavedExtensions } from '../../contexts/SavedExtensionsContext';
import { SavedExtension } from '../../types/savedExtensions';
import { DateExtensionConfig } from './DateExtensionConfig';
import { ChoiceExtensionConfig } from './ChoiceExtensionConfig';
import { RandomExtensionConfig } from './RandomExtensionConfig';
import { ClipboardExtensionConfig } from './ClipboardExtensionConfig';
import { EchoExtensionConfig } from './EchoExtensionConfig';
import { ScriptExtensionConfig } from './ScriptExtensionConfig';
import { ShellExtensionConfig } from './ShellExtensionConfig';
import { FormExtensionConfig } from './FormExtensionConfig';

const { Title, Text } = Typography;

interface ExtensionBuilderProps {
  visible: boolean;
  onClose: () => void;
  onInsert: (value: string) => void;
  initialType?: ExtensionType;
  initialExtension?: Extension;
}

export const ExtensionBuilder: React.FC<ExtensionBuilderProps> = ({
  visible,
  onClose,
  onInsert,
  initialType = 'date',
  initialExtension,
}) => {
  const [activeTab, setActiveTab] = useState<ExtensionType>(initialType);
  const [extension, setExtension] = useState<Extension | null>(initialExtension || null);
  const [variableName, setVariableName] = useState('');
  
  // Save functionality state
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [saveAsDescription, setSaveAsDescription] = useState('');
  const [saveAsCategory, setSaveAsCategory] = useState<string>('personal');
  const [saveAsTags, setSaveAsTags] = useState<string[]>([]);
  // const [autoSave, setAutoSave] = useState(false);
  
  const {
    token: { colorBgLayout, colorText, colorBgContainer },
  } = theme.useToken();
  
  const {
    savedExtensions,
    saveExtension,
    useExtension,
    filterExtensions,
  } = useSavedExtensions();

  useEffect(() => {
    if (initialExtension) {
      setExtension(initialExtension);
      setVariableName(initialExtension.name);
    }
  }, [initialExtension]);

  useEffect(() => {
    setActiveTab(initialType);
  }, [initialType]);

  useEffect(() => {
    // Reset state when modal visibility changes
    if (visible) {
      setActiveTab(initialType);
      if (!initialExtension) {
        setExtension(null);
        setVariableName('');
        // Initialize a basic extension for the active type if none exists
        if (initialType === 'choice') {
          setExtension({
            name: 'choice',
            type: 'choice',
            params: { values: [] }
          });
        }
      }
    }
  }, [visible, initialType, initialExtension]);

  const handleExtensionChange = (ext: Extension) => {
    setExtension(ext);
  };

  const generateEspansoSyntax = (): string => {
    if (!extension || !variableName) return '';

    // Build the variable definition
    let varDef = `    vars:\n      - name: ${variableName}\n        type: ${extension.type}`;

    // Add parameters based on extension type
    if ('params' in extension && extension.params) {
      varDef += '\n        params:';
      
      switch (extension.type) {
        case 'date':
          if (extension.params.format) {
            varDef += `\n          format: "${extension.params.format}"`;
          }
          if (extension.params.offset) {
            varDef += `\n          offset: ${extension.params.offset}`;
          }
          if (extension.params.locale) {
            varDef += `\n          locale: "${extension.params.locale}"`;
          }
          break;
          
        case 'choice':
          varDef += '\n          values:';
          extension.params.values.forEach(value => {
            if (typeof value === 'string') {
              varDef += `\n            - "${value}"`;
            } else {
              varDef += `\n            - label: "${value.label}"`;
              varDef += `\n              id: "${value.id}"`;
            }
          });
          break;
          
        case 'random':
          varDef += '\n          choices:';
          extension.params.choices.forEach(choice => {
            varDef += `\n            - "${choice}"`;
          });
          break;
          
        case 'echo':
          varDef += `\n          echo: "${extension.params.echo}"`;
          break;
          
        case 'script':
          varDef += `\n          interpreter: "${extension.params.interpreter}"`;
          varDef += `\n          script: "${extension.params.script}"`;
          if (extension.params.args && extension.params.args.length > 0) {
            varDef += '\n          args:';
            extension.params.args.forEach(arg => {
              varDef += `\n            - "${arg}"`;
            });
          }
          if (extension.params.debug) {
            varDef += `\n          debug: true`;
          }
          break;
          
        case 'shell':
          varDef += `\n          cmd: "${extension.params.cmd}"`;
          if (extension.params.shell) {
            varDef += `\n          shell: ${extension.params.shell}`;
          }
          if (extension.params.trim !== undefined) {
            varDef += `\n          trim: ${extension.params.trim}`;
          }
          if (extension.params.debug) {
            varDef += `\n          debug: true`;
          }
          break;
          
        case 'form':
          if (extension.params.layout) {
            varDef += `\n          layout: "${extension.params.layout}"`;
          }
          if (extension.params.fields) {
            varDef += '\n          fields:';
            extension.params.fields.forEach(field => {
              varDef += `\n            - name: "${field.name}"`;
              varDef += `\n              type: ${field.type}`;
              if (field.default) {
                varDef += `\n              default: "${field.default}"`;
              }
              if (field.params) {
                if (field.params.multiline) {
                  varDef += `\n              params:\n                multiline: true`;
                }
                if (field.params.values) {
                  varDef += `\n              params:\n                values:`;
                  field.params.values.forEach(val => {
                    varDef += `\n                  - "${val}"`;
                  });
                }
              }
            });
          }
          break;
      }
    }

    return varDef;
  };

  const handleInsert = async () => {
    if (!variableName) {
      message.error('Please enter a variable name');
      return;
    }

    const syntax = `{{${variableName}}}`;
    
    // Auto-save functionality can be added later if needed
    
    onInsert(syntax);
    message.success(`Inserted: ${syntax}`);
    onClose();
  };

  const handleSaveExtension = async () => {
    if (!extension || !saveAsName.trim()) {
      message.error('Please provide a name for the extension');
      return;
    }

    try {
      await saveExtension(saveAsName, extension, {
        description: saveAsDescription,
        category: saveAsCategory,
        tags: saveAsTags,
      });
      
      // Reset save form
      setSaveAsName('');
      setSaveAsDescription('');
      setSaveAsCategory('personal');
      setSaveAsTags([]);
      setShowSaveForm(false);
      
      message.success(`Extension "${saveAsName}" saved successfully!`);
    } catch (error) {
      message.error('Failed to save extension');
      throw error;
    }
  };

  const handleLoadSavedExtension = async (savedExt: SavedExtension) => {
    try {
      const updated = await useExtension(savedExt.id);
      setExtension(updated.extension);
      setVariableName(updated.extension.name);
      setActiveTab(updated.extension.type);
      message.success(`Loaded "${updated.name}"`);
    } catch (error) {
      message.error('Failed to load extension');
    }
  };

  // handleSaveAndInsert functionality removed to simplify UI

  const getIconForType = (type: ExtensionType) => {
    const iconMap: Record<ExtensionType, React.ReactElement> = {
      date: <CalendarOutlined />,
      choice: <UnorderedListOutlined />,
      random: <ThunderboltOutlined />,
      clipboard: <CopyOutlined />,
      echo: <MessageOutlined />,
      script: <CodeOutlined />,
      shell: <CodeSandboxOutlined />,
      form: <FormOutlined />,
    };
    return iconMap[type];
  };

  const tabItems = Object.entries(EXTENSION_METADATA).map(([type, meta]) => ({
    key: type,
    label: (
      <Space>
        {getIconForType(type as ExtensionType)}
        {meta.label}
      </Space>
    ),
    children: (
      <div>
        <Alert
          message={meta.description}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        {type === 'date' && activeTab === 'date' && (
          <DateExtensionConfig
            extension={extension?.type === 'date' ? extension : undefined}
            onChange={handleExtensionChange}
            onVariableNameChange={setVariableName}
          />
        )}
        
        {type === 'choice' && activeTab === 'choice' && (
          <ChoiceExtensionConfig
            extension={extension?.type === 'choice' ? extension : undefined}
            onChange={handleExtensionChange}
            onVariableNameChange={setVariableName}
          />
        )}
        
        {type === 'random' && activeTab === 'random' && (
          <RandomExtensionConfig
            extension={extension?.type === 'random' ? extension : undefined}
            onChange={handleExtensionChange}
            onVariableNameChange={setVariableName}
          />
        )}
        
        {type === 'clipboard' && activeTab === 'clipboard' && (
          <ClipboardExtensionConfig
            onChange={handleExtensionChange}
            onVariableNameChange={setVariableName}
          />
        )}
        
        {type === 'echo' && activeTab === 'echo' && (
          <EchoExtensionConfig
            extension={extension?.type === 'echo' ? extension : undefined}
            onChange={handleExtensionChange}
            onVariableNameChange={setVariableName}
          />
        )}
        
        {type === 'script' && activeTab === 'script' && (
          <ScriptExtensionConfig
            extension={extension?.type === 'script' ? extension : undefined}
            onChange={handleExtensionChange}
            onVariableNameChange={setVariableName}
          />
        )}
        
        {type === 'shell' && activeTab === 'shell' && (
          <ShellExtensionConfig
            extension={extension?.type === 'shell' ? extension : undefined}
            onChange={handleExtensionChange}
            onVariableNameChange={setVariableName}
          />
        )}
        
        {type === 'form' && activeTab === 'form' && (
          <FormExtensionConfig
            extension={extension?.type === 'form' ? extension : undefined}
            onChange={handleExtensionChange}
            onVariableNameChange={setVariableName}
          />
        )}
        
        {extension && variableName && (
          <>
            <Divider>Preview</Divider>
            <div style={{ marginTop: 16 }}>
              <Title level={5}>Variable Usage:</Title>
              <Text code style={{ fontSize: 16 }}>{`{{${variableName}}}`}</Text>
              
              <div style={{ marginTop: 16 }}>
                <Title level={5}>Espanso YAML:</Title>
                <pre style={{ 
                  background: colorBgLayout, 
                  color: colorText,
                  padding: 12, 
                  borderRadius: 4,
                  overflow: 'auto',
                  fontSize: 12,
                  border: '1px solid var(--ant-color-border)',
                }}>
                  {generateEspansoSyntax()}
                </pre>
              </div>
            </div>
          </>
        )}
      </div>
    ),
  }));

  return (
    <Modal
      title={
        <Space>
          <PlusOutlined />
          Extension Builder
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Dropdown
          key="load"
          disabled={savedExtensions.length === 0}
          menu={{
            items: filterExtensions({ extensionType: activeTab }).map(saved => ({
              key: saved.id,
              icon: saved.isFavorite ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />,
              label: (
                <Space>
                  <span>{saved.name}</span>
                  {saved.usageCount > 0 && (
                    <Tag color="blue">{saved.usageCount}</Tag>
                  )}
                </Space>
              ),
              onClick: () => handleLoadSavedExtension(saved),
            })),
          }}
          trigger={['click']}
        >
          <Button icon={<DownOutlined />}>
            Load Saved ({filterExtensions({ extensionType: activeTab }).length})
          </Button>
        </Dropdown>,
        <Button
          key="save"
          icon={<SaveOutlined />}
          onClick={() => setShowSaveForm(!showSaveForm)}
          disabled={!extension || !variableName}
        >
          {showSaveForm ? 'Hide Save' : 'Save'}
        </Button>,
        <Button
          key="insert"
          type="primary"
          onClick={handleInsert}
          disabled={!extension || !variableName}
        >
          Insert Variable
        </Button>,
      ]}
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          const newType = key as ExtensionType;
          setActiveTab(newType);
          // Initialize extension if switching to a new type without an extension
          if (!extension || extension.type !== newType) {
            // Clear variable name when switching types
            setVariableName('');
          }
        }}
        items={tabItems}
      />

      {showSaveForm && (
        <Card 
          title="Save Extension" 
          style={{ marginTop: 16, backgroundColor: colorBgContainer }}
          size="small"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>Name *</Text>
              <Input
                placeholder="Enter extension name"
                value={saveAsName}
                onChange={(e) => setSaveAsName(e.target.value)}
                style={{ marginTop: 4 }}
              />
            </div>
            
            <div>
              <Text strong>Description</Text>
              <Input.TextArea
                placeholder="Optional description"
                value={saveAsDescription}
                onChange={(e) => setSaveAsDescription(e.target.value)}
                rows={2}
                style={{ marginTop: 4 }}
              />
            </div>
            
            <div>
              <Text strong>Category</Text>
              <Select
                value={saveAsCategory}
                onChange={setSaveAsCategory}
                style={{ width: '100%', marginTop: 4 }}
                options={[
                  { label: 'Personal', value: 'personal' },
                  { label: 'Work', value: 'work' },
                  { label: 'Development', value: 'development' },
                  { label: 'System', value: 'system' },
                  { label: 'Text Processing', value: 'text-processing' },
                  { label: 'Utilities', value: 'utilities' },
                ]}
              />
            </div>
            
            <div>
              <Text strong>Tags</Text>
              <Select
                mode="tags"
                value={saveAsTags}
                onChange={setSaveAsTags}
                placeholder="Add tags"
                style={{ width: '100%', marginTop: 4 }}
                tokenSeparators={[',']}
              />
            </div>
            
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <Space>
                <Button onClick={() => setShowSaveForm(false)}>
                  Cancel
                </Button>
                <Button 
                  type="primary" 
                  onClick={handleSaveExtension}
                  disabled={!saveAsName.trim()}
                >
                  Save Extension
                </Button>
              </Space>
            </div>
          </Space>
        </Card>
      )}
    </Modal>
  );
};