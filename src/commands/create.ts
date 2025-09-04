import { Command } from 'commander';
import { ZccCore, ComponentSearchResult } from '../lib/ZccCore';
import { ComponentInfo } from '../lib/ZccScope';
import { logger } from '../lib/logger';
import chalk from 'chalk';
import inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';
import { ensureDirectorySync } from '../lib/utils/filesystem';

export const createCommand = new Command('create')
  .description('Create new custom components (modes, workflows, agents)')
  .argument('<type>', 'Component type (mode, workflow, agent)')
  .argument('[name]', 'Component name')
  .option('--from <template>', 'Clone from existing component')
  .option('--global', 'Create in global scope (~/.zcc) instead of project')
  .option('--non-interactive', 'Skip interactive prompts (use defaults)')
  .action(async (type: string, name?: string, options?: any) => {
    try {
      const core = new ZccCore(process.cwd());
      const opts = options || {};
      
      // Validate component type
      const validTypes: ComponentInfo['type'][] = ['mode', 'workflow', 'agent'];
      if (!validTypes.includes(type as ComponentInfo['type'])) {
        logger.error(`Invalid component type: ${type}`);
        logger.info(`Valid types are: ${validTypes.join(', ')}`);
        process.exit(1);
      }
      
      const componentType = type as ComponentInfo['type'];
      
      // Get component name through interactive prompt if not provided
      let componentName = name;
      if (!componentName) {
        if (opts.nonInteractive) {
          logger.error('Component name is required in non-interactive mode');
          process.exit(1);
        }
        
        const { inputName } = await inquirer.prompt([
          {
            type: 'input',
            name: 'inputName',
            message: `Enter ${componentType} name:`,
            validate: (input: string) => {
              if (!input.trim()) {
                return 'Component name is required';
              }
              if (!/^[a-z0-9-_]+$/.test(input.trim())) {
                return 'Name must contain only lowercase letters, numbers, hyphens, and underscores';
              }
              return true;
            }
          }
        ]);
        componentName = inputName.trim();
      }
      
      // Validate component name
      if (!/^[a-z0-9-_]+$/.test(componentName!)) {
        logger.error('Component name must contain only lowercase letters, numbers, hyphens, and underscores');
        process.exit(1);
      }
      
      // Check if component already exists
      const targetScope = opts.global ? 'global' : 'project';
      const existingComponent = await core.getComponent(componentName!, componentType);
      if (existingComponent) {
        const conflicts = await core.getComponentConflicts(componentName!, componentType);
        const targetConflict = conflicts.find(c => 
          (targetScope === 'global' && c.source === 'global') ||
          (targetScope === 'project' && c.source === 'project')
        );
        
        if (targetConflict && !opts.nonInteractive) {
          logger.warn(`${componentType.charAt(0).toUpperCase() + componentType.slice(1)} '${componentName}' already exists in ${targetScope} scope.`);
          
          const { shouldOverwrite } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'shouldOverwrite',
              message: 'Do you want to overwrite it?',
              default: false
            }
          ]);
          
          if (!shouldOverwrite) {
            logger.info('Creation cancelled.');
            return;
          }
        } else if (targetConflict && opts.nonInteractive) {
          logger.error(`${componentType.charAt(0).toUpperCase() + componentType.slice(1)} '${componentName}' already exists in ${targetScope} scope. Use --force to overwrite.`);
          process.exit(1);
        }
      }
      
      let templateContent: string;
      let sourceComponent: ComponentSearchResult | null = null;
      
      // Handle cloning from existing component
      if (opts.from) {
        sourceComponent = await findSourceComponent(core, opts.from, componentType);
        if (!sourceComponent) {
          logger.error(`Source component '${opts.from}' not found`);
          process.exit(1);
        }
        
        try {
          templateContent = fs.readFileSync(sourceComponent.component.path, 'utf-8');
          logger.info(`Cloning from ${sourceComponent.source} ${componentType}: ${chalk.cyan(sourceComponent.name)}`);
        } catch (error: any) {
          logger.error(`Failed to read source component: ${error.message}`);
          process.exit(1);
        }
      } else {
        // Create from template
        templateContent = await createFromTemplate(componentType, componentName!, opts);
      }
      
      // Apply template variable substitution
      templateContent = await applyTemplateVariables(templateContent, componentName!, componentType, opts);
      
      // Write the new component
      await writeNewComponent(core, componentName!, componentType, templateContent, opts);
      
      logger.success(`Successfully created ${componentType} '${componentName}' in ${targetScope} scope.`);
      
      // Show usage hint
      if (componentType === 'mode') {
        logger.info('');
        logger.info(`To use this mode: ${chalk.green(`/mode ${componentName}`)}`);
      } else if (componentType === 'workflow') {
        logger.info('');
        logger.info(`This workflow is now available in your prompts and modes.`);
      } else if (componentType === 'agent') {
        logger.info('');
        logger.info(`This agent is now available in Claude Code.`);
      }
      
      // Suggest editing
      logger.info('');
      logger.info(`Edit your new ${componentType}: ${chalk.green(`zcc edit ${componentType} ${componentName}`)}`);
      
    } catch (error) {
      logger.error('Failed to create component:', error);
      process.exit(1);
    }
  });

