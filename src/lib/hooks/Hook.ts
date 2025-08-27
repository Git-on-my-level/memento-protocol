import { HookConfig, HookContext, HookResult } from './types';
import { HookExecutor } from './HookExecutor';

export abstract class Hook {
  public readonly config: HookConfig;
  protected hookExecutor: HookExecutor;

  constructor(config: HookConfig, projectRoot?: string) {
    this.config = config;
    // If no projectRoot provided, try to get it from context during execution
    this.hookExecutor = new HookExecutor(projectRoot || process.cwd());
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

    // Update hook executor if project root changed
    if (context.projectRoot !== this.hookExecutor.getScriptExecutor()['projectRoot']) {
      this.hookExecutor = new HookExecutor(context.projectRoot);
    }

    return await this.hookExecutor.executeHook(this.config, context);
  }

}