import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple YAML parser for the specific format we're dealing with
function parseSimpleYaml(content) {
  const lines = content.split('\n');
  const matches = [];
  let currentMatch = null;
  let inVars = false;
  let currentVar = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Check for matches array
    if (trimmed === 'matches:') continue;
    
    // New match starts with - trigger:
    if (trimmed.startsWith('- trigger:')) {
      if (currentMatch) matches.push(currentMatch);
      currentMatch = {
        trigger: trimmed.replace('- trigger:', '').trim().replace(/["']/g, ''),
        replace: '',
        vars: []
      };
      inVars = false;
    }
    // Replace line
    else if (trimmed.startsWith('replace:')) {
      if (currentMatch) {
        currentMatch.replace = trimmed.replace('replace:', '').trim().replace(/["']/g, '');
      }
    }
    // Vars section
    else if (trimmed === 'vars:') {
      inVars = true;
    }
    // Variable definition
    else if (inVars && trimmed.startsWith('- name:')) {
      currentVar = {
        name: trimmed.replace('- name:', '').trim().replace(/["']/g, ''),
        type: '',
        params: {}
      };
      if (currentMatch) currentMatch.vars.push(currentVar);
    }
    else if (inVars && currentVar && trimmed.startsWith('type:')) {
      currentVar.type = trimmed.replace('type:', '').trim().replace(/["']/g, '');
    }
    else if (inVars && currentVar && trimmed.startsWith('params:')) {
      // params section
    }
    else if (inVars && currentVar && trimmed.startsWith('default:')) {
      currentVar.params.default = trimmed.replace('default:', '').trim().replace(/["']/g, '');
    }
  }
  
  if (currentMatch) matches.push(currentMatch);
  
  return { matches };
}

class CategoryMigration {
  constructor() {
    // Use local match directory
    this.matchDir = path.join(__dirname, 'match');
    this.brmDir = path.join(os.homedir(), 'Library', 'Application Support', 'BetterReplacementsManager');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.backupDir = path.join(__dirname, 'backups', `migration_${timestamp}`);
    
    this.report = {
      timestamp,
      backupLocation: this.backupDir,
      migratedCategories: [],
      migratedProjects: 0,
      errors: [],
      warnings: []
    };
  }

  async run() {
    console.log('Starting migration to category-based system...');
    console.log(`Using local match directory: ${this.matchDir}\n`);
    
    try {
      // Step 1: Create backup
      await this.createBackups();
      
      // Step 2: Load existing data
      const { categories, projects } = await this.loadExistingData();
      
      // Step 3: Migrate YAML files to categories
      const migratedCategories = await this.migrateYamlToCategories();
      
      // Step 4: Migrate project variables
      const updatedProjects = await this.migrateProjectVariables(projects, migratedCategories);
      
      // Step 5: Save migrated data
      await this.saveMigratedData(migratedCategories, updatedProjects);
      
      // Step 6: Generate report
      await this.generateReport();
      
      console.log('\n✅ Migration completed successfully!');
      console.log(`📁 Backup created at: ${this.backupDir}`);
      console.log(`📊 Report saved at: ${path.join(this.backupDir, 'migration_report.json')}`);
      console.log('\n📋 Next steps:');
      console.log('1. Review the migrated data in the BRM app');
      console.log('2. If everything looks good, copy the match directory to Espanso:');
      console.log(`   cp -r ${this.matchDir}/* ~/Library/Application\\ Support/espanso/match/`);
      
    } catch (error) {
      this.report.errors.push(`Fatal error: ${error.message}`);
      await this.generateReport();
      console.error('\n❌ Migration failed:', error);
      console.log('💾 Backup preserved at:', this.backupDir);
      process.exit(1);
    }
  }

  async createBackups() {
    console.log('📦 Creating backups...');
    
    // Create backup directory
    await fs.mkdir(this.backupDir, { recursive: true });
    
    // Backup YAML files from local match directory
    const yamlFiles = ['ai_prompts.yml', 'base.yml', 'better_replacements.yml', 
                      'project_active_vars.yml', 'project_selector.yml', 'project_global_vars.yml'];
    
    for (const file of yamlFiles) {
      const source = path.join(this.matchDir, file);
      const dest = path.join(this.backupDir, 'yaml', file);
      
      try {
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.copyFile(source, dest);
        console.log(`  ✓ Backed up ${file}`);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          this.report.warnings.push(`Failed to backup ${file}: ${error.message}`);
        }
      }
    }
    
    // Backup existing JSON files from BRM directory
    const jsonFiles = ['custom_variables.json', 'project_categories.json', 'projects.json'];
    
    for (const file of jsonFiles) {
      const source = path.join(this.brmDir, file);
      const dest = path.join(this.backupDir, 'json', file);
      
      try {
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.copyFile(source, dest);
        console.log(`  ✓ Backed up ${file}`);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          // It's OK if these don't exist yet
        }
      }
    }
  }

  async loadExistingData() {
    console.log('\n📖 Loading existing data...');
    
    let categories = [];
    let projects = [];
    
    // Try to load existing projects
    try {
      const projectsPath = path.join(this.brmDir, 'projects.json');
      const data = await fs.readFile(projectsPath, 'utf-8');
      const projectData = JSON.parse(data);
      // Handle both array and object with projects property
      projects = Array.isArray(projectData) ? projectData : (projectData.projects || []);
      console.log(`  ✓ Loaded ${projects.length} existing projects`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.report.warnings.push(`Error loading projects: ${error.message}`);
      } else {
        console.log('  ℹ️  No existing projects found');
      }
    }
    
    return { categories, projects };
  }

  async migrateYamlToCategories() {
    console.log('\n🔄 Migrating YAML files to categories...');
    
    const categoryMapping = [
      { yamlFile: 'ai_prompts.yml', categoryId: 'ai-prompts', categoryName: 'AI Prompts' },
      { yamlFile: 'base.yml', categoryId: 'general', categoryName: 'General' },
      { yamlFile: 'better_replacements.yml', categoryId: 'temporary', categoryName: 'Temporary' }
    ];
    
    const projectCategories = [];
    
    for (const mapping of categoryMapping) {
      console.log(`\n  Processing ${mapping.yamlFile}...`);
      
      try {
        const yamlPath = path.join(this.matchDir, mapping.yamlFile);
        const yamlContent = await fs.readFile(yamlPath, 'utf-8');
        const yamlData = parseSimpleYaml(yamlContent);
        
        if (!yamlData.matches || yamlData.matches.length === 0) {
          this.report.warnings.push(`No matches found in ${mapping.yamlFile}`);
          continue;
        }
        
        // Extract variables from YAML matches
        const variables = [];
        const variablePattern = /\{\{([^}]+)\}\}/g;
        const seenVariables = new Set();
        
        for (const match of yamlData.matches) {
          if (!match.replace) continue;
          
          let varMatch;
          while ((varMatch = variablePattern.exec(match.replace)) !== null) {
            const varName = varMatch[1].trim();
            
            // Skip if already added
            if (seenVariables.has(varName)) continue;
            seenVariables.add(varName);
            
            // Extract value from vars array if available
            let value = '';
            if (match.vars) {
              const varDef = match.vars.find(v => v.name === varName);
              if (varDef && varDef.params && varDef.params.default) {
                value = varDef.params.default;
              }
            }
            
            variables.push({
              id: `${mapping.categoryId}-${varName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
              name: varName,
              value: value,
              description: `Migrated from ${mapping.yamlFile}`,
              preview: value || `{{${varName}}}`
            });
          }
        }
        
        const category = {
          id: mapping.categoryId,
          name: mapping.categoryName,
          description: `Variables migrated from ${mapping.yamlFile}`,
          variables: variables
        };
        
        projectCategories.push(category);
        
        this.report.migratedCategories.push({
          name: mapping.categoryName,
          variableCount: variables.length,
          source: mapping.yamlFile
        });
        
        console.log(`    ✓ Created category "${mapping.categoryName}" with ${variables.length} variables`);
        
      } catch (error) {
        this.report.errors.push(`Failed to migrate ${mapping.yamlFile}: ${error.message}`);
        console.error(`    ✗ Error processing ${mapping.yamlFile}:`, error.message);
      }
    }
    
    return projectCategories;
  }

  async migrateProjectVariables(projects, categories) {
    console.log('\n🔧 Migrating project variables...');
    
    const updatedProjects = [];
    
    for (const project of projects) {
      console.log(`  Processing project: ${project.name}`);
      
      // If project already has categoryId and categoryValues, skip
      if (project.categoryId && project.categoryValues) {
        updatedProjects.push(project);
        continue;
      }
      
      // Determine appropriate category based on project content
      let assignedCategoryId = 'general'; // Default category
      
      // Simple heuristic: if project has AI-related keywords, assign to AI category
      const projectContent = JSON.stringify(project).toLowerCase();
      if (projectContent.includes('prompt') || projectContent.includes('ai') || 
          projectContent.includes('claude') || projectContent.includes('gpt')) {
        assignedCategoryId = 'ai-prompts';
      }
      
      // Migrate customVariables to categoryValues
      const categoryValues = {};
      
      if (project.customVariables && project.customVariables.length > 0) {
        for (const variable of project.customVariables) {
          categoryValues[variable.name] = variable.value || '';
        }
        
        console.log(`    ✓ Migrated ${project.customVariables.length} custom variables`);
      }
      
      const updatedProject = {
        ...project,
        categoryId: assignedCategoryId,
        categoryValues: categoryValues
      };
      
      // Remove old structure
      delete updatedProject.customVariables;
      
      updatedProjects.push(updatedProject);
      this.report.migratedProjects++;
    }
    
    if (this.report.migratedProjects > 0) {
      console.log(`  ✓ Migrated ${this.report.migratedProjects} projects`);
    } else {
      console.log('  ℹ️  No projects needed migration');
    }
    
    return updatedProjects;
  }

  async saveMigratedData(categories, projects) {
    console.log('\n💾 Saving migrated data...');
    
    // Ensure BRM directory exists
    await fs.mkdir(this.brmDir, { recursive: true });
    
    // Save project categories
    const categoriesPath = path.join(this.brmDir, 'project_categories.json');
    await fs.writeFile(
      categoriesPath, 
      JSON.stringify(categories, null, 2)
    );
    console.log(`  ✓ Saved ${categories.length} categories to project_categories.json`);
    
    // Save updated projects if any exist
    if (projects.length > 0) {
      const projectsPath = path.join(this.brmDir, 'projects.json');
      // Keep the same structure as the original file
      const projectData = {
        projects: projects,
        activeProjectId: null
      };
      await fs.writeFile(
        projectsPath, 
        JSON.stringify(projectData, null, 2)
      );
      console.log(`  ✓ Saved ${projects.length} projects to projects.json`);
    }
  }

  async generateReport() {
    const reportPath = path.join(this.backupDir, 'migration_report.json');
    await fs.writeFile(
      reportPath, 
      JSON.stringify(this.report, null, 2)
    );
    
    // Also create a human-readable report
    const readablePath = path.join(this.backupDir, 'migration_report.md');
    const readableReport = `# Migration Report
    
## Summary
- **Timestamp**: ${this.report.timestamp}
- **Backup Location**: ${this.report.backupLocation}
- **Migrated Projects**: ${this.report.migratedProjects}

## Migrated Categories
${this.report.migratedCategories.map(cat => 
  `- **${cat.name}**: ${cat.variableCount} variables from ${cat.source}`
).join('\n')}

## Errors
${this.report.errors.length > 0 ? this.report.errors.join('\n') : 'None'}

## Warnings
${this.report.warnings.length > 0 ? this.report.warnings.join('\n') : 'None'}
`;
    
    await fs.writeFile(readablePath, readableReport);
  }
}

// Run migration
const migration = new CategoryMigration();
migration.run().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});