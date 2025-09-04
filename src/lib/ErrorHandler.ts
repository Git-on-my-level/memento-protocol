import { ZccCore } from './ZccCore';
import { ComponentInfo } from './ZccScope';
import { logger } from './logger';
import chalk from 'chalk';

export interface ErrorSuggestion {
  type: 'command' | 'suggestion' | 'hint' | 'install';
  message: string;
  action?: string;
}

export class ErrorHandler {
  private core: ZccCore;

  constructor(core: ZccCore) {
    this.core = core;
  }

  /**
   * Handle component not found error with helpful suggestions
   */
  async handleComponentNotFound(
    name: string, 
    type: ComponentInfo['type'],
    context: 'search' | 'add' | 'use' = 'search'
  ): Promise<ErrorSuggestion[]> {
    const suggestions: ErrorSuggestion[] = [];
    
    // Try to generate fuzzy suggestions
    const fuzzySuggestions = await this.core.generateSuggestions(name, type, 5);
    
    if (fuzzySuggestions.length > 0) {
      suggestions.push({
        type: 'suggestion',
        message: `Did you mean one of these ${type}s?`,
      });
      
      for (const suggestion of fuzzySuggestions) {
        suggestions.push({
          type: 'command',
          message: suggestion,
          action: this.getContextualAction(context, type, suggestion)
        });
      }
    } else {
      // No fuzzy matches, provide general guidance
      suggestions.push({
        type: 'hint',
        message: `No ${type}s found matching '${name}'.`
      });
    }
    
    // Add discovery commands
    suggestions.push({
      type: 'command',
      message: `List all available ${type}s`,
      action: `zcc list --type ${type}`
    });
    
    if (context === 'add') {
      suggestions.push({
        type: 'command',
        message: `Browse ${type}s interactively`,
        action: `zcc add ${type}`
      });
    }
    
    // Check if we have any built-in components of this type
    const builtinComponents = await this.core.getBuiltinProvider().getComponentsByType(type);
    if (builtinComponents.length > 0) {
      suggestions.push({
        type: 'hint',
        message: `${builtinComponents.length} built-in ${type}${builtinComponents.length !== 1 ? 's' : ''} available.`
      });
    }
    
    return suggestions;
  }

  /**
   * Handle invalid component type error
   */
  handleInvalidComponentType(type: string): ErrorSuggestion[] {
    const validTypes = ['mode', 'workflow', 'agent', 'script', 'hook', 'command', 'template'];
    const suggestions: ErrorSuggestion[] = [];
    
    // Try to find the closest valid type
    const closeMatches = validTypes.filter(validType => 
      validType.includes(type.toLowerCase()) || 
      type.toLowerCase().includes(validType) ||
      this.calculateSimilarity(type.toLowerCase(), validType) > 0.6
    );
    
    if (closeMatches.length > 0) {
      suggestions.push({
        type: 'suggestion',
        message: `Did you mean one of these types?`,
      });
      
      for (const match of closeMatches) {
        suggestions.push({
          type: 'command',
          message: match,
          action: `zcc list --type ${match}`
        });
      }
    } else {
      suggestions.push({
        type: 'hint',
        message: `Valid component types are: ${validTypes.join(', ')}`
      });
    }
    
    return suggestions;
  }

  /**
   * Handle scope initialization errors
   */
  async handleScopeNotInitialized(scope: 'global' | 'project'): Promise<ErrorSuggestion[]> {
    const suggestions: ErrorSuggestion[] = [];
    
    if (scope === 'project') {
      suggestions.push({
        type: 'hint',
        message: 'zcc is not initialized in this project.'
      });
      suggestions.push({
        type: 'command',
        message: 'Initialize project scope',
        action: 'zcc init'
      });
    } else {
      suggestions.push({
        type: 'hint',
        message: 'Global zcc scope is not initialized.'
      });
      suggestions.push({
        type: 'command',
        message: 'Initialize global scope',
        action: 'zcc init --global'
      });
    }
    
    return suggestions;
  }

