# Category Hierarchy - Visual Diagrams

## Three-Tier Hierarchy (Conceptual)

```
┌─────────────────────────────────────────────────────────────────┐
│            PROJECT CATEGORIES (App Configuration)               │
│  Defines variable templates and rules for project types         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   General    │  │ Development  │  │  AI Prompts  │          │
│  │ (Default)    │  │ (Default)    │  │ (Custom)     │          │
│  │ categoryId:  │  │ categoryId:  │  │ categoryId:  │          │
│  │ "general"    │  │"development" │  │"ai-prompts"  │          │
│  │              │  │              │  │              │          │
│  │ Variables:   │  │ Variables:   │  │ Variables:   │          │
│  │ • project_   │  │ • tech_stack │  │ • prompt_    │          │
│  │   name       │  │ • directory  │  │   type       │          │
│  │ • project_   │  │ • restart_   │  │ • model      │          │
│  │   desc       │  │   command    │  │ • temp       │          │
│  │              │  │ • log_cmd    │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         △                 △                  △                  │
└─────────────────────────────────────────────────────────────────┘
         │                 │                  │
    Links via            Links via          Links via
    categoryId=          categoryId=         categoryId=
    "general"            "development"      "ai-prompts"
         │                 │                  │
         │                 │                  │
┌────────┴────────┐  ┌─────┴──────────┐  ┌───┴────────┐
│                 │  │                │  │            │
│   PROJECTS      │  │   PROJECTS     │  │ PROJECTS   │
│  (belong to     │  │  (belong to    │  │ (belong    │
│   categories)   │  │   categories)  │  │  to cat.)  │
│                 │  │                │  │            │
│ • Marketing     │  │ • My React App │  │ • AI Chat  │
│   Website       │  │ • Python CLI   │  │   Tool     │
│ • Blog          │  │ • TypeScript   │  │            │
│                 │  │   Lib          │  │            │
└─────────────────┘  └────────────────┘  └────────────┘
      │                    │                    │
      └────────────────────┴────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
      Project Variables   Project Variables
      (stored in          (stored in
       categoryValues)     categoryValues)
         │                   │
         ↓                   ↓
┌─────────────────────────────────────┐
│   REPLACEMENT CATEGORIES (YAML)      │
│   (Same for ALL projects)            │
│                                      │
│   • Global (global.yml)              │
│   • Base (base.yml)                  │
│   • AI Prompts (ai_prompts.yml)      │
│   • Teapot (teapot.yml)              │
│   • Custom (any_custom.yml)          │
│                                      │
│   Note: These are NOT filtered by    │
│   project category - they're static  │
│   available to all projects          │
└─────────────────────────────────────┘
```

## Data Flow: Category Selection to Project Filtering

```
┌──────────────────────────────────────┐
│  User Interface - MainLayout Header  │
│                                      │
│  Category Select: [Development ▼]    │
│  Project Select:  [Select project ▼] │
└──────────────────────┬───────────────┘
                       │
                       ▼
         ┌─────────────────────────┐
         │  setSelectedCategory()  │
         │   categoryId = "dev"    │
         └────────┬────────────────┘
                  │
                  ▼
    ┌────────────────────────────────┐
    │   ProjectContext filters       │
    │   filteredProjects =           │
    │   projects.filter(p =>         │
    │     p.categoryId ===           │
    │     selectedCategoryId         │
    │   )                            │
    └────────┬───────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │  Project Dropdown Updates    │
    │  Now shows ONLY projects     │
    │  with categoryId: "dev"      │
    │                              │
    │  • My React App              │
    │  • Python CLI                │
    │  • TypeScript Lib            │
    │  (General projects hidden)   │
    └────────┬──────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ User selects project         │
    │ → activeProject set          │
    │ → categoryValues loaded      │
    │ → Variables displayed        │
    └──────────────────────────────┘
```

## Data Storage Layout

### Project Type: What Gets Stored Where

```
Project Document (projects.json)
{
  "id": "proj_456",
  "name": "My React App",
  "categoryId": "development",           ← KEY: Links to ProjectCategory
  "categoryValues": {                    ← Nested by category ID
    "general": {                         ← "general" category values
      "project_name": "My React App",
      "project_description": "Web app"
    },
    "development": {                     ← "development" category values
      "tech_stack": "React + TypeScript",
      "directory": "/Users/joe/react",
      "restart_command": "npm run dev",
      "log_command": "npm run logs"
    }
  }
}

ProjectCategory Document (project_categories.json)
{
  "id": "development",                   ← Matches Project.categoryId
  "name": "Development",
  "variableDefinitions": [               ← Templates that projects use
    { "id": "tech_stack", "name": "tech_stack", "required": true },
    { "id": "directory", "name": "directory" },
    { "id": "restart_command", "name": "restart_command" },
    { "id": "log_command", "name": "log_command" }
  ]
}
```

