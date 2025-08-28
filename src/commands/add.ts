import { Command } from 'commander';
import { MementoCore, ComponentSearchResult } from '../lib/MementoCore';
import { ComponentInfo } from '../lib/MementoScope';
import { logger } from '../lib/logger';
import { InvalidComponentTypeError, InvalidScopeError, ComponentInstallError } from '../lib/errors';
import { InputValidator } from '../lib/validation/InputValidator';
import chalk from 'chalk';
import inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';
import { ensureDirectorySync } from '../lib/utils/filesystem';

export const addCommand = new Command('add')
  .description('Add components to your Memento Protocol setup')
  .argument('<type>', 'Component type (mode, workflow, agent, script, hook, command, template)')
  .argument('[name]', 'Component name (supports fuzzy matching and interactive selection)')
  .option('-s, --source <scope>', 'Install from specific scope (builtin, global)', 'builtin')
  .option('-f, --force', 'Force installation even if component already exists')
  .option('--global', 'Install to global scope (~/.memento) instead of project')
  .addHelpText('after', `
Examples:
  $ memento add mode                              # Interactive mode selection
  $ memento add mode engineer                     # Add engineer mode exactly
  $ memento add mode eng                          # Fuzzy match (finds engineer)
  $ memento add mode apm                          # Acronym match (finds autonomous-project-manager)
  $ memento add workflow review                   # Add code review workflow  
  $ memento add workflow debug                    # Add debugging workflow
  $ memento add agent claude-code-research        # Add research agent for Claude Code
  $ memento add hook git-context-loader          # Add git context hook
  $ memento add script deployment                 # Add deployment script
  $ memento add template api-endpoint             # Add API endpoint template

Installing from different scopes:
  $ memento add mode engineer --source builtin   # From built-in templates
  $ memento add mode my-custom --source global   # From global ~/.memento
  $ memento add workflow review --global          # Install to global scope

Force installation (overwrite existing):
  $ memento add mode engineer --force             # Overwrite existing engineer mode
  $ memento add workflow review --force --global  # Force overwrite in global scope

Interactive selection:
  $ memento add mode                              # Choose from available modes
  $ memento add workflow                          # Choose from available workflows
  $ memento add agent                             # Choose from available agents

Multiple component types:
  $ memento add mode engineer && memento add workflow review
  $ memento add hook git-context && memento add hook test-on-save
`)
  .action(async (type: string, name?: string, options?: any) => {
    try {
      const core = new MementoCore(process.cwd());
      const opts = options || {};
      
      // Validate component type
      const validTypes: ComponentInfo['type'][] = ['mode', 'workflow', 'agent', 'script', 'hook', 'command', 'template'];
      if (!validTypes.includes(type as ComponentInfo['type'])) {
        throw new InvalidComponentTypeError(type, validTypes);
      }
      
      // Validate source scope
      const validSources = ['builtin', 'global'];
      if (opts.source && !validSources.includes(opts.source)) {
        throw new InvalidScopeError(opts.source, validSources);
      }
      
      const componentType = type as ComponentInfo['type'];
      
      // If no name provided, show interactive selection
      if (!name) {
        await showInteractiveSelection(core, componentType, opts);
        return;
      }
      
      // Validate and sanitize the component name for security
      const validatedName = InputValidator.validateComponentName(name, componentType);
      
      // Try to find the component with fuzzy matching using validated name
      const matches = await core.findComponents(validatedName, componentType, {
        maxResults: 5,
        minScore: 30
      });
      
      if (matches.length === 0) {
        // No matches found, show suggestions
        await handleNoMatches(core, validatedName, componentType);
        return;
      }
      
      if (matches.length === 1) {
        // Single match, install it
        await installComponent(core, matches[0], opts);
        return;
      }
      
      // Multiple matches, let user choose
      await showMultipleMatches(core, matches, opts);
      
    } catch (error) {
      if (error instanceof InvalidComponentTypeError) {
        logger.error(`Invalid component type: ${type}`);
      } else if (error instanceof InvalidScopeError) {
        logger.error(`Invalid source scope: ${opts.source}`);
      } else {
        logger.error(`Failed to add component:`, error);
      }
      process.exit(1);
    }
  });

