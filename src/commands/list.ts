import { Command } from 'commander';
import { ZccCore, ComponentResolutionResult } from '../lib/ZccCore';
import { ComponentInfo } from '../lib/ZccScope';
import { logger } from '../lib/logger';
import chalk from 'chalk';

type ZccStatus = {
  builtin: {
    available: boolean;
    path: string;
    components: number;
  };
  global: {
    exists: boolean;
    path: string;
    components: number;
    hasConfig: boolean;
  };
  project: {
    exists: boolean;
    path: string;
    components: number;
    hasConfig: boolean;
  };
  totalComponents: number;
  uniqueComponents: number;
};

// ComponentResolutionResult is imported from ZccCore

type ComponentsByType = {
  modes: ComponentResolutionResult[];
  workflows: ComponentResolutionResult[];
  scripts: ComponentResolutionResult[];
  hooks: ComponentResolutionResult[];
  agents: ComponentResolutionResult[];
  commands: ComponentResolutionResult[];
  templates: ComponentResolutionResult[];
};

export const listCommand = new Command('list')
  .description('List components across all scopes (built-in, global, project)')
  .option('-t, --type <type>', 'Filter by component type (mode, workflow, agent, etc.)')
  .option('-s, --scope <scope>', 'Filter by scope (builtin, global, project)')
  .option('-v, --verbose', 'Show detailed component information')
  .option('-c, --conflicts', 'Show only components with conflicts across scopes')
  .option('--installed', 'Show only installed components (project and global scope)')
  .action(async (options) => {
    try {
      const core = new ZccCore(process.cwd());
      const status = await core.getStatus();
      
      // Validate type filter and map singular forms to plural keys
      const validTypes: ComponentInfo['type'][] = ['mode', 'workflow', 'agent', 'script', 'hook', 'command', 'template'];
      const typeMapping: { [key: string]: string } = {
        'mode': 'modes',
        'modes': 'modes',
        'workflow': 'workflows', 
        'workflows': 'workflows',
        'agent': 'agents',
        'agents': 'agents',
        'script': 'scripts',
        'scripts': 'scripts', 
        'hook': 'hooks',
        'hooks': 'hooks',
        'command': 'commands',
        'commands': 'commands',
        'template': 'templates',
        'templates': 'templates'
      };
      
      if (options.type && !typeMapping[options.type]) {
        logger.error(`Invalid component type '${options.type}'. Valid types are: ${validTypes.join(', ')} (plural forms also accepted)`);
        process.exit(1);
      }
      
      // Validate scope filter
      const validScopes = ['builtin', 'global', 'project'];
      if (options.scope && !validScopes.includes(options.scope)) {
        logger.error(`Invalid scope '${options.scope}'. Valid scopes are: ${validScopes.join(', ')}`);
        process.exit(1);
      }

      // Show status summary
      if (!options.type && !options.scope && !options.conflicts && !options.installed) {
        await showStatusSummary(status);
        logger.info('');
      }

      // Get components with source information
      const componentsByType = await core.listComponentsWithSource();
      
      if (options.conflicts) {
        await showConflictingComponents(componentsByType, options.verbose || false);
      } else {
        await showComponents(componentsByType, {
          typeFilter: options.type ? typeMapping[options.type] || options.type : undefined,
          scopeFilter: options.scope,
          verbose: options.verbose || false,
          installedOnly: options.installed || false
        });
      }
    } catch (error) {
      logger.error('Failed to list components:', error);
      process.exit(1);
    }
  });

/**
 * Show status summary of all scopes
 */
async function showStatusSummary(status: ZccStatus): Promise<void> {
  logger.info(chalk.bold('zcc Status:'));
  logger.info('');
  
  // Built-in components
  const builtinStatus = status.builtin.available 
    ? chalk.green(`✓ ${status.builtin.components} components`) 
    : chalk.red('✗ Not available');
  logger.info(`Built-in:  ${builtinStatus}`);
  
  // Global scope
  const globalStatus = status.global.exists
    ? chalk.green(`✓ ${status.global.components} components`)
    : chalk.yellow('○ Not initialized');
  logger.info(`Global:    ${globalStatus}`);
  
  // Project scope
  const projectStatus = status.project.exists
    ? chalk.green(`✓ ${status.project.components} components`)
    : chalk.yellow('○ Not initialized');
  logger.info(`Project:   ${projectStatus}`);
  
  logger.info('');
  logger.info(`Total: ${status.totalComponents} components (${status.uniqueComponents} unique)`);
}

/**
 * Show components organized by type
 */
