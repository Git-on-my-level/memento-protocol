import { Command } from 'commander';
import { ZccCore, ComponentSearchResult } from '../lib/ZccCore';
import { ComponentInfo } from '../lib/ZccScope';
import { logger } from '../lib/logger';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { validateComponent, formatValidationIssues } from '../lib/utils/componentValidator';
import { isNonInteractive } from '../lib/context';

// Custom error types for better error handling
class ValidationError extends Error {
  constructor(message: string, public exitCode: number = 1) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Sanitize component name input to prevent injection attacks
 */
function sanitizeComponentName(name: string): string {
  if (typeof name !== 'string') {
    throw new ValidationError('Component name must be a string');
  }
  
  // Remove potentially dangerous characters while preserving valid component name characters
  const sanitized = name.trim().replace(/[^a-zA-Z0-9\-_\.]/g, '');
  
  if (sanitized.length === 0) {
    throw new ValidationError('Component name cannot be empty after sanitization');
  }
  
  if (sanitized.length > 100) {
    throw new ValidationError('Component name is too long (max 100 characters)');
  }
  
  return sanitized;
}

export const validateCommand = new Command('validate')
  .description('Validate components for correctness and best practices')
  .argument('[type]', 'Component type (mode, workflow, agent) - validates all types if not specified')
  .argument('[name]', 'Component name (supports fuzzy matching) - validates all components if not specified')
  .option('--strict', 'Treat warnings as errors')
  .option('--summary-only', 'Show only summary, not individual issues')
  .action(async (type?: string, name?: string, options?: any) => {
    try {
      const core = new ZccCore(process.cwd());
      const opts = options || {};
      
      // Validate type if provided
      const validTypes: ComponentInfo['type'][] = ['mode', 'workflow', 'agent'];
      if (type && !validTypes.includes(type as ComponentInfo['type'])) {
        throw new ValidationError(`Invalid component type: ${type}. Valid types are: ${validTypes.join(', ')}`);
      }
      
      const componentType = type as ComponentInfo['type'] | undefined;
      
      // Sanitize name input if provided
      const sanitizedName = name ? sanitizeComponentName(name) : undefined;
      
      // Determine what to validate
      if (!componentType && !sanitizedName) {
        // Validate all components
        await validateAllComponents(core, opts);
      } else if (componentType && !sanitizedName) {
        // Validate all components of a specific type
        await validateComponentsByType(core, componentType, opts);
      } else if (sanitizedName) {
        // Validate specific component(s)
        await validateSpecificComponent(core, sanitizedName, componentType, opts);
      }
      
    } catch (error) {
      if (error instanceof ValidationError) {
        logger.error(error.message);
        process.exit(error.exitCode);
      } else {
        logger.error('Failed to validate components:', error);
        process.exit(1);
      }
    }
  });

/**
 * Validate all components across all types
 */
async function validateAllComponents(core: ZccCore, opts: any): Promise<void> {
  logger.info('Validating all components...');
  logger.info('');
  
  const types: ComponentInfo['type'][] = ['mode', 'workflow', 'agent'];
  let totalComponents = 0;
  let totalValid = 0;
  let totalErrors = 0;
  let totalWarnings = 0;
  
  for (const type of types) {
    const components = await core.getComponentsByTypeWithSource(type);
    if (components.length === 0) continue;
    
    if (!opts.summaryOnly) {
      logger.info(chalk.bold(`${type.charAt(0).toUpperCase() + type.slice(1)}s:`));
    }
    
    const results = await validateComponentsGroup(components, opts);
    totalComponents += components.length;
    totalValid += results.valid;
    totalErrors += results.errors;
    totalWarnings += results.warnings;
    
    if (!opts.summaryOnly) {
      logger.info('');
    }
  }
  
  // Show summary
  logger.info(chalk.bold('Validation Summary:'));
  logger.info(`Total components: ${totalComponents}`);
  logger.info(`Valid: ${chalk.green(totalValid)}`);
  
  if (totalErrors > 0) {
    logger.info(`With errors: ${chalk.red(totalErrors)}`);
  }
  if (totalWarnings > 0) {
    logger.info(`With warnings: ${chalk.yellow(totalWarnings)}`);
  }
  
  const hasIssues = totalErrors > 0 || (opts.strict && totalWarnings > 0);
  if (hasIssues) {
    logger.info('');
    throw new ValidationError('Validation completed with issues.');
  } else {
    logger.success('All components are valid!');
  }
}

/**
 * Validate all components of a specific type
 */
async function validateComponentsByType(core: ZccCore, type: ComponentInfo['type'], opts: any): Promise<void> {
  const components = await core.getComponentsByTypeWithSource(type);
  
  if (components.length === 0) {
    logger.info(`No ${type}s found to validate.`);
    return;
  }
  
  logger.info(`Validating all ${type}s...`);
  logger.info('');
  
  const results = await validateComponentsGroup(components, opts);
  
  // Show summary
  logger.info(chalk.bold('Validation Summary:'));
  logger.info(`Total ${type}s: ${components.length}`);
  logger.info(`Valid: ${chalk.green(results.valid)}`);
  
  if (results.errors > 0) {
    logger.info(`With errors: ${chalk.red(results.errors)}`);
  }
  if (results.warnings > 0) {
    logger.info(`With warnings: ${chalk.yellow(results.warnings)}`);
  }
  
  const hasIssues = results.errors > 0 || (opts.strict && results.warnings > 0);
  if (hasIssues) {
    logger.info('');
    throw new ValidationError(`${type.charAt(0).toUpperCase() + type.slice(1)} validation completed with issues.`);
  } else {
    logger.success(`All ${type}s are valid!`);
  }
}

/**
 * Validate a specific component by name
 */
async function validateSpecificComponent(
  core: ZccCore, 
  name: string, 
  type: ComponentInfo['type'] | undefined, 
  opts: any
): Promise<void> {
  // Search for the component
  const searchTypes = type ? [type] : (['mode', 'workflow', 'agent'] as ComponentInfo['type'][]);
  let allMatches: ComponentSearchResult[] = [];
  
  for (const searchType of searchTypes) {
    const matches = await core.findComponents(name, searchType, {
      maxResults: 5,
      minScore: 30
    });
    allMatches.push(...matches);
  }
  
  if (allMatches.length === 0) {
    const typeText = type ? ` ${type}` : '';
    let errorMsg = `Component${typeText} '${name}' not found.`;
    
    // Show suggestions
    if (!isNonInteractive()) {
      const suggestions = await core.generateSuggestions(name, type || 'mode', 3);
      if (suggestions.length > 0) {
        errorMsg += '\n\nDid you mean one of these?';
        for (const suggestion of suggestions) {
          errorMsg += `\n  ${suggestion}`;
        }
      }
    }
    throw new ValidationError(errorMsg);
  }
  
  if (allMatches.length === 1) {
    // Single match, validate it
    await validateSingleComponent(allMatches[0], opts);
    return;
  }
  
  // Multiple matches - in non-interactive mode, use best match with auto-selection logic
  if (isNonInteractive()) {
    const bestMatch = allMatches[0]; // matches are already sorted by score
    const isGoodMatch = bestMatch.score >= 80 || bestMatch.matchType === 'exact';
    
    if (isGoodMatch) {
      logger.info(`Auto-selected '${bestMatch.name}' for validation (${bestMatch.matchType} match, ${bestMatch.score}%)`);
      await validateSingleComponent(bestMatch, opts);
      return;
    } else {
      let errorMsg = `Multiple ambiguous matches found for '${name}'. Please be more specific.\n\nAvailable matches:`;
      allMatches.forEach(match => {
        errorMsg += `\n  - ${match.name} (${match.matchType} match, ${match.score}%)`;
      });
      throw new ValidationError(errorMsg);
    }
  }
  
  // Multiple matches, let user choose
  await showMultipleMatches(allMatches, opts);
}

/**
 * Show multiple matches for user to choose from
 */
async function showMultipleMatches(matches: ComponentSearchResult[], opts: any): Promise<void> {
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
      message: 'Which component would you like to validate?',
      choices
    }
  ]);
  
  await validateSingleComponent(selected, opts);
}

