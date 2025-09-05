import { Command } from 'commander';
import { ZccCore, ComponentSearchResult } from '../lib/ZccCore';
import { ComponentInfo } from '../lib/ZccScope';
import { logger } from '../lib/logger';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { spawn } from 'child_process';
import * as fs from 'fs';
import { validateComponent, formatValidationIssues } from '../lib/utils/componentValidator';

export const editCommand = new Command('edit')
  .description('Edit existing components in your preferred editor')
  .argument('<type>', 'Component type (mode, workflow, agent)')
  .argument('[name]', 'Component name (supports fuzzy matching and interactive selection)')
  .option('-e, --editor <editor>', 'Override default editor (uses $EDITOR environment variable by default)')
  .option('--validate', 'Validate component after editing')
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
      
      // If no name provided, show interactive selection
      if (!name) {
        await showInteractiveSelection(core, componentType, opts);
        return;
      }
      
      // Try to find the component with fuzzy matching
      const matches = await core.findComponents(name, componentType, {
        maxResults: 5,
        minScore: 30
      });
      
      if (matches.length === 0) {
        // No matches found, show suggestions
        await handleNoMatches(core, name, componentType);
        return;
      }
      
      if (matches.length === 1) {
        // Single match, edit it
        await editComponent(matches[0], opts);
        return;
      }
      
      // Multiple matches, let user choose
      await showMultipleMatches(matches, opts);
      
    } catch (error) {
      logger.error('Failed to edit component:', error);
      process.exit(1);
    }
  });

/**
 * Show interactive selection of all available components of a type
 */
async function showInteractiveSelection(
  core: ZccCore, 
  type: ComponentInfo['type'], 
  opts: any
): Promise<void> {
  const components = await core.getComponentsByTypeWithSource(type);
  
  if (components.length === 0) {
    logger.info(`No ${type}s available for editing.`);
    logger.info(`Create a new ${type}: ${chalk.green(`zcc create ${type}`)}`);
    return;
  }
  
  // Group by name to show conflicts and prioritize editable components
  const groupedComponents = new Map<string, typeof components>();
  for (const comp of components) {
    const key = comp.component.name;
    if (!groupedComponents.has(key)) {
      groupedComponents.set(key, []);
    }
    groupedComponents.get(key)!.push(comp);
  }
  
  // Create choices with conflict indicators, prioritizing project and global scope
  const choices = Array.from(groupedComponents.entries())
    .map(([name, comps]) => {
      // Sort by editability: project > global > builtin
      const sortedComps = comps.sort((a, b) => {
        const priority = { project: 3, global: 2, builtin: 1 };
        return priority[b.source] - priority[a.source];
      });
      
      const primary = sortedComps[0]; // Most editable component
      const hasConflicts = comps.length > 1;
      const description = primary.component.metadata?.description || 'No description available';
      
      const conflictIndicator = hasConflicts ? chalk.yellow(' (multiple sources)') : '';
      const sourceBadge = chalk.dim(`[${primary.source}]`);
      const editableIndicator = primary.source === 'builtin' ? chalk.red(' (read-only)') : '';
      
      return {
        name: `${getSourceIcon(primary.source)} ${name} ${sourceBadge}${conflictIndicator}${editableIndicator} - ${description}`,
        value: primary,
        short: name,
        disabled: primary.source === 'builtin' ? 'Built-in components are read-only' : false
      };
    })
    .filter(choice => !choice.disabled); // Remove disabled choices for cleaner display
  
  if (choices.length === 0) {
    logger.info(`No editable ${type}s found. Built-in components are read-only.`);
    logger.info(`Create a new ${type}: ${chalk.green(`zcc create ${type}`)}`);
    return;
  }
  
  const { selected } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selected',
      message: `Select a ${type} to edit:`,
      choices,
      pageSize: 10
    }
  ]);
  
  await editComponent({ 
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
  core: ZccCore,
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
    logger.info(`Try: ${chalk.green(`zcc edit ${type} ${suggestions[0]}`)}`);
  } else {
    logger.info('');
    logger.info(`To see all available ${type}s:`);
    logger.info(`  ${chalk.green(`zcc list --type ${type}`)}`);
    logger.info(`To create a new ${type}:`);
    logger.info(`  ${chalk.green(`zcc create ${type} ${query}`)}`);
  }
}

