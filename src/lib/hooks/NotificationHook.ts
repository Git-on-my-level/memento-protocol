import { Hook } from './Hook';
import { HookContext } from './types';

export class NotificationHook extends Hook {
  shouldRun(context: HookContext): boolean {
    // Notification hooks can match on specific notification types
    if (!this.config.matcher) {
      return true;
    }

    // For now, always run notification hooks
    // In the future, we could match on notification content
    return true;
  }
}