## Filtering Logic Illustrated

```
┌─ PROJECT CATEGORIES (Sidebar)
│  ├─ Base Replacements
│  ├─ Development        ← User clicks "Development"
│  └─ AI Prompts
│
│
└─ PROJECT DROPDOWN (Header)
   Shows projects where categoryId === "development"
   
   ALL PROJECTS in database:
   ┌──────────────────────────┬──────────────┐
   │ Project Name             │ categoryId   │
   ├──────────────────────────┼──────────────┤
   │ Marketing Website        │ general   ✗  │
   │ Blog Post Template       │ general   ✗  │
   │ My React App             │ development✓ │
   │ Python CLI Tool          │ development✓ │
   │ TypeScript Library       │ development✓ │
   │ AI Chat Assistant        │ ai-prompts✗  │
   └──────────────────────────┴──────────────┘
   
   FILTERED DROPDOWN (Shows only ✓):
   └─ My React App
   └─ Python CLI Tool
   └─ TypeScript Library
```

## The Missing Link in Current BRM

```
CURRENT STATE (Broken):
┌─────────────────────────────────────┐
│ Project Type has NO categoryId       │
│                                      │
│ interface Project {                 │
│   id: string                         │
│   name: string                       │
│   categoryId?: string  ← MISSING!    │
│   categoryValues?: {...}             │
│ }                                    │
└─────────────────────────────────────┘
         │
         ▼
    No way to link projects
    to project categories
         │
         ▼
┌─────────────────────────────────────┐
│ MainLayout has NO category filter    │
│                                      │
│ Header dropdowns:                    │
│ • Select Active Project    ✓         │
│ • Category Filter          ✗ MISSING │
│                                      │
│ No filtering logic                  │
│ All projects shown always            │
└─────────────────────────────────────┘


DESIRED STATE (Complete):
┌─────────────────────────────────────┐
│ Project has categoryId field         │
│                                      │
│ interface Project {                 │
│   id: string                         │
│   name: string                       │
│   categoryId: string      ← ADDED!   │
│   categoryValues?: {...}             │
│ }                                    │
└─────────────────────────────────────┘
         │
         ▼
    Projects linked
    to categories
         │
         ▼
┌─────────────────────────────────────┐
│ MainLayout filters projects          │
│                                      │
│ Header dropdowns:                    │
│ • Category Filter          ✓ ADDED   │
│ • Select Active Project    ✓         │
│                                      │
│ Filter logic:                        │
│ filtered = projects.filter(          │
│   p => p.categoryId === sel          │
│ )                                    │
└─────────────────────────────────────┘
```

## Timeline of Category Selection

```
TIME  │  STATE                      │  COMPONENT
──────┼─────────────────────────────┼──────────────────────
  0   │ User interface loads        │ MainLayout
      │ All categories shown        │
      │ All projects shown          │
──────┼─────────────────────────────┼──────────────────────
  1   │ User clicks category        │ MainLayout Select
      │ categoryId = "development"  │ → ProjectContext
──────┼─────────────────────────────┼──────────────────────
  2   │ ProjectContext filters      │ ProjectContext
      │ filteredProjects updates    │ (useMemo)
──────┼─────────────────────────────┼──────────────────────
  3   │ Project dropdown re-renders │ MainLayout
      │ Shows only dev projects     │ Select component
──────┼─────────────────────────────┼──────────────────────
  4   │ User selects a project      │ MainLayout Select
      │ setActiveProject(id)        │ → ProjectContext
──────┼─────────────────────────────┼──────────────────────
  5   │ ProjectContext updates      │ ProjectContext
      │ activeProject set           │ Variables loaded
      │ categoryValues extracted    │
──────┼─────────────────────────────┼──────────────────────
  6   │ Variable insertion UI       │ InsertionHub
      │ Shows project variables    │ Component
      │ for this project           │
──────┴─────────────────────────────┴──────────────────────
```

## Relationship Cardinality

```
ProjectCategory  →  Project  →  ReplacementCategory
       ↓              ↓              ↓
    1 to many    1 to 1        Shared by all
    (one cat-    (each pro-    (not filtered
     egory can   ject has      by project
     have many   exactly       category)
     projects)   one cat)
     
Example:
"Development" category    "My React App"    All YAML files
  │ can have ↓            belongs to ↓       (same for all)
  ├─ My React App         "Development"    • global.yml
  ├─ Python CLI                            • base.yml
  ├─ TypeScript Lib                        • ai_prompts.yml
  └─ ...more projects                      • custom.yml
                                           • ...
```

