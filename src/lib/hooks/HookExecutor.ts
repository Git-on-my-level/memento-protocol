import { ScriptExecutor, ScriptContext, ScriptResult } from '../ScriptExecutor';
import { HookConfig, HookContext, HookResult } from './types';
import { logger } from '../logger';
import * as path from 'path';

/**
 * Executes hooks using the ScriptExecutor for proper script context management.
 * This ensures hooks run with correct working directories and environment variables.
 */
export class HookExecutor {
  private scriptExecutor: ScriptExecutor;
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.scriptExecutor = new ScriptExecutor(projectRoot);
  }

  /**
   * Execute a hook using the ScriptExecutor
   */
  async executeHook(config: HookConfig, context: HookContext): Promise<HookResult> {
    const startTime = Date.now();
    logger.debug(`Executing hook: ${config.name} (${config.id})`);

    try {
      // Determine script source based on command path
      const scriptSource = this.determineScriptSource(config.command);
      
      // Create script context
      const scriptContext = this.createScriptContext(config, context, scriptSource);
      
      // Execute the script
      const scriptResult = await this.scriptExecutor.execute(
        {
          name: config.id,
          path: scriptContext.scriptPath,
          metadata: { hookConfig: config }
        },
        scriptContext,
        {
          timeout: config.timeout || 30000
        }
      );

      // Convert ScriptResult to HookResult
      const hookResult = this.convertScriptResultToHookResult(scriptResult, context);
      
      const duration = Date.now() - startTime;
      logger.debug(`Hook ${config.name} completed in ${duration}ms`);
      
      return {
        ...hookResult,
        duration
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`Hook ${config.name} failed: ${error.message}`);
      
      if (config.continueOnError) {
        return {
          success: false,
          error: error.message,
          duration,
          exitCode: -1
        };
      }
      
      throw error;
    }
  }

  /**
   * Determine the script source based on the command path
   */
  private determineScriptSource(command: string): 'global' | 'project' | 'builtin' {
    const absolutePath = path.isAbsolute(command) ? command : path.join(this.projectRoot, command);
    
    // Check if it's in a .memento directory
    if (absolutePath.includes('.memento')) {
      // Check if it's in the global .memento directory
      const globalMementoPath = path.join(require('os').homedir(), '.memento');
      if (absolutePath.startsWith(globalMementoPath)) {
        return 'global';
      }
      // Otherwise assume it's project-level
      return 'project';
    }
    
    // For other paths, consider them builtin
    return 'builtin';
  }

  /**
   * Create script context from hook config and context
   */
  private createScriptContext(
    config: HookConfig, 
    context: HookContext, 
    source: 'global' | 'project' | 'builtin'
  ): ScriptContext {
    // Resolve script path
    const scriptPath = path.isAbsolute(config.command) 
      ? config.command 
      : path.join(this.projectRoot, config.command);

    // Prepare environment variables
    const env: Record<string, string> = {
      // Existing hook environment variables
      HOOK_EVENT: context.event,
      HOOK_PROJECT_ROOT: context.projectRoot,
      HOOK_TIMESTAMP: context.timestamp.toString(),
      
      // Add optional context variables
      ...(context.sessionId && { HOOK_SESSION_ID: context.sessionId }),
      ...(context.tool && { HOOK_TOOL: context.tool }),
      ...(context.toolArgs && { HOOK_TOOL_ARGS: JSON.stringify(context.toolArgs) }),
      
      // Add hook-specific environment variables
      HOOK_ID: config.id,
      HOOK_NAME: config.name,
      HOOK_ENABLED: config.enabled.toString(),
      HOOK_PRIORITY: (config.priority || 0).toString(),
      
      // Add user-defined environment variables
      ...config.env,
    };

    // Add arguments as environment variables if provided
    if (config.args && config.args.length > 0) {
      env.HOOK_ARGS = config.args.join(' ');
      config.args.forEach((arg, index) => {
        env[`HOOK_ARG_${index}`] = arg;
      });
    }

    // Add prompt as stdin-like environment variable if present
    if (context.prompt) {
      env.HOOK_PROMPT = context.prompt;
    }

    return {
      source,
      scriptPath,
      workingDirectory: context.projectRoot, // Always execute in project root
      env
    };
  }

  /**
   * Convert ScriptResult to HookResult
   */
  private convertScriptResultToHookResult(scriptResult: ScriptResult, context: HookContext): HookResult {
    const hookResult: HookResult = {
      success: scriptResult.success,
      output: scriptResult.stdout,
      error: scriptResult.stderr,
      exitCode: scriptResult.exitCode
    };

    // Handle blocking hooks (exit code 2)
    if (scriptResult.exitCode === 2) {
      hookResult.shouldBlock = true;
      hookResult.success = true; // Blocking is a valid outcome
    }

    // For UserPromptSubmit hooks, check if prompt was modified
    if (context.event === 'UserPromptSubmit' && scriptResult.stdout.trim()) {
      hookResult.modifiedPrompt = scriptResult.stdout.trim();
    }

    // Add error details if script failed
    if (!scriptResult.success && scriptResult.error) {
      hookResult.error = scriptResult.error;
    }

    return hookResult;
  }

  /**
   * Test hook execution with dry run
   */
  async testHook(config: HookConfig, testInput: string = 'test'): Promise<HookResult> {
    const testContext: HookContext = {
      event: config.event,
      projectRoot: this.projectRoot,
      prompt: testInput,
      timestamp: Date.now()
    };

    return this.executeHook(config, testContext);
  }

  /**
   * Get the underlying script executor for advanced operations
   */
  getScriptExecutor(): ScriptExecutor {
    return this.scriptExecutor;
  }
}