async function showComponents(
  componentsByType: ComponentsByType,
  options: {
    typeFilter?: string;
    scopeFilter?: string;
    verbose: boolean;
    installedOnly: boolean;
  }
): Promise<void> {
  const { typeFilter, scopeFilter, verbose, installedOnly } = options;
  
  // Filter component types
  const typesToShow = typeFilter
    ? [typeFilter]
    : ['modes', 'workflows', 'agents', 'scripts', 'hooks', 'commands', 'templates'];
  
  let hasAnyComponents = false;
  
  for (const typeKey of typesToShow) {
    const components = componentsByType[typeKey as keyof ComponentsByType] || [];
    
    // Apply scope filter
    let filteredComponents = scopeFilter
      ? components.filter((comp: ComponentResolutionResult) => comp.source === scopeFilter)
      : components;
    
    // Apply installed filter (exclude builtin-only components)
    if (installedOnly) {
      filteredComponents = filteredComponents.filter((comp: ComponentResolutionResult) => comp.source !== 'builtin');
    }
    
    if (filteredComponents.length === 0) continue;
    
    hasAnyComponents = true;
    
    // Capitalize and format type name
    const typeName = typeKey.charAt(0).toUpperCase() + typeKey.slice(1);
    logger.info(chalk.bold(`${typeName}:`));
    
    for (const { component, source } of filteredComponents) {
      const sourceIcon = getSourceIcon(source);
      const sourceBadge = chalk.dim(`[${source}]`);
      
      if (verbose && component.metadata?.description) {
        logger.info(`  ${sourceIcon} ${component.name} ${sourceBadge}`);
        logger.info(`    ${chalk.dim(component.metadata.description)}`);
        
        if (component.metadata.tags && component.metadata.tags.length > 0) {
          const tags = component.metadata.tags.filter((tag: string) => tag).join(', ');
          if (tags) {
            logger.info(`    ${chalk.cyan('Tags:')} ${tags}`);
          }
        }
      } else {
        const description = component.metadata?.description || '';
        const displayDescription = description ? ` - ${description}` : '';
        logger.info(`  ${sourceIcon} ${component.name} ${sourceBadge}${displayDescription}`);
      }
    }
    
    logger.info('');
  }
  
  if (!hasAnyComponents) {
    const filterDesc = [];
    if (typeFilter) filterDesc.push(`type '${typeFilter}'`);
    if (scopeFilter) filterDesc.push(`scope '${scopeFilter}'`);
    if (installedOnly) filterDesc.push('installed components only');
    const filterText = filterDesc.length > 0 ? ` matching ${filterDesc.join(' and ')}` : '';
    
    logger.info(`No components found${filterText}.`);
    
    if (!scopeFilter || scopeFilter === 'builtin') {
      logger.info('');
      logger.info('To add components:');
      logger.info('  zcc add mode <name>      # Add a mode');
      logger.info('  zcc add workflow <name>  # Add a workflow');
      logger.info('  zcc add agent <name>     # Add an agent');
    }
  }
}

/**
 * Show only components that have conflicts (exist in multiple scopes)
 */
async function showConflictingComponents(
  componentsByType: ComponentsByType,
  verbose: boolean
): Promise<void> {
  logger.info(chalk.bold('Components with conflicts:'));
  logger.info('');
  
  let hasConflicts = false;
  
  // Group all components by name and type to find conflicts
  const componentGroups = new Map<string, ComponentResolutionResult[]>();
  
  for (const [, components] of Object.entries(componentsByType)) {
    for (const comp of components as ComponentResolutionResult[]) {
      const key = `${comp.component.type}:${comp.component.name}`;
      if (!componentGroups.has(key)) {
        componentGroups.set(key, []);
      }
      componentGroups.get(key)!.push(comp);
    }
  }
  
  // Show only groups with multiple entries (conflicts)
  for (const [key, group] of componentGroups) {
    if (group.length <= 1) continue;
    
    hasConflicts = true;
    const [type, name] = key.split(':');
    const typeName = type.charAt(0).toUpperCase() + type.slice(1);
    
    logger.info(chalk.yellow(`${typeName}: ${name}`));
    
    // Sort by source precedence (project > global > builtin)
    const sourceOrder: { [key: string]: number } = { project: 3, global: 2, builtin: 1 };
    group.sort((a, b) => sourceOrder[b.source] - sourceOrder[a.source]);
    
    for (let i = 0; i < group.length; i++) {
      const { component, source } = group[i];
      const sourceIcon = getSourceIcon(source);
      const isActive = i === 0; // First in sorted order is active
      const activeText = isActive ? chalk.green(' (active)') : chalk.dim(' (overridden)');
      
      logger.info(`  ${sourceIcon} ${chalk.dim(`[${source}]`)} ${component.name}${activeText}`);
      
      if (verbose && component.metadata?.description) {
        logger.info(`    ${chalk.dim(component.metadata.description)}`);
      }
    }
    
    logger.info('');
  }
  
  if (!hasConflicts) {
    logger.info('No component conflicts found.');
    logger.info('All components have unique names within their types.');
  }
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