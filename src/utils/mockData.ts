// Mock data for development when Tauri is not available
export const mockCategories = {
  categories: [
    {
      id: "general",
      name: "General",
      description: "Variables migrated from base.yml",
      icon: "InfoCircleOutlined",
      color: "#1890ff",
      isDefault: false,
      variableDefinitions: [
        {
          id: "mydate",
          name: "mydate",
          description: "Date variable from base.yml",
          defaultValue: "",
          required: false
        },
        {
          id: "output",
          name: "output",
          description: "Output variable from base.yml",
          defaultValue: "",
          required: false
        }
      ]
    },
    {
      id: "ai-prompts",
      name: "AI Prompts",
      description: "Variables for AI prompt templates",
      icon: "RobotOutlined",
      color: "#722ed1",
      isDefault: false,
      variableDefinitions: []
    },
    {
      id: "temporary",
      name: "Temporary",
      description: "Temporary variables from better_replacements.yml",
      icon: "ClockCircleOutlined",
      color: "#faad14",
      isDefault: false,
      variableDefinitions: []
    },
    {
      id: "development",
      name: "Development",
      description: "Development-related variables",
      icon: "CodeOutlined",
      color: "#52c41a",
      isDefault: true,
      variableDefinitions: [
        {
          id: "tech_stack",
          name: "tech_stack",
          description: "Technology stack used",
          defaultValue: "TypeScript",
          required: false
        }
      ]
    }
  ],
  lastUpdated: new Date().toISOString()
};

export const mockProjects = {
  projects: [
    {
      id: "6f0d16f6-255e-49f6-b675-b7f7d618e9ba",
      name: "Better replacements manager",
      description: "Used to manage and easily create text replacements with Espanso",
      stack: "TypeScript, React 18, Ant Design 5.25.2, Rust, Tauri v2",
      directory: "/Volumes/4TB/Users/josephmcmyne/myProjects/BRM",
      restartCommand: "./universal_build.sh --release",
      logCommand: "npm run logs",
      categoryId: "ai-prompts",
      isActive: false,
      createdAt: "2025-05-23T14:05:48.428Z",
      updatedAt: "2025-05-23T14:05:48.428Z",
      categoryValues: {}
    },
    {
      id: "a7470b6b-c453-4205-a1f2-40e93a9f6603",
      name: "AR Dash",
      description: "A comprehensive project management system",
      stack: "TypeScript",
      directory: "/Volumes/4TB/Users/josephmcmyne/myProjects/management",
      restartCommand: "npm run dev",
      logCommand: "npm run logs",
      categoryId: "ai-prompts",
      isActive: false,
      createdAt: "2025-05-23T15:20:55.960Z",
      updatedAt: "2025-05-23T15:20:55.960Z",
      categoryValues: {}
    }
  ],
  activeProjectId: null
};

export const mockReplacements = [
  {
    trigger: ":hello",
    replacement: "Hello, World!",
    description: "A simple greeting"
  }
];