/**
 * Show interactive selection of all available components of a type
 */
async function showInteractiveSelection(
  core: MementoCore, 
  type: ComponentInfo['type'], 
  opts: any
): Promise<void> {
  const components = await core.getComponentsByTypeWithSource(type);
  
  // Filter by source if specified
  const filteredComponents = opts.source
    ? components.filter(comp => comp.source === opts.source)
    : components;
  
  if (filteredComponents.length === 0) {
    const sourceText = opts.source ? ` from ${opts.source} scope` : '';
    logger.info(`No ${type}s available${sourceText}.`);
    return;
  }
  
  // Group by name to show conflicts
  const groupedComponents = new Map<string, typeof filteredComponents>();
  for (const comp of filteredComponents) {
    const key = comp.component.name;
    if (!groupedComponents.has(key)) {
      groupedComponents.set(key, []);
    }
    groupedComponents.get(key)!.push(comp);
  }
  
  // Create choices with conflict indicators
  const choices = Array.from(groupedComponents.entries()).map(([name, comps]) => {
    const primary = comps[0]; // First component (highest precedence)
    const hasConflicts = comps.length > 1;
    const description = primary.component.metadata?.description || 'No description available';
    
    const conflictIndicator = hasConflicts ? chalk.yellow(' (multiple sources)') : '';
    const sourceBadge = chalk.dim(`[${primary.source}]`);
    
    return {
      name: `${getSourceIcon(primary.source)} ${name} ${sourceBadge}${conflictIndicator} - ${description}`,
      value: primary,
      short: name
    };
  });
  
  const { selected } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selected',
      message: `Select a ${type} to install:`,
      choices,
      pageSize: 10
    }
  ]);
  
  await installComponent(core, { 
    ...selected, 
    name: selected.component.name, 
    score: 100, 
    matchType: 'exact' as const 
  }, opts);
}

/**
 * Handle case where no matches were found
 */
async function handleNoMatches(
  core: MementoCore,
  query: string,
  type: ComponentInfo['type']
): Promise<void> {
  logger.error(`${type.charAt(0).toUpperCase() + type.slice(1)} '${query}' not found.`);
  
  // Generate suggestions
  const suggestions = await core.generateSuggestions(query, type, 3);
  
  if (suggestions.length > 0) {
    logger.info('');
    logger.info('Did you mean one of these?');
    for (const suggestion of suggestions) {
      logger.info(`  ${chalk.cyan(suggestion)}`);
    }
    logger.info('');
    logger.info(`Try: ${chalk.green(`memento add ${type} ${suggestions[0]}`)}`);
  } else {
    logger.info('');
    logger.info(`To see all available ${type}s:`);
    logger.info(`  ${chalk.green(`memento list --type ${type}`)}`);
  }
}

/**
 * Show multiple matches for user to choose from
 */
async function showMultipleMatches(
  core: MementoCore,
  matches: ComponentSearchResult[],
  opts: any
): Promise<void> {
  logger.info(`Found ${matches.length} matches:`);
  logger.info('');
  
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
      message: 'Which component would you like to install?',
      choices
    }
  ]);
  
  await installComponent(core, selected, opts);
}

/**
 * Install a component to the appropriate scope
 */
