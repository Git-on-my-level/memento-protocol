import { Command } from 'commander';
import { ZccCore, ComponentSearchResult } from '../lib/ZccCore';
import { ComponentInfo } from '../lib/ZccScope';
import { logger } from '../lib/logger';
import chalk from 'chalk';
import inquirer from 'inquirer';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  type: 'frontmatter' | 'content' | 'structure';
  message: string;
  line?: number;
}

interface ValidationWarning {
  type: 'content' | 'style' | 'best-practice' | 'structure';
  message: string;
  line?: number;
}

export const validateCommand = new Command('validate')
  .description('Validate component files for correctness and best practices')
  .argument('<type>', 'Component type (mode, workflow, agent, or "all" for all types)')
  .argument('[name]', 'Component name (validates all components of type if not specified)')
  .option('-s, --strict', 'Enable strict validation with additional checks')
  .option('-q, --quiet', 'Only show errors, suppress warnings')
  .option('--fix', 'Attempt to automatically fix common issues (not implemented yet)')
  .action(async (type: string, name?: string, options?: any) => {
    try {
      const core = new ZccCore(process.cwd());
      const opts = options || {};
      
      if (type === 'all') {
        await validateAllComponents(core, opts);
        return;
      }
      
      // Validate component type
      const validTypes: ComponentInfo['type'][] = ['mode', 'workflow', 'agent'];
      if (!validTypes.includes(type as ComponentInfo['type'])) {
        logger.error(`Invalid component type: ${type}`);
        logger.info(`Valid types are: ${validTypes.join(', ')}, or "all"`);
        process.exit(1);
      }
      
      const componentType = type as ComponentInfo['type'];
      
      if (!name) {
        // Validate all components of the specified type
        await validateComponentsByType(core, componentType, opts);
        return;
      }
      
      // Validate specific component
      const matches = await core.findComponents(name, componentType, {
        maxResults: 5,
        minScore: 30
      });
      
      if (matches.length === 0) {
        logger.error(`${componentType.charAt(0).toUpperCase() + componentType.slice(1)} '${name}' not found.`);
        process.exit(1);
      }
      
      if (matches.length === 1) {
        await validateComponent(matches[0], opts);
        return;
      }
      
      // Multiple matches, let user choose
      await showMultipleMatches(matches, opts);
      
    } catch (error) {
      logger.error('Failed to validate component:', error);
      process.exit(1);
    }
  });

/**
 * Validate all components across all types
 */
async function validateAllComponents(core: ZccCore, opts: any): Promise<void> {
  const types: ComponentInfo['type'][] = ['mode', 'workflow', 'agent'];
  let totalComponents = 0;
  let totalErrors = 0;
  let totalWarnings = 0;
  
  logger.info('Validating all components...');
  logger.info('');
  
  for (const type of types) {
    const components = await core.getComponentsByTypeWithSource(type);
    if (components.length === 0) {
      continue;
    }
    
    logger.info(chalk.bold(`${type.charAt(0).toUpperCase() + type.slice(1)}s:`));
    
    for (const comp of components) {
      const result = await validateComponentFile(comp.component.path, comp.component.type, opts);
      totalComponents++;
      totalErrors += result.errors.length;
      totalWarnings += result.warnings.length;
      
      const status = result.isValid ? chalk.green('✓') : chalk.red('✗');
      const errorText = result.errors.length > 0 ? chalk.red(`${result.errors.length} errors`) : '';
      const warningText = result.warnings.length > 0 ? chalk.yellow(`${result.warnings.length} warnings`) : '';
      const issues = [errorText, warningText].filter(Boolean).join(', ');
      
      logger.info(`  ${status} ${comp.component.name} ${chalk.dim(`[${comp.source}]`)} ${issues ? `(${issues})` : ''}`);
      
      if (!opts.quiet) {
        // Show first error/warning for context
        if (result.errors.length > 0) {
          logger.info(`    ${chalk.red('Error:')} ${result.errors[0].message}`);
        } else if (result.warnings.length > 0) {
          logger.info(`    ${chalk.yellow('Warning:')} ${result.warnings[0].message}`);
        }
      }
    }
    
    logger.info('');
  }
  
  // Summary
  logger.info(chalk.bold('Validation Summary:'));
  logger.info(`  Components validated: ${totalComponents}`);
  logger.info(`  Total errors: ${chalk.red(totalErrors.toString())}`);
  logger.info(`  Total warnings: ${chalk.yellow(totalWarnings.toString())}`);
  
  if (totalErrors > 0) {
    logger.info('');
    logger.info('Run validation on specific components for detailed error information:');
    logger.info(`  ${chalk.green('zcc validate <type> <name>')}`);
    process.exit(1);
  }
}

/**
 * Validate all components of a specific type
 */
