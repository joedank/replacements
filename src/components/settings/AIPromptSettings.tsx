import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Card, 
  Button, 
  Input, 
  Form, 
  message, 
  Space,
  Tabs,
  Alert,
  Tooltip,
  Collapse,
  Switch,
  Tag,
  Divider,
  Empty
} from 'antd';
import { 
  SaveOutlined, 
  ReloadOutlined,
  InfoCircleOutlined,
  EditOutlined,
  CodeOutlined,
  BulbOutlined,
  ProjectOutlined,
  FunctionOutlined
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { useProjects } from '../../contexts/ProjectContext';
import { useVariables } from '../../contexts/VariablesContext';
import { useProjectCategories } from '../../contexts/ProjectCategoriesContext';
import { CustomVariableCategory, CustomVariable } from '../../types/variables';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Panel } = Collapse;

interface AIPrompts {
  generateReplacement: {
    system: string;
    user: string;
  };
  improveReplacement: {
    system: string;
    userWithInstructions: string;
    userWithoutInstructions: string;
  };
  generateExtension: {
    system: string;
    script: string;
    shell: string;
    form: string;
  };
}

const DEFAULT_PROMPTS: AIPrompts = {
  generateReplacement: {
    system: `You are an expert at creating text replacements for Espanso. 
Generate a concise, useful text replacement based on the user's description.
If the description mentions specific variables or provides context about available variables, use them appropriately with the {{variable_name}} syntax.
Return ONLY the replacement text, no explanations or additional formatting.
Make the replacement practical and ready to use.

You will receive context about the active project and available variables. Use them intelligently where they make sense for the requested replacement.`,
    user: `Create a text replacement for: {description}`
  },
  improveReplacement: {
    system: `You are an expert at improving text replacements.
Enhance the given text while maintaining its core purpose.
Return ONLY the improved text, no explanations.`,
    userWithInstructions: `Improve this text according to these instructions: "{instructions}"

Original text: {original}`,
    userWithoutInstructions: `Improve this text to be more professional and polished: {original}`
  },
  generateExtension: {
    system: `You are an expert at creating Espanso extensions.
Generate the requested extension configuration as valid JSON.
Ensure the output is properly formatted and follows Espanso's extension schema.`,
    script: `Generate a script that: {description}
Return a JSON object with: { interpreter: "python" or "node", script: "the script code", args: [] }`,
    shell: `Generate a shell command that: {description}
Return a JSON object with: { cmd: "the command", shell: "bash" }`,
    form: `Generate a form for: {description}
Return a JSON object with: { title: "form title", fields: [{ name: "field_name", type: "text", label: "Field Label" }] }`
  }
};

