import { Hook } from './Hook';
import { HookConfig, HookContext, HookEvent, HookResult } from './types';
import { UserPromptSubmitHook } from './UserPromptSubmitHook';
import { PreToolUseHook } from './PreToolUseHook';
import { PostToolUseHook } from './PostToolUseHook';
import { SessionStartHook } from './SessionStartHook';
import { NotificationHook } from './NotificationHook';
import { logger } from '../logger';

export class HookRegistry {
  private hooks: Map<HookEvent, Hook[]> = new Map();
  private hookFactories: Map<HookEvent, typeof Hook> = new Map();

  constructor() {
    // Register hook factories
    this.registerHookFactory('UserPromptSubmit', UserPromptSubmitHook);
    this.registerHookFactory('PreToolUse', PreToolUseHook);
    this.registerHookFactory('PostToolUse', PostToolUseHook);
    this.registerHookFactory('SessionStart', SessionStartHook);
    this.registerHookFactory('Notification', NotificationHook);
    // Stop, SubagentStop, PreCompact can use base Hook class
  }

  /**
   * Register a hook factory for a specific event type
   */
  registerHookFactory(event: HookEvent, hookClass: typeof Hook): void {
    this.hookFactories.set(event, hookClass);
  }

  /**
   * Add a hook configuration
   */
  addHook(config: HookConfig): void {
    const HookClass = this.hookFactories.get(config.event) || Hook;
    const hook = new (HookClass as any)(config);
    
    const eventHooks = this.hooks.get(config.event) || [];
    eventHooks.push(hook);
    
    // Sort by priority (higher priority first)
    eventHooks.sort((a, b) => b.priority - a.priority);
    
    this.hooks.set(config.event, eventHooks);
    logger.debug(`Registered hook: ${config.name} for event: ${config.event}`);
  }

  /**
   * Remove a hook by ID
   */
  removeHook(id: string): boolean {
    for (const [, hooks] of this.hooks.entries()) {
      const index = hooks.findIndex(h => h.id === id);
      if (index !== -1) {
        hooks.splice(index, 1);
        logger.debug(`Removed hook: ${id}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Get all hooks for an event
   */
  getHooksForEvent(event: HookEvent): Hook[] {
    return this.hooks.get(event) || [];
  }

  /**
   * Execute all hooks for an event
   */
  async executeHooks(event: HookEvent, context: HookContext): Promise<HookResult[]> {
    const hooks = this.getHooksForEvent(event);
    const results: HookResult[] = [];

    for (const hook of hooks) {
      if (!hook.enabled) {
        continue;
      }

      try {
        const result = await hook.execute(context);
        results.push(result);

        // If hook blocks execution, stop processing
        if (result.shouldBlock) {
          logger.warn(`Hook ${hook.name} blocked execution`);
          break;
        }

        // For UserPromptSubmit, update context with modified prompt
        if (event === 'UserPromptSubmit' && result.modifiedPrompt) {
          context.prompt = result.modifiedPrompt;
        }
      } catch (error: any) {
        logger.error(`Hook ${hook.name} failed: ${error.message}`);
        results.push({
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Load hooks from configuration
   */
  loadHooks(configs: HookConfig[]): void {
    for (const config of configs) {
      this.addHook(config);
    }
  }

  /**
   * Clear all hooks
   */
  clear(): void {
    this.hooks.clear();
  }

  /**
   * Get all registered hooks
   */
  getAllHooks(): { event: HookEvent; hooks: Hook[] }[] {
    const result: { event: HookEvent; hooks: Hook[] }[] = [];
    
    for (const [event, hooks] of this.hooks.entries()) {
      result.push({ event, hooks });
    }
    
    return result;
  }
}