  /**
   * Handle component conflicts
   */
  async handleComponentConflict(
    name: string,
    type: ComponentInfo['type'],
    conflicts: Array<{ component: ComponentInfo; source: 'builtin' | 'global' | 'project' }>
  ): Promise<ErrorSuggestion[]> {
    const suggestions: ErrorSuggestion[] = [];
    
    suggestions.push({
      type: 'hint',
      message: `Multiple versions of ${type} '${name}' found:`
    });
    
    // Sort conflicts by precedence
    const sorted = conflicts.sort((a, b) => {
      const order = { project: 3, global: 2, builtin: 1 };
      return order[b.source] - order[a.source];
    });
    
    for (let i = 0; i < sorted.length; i++) {
      const { source } = sorted[i];
      const isActive = i === 0;
      const status = isActive ? ' (active)' : ' (overridden)';
      
      suggestions.push({
        type: 'hint',
        message: `  ${this.getSourceIcon(source)} [${source}]${status}`
      });
    }
    
    suggestions.push({
      type: 'command',
      message: 'View all conflicts',
      action: 'zcc list --conflicts'
    });
    
    return suggestions;
  }

  /**
   * Handle file system errors
   */
  handleFileSystemError(error: any, operation: string): ErrorSuggestion[] {
    const suggestions: ErrorSuggestion[] = [];
    
    if (error.code === 'ENOENT') {
      suggestions.push({
        type: 'hint',
        message: `File or directory not found during ${operation}.`
      });
      suggestions.push({
        type: 'hint',
        message: 'Check if zcc is properly initialized.'
      });
      suggestions.push({
        type: 'command',
        message: 'Reinitialize zcc',
        action: 'zcc init --force'
      });
    } else if (error.code === 'EACCES') {
      suggestions.push({
        type: 'hint',
        message: `Permission denied during ${operation}.`
      });
      suggestions.push({
        type: 'hint',
        message: 'Check file and directory permissions.'
      });
    } else if (error.code === 'ENOSPC') {
      suggestions.push({
        type: 'hint',
        message: `Not enough disk space for ${operation}.`
      });
    } else {
      suggestions.push({
        type: 'hint',
        message: `File system error during ${operation}: ${error.message}`
      });
    }
    
    return suggestions;
  }

  /**
   * Display error suggestions to the user
   */
  displaySuggestions(suggestions: ErrorSuggestion[]): void {
    if (suggestions.length === 0) return;
    
    logger.info('');
    
    for (const suggestion of suggestions) {
      switch (suggestion.type) {
        case 'command':
          if (suggestion.action) {
            logger.info(`  ${chalk.green(suggestion.action)} ${chalk.dim('# ' + suggestion.message)}`);
          } else {
            logger.info(`  ${chalk.cyan('•')} ${suggestion.message}`);
          }
          break;
          
        case 'suggestion':
          logger.info(`${chalk.yellow('💡')} ${suggestion.message}`);
          break;
          
        case 'hint':
          logger.info(`   ${chalk.dim(suggestion.message)}`);
          break;
          
        case 'install':
          if (suggestion.action) {
            logger.info(`  ${chalk.green(suggestion.action)} ${chalk.dim('# ' + suggestion.message)}`);
          } else {
            logger.info(`  ${chalk.cyan('📦')} ${suggestion.message}`);
          }
          break;
      }
    }
  }

  /**
   * Get contextual action for different scenarios
   */
  private getContextualAction(
    context: 'search' | 'add' | 'use',
    type: ComponentInfo['type'],
    name: string
  ): string {
    switch (context) {
      case 'add':
        return `zcc add ${type} ${name}`;
      case 'use':
        if (type === 'mode') {
          return `/mode ${name}`;
        }
        return `zcc list --type ${type}`;
      case 'search':
      default:
        return `zcc list --type ${type}`;
    }
  }

  /**
   * Calculate string similarity (simple Jaccard similarity)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.toLowerCase().split(''));
    const set2 = new Set(str2.toLowerCase().split(''));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * Get icon for different component sources
   */
  private getSourceIcon(source: string): string {
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
}