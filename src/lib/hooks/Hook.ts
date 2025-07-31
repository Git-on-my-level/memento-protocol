import { spawn } from 'child_process';
import { HookConfig, HookContext, HookResult } from './types';
import { logger } from '../logger';

export abstract class Hook {
  public readonly config: HookConfig;

  constructor(config: HookConfig) {
    this.config = config;
  }

  get id(): string {
    return this.config.id;
  }

  get name(): string {
    return this.config.name;
  }

  get event(): string {
    return this.config.event;
  }

  get enabled(): boolean {
    return this.config.enabled;
  }

  get priority(): number {
    return this.config.priority || 0;
  }

  /**
   * Check if this hook should run for the given context
   */
  abstract shouldRun(context: HookContext): boolean;

  /**
   * Execute the hook command
   */
  async execute(context: HookContext): Promise<HookResult> {
    if (!this.shouldRun(context)) {
      return { success: true };
    }

    const startTime = Date.now();
    logger.debug(`Executing hook: ${this.name} (${this.id})`);

    try {
      const result = await this.runCommand(context);
      const duration = Date.now() - startTime;

      logger.debug(`Hook ${this.name} completed in ${duration}ms`);
      
      return {
        ...result,
        duration,
        success: result.exitCode === 0 || (result.exitCode === 2 && result.shouldBlock === true)
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`Hook ${this.name} failed: ${error.message}`);
      
      if (this.config.continueOnError) {
        return {
          success: false,
          error: error.message,
          duration
        };
      }
      
      throw error;
    }
  }

  /**
   * Run the actual command
   */
  protected async runCommand(context: HookContext): Promise<HookResult> {
    return new Promise((resolve) => {
      const env = {
        ...process.env,
        ...this.config.env,
        HOOK_EVENT: context.event,
        HOOK_PROJECT_ROOT: context.projectRoot,
        HOOK_TIMESTAMP: context.timestamp.toString(),
        ...(context.sessionId && { HOOK_SESSION_ID: context.sessionId }),
        ...(context.tool && { HOOK_TOOL: context.tool })
      };

      const child = spawn(this.config.command, this.config.args || [], {
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

      // Handle timeout
      const timeout = this.config.timeout || 30000;
      const timer = setTimeout(() => {
        child.kill();
        resolve({
          success: false,
          error: 'Hook timeout',
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