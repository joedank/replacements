import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Card, 
  Button, 
  Input, 
  Select, 
  InputNumber, 
  Space, 
  Table, 
  Modal, 
  Form, 
  message, 
  Tag,
  Tooltip,
  Switch,
  Alert,
  Popconfirm
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  KeyOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ApiOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
const { Title, Text } = Typography;
const { Option } = Select;

interface LLMConfig {
  id: string;
  name: string;
  provider: string;
  api_url: string;
  model: string;
  temperature: number;
  max_tokens: number;
  is_default: boolean;
}

interface LLMConfigData {
  configs: LLMConfig[];
  last_updated: string;
}

interface LLMResponse {
  text: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

const PROVIDER_PRESETS = {
  openai: {
    api_url: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    default_model: 'gpt-4o-mini'
  },
  anthropic: {
    api_url: 'https://api.anthropic.com/v1/messages',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    default_model: 'claude-3-5-sonnet-20241022'
  },
  deepseek: {
    api_url: 'https://api.deepseek.com/v1/chat/completions',
    models: ['deepseek-chat', 'deepseek-coder'],
    default_model: 'deepseek-chat'
  },
  local: {
    api_url: 'http://localhost:11434/v1/chat/completions',
    models: ['llama3.2', 'mistral', 'codellama', 'custom'],
    default_model: 'llama3.2'
  },
  custom: {
    api_url: '',
    models: [],
    default_model: ''
  }
};

export const APISettings: React.FC = () => {
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<LLMConfig | null>(null);
  const [apiKeyStatus, setApiKeyStatus] = useState<Record<string, boolean>>({});
  const [testingConfig, setTestingConfig] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const data: LLMConfigData = await invoke('read_llm_configs');
      setConfigs(data.configs);
      
      // Check API key status for each config
      const keyStatus: Record<string, boolean> = {};
      for (const config of data.configs) {
        keyStatus[config.id] = await invoke('check_llm_api_key', { configId: config.id });
      }
      setApiKeyStatus(keyStatus);
    } catch (error) {
      message.error('Failed to load LLM configurations');
      console.error(error);
    }
  };

  const saveConfigs = async (newConfigs: LLMConfig[]) => {
    try {
      await invoke('write_llm_configs', {
        data: {
          configs: newConfigs,
          last_updated: new Date().toISOString()
        }
      });
      setConfigs(newConfigs);
      message.success('Configurations saved');
    } catch (error) {
      message.error('Failed to save configurations');
      console.error(error);
    }
  };

  const handleAddEdit = async (values: any) => {
    try {
      const newConfig: LLMConfig = {
        id: editingConfig?.id || `llm_${Date.now()}`,
        name: values.name,
        provider: values.provider,
        api_url: values.api_url,
        model: values.model,
        temperature: values.temperature,
        max_tokens: values.max_tokens,
        is_default: values.is_default || false
      };

      // Validate configuration
      await invoke('validate_llm_config', { config: newConfig });

      // Store API key if provided
      if (values.api_key) {
        await invoke('store_llm_api_key', { 
          configId: newConfig.id, 
          apiKey: values.api_key 
        });
        setApiKeyStatus(prev => ({ ...prev, [newConfig.id]: true }));
      }

      let updatedConfigs: LLMConfig[];
      if (editingConfig) {
        updatedConfigs = configs.map(c => c.id === editingConfig.id ? newConfig : c);
      } else {
        updatedConfigs = [...configs, newConfig];
      }

      // If setting as default, unset other defaults
      if (newConfig.is_default) {
        updatedConfigs = updatedConfigs.map(c => ({
          ...c,
          is_default: c.id === newConfig.id
        }));
      }

      await saveConfigs(updatedConfigs);
      setIsModalVisible(false);
      form.resetFields();
      setEditingConfig(null);
    } catch (error: any) {
      message.error(error.toString());
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Delete API key
      await invoke('delete_llm_api_key', { configId: id });
      
      // Remove from configs
      const updatedConfigs = configs.filter(c => c.id !== id);
      await saveConfigs(updatedConfigs);
      
      setApiKeyStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[id];
        return newStatus;
      });
    } catch (error) {
      message.error('Failed to delete configuration');
    }
  };

  const handleTest = async (config: LLMConfig) => {
    setTestingConfig(config.id);
    try {
      const apiKey = await invoke('get_llm_api_key', { configId: config.id });
      const response = await invoke<LLMResponse>('generate_with_llm', {
        apiKey,
        request: {
          prompt: "Hello! Please respond with a brief greeting.",
          config: {
            provider: config.provider,
            api_url: config.api_url,
            model: config.model,
            temperature: 0.7,
            max_tokens: 50
          }
        }
      });
      
      message.success('Connection successful!');
      Modal.info({
        title: 'Test Response',
        content: (
          <div>
            <Text>{response.text}</Text>
            {response.usage && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Tokens used: {response.usage.total_tokens}
                </Text>
              </div>
            )}
          </div>
        )
      });
    } catch (error: any) {
      message.error(`Test failed: ${error.toString()}`);
    } finally {
      setTestingConfig(null);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: LLMConfig) => (
        <Space>
          <Text strong>{text}</Text>
          {record.is_default && <Tag color="blue">Default</Tag>}
        </Space>
      )
    },
    {
      title: 'Provider',
      dataIndex: 'provider',
      key: 'provider',
      render: (provider: string) => (
        <Tag color={
          provider === 'openai' ? 'green' : 
          provider === 'anthropic' ? 'purple' : 
          provider === 'deepseek' ? 'blue' :
          'orange'
        }>
          {provider.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model'
    },
    {
      title: 'API Key',
      key: 'api_key',
      render: (_: any, record: LLMConfig) => (
        apiKeyStatus[record.id] ? (
          <Tag icon={<CheckCircleOutlined />} color="success">Configured</Tag>
        ) : (
          <Tag icon={<ExclamationCircleOutlined />} color="warning">Not Set</Tag>
        )
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: LLMConfig) => (
        <Space>
          <Tooltip title="Test Connection">
            <Button
              size="small"
              icon={<ApiOutlined />}
              onClick={() => handleTest(record)}
              loading={testingConfig === record.id}
              disabled={!apiKeyStatus[record.id]}
            />
          </Tooltip>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingConfig(record);
              form.setFieldsValue({
                ...record,
                api_key: '' // Don't populate API key for security
              });
              setIsModalVisible(true);
            }}
          />
          <Popconfirm
            title="Delete this configuration?"
            description="This will also delete the stored API key."
            onConfirm={() => handleDelete(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div 
      style={{ 
        height: '100%', 
        overflow: 'auto',
        padding: '24px',
      }}
      className="custom-scrollbar"
    >
      <Title level={2}>API Settings</Title>
      
      <Alert
        message="Secure API Key Storage"
        description="API keys are stored securely in your system's keychain. They are never saved in plain text or configuration files."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />
      
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Title level={4}>LLM Configurations</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingConfig(null);
              form.resetFields();
              setIsModalVisible(true);
            }}
          >
            Add Configuration
          </Button>
        </div>
        
        <Table
          dataSource={configs}
          columns={columns}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Modal
        title={editingConfig ? 'Edit Configuration' : 'Add Configuration'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
          setEditingConfig(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddEdit}
          initialValues={{
            temperature: 0.7,
            max_tokens: 2000,
            provider: 'openai'
          }}
        >
          <Form.Item
            name="name"
            label="Configuration Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="e.g., Production GPT-4" />
          </Form.Item>

          <Form.Item
            name="provider"
            label="Provider"
            rules={[{ required: true }]}
          >
            <Select
              onChange={(value) => {
                const preset = PROVIDER_PRESETS[value as keyof typeof PROVIDER_PRESETS];
                if (preset) {
                  form.setFieldsValue({
                    api_url: preset.api_url,
                    model: preset.default_model
                  });
                }
              }}
            >
              <Option value="openai">OpenAI</Option>
              <Option value="anthropic">Anthropic</Option>
              <Option value="deepseek">DeepSeek</Option>
              <Option value="local">Local (Ollama)</Option>
              <Option value="custom">Custom</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="api_url"
            label="API URL"
            rules={[{ required: true, type: 'url', message: 'Please enter a valid URL' }]}
          >
            <Input placeholder="https://api.openai.com/v1/chat/completions" />
          </Form.Item>

          <Form.Item
            name="model"
            label="Model"
            rules={[{ required: true }]}
          >
            <Input placeholder="e.g., gpt-4o-mini" />
          </Form.Item>

          <Form.Item
            name="api_key"
            label={
              <Space>
                <KeyOutlined />
                API Key
                {editingConfig && apiKeyStatus[editingConfig.id] && (
                  <Text type="secondary">(Leave empty to keep existing)</Text>
                )}
              </Space>
            }
            rules={[
              { 
                required: !editingConfig || !apiKeyStatus[editingConfig?.id], 
                message: 'API key is required' 
              }
            ]}
          >
            <Input.Password
              placeholder="sk-..."
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>

          <Form.Item
            name="temperature"
            label="Temperature"
            rules={[{ required: true }]}
          >
            <InputNumber
              min={0}
              max={2}
              step={0.1}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="max_tokens"
            label="Max Tokens"
            rules={[{ required: true }]}
          >
            <InputNumber
              min={1}
              max={32000}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="is_default"
            label="Set as Default"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingConfig ? 'Update' : 'Add'} Configuration
              </Button>
              <Button onClick={() => {
                setIsModalVisible(false);
                form.resetFields();
                setEditingConfig(null);
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};