async function installComponent(
  core: MementoCore,
  match: ComponentSearchResult,
  opts: any
): Promise<void> {
  const { component, source } = match;
  const targetScope = opts.global ? 'global' : 'project';
  
  // Check for conflicts in target scope
  const conflicts = await core.getComponentConflicts(component.name, component.type);
  const targetConflict = conflicts.find(c => 
    (targetScope === 'global' && c.source === 'global') ||
    (targetScope === 'project' && c.source === 'project')
  );
  
  if (targetConflict && !opts.force) {
    logger.warn(`${component.type.charAt(0).toUpperCase() + component.type.slice(1)} '${component.name}' already exists in ${targetScope} scope.`);
    
    const { shouldOverwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldOverwrite',
        message: 'Do you want to overwrite it?',
        default: false
      }
    ]);
    
    if (!shouldOverwrite) {
      logger.info('Installation cancelled.');
      return;
    }
  }
  
  // Show what will be installed
  logger.info('');
  logger.info(`Installing ${component.type}: ${chalk.cyan(component.name)}`);
  logger.info(`Source: ${chalk.dim(source)} → Target: ${chalk.dim(targetScope)}`);
  if (component.metadata?.description) {
    logger.info(`Description: ${component.metadata.description}`);
  }
  logger.info('');
  
  // Validate source path for security, but exempt built-in components
  const projectRoot = process.cwd();
  try {
    // Built-in components are exempt from project boundary validation
    if (source !== 'builtin') {
      InputValidator.validateFilePath(component.path, projectRoot, 'source component path');
    } else {
      // For built-in components, allow absolute paths and skip boundary checking
      InputValidator.sanitizePath(component.path, undefined, 'source component path', true);
    }
  } catch (validationError) {
    throw new ComponentInstallError(
      component.type,
      component.name,
      `Source path validation failed: ${validationError instanceof Error ? validationError.message : 'Invalid path'}`,
      source === 'builtin' 
        ? 'Built-in component path is invalid' 
        : 'Ensure component path is within the project boundaries'
    );
  }
  
  // Get the source content
  let sourceContent: string;
  try {
    sourceContent = fs.readFileSync(component.path, 'utf-8');
    
    // Validate template content for security
    InputValidator.validateTemplateContent(sourceContent, `${component.type} ${component.name}`);
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      throw error; // Re-throw validation errors
    }
    throw new ComponentInstallError(
      component.type,
      component.name,
      `Unable to read source component file at ${component.path}`,
      `Check if the file exists and you have read permissions. Try: ls -la "${path.dirname(component.path)}"`
    );
  }
  
  // Determine target path
  const scopes = core.getScopes();
  const targetScopeObj = targetScope === 'global' ? scopes.global : scopes.project;
  const scopePath = targetScopeObj.getPath();
  
  // Scope path is controlled by MementoCore, so we trust it but validate format
  const validatedScopePath = InputValidator.sanitizePath(scopePath, undefined, 'target scope path', true);
  
  const targetDir = path.join(validatedScopePath, `${component.type}s`);
  const fileName = path.basename(component.path);
  
  // Validate filename
  const validatedFileName = InputValidator.validateFileName(fileName, 'component filename');
  const targetPath = path.join(targetDir, validatedFileName);
  
  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    ensureDirectorySync(targetDir);
  }
  
  // Write the component
  try {
    fs.writeFileSync(targetPath, sourceContent, 'utf-8');
    logger.success(`Successfully installed ${component.type} '${component.name}' to ${targetScope} scope.`);
    
    // Clear caches
    core.clearCache();
    
    // Show usage hint
    if (component.type === 'mode') {
      logger.info('');
      logger.info(`To use this mode: ${chalk.green(`/mode ${component.name}`)}`);
    } else if (component.type === 'workflow') {
      logger.info('');
      logger.info(`This workflow is now available in your prompts and modes.`);
    } else if (component.type === 'agent') {
      logger.info('');
      logger.info(`This agent is now available in Claude Code.`);
    }
    
  } catch (error: any) {
    const reason = error.code === 'EACCES'
      ? 'permission denied'
      : error.code === 'ENOSPC'
      ? 'insufficient disk space'
      : error.code === 'EROFS'
      ? 'read-only file system'
      : `write failed (${error.message})`;

    throw new ComponentInstallError(
      component.type,
      component.name,
      reason,
      error.code === 'EACCES'
        ? `Check directory permissions: ls -la "${path.dirname(targetPath)}"`
        : error.code === 'ENOSPC'
        ? `Free up disk space and try again`
        : `Verify the target directory exists and is writable: ls -la "${path.dirname(targetPath)}"`
    );
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