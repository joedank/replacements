# Category Relationship Analysis: Old Implementation vs Current

## Overview
The old implementation (from https://github.com/joedank/replacements) has a crucial feature missing in the current BRM project: **Project Categories** (not to be confused with "Replacement Categories"). This creates a hierarchy where:

1. **Project Categories** - Define variable templates for different project types
2. **Projects** - Individual projects that belong to a specific project category
3. **Replacement Categories** - YAML files containing text replacements

## Key Finding: The Hierarchy

The old implementation has a **three-tier hierarchy**:

```
Project Categories (defined by user, e.g., "Development", "Marketing")
    ├── Base Replacements (special category with default variables)
    ├── Development (variables like tech_stack, directory, restart_command)
    └── AI Prompts (variables specific to AI templates)
         │
         ├── Project A (categoryId: "development")
         ├── Project B (categoryId: "development")
         └── Project C (categoryId: "ai-prompts")
                  │
                  └── Replacement Categories (YAML files)
                      ├── Global
                      ├── Base
                      ├── AI Prompts
                      └── Teapot
```

## File Structure Analysis

### 1. Project Categories (Desktop Application Level)
**Location**: `~/Library/Application Support/BetterReplacementsManager/project_categories.json`

```typescript
// From projectCategories.ts
export interface ProjectCategory {
  id: string;              // 'general', 'development', 'ai-prompts'
  name: string;            // Display name: 'Base Replacements', 'Development', etc.
  description?: string;
  icon?: string;           // Ant Design icon name
  color?: string;
  isDefault?: boolean;     // Cannot be deleted if true
  fileName?: string;       // Associated YAML file: 'base.yml', 'project_development.yml'
  variableDefinitions: ProjectCategoryVariable[];  // Variable template definitions
}

export interface ProjectCategoryVariable {
  id: string;
  name: string;            // Variable name without {{ }} - e.g., 'tech_stack'
  description?: string;
  defaultValue?: string;
  required?: boolean;
}
```

**Default Project Categories**:
```typescript
[
  {
    id: 'general',
    name: 'Base Replacements',
    description: 'Basic text replacements and project information',
    icon: 'InfoCircleOutlined',
    color: '#1890ff',
    isDefault: true,
    fileName: 'base.yml',
    variableDefinitions: [
      { id: 'project_name', name: 'project_name', required: true },
      { id: 'project_description', name: 'project_description' }
    ]
  },
  {
    id: 'development',
    name: 'Development',
    description: 'Development-related variables',
    icon: 'CodeOutlined',
    color: '#52c41a',
    isDefault: true,
    fileName: 'project_development.yml',
    variableDefinitions: [
      { id: 'tech_stack', name: 'tech_stack', defaultValue: 'TypeScript' },
      { id: 'directory', name: 'directory' },
      { id: 'restart_command', name: 'restart_command', defaultValue: 'npm run dev' },
      { id: 'log_command', name: 'log_command', defaultValue: 'npm run logs' }
    ]
  }
]
```

### 2. Projects
**Location**: `~/Library/Application Support/BetterReplacementsManager/projects.json`

```typescript
export interface Project {
  id: string;
  name: string;
  description?: string;
  categoryId: string;      // ← KEY RELATIONSHIP: Links to ProjectCategory.id
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Category-based variable values
  categoryValues?: Record<
    string,                // categoryId (e.g., 'development')
    Record<
      string,              // variableId (e.g., 'tech_stack')
      string               // value (e.g., 'TypeScript')
    >
  >;
}
```

**Example**:
```json
{
  "id": "proj_123",
  "name": "My React App",
  "categoryId": "development",  // ← Belongs to Development project category
  "categoryValues": {
    "general": {                // Values from 'Base Replacements' category
      "project_name": "My React App",
      "project_description": "A web application"
    },
    "development": {            // Values from 'Development' category
      "tech_stack": "React + TypeScript",
      "directory": "/Users/joe/projects/my-app",
      "restart_command": "npm run dev",
      "log_command": "npm run logs"
    }
  }
}
```

### 3. Replacement Categories (YAML Files)
**Location**: `~/Library/Application Support/espanso/match/*.yml`

These are NOT filtered by project category. They are static categories in the sidebar.

```yaml
# File: base.yml
matches:
  - trigger: ":email"
    replace: "john@example.com"
  - trigger: ":sig"
    replace: "Best regards,\nJohn Doe"

# File: better_replacements.yml
matches:
  - trigger: ":react"
    replace: "import React from 'react';"
```

## How the Old Implementation Links Them

### MainLayout.tsx - Category Dropdown Filter
```typescript
// Line 238-260: Category dropdown in header
<Select
  style={{ width: 200 }}
  placeholder={selectedCategoryId ? undefined : "All categories"}
  value={selectedCategoryId || undefined}
  onChange={(value) => setSelectedCategory(value || null)}
  options={projectCategories.map(category => ({
    label: category.name,        // e.g., "Development"
    value: category.id,          // e.g., "development"
  }))}
/>

// Line 262-285: Project dropdown
<Select
  style={{ width: 250 }}
  value={activeProject?.id || undefined}
  onChange={(value) => setActiveProject(value || null)}
  options={filteredProjects.map(project => ({
    label: project.name,
    value: project.id,
  }))}
/>
```

### ProjectContext.tsx - Filtering Logic
```typescript
// Lines 44-46: Filter projects by selected category
const filteredProjects = selectedCategoryId 
  ? projects.filter(p => p.categoryId === selectedCategoryId)
  : projects;

// Lines 164-170: When category selected, clear incompatible active project
const setSelectedCategory = (categoryId: string | null) => {
  setSelectedCategoryId(categoryId);
  // If active project is not in the new category, clear it
  if (categoryId && activeProject && activeProject.categoryId !== categoryId) {
    setActiveProject(null);
  }
};
```

## The Missing Feature in Current Implementation

The current BRM project is missing:

1. **Project Categories as a configuration entity** - No distinction between project types
2. **Project.categoryId field** - Projects can't be grouped by type
3. **ProjectCategoriesContext** - Exists in the old implementation (though code exists in new one)
4. **Category dropdown in MainLayout** - No way to filter projects by category
5. **Variable templates per category** - Project categories define which variables are available

## Data Flow in Old Implementation

### When selecting a category:
```
User selects "Development" in category dropdown
    ↓
setSelectedCategory("development") called
    ↓
filteredProjects updates to only show projects where categoryId === "development"
    ↓
Projects dropdown now shows only Development-type projects
    ↓
When a Development project is selected as active
    ↓
Project variables from "development" ProjectCategory are loaded
    ↓
Variables displayed in variable insertion UI
```

### Project Variables Structure
Each project stores values for all its category's variables:
```
Project "My App" (categoryId: "development")
  └── categoryValues: {
        "general": { "project_name": "My App", ... },
        "development": { "tech_stack": "TypeScript", "directory": "/path", ... }
      }
```

## Rust Backend Implementation

From `lib.rs`:
```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
struct Project {
    id: String,
    name: String,
    description: Option<String>,
    #[serde(rename = "categoryId")]  // ← Renamed from snake_case for frontend
    category_id: String,
    #[serde(rename = "isActive")]
    is_active: bool,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "updatedAt")]
    updated_at: String,
    #[serde(rename = "categoryValues")]
    category_values: Option<HashMap<String, HashMap<String, String>>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Category {
    id: String,
    name: String,
    #[serde(rename = "fileName")]
    file_name: String,
    description: Option<String>,
    icon: String,
    color: Option<String>,
    #[serde(rename = "isDefault")]
    is_default: Option<bool>,
}
```

## Migration Script Evidence

The `migrate-to-categories.js` shows how the system was designed:
- Maps YAML files to project categories (e.g., `base.yml` → category "general")
- Assigns each project a `categoryId`
- Stores all project variables in `categoryValues` nested by category ID
- Creates default categories: 'general', 'ai-prompts'

## Summary: What Needs to be Implemented

To restore this feature to the current BRM:

1. **Add categoryId to Project type** ← Critical missing field
2. **Implement category dropdown in MainLayout** ← Missing UI
3. **Add filter logic to ProjectContext** ← Partially exists
4. **Ensure ProjectCategoriesContext is fully functional** ← Partially exists
5. **Update project creation/update flow** ← Needs to assign categoryId
6. **Link replacement categories to project categories** ← Optional enhancement

The key relationship is: **Project.categoryId points to ProjectCategory.id**

This allows one category (e.g., "Development") to have multiple projects, but each project belongs to only ONE project category.
