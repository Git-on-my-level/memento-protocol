import { Hook } from './Hook';
import { HookContext, HookResult } from './types';
import { HookExecutor } from './HookExecutor';

export class SessionStartHook extends Hook {
  shouldRun(_context: HookContext): boolean {
    // SessionStart hooks always run unless disabled
    return true;
  }

  async execute(context: HookContext): Promise<HookResult> {
    if (!this.shouldRun(context)) {
      return { success: true };
    }

    // SessionStart hooks don't receive prompt input
    const modifiedContext = { ...context, prompt: undefined };

    // Update hook executor if project root changed
    if (context.projectRoot !== this.hookExecutor.getScriptExecutor()['projectRoot']) {
      this.hookExecutor = new HookExecutor(context.projectRoot);
    }

    return await this.hookExecutor.executeHook(this.config, modifiedContext);
  }
}