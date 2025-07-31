import { Hook } from './Hook';
import { HookContext } from './types';

export class SessionStartHook extends Hook {
  shouldRun(_context: HookContext): boolean {
    // SessionStart hooks always run unless disabled
    return true;
  }

  protected async runCommand(context: HookContext): Promise<any> {
    // SessionStart hooks don't receive prompt input
    const modifiedContext = { ...context, prompt: undefined };
    return super.runCommand(modifiedContext);
  }
}