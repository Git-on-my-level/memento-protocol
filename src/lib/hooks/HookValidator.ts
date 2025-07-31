import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { HookConfig, HookContext, HookResult } from './types';
import { logger } from '../logger';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class HookValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'HookValidationError';
  }
}

export class HookValidator {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Validate a hook script for common errors
   */
  validateScript(script: string): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Check for empty script
    if (!script || script.trim().length === 0) {
      result.valid = false;
      result.errors.push('Script cannot be empty');
      return result;
    }

    // Check for potentially dangerous commands
    const dangerousPatterns = [
      /\brm\s+-rf\s+\//, // rm -rf /
      /\bchmod\s+777/, // chmod 777
      /\bsudo\s+/, // sudo commands
      /\bsu\s+/, // su commands
      /\bdoas\s+/, // doas commands
      />\s*\/dev\/s[dr]\w+/, // redirect to system devices
      /\|\s*sh\s*$/, // pipe to sh at end of line
      /curl\s+[^|]*\|\s*sh/, // curl | sh pattern
      /wget\s+[^|]*\|\s*sh/, // wget | sh pattern
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(script)) {
        result.warnings.push(`Potentially dangerous pattern detected: ${pattern.source}`);
      }
    }

    // Check for basic shell syntax issues
    if (script.includes('#!/bin/bash')) {
      // Check for common bash issues
      if (script.includes('[ ') && !script.includes(' ]')) {
        result.errors.push('Unmatched bracket in conditional statement');
        result.valid = false;
      }
      
      // Check for unescaped variables in double quotes
      const variablePattern = /"\$\{?[A-Za-z_][A-Za-z0-9_]*\}?[^"]*"/g;
      const matches = script.match(variablePattern);
      if (matches) {
        for (const match of matches) {
          if (match.includes(' ') && !match.includes('\\')) {
            result.warnings.push(`Variable expansion in quoted string may cause issues: ${match}`);
          }
        }
      }
    }

    // Check for required shebang
    if (!script.startsWith('#!')) {
      result.warnings.push('Script should start with a shebang (e.g., #!/bin/bash)');
    }

    // Check for exit codes
    if (!script.includes('exit ') && !script.includes('return ')) {
      result.warnings.push('Script should explicitly exit with a status code');
    }

    return result;
  }

  /**
   * Validate that required dependencies are available
   */
  async validateDependencies(hook: HookConfig): Promise<string[]> {
    const missingDependencies: string[] = [];
    
    // Extract requirements from hook config
    const requirements = hook.requirements;
    if (!requirements) {
      return missingDependencies;
    }

    // Check required commands
    if (requirements.commands) {
      for (const command of requirements.commands) {
        const isAvailable = await this.checkCommandAvailable(command);
        if (!isAvailable) {
          missingDependencies.push(`Command not found: ${command}`);
        }
      }
    }

    // Check required environment variables
    if (requirements.env) {
      for (const envVar of requirements.env) {
        if (!process.env[envVar]) {
          missingDependencies.push(`Environment variable not set: ${envVar}`);
        }
      }
    }

    // Check required files/paths
    if (requirements.files) {
      for (const filePath of requirements.files) {
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.projectRoot, filePath);
        try {
          await fs.access(fullPath);
        } catch {
          missingDependencies.push(`Required file not found: ${filePath}`);
        }
      }
    }

    return missingDependencies;
  }

  /**
   * Test a hook with sample input (dry run)
   */
  async testHook(hook: HookConfig, testInput: string = ''): Promise<HookResult> {
    logger.debug(`Testing hook: ${hook.name} (${hook.id})`);

    const context: HookContext = {
      event: hook.event,
      projectRoot: this.projectRoot,
      prompt: testInput,
      timestamp: Date.now(),
      sessionId: 'test-session'
    };

    try {
      const result = await this.executeHookDryRun(hook, context);
      logger.debug(`Hook test completed: ${hook.name} - Success: ${result.success}`);
      return result;
    } catch (error: any) {
      logger.error(`Hook test failed: ${hook.name} - ${error.message}`);
      return {
        success: false,
        error: error.message,
        exitCode: -1
      };
    }
  }

  /**
   * Validate the overall hook configuration
   */
  validateHookConfig(hook: HookConfig): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Required fields
    if (!hook.id || hook.id.trim().length === 0) {
      result.errors.push('Hook ID is required');
      result.valid = false;
    }

    if (!hook.name || hook.name.trim().length === 0) {
      result.errors.push('Hook name is required');
      result.valid = false;
    }

    if (!hook.command || hook.command.trim().length === 0) {
      result.errors.push('Hook command is required');
      result.valid = false;
    }

    if (!hook.event) {
      result.errors.push('Hook event is required');
      result.valid = false;
    }

    // Validate event type
    const validEvents = ['UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'SessionStart', 'Stop', 'SubagentStop', 'PreCompact', 'Notification'];
    if (hook.event && !validEvents.includes(hook.event)) {
      result.errors.push(`Invalid event type: ${hook.event}. Valid events: ${validEvents.join(', ')}`);
      result.valid = false;
    }

    // Validate priority
    if (hook.priority !== undefined && (hook.priority < 0 || hook.priority > 1000)) {
      result.warnings.push('Priority should be between 0 and 1000');
    }

    // Validate timeout
    if (hook.timeout !== undefined && hook.timeout <= 0) {
      result.errors.push('Timeout must be a positive number');
      result.valid = false;
    }

    // Validate matcher
    if (hook.matcher) {
      // For PreToolUse and PostToolUse events, Claude Code expects tool names as strings
      if ((hook.event === 'PreToolUse' || hook.event === 'PostToolUse') && 
          hook.matcher.type === 'tool' && hook.matcher.pattern) {
        // This is valid - Claude Code will use the pattern as the tool name
      } else {
        const validMatcherTypes = ['regex', 'exact', 'fuzzy', 'tool', 'keyword'];
        if (!validMatcherTypes.includes(hook.matcher.type)) {
          result.errors.push(`Invalid matcher type: ${hook.matcher.type}. Valid types: ${validMatcherTypes.join(', ')}`);
          result.valid = false;
        }

        if (!hook.matcher.pattern || hook.matcher.pattern.trim().length === 0) {
          result.errors.push('Matcher pattern is required when matcher is specified');
          result.valid = false;
        }

        // Validate regex pattern
        if (hook.matcher.type === 'regex') {
          try {
            new RegExp(hook.matcher.pattern);
          } catch (error) {
            result.errors.push(`Invalid regex pattern: ${hook.matcher.pattern}`);
            result.valid = false;
          }
        }
      }
    }

    return result;
  }

  /**
   * Check if a command is available in the system
   */
  private async checkCommandAvailable(command: string): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn('which', [command], {
        stdio: 'ignore',
        shell: true
      });

      child.on('close', (code) => {
        resolve(code === 0);
      });

      child.on('error', () => {
        resolve(false);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        child.kill();
        resolve(false);
      }, 5000);
    });
  }

  /**
   * Execute a hook in dry-run mode for testing
   */
  private async executeHookDryRun(hook: HookConfig, context: HookContext): Promise<HookResult> {
    return new Promise((resolve) => {
      const env = {
        ...process.env,
        ...hook.env,
        HOOK_EVENT: context.event,
        HOOK_PROJECT_ROOT: context.projectRoot,
        HOOK_TIMESTAMP: context.timestamp.toString(),
        HOOK_DRY_RUN: 'true', // Indicate this is a dry run
        ...(context.sessionId && { HOOK_SESSION_ID: context.sessionId }),
        ...(context.tool && { HOOK_TOOL: context.tool })
      };

      const child = spawn(hook.command, hook.args || [], {
        env,
        cwd: context.projectRoot,
        shell: true
      });

      let stdout = '';
      let stderr = '';

      // Send input if needed
      if (context.prompt) {
        child.stdin.write(context.prompt);
        child.stdin.end();
      }

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle timeout (shorter for testing)
      const timeout = Math.min(hook.timeout || 10000, 10000);
      const timer = setTimeout(() => {
        child.kill();
        resolve({
          success: false,
          error: 'Hook test timeout',
          exitCode: -1
        });
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        
        const result: HookResult = {
          success: code === 0,
          output: stdout,
          error: stderr,
          exitCode: code || 0
        };

        // Handle blocking hooks (exit code 2)
        if (code === 2) {
          result.shouldBlock = true;
        }

        // For UserPromptSubmit hooks, check if prompt was modified
        if (context.event === 'UserPromptSubmit' && stdout) {
          result.modifiedPrompt = stdout;
        }

        resolve(result);
      });
    });
  }
}