export const AIPromptSettings: React.FC = () => {
  const [prompts, setPrompts] = useState<AIPrompts>(DEFAULT_PROMPTS);
  const [hasChanges, setHasChanges] = useState(false);
  const [useCustomPrompts, setUseCustomPrompts] = useState(false);
  const [form] = Form.useForm();
  
  const { activeProject } = useProjects();
  const { categories: variableCategories } = useVariables();
  const { categories: projectCategories } = useProjectCategories();

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const data = await invoke<{ prompts: AIPrompts; useCustom: boolean }>('read_ai_prompts');
      setPrompts(data.prompts);
      setUseCustomPrompts(data.useCustom);
      form.setFieldsValue(data.prompts);
    } catch (error) {
      console.error('Failed to load AI prompts:', error);
      // Use defaults if no saved prompts
      form.setFieldsValue(DEFAULT_PROMPTS);
    }
  };

  const handleSave = async () => {
    try {
      const values = form.getFieldsValue();
      await invoke('write_ai_prompts', { 
        prompts: values,
        useCustom: useCustomPrompts
      });
      setPrompts(values);
      setHasChanges(false);
      message.success('AI prompts saved successfully');
    } catch (error) {
      message.error('Failed to save AI prompts');
      console.error(error);
    }
  };

  const handleReset = () => {
    form.setFieldsValue(DEFAULT_PROMPTS);
    setPrompts(DEFAULT_PROMPTS);
    setHasChanges(true);
  };

  const handleFormChange = () => {
    setHasChanges(true);
  };

  // Get all available variables that will be passed to AI
  const getAvailableVariables = () => {
    const variables: { name: string; value: string; source: string }[] = [];
    const addedVariables = new Set<string>(); // Track added variables to prevent duplicates
    
    // Add project variables if there's an active project
    if (activeProject) {
      // Add category variables from the active project's category and any categories with values
      if (projectCategories) {
        const categoriesToProcess = new Set<string>();
        
        // Always include the project's assigned category
        categoriesToProcess.add(activeProject.categoryId);
        
        // Also include any categories that have actual values
        if (activeProject.categoryValues) {
          Object.keys(activeProject.categoryValues).forEach(categoryId => {
            categoriesToProcess.add(categoryId);
          });
        }
        
        // Process each relevant category
        categoriesToProcess.forEach(categoryId => {
          const category = projectCategories.find(c => c.id === categoryId);
          if (category) {
            const categoryValues = activeProject.categoryValues?.[categoryId] || {};
            category.variableDefinitions.forEach(varDef => {
              const value = categoryValues[varDef.id] || varDef.defaultValue;
              if (value && !addedVariables.has(varDef.name)) {
                variables.push({
                  name: varDef.name,
                  value: value,
                  source: `${category.name} Category`
                });
                addedVariables.add(varDef.name);
              }
            });
          }
        });
      }
      
      // Add the project name as fallback if not already added from categories
      if (!addedVariables.has('active_project_name')) {
        variables.push(
          { name: 'active_project_name', value: activeProject.name, source: 'Project' }
        );
        addedVariables.add('active_project_name');
      }
    }
    
    // Add custom variables (avoid duplicates)
    variableCategories.forEach((cat: CustomVariableCategory) => {
      cat.variables.forEach((v: CustomVariable) => {
        if (!addedVariables.has(v.name)) {
          variables.push({
            name: v.name,
            value: v.value,
            source: cat.name
          });
          addedVariables.add(v.name);
        }
      });
    });
    
    return variables;
  };

  const availableVariables = getAvailableVariables();

  const renderPromptField = (
    name: string[], 
    label: string, 
    placeholder: string,
    help?: string,
    rows: number = 4
  ) => (
    <Form.Item
      name={name}
      label={
        <Space>
          {label}
          {help && (
            <Tooltip title={help}>
              <InfoCircleOutlined style={{ color: '#1890ff' }} />
            </Tooltip>
          )}
        </Space>
      }
    >
      <TextArea 
        rows={rows} 
        placeholder={placeholder}
        disabled={!useCustomPrompts}
        onChange={handleFormChange}
      />
    </Form.Item>
  );

  return (
    <div 
      style={{ 
        height: '100%', 
        overflow: 'auto',
        padding: '24px',
      }}
      className="custom-scrollbar"
    >
      <Title level={2}>AI Prompt Settings</Title>
      
      <Alert
        message="Customize AI Prompts"
        description="Modify the prompts used by the AI to generate replacements and extensions. Use placeholders like {description}, {original}, {instructions} which will be replaced with actual values."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card style={{ marginBottom: 24 }}>
        <Title level={4}>
          <FunctionOutlined /> Available Variables for AI Context
        </Title>
        <Paragraph type="secondary">
          These variables are automatically passed to the AI when generating replacements. The AI can use them to create more contextual content.
        </Paragraph>
        
        {activeProject ? (
          <div>
            <Space align="center" style={{ marginBottom: 12 }}>
              <ProjectOutlined />
              <Text strong>Active Project: {activeProject.name}</Text>
            </Space>
            
            {availableVariables.length > 0 ? (
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {availableVariables.map((variable, index) => (
                    <Tooltip 
                      key={index}
                      title={
                        <div>
                          <div><strong>Value:</strong> {variable.value}</div>
                          <div><strong>Source:</strong> {variable.source}</div>
                        </div>
                      }
                    >
                      <Tag color={variable.source === 'Project' ? 'blue' : 'green'}>
                        {`{{${variable.name}}}`}
                      </Tag>
                    </Tooltip>
                  ))}
                </div>
                
                <Divider />
                
                <Alert
                  message="How variables are used in AI generation"
                  description={
                    <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                      <li>When you generate a replacement, these variables are sent as context to the AI</li>
                      <li>The AI will automatically use relevant variables based on your description</li>
                      <li>For example, if you ask for "email signature", it might use project name and other relevant variables</li>
                      <li>You can reference specific variables in your prompts using the placeholder syntax shown above</li>
                    </ul>
                  }
                  type="info"
                  showIcon={false}
                  style={{ marginTop: 16 }}
                />
              </div>
            ) : (
              <Empty 
                description="No variables defined for this project"
                style={{ marginTop: 16 }}
              />
            )}
          </div>
        ) : (
          <Empty 
            description="No active project selected"
            style={{ marginTop: 16 }}
          >
            <Button type="link" onClick={() => window.location.hash = '#projects'}>
              Go to Projects
            </Button>
          </Empty>
        )}
      </Card>

      <Card>
        <div style={{ marginBottom: 24 }}>
          <Space align="center" size="large">
            <Switch
              checked={useCustomPrompts}
              onChange={(checked) => {
                setUseCustomPrompts(checked);
                setHasChanges(true);
              }}
            />
            <Text strong>Use Custom Prompts</Text>
            <Text type="secondary">
              When disabled, the system will use default prompts
            </Text>
          </Space>
        </div>

        <Form
          form={form}
          layout="vertical"
          initialValues={prompts}
          disabled={!useCustomPrompts}
        >
          <Tabs defaultActiveKey="replacement">
            <TabPane 
              tab={
                <span>
                  <EditOutlined />
                  Text Replacement
                </span>
              } 
              key="replacement"
            >
              <Collapse defaultActiveKey={['generate', 'improve']}>
                <Panel header="Generate Replacement" key="generate">
                  {renderPromptField(
                    ['generateReplacement', 'system'],
                    'System Prompt',
                    'Enter the system prompt for generating replacements...',
                    'This sets the AI\'s behavior and context',
                    6
                  )}
                  {renderPromptField(
                    ['generateReplacement', 'user'],
                    'User Prompt Template',
                    'Enter the user prompt template...',
                    'Use {description} as placeholder for user input',
                    3
                  )}
                </Panel>
                
                <Panel header="Improve Replacement" key="improve">
                  {renderPromptField(
                    ['improveReplacement', 'system'],
                    'System Prompt',
                    'Enter the system prompt for improving replacements...',
                    'This sets the AI\'s behavior for improvements',
                    6
                  )}
                  {renderPromptField(
                    ['improveReplacement', 'userWithInstructions'],
                    'User Prompt (With Instructions)',
                    'Enter the user prompt when instructions are provided...',
                    'Use {instructions} and {original} as placeholders',
                    4
                  )}
                  {renderPromptField(
                    ['improveReplacement', 'userWithoutInstructions'],
                    'User Prompt (Without Instructions)',
                    'Enter the user prompt when no instructions are provided...',
                    'Use {original} as placeholder',
                    3
                  )}
                </Panel>
              </Collapse>
            </TabPane>

            <TabPane 
              tab={
                <span>
                  <CodeOutlined />
                  Extensions
                </span>
              } 
              key="extensions"
            >
              <Collapse defaultActiveKey={['extension-system']}>
                <Panel header="Extension System Prompt" key="extension-system">
                  {renderPromptField(
                    ['generateExtension', 'system'],
                    'System Prompt',
                    'Enter the system prompt for generating extensions...',
                    'This sets the AI\'s behavior for all extension types',
                    6
                  )}
                </Panel>
                
                <Panel header="Script Extension" key="script">
                  {renderPromptField(
                    ['generateExtension', 'script'],
                    'Script Prompt Template',
                    'Enter the prompt for generating script extensions...',
                    'Use {description} as placeholder',
                    4
                  )}
                </Panel>
                
                <Panel header="Shell Extension" key="shell">
                  {renderPromptField(
                    ['generateExtension', 'shell'],
                    'Shell Prompt Template',
                    'Enter the prompt for generating shell extensions...',
                    'Use {description} as placeholder',
                    4
                  )}
                </Panel>
                
                <Panel header="Form Extension" key="form">
                  {renderPromptField(
                    ['generateExtension', 'form'],
                    'Form Prompt Template',
                    'Enter the prompt for generating form extensions...',
                    'Use {description} as placeholder',
                    4
                  )}
                </Panel>
              </Collapse>
            </TabPane>
          </Tabs>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                disabled={!hasChanges}
              >
                Save Prompts
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
                disabled={!useCustomPrompts}
              >
                Reset to Defaults
              </Button>
            </Space>
            
            <div>
              <Paragraph type="secondary" style={{ margin: 0 }}>
                <BulbOutlined /> Tip: Test your prompts after saving to ensure they generate the expected results
              </Paragraph>
            </div>
          </div>
        </Form>
      </Card>
    </div>
  );
};