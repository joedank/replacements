# Implementation Checklist: Project Category Filtering

## Critical Missing Components

### 1. Add categoryId to Project Type
**Status**: MISSING  
**File**: `src/types/project.ts`  
**Severity**: CRITICAL

```typescript
// CURRENT (BROKEN):
export interface Project {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  categoryValues?: Record<string, Record<string, string>>;
}

// REQUIRED (FIXED):
export interface Project {
  id: string;
  name: string;
  description?: string;
  categoryId: string;      // ← ADD THIS
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  categoryValues?: Record<string, Record<string, string>>;
}
```

### 2. Update Rust Backend Project Struct
**Status**: NEEDS VERIFICATION  
**File**: `src-tauri/src/lib.rs`  
**Severity**: CRITICAL

```rust
// Verify categoryId is properly serialized:
#[derive(Debug, Serialize, Deserialize, Clone)]
struct Project {
    id: String,
    name: String,
    description: Option<String>,
    #[serde(rename = "categoryId")]
    category_id: String,        // ← MUST EXIST
    #[serde(rename = "isActive")]
    is_active: bool,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "updatedAt")]
    updated_at: String,
    #[serde(rename = "categoryValues")]
    category_values: Option<HashMap<String, HashMap<String, String>>>,
}
```

### 3. Add Category Dropdown to MainLayout
**Status**: MISSING  
**File**: `src/components/layout/MainLayout.tsx`  
**Severity**: CRITICAL

**Location**: Add to Header before Project Select (around line 237)

```typescript
// Add state for selected category
const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

// In the Header JSX, add BEFORE the project dropdown:
<Select
  style={{ width: 200 }}
  placeholder={selectedCategoryId ? undefined : "All categories"}
  value={selectedCategoryId || undefined}
  onChange={(value) => setSelectedCategory(value || null)}
  allowClear
  showSearch
  optionFilterProp="children"
  filterOption={(input, option) =>
    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
  }
  options={[
    {
      label: 'All categories',
      value: '',
    },
    ...projectCategories.map(category => ({
      label: category.name,
      value: category.id,
    }))
  ]}
  suffixIcon={<FolderOpenOutlined />}
/>

// Then the existing project select (keep this):
<Select
  style={{ width: 250 }}
  placeholder="Select active project"
  value={activeProject?.id || undefined}
  onChange={(value) => setActiveProject(value || null)}
  allowClear
  showSearch
  optionFilterProp="children"
  filterOption={(input, option) =>
    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
  }
  options={[
    {
      label: 'No active project',
      value: '',
    },
    ...filteredProjects.map(project => ({
      label: project.name,
      value: project.id,
    }))
  ]}
  suffixIcon={<ProjectOutlined />}
/>
```

### 4. Update ProjectContext Filtering Logic
**Status**: PARTIALLY EXISTS  
**File**: `src/contexts/ProjectContext.tsx`  
**Severity**: HIGH

**Verify these exist**:

```typescript
// Should have selectedCategoryId state
const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

// Should filter projects based on category
const filteredProjects = selectedCategoryId 
  ? projects.filter(p => p.categoryId === selectedCategoryId)
  : projects;

// Should clear incompatible active project
const setSelectedCategory = (categoryId: string | null) => {
  setSelectedCategoryId(categoryId);
  if (categoryId && activeProject && activeProject.categoryId !== categoryId) {
    setActiveProject(null);
  }
};

// Export in context value:
value={{
  selectedCategoryId,      // ← Must be exported
  setSelectedCategory,     // ← Must be exported
  // ... other properties
}}
```

### 5. Update ProjectContext Interface
**Status**: NEEDS VERIFICATION  
**File**: `src/contexts/ProjectContext.tsx`  
**Severity**: HIGH

```typescript
interface ProjectContextType {
  projects: Project[];
  filteredProjects: Project[];
  activeProject: Project | null;
  selectedCategoryId: string | null;    // ← ADD THIS
  loading: boolean;
  error: string | null;
  loadProjects: () => Promise<void>;
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setActiveProject: (id: string | null) => Promise<void>;
  setSelectedCategory: (categoryId: string | null) => void;  // ← ADD THIS
  generateEspansoConfig: () => Promise<void>;
}
```