/**
 * Find source component for cloning
 */
async function findSourceComponent(
  core: ZccCore,
  sourceName: string,
  type: ComponentInfo['type']
): Promise<ComponentSearchResult | null> {
  const matches = await core.findComponents(sourceName, type, {
    maxResults: 5,
    minScore: 30
  });
  
  if (matches.length === 0) {
    return null;
  }
  
  if (matches.length === 1) {
    return matches[0];
  }
  
  // Multiple matches - let user choose
  logger.info(`Found ${matches.length} matches for '${sourceName}':`);
  
  const choices = matches.map((match) => {
    const description = match.component.metadata?.description || 'No description available';
    const matchTypeIndicator = getMatchTypeIndicator(match.matchType);
    const sourceBadge = chalk.dim(`[${match.source}]`);
    const scoreText = chalk.dim(`(${match.score}%)`);
    
    return {
      name: `${getSourceIcon(match.source)} ${match.name} ${sourceBadge} ${matchTypeIndicator} ${scoreText} - ${description}`,
      value: match,
      short: match.name
    };
  });
  
  const { selected } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selected',
      message: 'Which component would you like to clone from?',
      choices
    }
  ]);
  
  return selected;
}

/**
 * Create component from template
 */
async function createFromTemplate(
  type: ComponentInfo['type'],
  _name: string,
  opts: any
): Promise<string> {
  const templates: Record<'mode' | 'workflow' | 'agent', string> = {
    mode: `---
name: {{COMPONENT_NAME}}
description: {{DESCRIPTION}}
author: {{AUTHOR}}
version: 1.0.0
tags: []
dependencies: []
---

# {{MODE_DISPLAY_NAME}} Mode

{{DESCRIPTION}}

## Behavioral Guidelines

- [Add your behavioral guidelines here]
- [Specify how this mode should operate differently from default behavior]
- [Include any specific constraints or preferences]

## Example Process

### Phase 1: [Phase Name]
- [Step 1]
- [Step 2]

### Phase 2: [Phase Name]
- [Step 1]
- [Step 2]

## Key Focus Areas

- [Focus area 1]
- [Focus area 2]
- [Focus area 3]

## Integration Points

- [How this mode works with other components]
- [Specific workflows or agents that complement this mode]
`,
    workflow: `---
name: {{COMPONENT_NAME}}
description: {{DESCRIPTION}}
author: {{AUTHOR}}
version: 1.0.0
tags: []
dependencies: []
---

# {{WORKFLOW_DISPLAY_NAME}} Workflow

{{DESCRIPTION}}

## Prerequisites
- [List any requirements or dependencies]
- [Required modes or agents]

## Inputs
- **parameter1**: Description of parameter
- **parameter2**: Description of parameter

## Outputs
- [Describe expected outputs]
- [File locations or formats]

## Example Commands

### Natural Language Invocations
- "execute {{COMPONENT_NAME}} [parameters]"
- "[other natural language examples]"

### Common Use Cases
- \`execute {{COMPONENT_NAME}} --param value\` → [Description]

## Workflow Steps

### 1. Preparation Phase

1. **[Step Name]**
   - [Step details]
   - [Expected outcomes]

### 2. Execution Phase

1. **[Step Name]**
   - [Step details]
   - [Expected outcomes]

### 3. Completion Phase

1. **[Step Name]**
   - [Step details]
   - [Expected outcomes]

## Integration Points

- [How this workflow integrates with other components]
- [Compatible modes or agents]

## Best Practices

1. [Best practice 1]
2. [Best practice 2]
3. [Best practice 3]
`,
    agent: `---
name: {{COMPONENT_NAME}}
description: {{DESCRIPTION}}
author: {{AUTHOR}}
version: 1.0.0
tags: []
dependencies: []
tools: {{TOOLS}}
---

{{DESCRIPTION}}

## Core Responsibilities

### [Responsibility Category 1]
- [Specific responsibility]
- [Specific responsibility]

### [Responsibility Category 2]  
- [Specific responsibility]
- [Specific responsibility]

## Process Guidelines

### 1. [Process Step]
When [trigger condition]:
1. [Action step]
2. [Action step]
3. [Action step]

### 2. [Process Step]
- [Guideline or process description]
- [Expected behavior]

## Key Focus Areas

### [Focus Area 1]
- [Specific focus point]
- [Expected behavior]

### [Focus Area 2]
- [Specific focus point]
- [Expected behavior]

## Response Guidelines

### [Guideline Category]
- [Specific guideline]
- [Expected behavior pattern]

## Example Interactions

**User**: "[Example user request]"
**Response**: [Description of how the agent should respond]

## Integration Points

- [How this agent works with other components]
- [Complementary tools or workflows]

## Best Practices

1. [Best practice 1]
2. [Best practice 2]
3. [Best practice 3]
`
  };

  if (!opts.nonInteractive) {
    // Collect additional information through prompts
    const questions = [
      {
        type: 'input',
        name: 'description',
        message: `Enter ${type} description:`,
        default: `A custom ${type} for specialized tasks`
      },
      {
        type: 'input',
        name: 'author',
        message: 'Author name:',
        default: 'custom'
      }
    ];

    if (type === 'agent') {
      questions.push({
        type: 'input',
        name: 'tools',
        message: 'Tools required (comma-separated):',
        default: 'Read, Write, Edit, Bash'
      } as any);
    }

    const answers = await inquirer.prompt(questions);
    opts.templateData = answers;
  } else {
    opts.templateData = {
      description: `A custom ${type} for specialized tasks`,
      author: 'custom',
      tools: type === 'agent' ? 'Read, Write, Edit, Bash' : undefined
    };
  }

  if (!(type in templates)) {
    throw new Error(`Template not available for component type: ${type}`);
  }
  return templates[type as keyof typeof templates];
}

