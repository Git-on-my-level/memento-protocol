import { Hook } from './Hook';
import { HookContext } from './types';

export class PostToolUseHook extends Hook {
  shouldRun(context: HookContext): boolean {
    if (!context.tool) {
      return false;
    }

    // If no matcher configured, run for all tools
    if (!this.config.matcher) {
      return true;
    }

    // Tool-specific matching
    if (this.config.matcher.type === 'tool') {
      const tools = this.config.matcher.pattern.split(',').map(t => t.trim());
      return tools.includes(context.tool);
    }

    // Regex matching on tool name
    if (this.config.matcher.type === 'regex') {
      try {
        const regex = new RegExp(this.config.matcher.pattern, 'i');
        return regex.test(context.tool);
      } catch {
        return false;
      }
    }

    return true;
  }
}