/**
 * Show multiple matches for user to choose from
 */
async function showMultipleMatches(
  matches: ComponentSearchResult[],
  opts: any
): Promise<void> {
  logger.info(`Found ${matches.length} matches:`);
  logger.info('');
  
  const editableMatches = matches.filter(match => match.source !== 'builtin');
  
  if (editableMatches.length === 0) {
    logger.warn('All matches are built-in components, which are read-only.');
    logger.info('Create a custom version with: ' + chalk.green('zcc create <type> --from <name>'));
    return;
  }
  
  const choices = editableMatches.map((match) => {
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
      message: 'Which component would you like to edit?',
      choices
    }
  ]);
  
  await editComponent(selected, opts);
}

/**
 * Edit a component using the user's preferred editor
 */
async function editComponent(
  match: ComponentSearchResult,
  opts: any
): Promise<void> {
  const { component, source } = match;
  
  // Check if component is editable
  if (source === 'builtin') {
    logger.error(`Cannot edit built-in ${component.type} '${component.name}' - it's read-only.`);
    logger.info('Create a custom version with: ' + chalk.green(`zcc create ${component.type} --from ${component.name}`));
    return;
  }
  
  // Determine editor to use
  const editor = opts.editor || process.env.EDITOR || process.env.VISUAL || 'nano';
  
  logger.info(`Opening ${source} ${component.type} '${component.name}' in ${editor}...`);
  logger.info(`File: ${chalk.dim(component.path)}`);
  
  // Store original content for comparison
  let originalContent = '';
  try {
    originalContent = fs.readFileSync(component.path, 'utf-8');
  } catch (error: any) {
    logger.warn(`Could not read original content: ${error.message}`);
  }
  
  // Launch editor
  return new Promise((resolve, reject) => {
    const editorProcess = spawn(editor, [component.path], {
      stdio: 'inherit',
      shell: true
    });
    
    editorProcess.on('close', async (code) => {
      if (code !== 0) {
        logger.error(`Editor exited with code ${code}`);
        reject(new Error(`Editor exited with code ${code}`));
        return;
      }
      
      // Check if file was modified
      let newContent = '';
      try {
        newContent = fs.readFileSync(component.path, 'utf-8');
      } catch (error: any) {
        logger.error(`Could not read modified file: ${error.message}`);
        reject(error);
        return;
      }
      
      if (originalContent !== newContent) {
        logger.success(`${component.type.charAt(0).toUpperCase() + component.type.slice(1)} '${component.name}' has been updated.`);
        
        // Validate if requested
        if (opts.validate) {
          logger.info('Validating component...');
          try {
            const validationResult = validateComponent(component.path);
            
            if (validationResult.isValid && validationResult.issues.length === 0) {
              logger.success('Component validation passed.');
            } else {
              const errors = validationResult.issues.filter(issue => issue.type === 'error');
              const warnings = validationResult.issues.filter(issue => issue.type === 'warning');
              
              if (errors.length > 0) {
                logger.error('Validation errors found:');
                formatValidationIssues(errors).forEach(error => logger.error(`  ${error}`));
              }
              
              if (warnings.length > 0) {
                logger.warn('Validation warnings:');
                formatValidationIssues(warnings).forEach(warning => logger.warn(`  ${warning}`));
              }
              
              if (validationResult.isValid) {
                logger.success('Component validation passed (with warnings).');
              } else {
                logger.warn('Component validation failed.');
              }
            }
          } catch (validationError: any) {
            logger.warn(`Validation failed: ${validationError.message}`);
          }
        }
        
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
      } else {
        logger.info('No changes made to the component.');
      }
      
      resolve();
    });
    
    editorProcess.on('error', (error) => {
      logger.error(`Failed to launch editor '${editor}': ${error.message}`);
      logger.info('Make sure your editor is installed and accessible in PATH.');
      logger.info('You can also set the EDITOR environment variable or use --editor flag.');
      reject(error);
    });
  });
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