### 6. Update Project Creation Flow
**Status**: NEEDS VERIFICATION  
**File**: `src/components/projects/ProjectForm.tsx` (or equivalent)  
**Severity**: HIGH

When creating a new project, must assign a categoryId:

```typescript
const handleCreate = async (values: any) => {
  const newProject: Project = {
    ...values,
    id: Date.now().toString(),
    categoryId: selectedCategoryId || 'general',  // ← ASSIGN CATEGORY
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Then save...
};
```

## Data Migration Required

### Migrate Existing Projects
**Status**: REQUIRED  
**Severity**: CRITICAL

Any existing projects without categoryId must be migrated:

```typescript
// Migration strategy
function migrateProjects(projects: Project[]): Project[] {
  return projects.map(p => ({
    ...p,
    categoryId: p.categoryId || 'general'  // Default to general if missing
  }));
}

// Run on app startup in ProjectContext:
useEffect(() => {
  const migratedProjects = migrateProjects(projects);
  setProjects(migratedProjects);
}, []);
```

## Testing Checklist

- [ ] Create new project with categoryId
- [ ] Select category filter in header
- [ ] Verify project dropdown filters correctly
- [ ] Select filtered project as active
- [ ] Verify correct variables load for project
- [ ] Switch to different category
- [ ] Verify active project clears if incompatible
- [ ] Verify "All categories" option shows all projects
- [ ] Test with existing projects (migration works)
- [ ] Test clearing category filter
- [ ] Test variable insertion with filtered project

## Cross-Platform Testing

- [ ] macOS: Build and test filtering logic
- [ ] Windows: Cross-compile and test (via CI/CD)
- [ ] Linux: Test via CI/CD

## File Structure Reference

```
.
├── src/
│   ├── types/
│   │   └── project.ts                 ← ADD categoryId
│   ├── components/
│   │   ├── layout/
│   │   │   └── MainLayout.tsx         ← ADD category dropdown
│   │   └── projects/
│   │       └── ProjectForm.tsx        ← Assign categoryId on create
│   └── contexts/
│       └── ProjectContext.tsx         ← Filter logic + state export
├── src-tauri/
│   └── src/
│       └── lib.rs                     ← Verify categoryId handling
└── memory-bank/
    └── category_relationship_analysis.md
```

## Rust Backend Verification

### Commands that need to handle categoryId

```rust
#[tauri::command]
fn create_project(project: Project) -> Result<(), String> {
  // project.categoryId must be validated against existing categories
}

#[tauri::command]
fn update_project(id: String, updates: Value) -> Result<(), String> {
  // If categoryId is updated, validate it exists
}

#[tauri::command]
fn get_projects() -> Result<ProjectData, String> {
  // Must include categoryId in response
}
```

## Documentation Updates Needed

- [ ] Update CLAUDE.md with category filtering feature
- [ ] Add category selection to user guide
- [ ] Document category-based project organization
- [ ] Add troubleshooting guide for "no projects shown"

## Priority Implementation Order

1. **Phase 1 (Critical)**
   - Add categoryId to Project type
   - Verify Rust backend has categoryId
   - Run data migration
   
2. **Phase 2 (High)**
   - Add category dropdown to MainLayout
   - Verify ProjectContext filtering
   - Update project creation flow
   
3. **Phase 3 (Medium)**
   - Add UI feedback (selected category highlight)
   - Test all filtering scenarios
   - Cross-platform testing
   
4. **Phase 4 (Nice-to-have)**
   - Category-based sidebar collapsing
   - Quick-category buttons
   - Favorite categories

## Related Issues to Check

- Is there a migration script needed for existing data?
- Do all create/update project endpoints handle categoryId?
- Are there any hardcoded assumptions about project structure?
- Does the AI template generation consider categoryId?
- Should category selection persist across sessions?

