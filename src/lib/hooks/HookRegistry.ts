import { Hook } from './Hook';
import { HookConfig, HookContext, HookEvent, HookResult } from './types';
import { UserPromptSubmitHook } from './UserPromptSubmitHook';
import { PreToolUseHook } from './PreToolUseHook';
import { PostToolUseHook } from './PostToolUseHook';
import { SessionStartHook } from './SessionStartHook';
import { NotificationHook } from './NotificationHook';
import { logger } from '../logger';

export interface HookFactoryDefinition {
  event: HookEvent;
  factory: typeof Hook;
  description?: string;
}

export class HookRegistry {
  private hooks: Map<HookEvent, Hook[]> = new Map();
  private hookFactories: Map<HookEvent, typeof Hook> = new Map();
  private factoryDefinitions: Map<HookEvent, HookFactoryDefinition> = new Map();

  constructor() {
    // Register default hook factories
    this.registerDefaultFactories();
  }

  /**
   * Register default hook factories
   */
  private registerDefaultFactories(): void {
    this.registerHookFactory('UserPromptSubmit', UserPromptSubmitHook, 'Handles user prompt submission events');
    this.registerHookFactory('PreToolUse', PreToolUseHook, 'Executes before tool usage');
    this.registerHookFactory('PostToolUse', PostToolUseHook, 'Executes after tool usage');
    this.registerHookFactory('SessionStart', SessionStartHook, 'Handles session start events');
    this.registerHookFactory('Notification', NotificationHook, 'Handles notification events');
    // Stop, SubagentStop, PreCompact can use base Hook class
  }

  /**
   * Register a hook factory for a specific event type
   * Now supports dynamic registration at runtime
   */
  registerHookFactory(event: HookEvent, hookClass: typeof Hook, description?: string): void {
    this.hookFactories.set(event, hookClass);
    this.factoryDefinitions.set(event, {
      event,
      factory: hookClass,
      description
    });
  }

  /**
   * Load hook factories from configuration
   * Enables dynamic hook loading from plugins or config files
   */
  async loadFactoriesFromConfig(factories: HookFactoryDefinition[]): Promise<void> {
    for (const factoryDef of factories) {
      // In a real implementation, this could dynamically import modules
      // For now, we just register the provided factories
      this.registerHookFactory(factoryDef.event, factoryDef.factory, factoryDef.description);
    }
  }

  /**
   * Get all registered factory definitions
   */
  getFactoryDefinitions(): HookFactoryDefinition[] {
    return Array.from(this.factoryDefinitions.values());
  }

  /**
   * Check if a factory is registered for an event
   */
  hasFactory(event: HookEvent): boolean {
    return this.hookFactories.has(event);
  }

  /**
   * Add a hook configuration
   * Now uses factory registry for dynamic hook creation
   */
  addHook(config: HookConfig): void {
    // Use registered factory or fall back to base Hook class
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