/**
 * Apply template variable substitution
 */
async function applyTemplateVariables(
  content: string,
  name: string,
  type: ComponentInfo['type'],
  opts: any
): Promise<string> {
  const templateData = opts.templateData || {};
  
  // Create display name (capitalize and replace hyphens/underscores with spaces)
  const displayName = name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  const variables: Record<string, string> = {
    '{{COMPONENT_NAME}}': name,
    '{{DESCRIPTION}}': templateData.description || `A custom ${type} for specialized tasks`,
    '{{AUTHOR}}': templateData.author || 'custom',
    '{{MODE_DISPLAY_NAME}}': displayName,
    '{{WORKFLOW_DISPLAY_NAME}}': displayName,
    '{{AGENT_DISPLAY_NAME}}': displayName,
    '{{TOOLS}}': templateData.tools || 'Read, Write, Edit, Bash',
    '{{PROJECT_TYPE}}': await detectProjectType(),
    '{{DATE}}': new Date().toISOString().split('T')[0]
  };
  
  let result = content;
  for (const [placeholder, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
  }
  
  return result;
}

/**
 * Detect project type for template variables
 */
async function detectProjectType(): Promise<string> {
  try {
    const cwd = process.cwd();
    
    // Check for common project indicators
    if (fs.existsSync(path.join(cwd, 'package.json'))) {
      const packageJson = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'));
      if (packageJson.dependencies?.react || packageJson.devDependencies?.react) {
        return 'React';
      }
      if (packageJson.dependencies?.['@angular/core'] || packageJson.devDependencies?.['@angular/core']) {
        return 'Angular';
      }
      if (packageJson.dependencies?.vue || packageJson.devDependencies?.vue) {
        return 'Vue';
      }
      if (packageJson.dependencies?.next || packageJson.devDependencies?.next) {
        return 'Next.js';
      }
      return 'Node.js';
    }
    
    if (fs.existsSync(path.join(cwd, 'Cargo.toml'))) {
      return 'Rust';
    }
    
    if (fs.existsSync(path.join(cwd, 'go.mod'))) {
      return 'Go';
    }
    
    if (fs.existsSync(path.join(cwd, 'requirements.txt')) || fs.existsSync(path.join(cwd, 'pyproject.toml'))) {
      return 'Python';
    }
    
    if (fs.existsSync(path.join(cwd, 'pom.xml')) || fs.existsSync(path.join(cwd, 'build.gradle'))) {
      return 'Java';
    }
    
    return 'General';
  } catch {
    return 'General';
  }
}

/**
 * Write the new component to the appropriate location
 */
async function writeNewComponent(
  core: ZccCore,
  name: string,
  type: ComponentInfo['type'],
  content: string,
  opts: any
): Promise<void> {
  const targetScope = opts.global ? 'global' : 'project';
  const scopes = core.getScopes();
  const targetScopeObj = targetScope === 'global' ? scopes.global : scopes.project;
  
  const targetDir = path.join(targetScopeObj.getPath(), `${type}s`);
  const targetPath = path.join(targetDir, `${name}.md`);
  
  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    ensureDirectorySync(targetDir);
  }
  
  // Write the component
  fs.writeFileSync(targetPath, content, 'utf-8');
  
  // Clear caches
  core.clearCache();
}

/**
 * Get icon for different component sources
 */
function getSourceIcon(source: string): string {
  switch (source) {
    case 'project':
      return chalk.blue('●');
    case 'global':
      return chalk.green('○');
    case 'builtin':
      return chalk.gray('◦');
    default:
      return '•';
  }
}

/**
 * Get indicator for match type
 */
function getMatchTypeIndicator(matchType: ComponentSearchResult['matchType']): string {
  switch (matchType) {
    case 'exact':
      return chalk.green('✓');
    case 'substring':
      return chalk.yellow('≈');
    case 'acronym':
      return chalk.blue('⚡');
    case 'partial':
      return chalk.dim('~');
    default:
      return '';
  }
}