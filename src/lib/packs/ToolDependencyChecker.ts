/**
 * ToolDependencyChecker handles checking and prompting for tool dependencies
 * Specifically designed for tools like ast-grep that enhance pack functionality
 */

import { logger } from "../logger";
import { ZccError } from "../errors";
import { execSync } from "child_process";

export interface ToolDependency {
  readonly name: string;
  readonly version?: string;
  readonly required: boolean;
  readonly installCommand?: string;
  readonly description?: string;
  readonly checkCommands?: readonly string[];
}

export interface ToolCheckResult {
  readonly available: boolean;
  readonly version?: string;
  readonly installMethod?: string;
  readonly needsInstallation: boolean;
}

export interface ToolDependencyResult {
  readonly tool: ToolDependency;
  readonly result: ToolCheckResult;
  readonly shouldPrompt: boolean;
}

export class ToolDependencyChecker {
  private readonly supportedTools: Map<string, (tool: ToolDependency) => Promise<ToolCheckResult>>;

  constructor() {
    this.supportedTools = new Map();
    this.registerToolCheckers();
  }

  /**
   * Register built-in tool checkers
   */
  private registerToolCheckers(): void {
    this.supportedTools.set('@ast-grep/cli', this.checkAstGrep.bind(this));
    this.supportedTools.set('ast-grep', this.checkAstGrep.bind(this));
    this.supportedTools.set('ripgrep', this.checkRipgrep.bind(this));
    this.supportedTools.set('rg', this.checkRipgrep.bind(this));
  }

  /**
   * Check all tool dependencies for a pack
   */
  async checkToolDependencies(
    dependencies: ToolDependency[],
    options: { interactive?: boolean } = {}
  ): Promise<ToolDependencyResult[]> {
    if (!dependencies || dependencies.length === 0) {
      return [];
    }

    const results: ToolDependencyResult[] = [];

    for (const tool of dependencies) {
      const checker = this.supportedTools.get(tool.name);
      
      if (!checker) {
        logger.debug(`No checker available for tool: ${tool.name}`);
        results.push({
          tool,
          result: {
            available: false,
            needsInstallation: tool.required,
          },
          shouldPrompt: false,
        });
        continue;
      }

      try {
        const result = await checker(tool);
        const shouldPrompt = this.shouldPromptInstallation(tool, result, options);
        
        results.push({ tool, result, shouldPrompt });

        if (result.available) {
          logger.debug(`✅ Tool ${tool.name} is available${result.version ? ` (${result.version})` : ''}`);
        } else if (tool.required) {
          logger.warn(`⚠️  Required tool ${tool.name} is not available`);
        } else {
          logger.debug(`ℹ️  Optional tool ${tool.name} is not available`);
        }
      } catch (error) {
        logger.debug(`Error checking tool ${tool.name}: ${error}`);
        results.push({
          tool,
          result: {
            available: false,
            needsInstallation: tool.required,
          },
          shouldPrompt: false,
        });
      }
    }

    return results;
  }

  /**
   * Generate installation summary and prompts
   */
  generateInstallationGuidance(results: ToolDependencyResult[]): {
    required: ToolDependencyResult[];
    optional: ToolDependencyResult[];
    installationSteps: string[];
    warningMessage?: string;
  } {
    const required = results.filter(r => r.tool.required && !r.result.available);
    const optional = results.filter(r => !r.tool.required && r.shouldPrompt);
    
    const installationSteps: string[] = [];
    
    // Required tools
    for (const { tool } of required) {
      if (tool.installCommand) {
        installationSteps.push(`# Install required tool: ${tool.name}`);
        installationSteps.push(tool.installCommand);
        if (tool.description) {
          installationSteps.push(`# ${tool.description}`);
        }
        installationSteps.push('');
      }
    }

    // Optional tools  
    for (const { tool } of optional) {
      if (tool.installCommand) {
        installationSteps.push(`# Install optional tool: ${tool.name} (recommended)`);
        installationSteps.push(tool.installCommand);
        if (tool.description) {
          installationSteps.push(`# ${tool.description}`);
        }
        installationSteps.push('');
      }
    }

    let warningMessage: string | undefined;
    if (required.length > 0) {
      warningMessage = `This pack requires ${required.length} tool${required.length > 1 ? 's' : ''} that ${required.length > 1 ? 'are' : 'is'} not installed: ${required.map(r => r.tool.name).join(', ')}`;
    } else if (optional.length > 0) {
      warningMessage = `This pack can benefit from ${optional.length} optional tool${optional.length > 1 ? 's' : ''}: ${optional.map(r => r.tool.name).join(', ')}`;
    }

    return {
      required,
      optional,
      installationSteps,
      warningMessage,
    };
  }

  /**
   * Check if we should prompt for tool installation
   */
  private shouldPromptInstallation(
    tool: ToolDependency,
    result: ToolCheckResult,
    options: { interactive?: boolean }
  ): boolean {
    if (result.available) return false;
    if (!options.interactive) return true; // Show info but don't prompt
    return !tool.required; // Prompt for optional tools only
  }

  /**
   * Check ast-grep availability
   */
  private async checkAstGrep(_tool: ToolDependency): Promise<ToolCheckResult> {
    const checks = [
      () => this.checkCommand('ast-grep --version'),
      () => this.checkCommand('npx --no-install @ast-grep/cli --version'),
      () => this.checkNodeModule('@ast-grep/cli'),
    ];

    for (const [index, check] of checks.entries()) {
      try {
        const version = await check();
        const installMethods = ['global', 'npx', 'local'];
        return {
          available: true,
          version,
          installMethod: installMethods[index],
          needsInstallation: false,
        };
      } catch {
        // Continue to next check
      }
    }

    return {
      available: false,
      needsInstallation: true,
    };
  }

  /**
   * Check ripgrep availability
   */
  private async checkRipgrep(_tool: ToolDependency): Promise<ToolCheckResult> {
    try {
      const version = await this.checkCommand('rg --version');
      return {
        available: true,
        version,
        installMethod: 'system',
        needsInstallation: false,
      };
    } catch {
      return {
        available: false,
        needsInstallation: true,
      };
    }
  }

  /**
   * Check if a command is available and get its version
   */
  private async checkCommand(command: string): Promise<string> {
    try {
      const output = execSync(command, { 
        encoding: 'utf-8', 
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 5000 
      });
      
      // Extract version from output (first line, first version-like string)
      const match = output.match(/(\d+\.\d+\.\d+[^\s]*)/);
      return match ? match[1] : output.trim().split('\n')[0];
    } catch (error) {
      throw new ZccError(
        `Command '${command}' not available`,
        'TOOL_CHECK_ERROR',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Check if a Node.js module is available locally
   */
  private async checkNodeModule(moduleName: string): Promise<string> {
    try {
      const packagePath = require.resolve(`${moduleName}/package.json`);
      const packageJson = require(packagePath);
      return packageJson.version || 'unknown';
    } catch {
      throw new ZccError(
        `Node module '${moduleName}' not available`,
        'MODULE_CHECK_ERROR'
      );
    }
  }
}