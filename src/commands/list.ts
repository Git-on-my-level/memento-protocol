import { Command } from 'commander';
import { MementoCore } from '../lib/MementoCore';
import { ComponentInfo } from '../lib/MementoScope';
import { logger } from '../lib/logger';
import chalk from 'chalk';

export const listCommand = new Command('list')
  .description('List components across all scopes (built-in, global, project)')
  .option('-t, --type <type>', 'Filter by component type (mode, workflow, agent, etc.)')
  .option('-s, --scope <scope>', 'Filter by scope (builtin, global, project)')
  .option('-v, --verbose', 'Show detailed component information')
  .option('-c, --conflicts', 'Show only components with conflicts across scopes')
  .option('--installed', 'Legacy option: show all components (equivalent to no filter)')
  .action(async (options) => {
    try {
      const core = new MementoCore(process.cwd());
      const status = await core.getStatus();
      
      // Validate type filter
      const validTypes: ComponentInfo['type'][] = ['mode', 'workflow', 'agent', 'script', 'hook', 'command', 'template'];
      if (options.type && !validTypes.includes(options.type)) {
        logger.error(`Invalid component type '${options.type}'. Valid types are: ${validTypes.join(', ')}`);
        process.exit(1);
      }
      
      // Validate scope filter
      const validScopes = ['builtin', 'global', 'project'];
      if (options.scope && !validScopes.includes(options.scope)) {
        logger.error(`Invalid scope '${options.scope}'. Valid scopes are: ${validScopes.join(', ')}`);
        process.exit(1);
      }

      // Show status summary
      if (!options.type && !options.scope && !options.conflicts) {
        await showStatusSummary(status);
        logger.info('');
      }

      // Get components with source information
      const componentsByType = await core.listComponentsWithSource();
      
      if (options.conflicts) {
        await showConflictingComponents(componentsByType, options.verbose || false);
      } else {
        await showComponents(componentsByType, {
          typeFilter: options.type,
          scopeFilter: options.scope,
          verbose: options.verbose || false
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
async function showStatusSummary(status: any): Promise<void> {
  logger.info(chalk.bold('Memento Protocol Status:'));
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
  componentsByType: any,
  options: {
    typeFilter?: string;
    scopeFilter?: string;
    verbose: boolean;
  }
): Promise<void> {
  const { typeFilter, scopeFilter, verbose } = options;
  
  // Filter component types
  const typesToShow = typeFilter
    ? [typeFilter]
    : ['modes', 'workflows', 'agents', 'scripts', 'hooks', 'commands', 'templates'];
  
  let hasAnyComponents = false;
  
  for (const typeKey of typesToShow) {
    const components = componentsByType[typeKey] || [];
    
    // Apply scope filter
    const filteredComponents = scopeFilter
      ? components.filter((comp: any) => comp.source === scopeFilter)
      : components;
    
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
    const filterText = filterDesc.length > 0 ? ` matching ${filterDesc.join(' and ')}` : '';
    
    logger.info(`No components found${filterText}.`);
    
    if (!scopeFilter || scopeFilter === 'builtin') {
      logger.info('');
      logger.info('To add components:');
      logger.info('  memento add mode <name>      # Add a mode');
      logger.info('  memento add workflow <name>  # Add a workflow');
      logger.info('  memento add agent <name>     # Add an agent');
    }
  }
}

/**
 * Show only components that have conflicts (exist in multiple scopes)
 */
async function showConflictingComponents(
  componentsByType: any,
  verbose: boolean
): Promise<void> {
  logger.info(chalk.bold('Components with conflicts:'));
  logger.info('');
  
  let hasConflicts = false;
  
  // Group all components by name and type to find conflicts
  const componentGroups = new Map<string, any[]>();
  
  for (const [typeKey, components] of Object.entries(componentsByType)) {
    for (const comp of components as any[]) {
      const key = `${comp.component.type}:${comp.component.name}`;
      if (!componentGroups.has(key)) {
        componentGroups.set(key, []);
      }
      componentGroups.get(key)!.push({ ...comp, typeKey });
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