async function validateComponentsByType(
  core: ZccCore,
  type: ComponentInfo['type'],
  opts: any
): Promise<void> {
  const components = await core.getComponentsByTypeWithSource(type);
  
  if (components.length === 0) {
    logger.info(`No ${type}s found to validate.`);
    return;
  }
  
  logger.info(`Validating ${components.length} ${type}(s)...`);
  logger.info('');
  
  let hasErrors = false;
  
  for (const comp of components) {
    const result = await validateComponentFile(comp.component.path, comp.component.type, opts);
    
    const status = result.isValid ? chalk.green('✓') : chalk.red('✗');
    logger.info(`${status} ${comp.component.name} ${chalk.dim(`[${comp.source}]`)}`);
    
    if (result.errors.length > 0 || (!opts.quiet && result.warnings.length > 0)) {
      for (const error of result.errors) {
        logger.info(`  ${chalk.red('Error:')} ${error.message}`);
      }
      
      if (!opts.quiet) {
        for (const warning of result.warnings) {
          logger.info(`  ${chalk.yellow('Warning:')} ${warning.message}`);
        }
      }
      
      logger.info('');
    }
    
    if (!result.isValid) {
      hasErrors = true;
    }
  }
  
  if (hasErrors) {
    process.exit(1);
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
  
  await validateComponent(selected, opts);
}

/**
 * Validate a single component
 */
async function validateComponent(
  match: ComponentSearchResult,
  opts: any
): Promise<void> {
  const { component, source } = match;
  
  logger.info(`Validating ${source} ${component.type}: ${chalk.cyan(component.name)}`);
  logger.info(`File: ${chalk.dim(component.path)}`);
  logger.info('');
  
  const result = await validateComponentFile(component.path, component.type, opts);
  
  if (result.errors.length > 0) {
    logger.error(chalk.bold('Errors found:'));
    for (const error of result.errors) {
      logger.error(`  • ${error.message}`);
      if (error.line) {
        logger.error(`    Line ${error.line}`);
      }
    }
    logger.info('');
  }
  
  if (result.warnings.length > 0 && !opts.quiet) {
    logger.warn(chalk.bold('Warnings:'));
    for (const warning of result.warnings) {
      logger.warn(`  • ${warning.message}`);
      if (warning.line) {
        logger.warn(`    Line ${warning.line}`);
      }
    }
    logger.info('');
  }
  
  if (result.isValid) {
    logger.success(`${component.type.charAt(0).toUpperCase() + component.type.slice(1)} '${component.name}' is valid!`);
    if (result.warnings.length > 0 && !opts.quiet) {
      logger.info(`${result.warnings.length} warning(s) found - consider addressing them for best practices.`);
    }
  } else {
    logger.error(`${component.type.charAt(0).toUpperCase() + component.type.slice(1)} '${component.name}' has validation errors.`);
    
    // Suggest fixes
    logger.info('');
    logger.info('Suggested actions:');
    logger.info(`  • Edit the component: ${chalk.green(`zcc edit ${component.type} ${component.name}`)}`);
    logger.info(`  • Check the template: ${chalk.green(`zcc create ${component.type} --help`)}`);
    
    process.exit(1);
  }
}

/**
 * Validate a component file
 */
async function validateComponentFile(
  filePath: string,
  type: ComponentInfo['type'],
  opts: any
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check for YAML frontmatter
    if (!content.startsWith('---\n')) {
      errors.push({
        type: 'frontmatter',
        message: 'Missing YAML frontmatter at the beginning of the file',
        line: 1
      });
      return { isValid: false, errors, warnings };
    }
    
    const frontmatterEnd = content.indexOf('\n---\n', 4);
    if (frontmatterEnd === -1) {
      errors.push({
        type: 'frontmatter',
        message: 'Malformed YAML frontmatter - missing closing "---"',
        line: 2
      });
      return { isValid: false, errors, warnings };
    }
    
    const frontmatterContent = content.substring(4, frontmatterEnd);
    let frontmatterData: any;
    
    // Parse YAML frontmatter
    try {
      frontmatterData = yaml.load(frontmatterContent);
    } catch (error: any) {
      errors.push({
        type: 'frontmatter',
        message: `Invalid YAML frontmatter: ${error.message}`,
        line: 2
      });
      return { isValid: false, errors, warnings };
    }
    
    // Validate required fields
    const requiredFields = ['name', 'description', 'author', 'version'];
    for (const field of requiredFields) {
      if (!frontmatterData || !frontmatterData[field]) {
        errors.push({
          type: 'frontmatter',
          message: `Missing required field: ${field}`
        });
      }
    }
    
    // Validate field values
    if (frontmatterData) {
      if (frontmatterData.name && typeof frontmatterData.name !== 'string') {
        errors.push({
          type: 'frontmatter',
          message: 'Field "name" must be a string'
        });
      }
      
      if (frontmatterData.name && !/^[a-z0-9-_]+$/.test(frontmatterData.name)) {
        errors.push({
          type: 'frontmatter',
          message: 'Field "name" must contain only lowercase letters, numbers, hyphens, and underscores'
        });
      }
      
      if (frontmatterData.version && !/^\d+\.\d+\.\d+/.test(frontmatterData.version)) {
        warnings.push({
          type: 'content',
          message: 'Version should follow semantic versioning (e.g., 1.0.0)'
        });
      }
      
      if (frontmatterData.description && frontmatterData.description.length < 10) {
        warnings.push({
          type: 'content',
          message: 'Description should be more descriptive (at least 10 characters)'
        });
      }
      
      // Agent-specific validation
      if (type === 'agent') {
        if (!frontmatterData.tools) {
          warnings.push({
            type: 'content',
            message: 'Agent should specify required tools in frontmatter'
          });
        }
      }
    }
    
    const bodyContent = content.substring(frontmatterEnd + 5);
    
    // Check for minimum content
    if (bodyContent.trim().length < 50) {
      warnings.push({
        type: 'content',
        message: 'Component content seems very short - consider adding more details'
      });
    }
    
    // Type-specific validation
    validateTypeSpecificContent(type, bodyContent, errors, warnings, opts);
    
    // Style and best practice checks
    if (opts.strict) {
      performStrictValidation(content, bodyContent, errors, warnings);
    }
    
  } catch (error: any) {
    errors.push({
      type: 'structure',
      message: `Failed to read or parse file: ${error.message}`
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate type-specific content requirements
 */
function validateTypeSpecificContent(
  type: ComponentInfo['type'],
  content: string,
  _errors: ValidationError[],
  warnings: ValidationWarning[],
  _opts: any
): void {
  switch (type) {
    case 'mode':
      if (!content.includes('# ')) {
        warnings.push({
          type: 'structure',
          message: 'Mode should have a main heading'
        });
      }
      
      if (!content.includes('## Behavioral Guidelines')) {
        warnings.push({
          type: 'best-practice',
          message: 'Mode should include "## Behavioral Guidelines" section'
        });
      }
      
      if (!content.includes('## Example Process') && !content.includes('## Process')) {
        warnings.push({
          type: 'best-practice',
          message: 'Mode should include process or example section'
        });
      }
      
      break;
      
    case 'workflow':
      if (!content.includes('## Prerequisites') && !content.includes('## Inputs')) {
        warnings.push({
          type: 'best-practice',
          message: 'Workflow should specify prerequisites or inputs'
        });
      }
      
      if (!content.includes('## Workflow Steps') && !content.includes('## Steps')) {
        warnings.push({
          type: 'best-practice',
          message: 'Workflow should include workflow steps section'
        });
      }
      
      if (!content.includes('## Outputs')) {
        warnings.push({
          type: 'best-practice',
          message: 'Workflow should specify expected outputs'
        });
      }
      
      break;
      
    case 'agent':
      if (!content.includes('## Core Responsibilities')) {
        warnings.push({
          type: 'best-practice',
          message: 'Agent should include "## Core Responsibilities" section'
        });
      }
      
      if (!content.includes('## Process') && !content.includes('## Guidelines')) {
        warnings.push({
          type: 'best-practice',
          message: 'Agent should include process guidelines or response guidelines'
        });
      }
      
      break;
  }
}

/**
 * Perform strict validation with additional checks
 */
function performStrictValidation(
  fullContent: string,
  bodyContent: string,
  _errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // Check for consistent heading levels
  const headings = bodyContent.match(/^#{1,6}\s+.+$/gm) || [];
  if (headings.length === 0) {
    warnings.push({
      type: 'structure',
      message: 'No headings found - consider adding structure with markdown headings'
    });
  }
  
  // Check for very long lines
  const lines = fullContent.split('\n');
  lines.forEach((line, index) => {
    if (line.length > 120) {
      warnings.push({
        type: 'style',
        message: 'Line is very long - consider breaking it up for readability',
        line: index + 1
      });
    }
  });
  
  // Check for placeholder text
  const placeholders = ['TODO', '[TODO]', 'FIXME', '[PLACEHOLDER]', '{{', '}}'];
  for (const placeholder of placeholders) {
    if (bodyContent.includes(placeholder)) {
      warnings.push({
        type: 'content',
        message: `Contains placeholder text: ${placeholder}`
      });
    }
  }
  
  // Check for minimum number of examples/sections
  if (bodyContent.split('##').length < 3) {
    warnings.push({
      type: 'content',
      message: 'Component should have multiple sections for comprehensive guidance'
    });
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