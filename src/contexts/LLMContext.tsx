import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { message } from 'antd';

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

interface LLMRequest {
  prompt: string;
  system_prompt?: string;
  context?: Record<string, string>;
  config?: Partial<LLMConfig>;
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

interface LLMContextType {
  isGenerating: boolean;
  defaultConfig: LLMConfig | null;
  configs: LLMConfig[];
  generateText: (request: LLMRequest) => Promise<LLMResponse>;
  generateReplacement: (description: string) => Promise<string>;
  improveReplacement: (original: string, instructions?: string) => Promise<string>;
  generateExtension: (type: string, description: string) => Promise<any>;
  loadConfigs: () => Promise<void>;
}

const LLMContext = createContext<LLMContextType | undefined>(undefined);

export const useLLMContext = () => {
  const context = useContext(LLMContext);
  if (!context) {
    throw new Error('useLLMContext must be used within LLMProvider');
  }
  return context;
};

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

export const LLMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [defaultConfig, setDefaultConfig] = useState<LLMConfig | null>(null);
  const [aiPrompts, setAiPrompts] = useState<AIPrompts | null>(null);
  const [useCustomPrompts, setUseCustomPrompts] = useState(false);

  const loadConfigs = useCallback(async () => {
    try {
      const data = await invoke<{ configs: LLMConfig[] }>('read_llm_configs');
      const loadedConfigs = data.configs || [];
      setConfigs(loadedConfigs);
      
      const defaultCfg = loadedConfigs.find((c: LLMConfig) => c.is_default);
      setDefaultConfig(defaultCfg || null);
    } catch (error) {
      console.error('Failed to load LLM configs:', error);
    }
  }, []);

  const loadPrompts = useCallback(async () => {
    try {
      const data = await invoke<{ prompts: AIPrompts; useCustom: boolean }>('read_ai_prompts');
      setAiPrompts(data.prompts);
      setUseCustomPrompts(data.useCustom);
    } catch (error) {
      console.error('Failed to load AI prompts:', error);
      // Use default prompts if loading fails
      setAiPrompts({
        generateReplacement: {
          system: `You are an expert at creating text replacements for Espanso. 
Generate a concise, useful text replacement based on the user's description.
If the description mentions specific variables or provides context about available variables, use them appropriately with the {{variable_name}} syntax.
Return ONLY the replacement text, no explanations or additional formatting.
Make the replacement practical and ready to use.`,
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
      });
      setUseCustomPrompts(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
    loadPrompts();
  }, [loadConfigs, loadPrompts]);

  const generateText = useCallback(async (request: LLMRequest): Promise<LLMResponse> => {
    setIsGenerating(true);
    try {
      const config = request.config || defaultConfig;
      if (!config) {
        throw new Error('No LLM configuration available. Please configure an API in settings.');
      }

      console.log('Using LLM config:', config);
      console.log('API URL:', config.api_url);

      // Get API key from secure storage
      const apiKey = await invoke('get_llm_api_key', { configId: config.id });

      const llmRequest = {
        prompt: request.prompt,
        system_prompt: request.system_prompt,
        context: request.context,
        config: {
          provider: config.provider,
          api_url: config.api_url,
          model: config.model,
          temperature: config.temperature,
          max_tokens: config.max_tokens
        }
      };

      const response = await invoke('generate_with_llm', {
        apiKey,
        request: llmRequest
      });

      return response as LLMResponse;
    } catch (error: any) {
      message.error(`Generation failed: ${error.toString()}`);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [defaultConfig]);

  const generateReplacement = useCallback(async (description: string): Promise<string> => {
    if (!aiPrompts) {
      throw new Error('AI prompts not loaded');
    }

    const prompts = useCustomPrompts ? aiPrompts.generateReplacement : {
      system: `You are an expert at creating text replacements for Espanso. 
Generate a concise, useful text replacement based on the user's description.
If the description mentions specific variables or provides context about available variables, use them appropriately with the {{variable_name}} syntax.
Return ONLY the replacement text, no explanations or additional formatting.
Make the replacement practical and ready to use.`,
      user: `Create a text replacement for: {description}`
    };

    const response = await generateText({
      system_prompt: prompts.system,
      prompt: prompts.user.replace('{description}', description)
    });
    
    return response.text.trim();
  }, [generateText, aiPrompts, useCustomPrompts]);

  const improveReplacement = useCallback(async (
    original: string, 
    instructions?: string
  ): Promise<string> => {
    if (!aiPrompts) {
      throw new Error('AI prompts not loaded');
    }

    const prompts = useCustomPrompts ? aiPrompts.improveReplacement : {
      system: `You are an expert at improving text replacements.
Enhance the given text while maintaining its core purpose.
Return ONLY the improved text, no explanations.`,
      userWithInstructions: `Improve this text according to these instructions: "{instructions}"

Original text: {original}`,
      userWithoutInstructions: `Improve this text to be more professional and polished: {original}`
    };

    const response = await generateText({
      system_prompt: prompts.system,
      prompt: instructions 
        ? prompts.userWithInstructions.replace('{instructions}', instructions).replace('{original}', original)
        : prompts.userWithoutInstructions.replace('{original}', original)
    });
    
    return response.text.trim();
  }, [generateText, aiPrompts, useCustomPrompts]);

  const generateExtension = useCallback(async (
    type: string, 
    description: string
  ): Promise<any> => {
    if (!aiPrompts) {
      throw new Error('AI prompts not loaded');
    }

    const defaultPrompts = {
      system: `You are an expert at creating Espanso extensions.
Generate the requested extension configuration as valid JSON.
Ensure the output is properly formatted and follows Espanso's extension schema.`,
      script: `Generate a script that: {description}
Return a JSON object with: { interpreter: "python" or "node", script: "the script code", args: [] }`,
      shell: `Generate a shell command that: {description}
Return a JSON object with: { cmd: "the command", shell: "bash" }`,
      form: `Generate a form for: {description}
Return a JSON object with: { title: "form title", fields: [{ name: "field_name", type: "text", label: "Field Label" }] }`
    };

    const prompts = useCustomPrompts ? aiPrompts.generateExtension : defaultPrompts;
    
    const extensionPrompts: Record<string, string> = {
      script: prompts.script.replace('{description}', description),
      shell: prompts.shell.replace('{description}', description),
      form: prompts.form.replace('{description}', description)
    };

    const response = await generateText({
      system_prompt: prompts.system,
      prompt: extensionPrompts[type] || `Generate a ${type} extension that: ${description}`
    });

    try {
      // Try to parse as JSON
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in response');
    } catch (error) {
      console.error('Failed to parse extension JSON:', error);
      throw new Error('Failed to generate valid extension configuration');
    }
  }, [generateText, aiPrompts, useCustomPrompts]);

  const value: LLMContextType = {
    isGenerating,
    defaultConfig,
    configs,
    generateText,
    generateReplacement,
    improveReplacement,
    generateExtension,
    loadConfigs
  };

  return <LLMContext.Provider value={value}>{children}</LLMContext.Provider>;
};