/**
 * Validate a group of components and return summary stats
 */
async function validateComponentsGroup(
  components: { component: ComponentInfo; source: string }[], 
  opts: any
): Promise<{ valid: number; errors: number; warnings: number }> {
  let valid = 0;
  let totalErrors = 0;
  let totalWarnings = 0;
  
  for (const { component, source } of components) {
    try {
      const result = validateComponent(component.path);
      const errors = result.issues.filter(issue => issue.type === 'error').length;
      const warnings = result.issues.filter(issue => issue.type === 'warning').length;
      
      const hasErrors = errors > 0;
      const hasWarnings = warnings > 0;
      
      // A component is considered "valid" if it has no errors
      // In strict mode, warnings also make it invalid
      const isComponentValid = !hasErrors && (!opts.strict || !hasWarnings);
      
      if (isComponentValid) {
        valid++;
        if (!opts.summaryOnly) {
          const status = hasWarnings ? 'Valid with warnings' : 'Valid';
          const icon = hasWarnings ? chalk.yellow('⚠') : chalk.green('✓');
          logger.info(`  ${icon} ${getSourceIcon(source)} ${component.name} - ${status}`);
        }
      }
      
      // Always count errors and warnings for summary
      totalErrors += errors;
      totalWarnings += warnings;
      
      if (!isComponentValid && !opts.summaryOnly) {
        const status = hasErrors ? chalk.red('✗ Invalid') : chalk.yellow('⚠ Invalid (warnings in strict mode)');
        logger.info(`  ${status} ${getSourceIcon(source)} ${component.name}`);
        
        if (hasErrors) {
          const errorIssues = result.issues.filter(issue => issue.type === 'error');
          formatValidationIssues(errorIssues).forEach(error => 
            logger.info(`    ${chalk.red(error)}`));
        }
        
        if (hasWarnings && (opts.strict || !hasErrors)) {
          const warningIssues = result.issues.filter(issue => issue.type === 'warning');
          formatValidationIssues(warningIssues).forEach(warning => 
            logger.info(`    ${chalk.yellow(warning)}`));
        }
      }
    } catch (error: any) {
      totalErrors++;
      if (!opts.summaryOnly) {
        logger.info(`  ${chalk.red('✗')} ${getSourceIcon(source)} ${component.name} - Validation failed: ${error.message}`);
      }
    }
  }
  
  return { valid, errors: totalErrors, warnings: totalWarnings };
}

/**
 * Validate a single component
 */
async function validateSingleComponent(match: ComponentSearchResult, opts: any): Promise<void> {
  const { component, source } = match;
  
  logger.info(`Validating ${source} ${component.type} '${component.name}'...`);
  logger.info(`File: ${chalk.dim(component.path)}`);
  logger.info('');
  
  try {
    const result = validateComponent(component.path);
    const errors = result.issues.filter(issue => issue.type === 'error');
    const warnings = result.issues.filter(issue => issue.type === 'warning');
    
    if (result.isValid && warnings.length === 0) {
      logger.success('Component is valid!');
      return;
    }
    
    // Show issues
    if (errors.length > 0) {
      logger.error('Validation errors:');
      formatValidationIssues(errors).forEach(error => logger.error(`  ${error}`));
    }
    
    if (warnings.length > 0) {
      logger.warn('Validation warnings:');
      formatValidationIssues(warnings).forEach(warning => logger.warn(`  ${warning}`));
    }
    
    if (result.isValid) {
      logger.success('Component is valid (with warnings).');
    } else {
      logger.error('Component validation failed.');
    }
    
    const hasIssues = errors.length > 0 || (opts.strict && warnings.length > 0);
    if (hasIssues) {
      throw new ValidationError('Component validation failed with issues.');
    }
    
  } catch (error: any) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Validation failed: ${error.message}`);
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