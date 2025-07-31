import { HookRegistry } from '../HookRegistry';
import { HookConfig, HookContext } from '../types';

// Mock the Hook implementations to avoid actual command execution
jest.mock('../SessionStartHook', () => ({
  SessionStartHook: class {
    config: any;
    constructor(config: any) {
      this.config = config;
    }
    get id() { return this.config.id; }
    get name() { return this.config.name; }
    get event() { return this.config.event; }
    get enabled() { return this.config.enabled; }
    get priority() { return this.config.priority || 0; }
    async execute() {
      return { success: true, output: 'mocked' };
    }
  }
}));

jest.mock('../UserPromptSubmitHook', () => ({
  UserPromptSubmitHook: class {
    config: any;
    constructor(config: any) {
      this.config = config;
    }
    get id() { return this.config.id; }
    get name() { return this.config.name; }
    get event() { return this.config.event; }
    get enabled() { return this.config.enabled; }
    get priority() { return this.config.priority || 0; }
    async execute() {
      if (this.config.command === 'exit 2') {
        return { success: false, exitCode: 2, shouldBlock: true };
      }
      return { success: true, output: 'mocked' };
    }
  }
}));

describe('HookRegistry', () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  describe('addHook', () => {
    it('should add a hook to the registry', () => {
      const config: HookConfig = {
        id: 'test-hook',
        name: 'Test Hook',
        event: 'UserPromptSubmit',
        enabled: true,
        command: 'echo test'
      };

      registry.addHook(config);
      
      const hooks = registry.getHooksForEvent('UserPromptSubmit');
      expect(hooks).toHaveLength(1);
      expect(hooks[0].id).toBe('test-hook');
    });

    it('should sort hooks by priority', () => {
      const lowPriority: HookConfig = {
        id: 'low',
        name: 'Low Priority',
        event: 'UserPromptSubmit',
        enabled: true,
        command: 'echo low',
        priority: 10
      };

      const highPriority: HookConfig = {
        id: 'high',
        name: 'High Priority',
        event: 'UserPromptSubmit',
        enabled: true,
        command: 'echo high',
        priority: 100
      };

      registry.addHook(lowPriority);
      registry.addHook(highPriority);

      const hooks = registry.getHooksForEvent('UserPromptSubmit');
      expect(hooks[0].id).toBe('high');
      expect(hooks[1].id).toBe('low');
    });
  });

  describe('removeHook', () => {
    it('should remove a hook by ID', () => {
      const config: HookConfig = {
        id: 'test-hook',
        name: 'Test Hook',
        event: 'UserPromptSubmit',
        enabled: true,
        command: 'echo test'
      };

      registry.addHook(config);
      const removed = registry.removeHook('test-hook');

      expect(removed).toBe(true);
      expect(registry.getHooksForEvent('UserPromptSubmit')).toHaveLength(0);
    });

    it('should return false when hook not found', () => {
      const removed = registry.removeHook('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('executeHooks', () => {
    it('should execute enabled hooks only', async () => {
      const enabledHook: HookConfig = {
        id: 'enabled',
        name: 'Enabled Hook',
        event: 'SessionStart',
        enabled: true,
        command: 'echo enabled'
      };

      const disabledHook: HookConfig = {
        id: 'disabled',
        name: 'Disabled Hook',
        event: 'SessionStart',
        enabled: false,
        command: 'echo disabled'
      };

      registry.addHook(enabledHook);
      registry.addHook(disabledHook);

      const context: HookContext = {
        event: 'SessionStart',
        projectRoot: '/test',
        timestamp: Date.now()
      };

      const results = await registry.executeHooks('SessionStart', context);
      
      // Only the enabled hook should have been executed
      expect(results).toHaveLength(1);
    });

    it('should stop execution when hook blocks', async () => {
      const blockingHook: HookConfig = {
        id: 'blocker',
        name: 'Blocking Hook',
        event: 'UserPromptSubmit',
        enabled: true,
        command: 'exit 2',
        priority: 100
      };

      const normalHook: HookConfig = {
        id: 'normal',
        name: 'Normal Hook',
        event: 'UserPromptSubmit',
        enabled: true,
        command: 'echo normal',
        priority: 50
      };

      registry.addHook(blockingHook);
      registry.addHook(normalHook);

      const context: HookContext = {
        event: 'UserPromptSubmit',
        projectRoot: '/test',
        prompt: 'test prompt',
        timestamp: Date.now()
      };

      const results = await registry.executeHooks('UserPromptSubmit', context);
      
      // Should only have one result (the blocking hook)
      expect(results).toHaveLength(1);
      expect(results[0].shouldBlock).toBe(true);
    });
  });

  describe('loadHooks', () => {
    it('should load multiple hooks at once', () => {
      const configs: HookConfig[] = [
        {
          id: 'hook1',
          name: 'Hook 1',
          event: 'PreToolUse',
          enabled: true,
          command: 'echo 1'
        },
        {
          id: 'hook2',
          name: 'Hook 2',
          event: 'PostToolUse',
          enabled: true,
          command: 'echo 2'
        }
      ];

      registry.loadHooks(configs);

      expect(registry.getHooksForEvent('PreToolUse')).toHaveLength(1);
      expect(registry.getHooksForEvent('PostToolUse')).toHaveLength(1);
    });
  });

  describe('getAllHooks', () => {
    it('should return all registered hooks grouped by event', () => {
      const hook1: HookConfig = {
        id: 'hook1',
        name: 'Hook 1',
        event: 'UserPromptSubmit',
        enabled: true,
        command: 'echo 1'
      };

      const hook2: HookConfig = {
        id: 'hook2',
        name: 'Hook 2',
        event: 'UserPromptSubmit',
        enabled: true,
        command: 'echo 2'
      };

      const hook3: HookConfig = {
        id: 'hook3',
        name: 'Hook 3',
        event: 'SessionStart',
        enabled: true,
        command: 'echo 3'
      };

      registry.addHook(hook1);
      registry.addHook(hook2);
      registry.addHook(hook3);

      const allHooks = registry.getAllHooks();

      expect(allHooks).toHaveLength(2);
      
      const userPromptHooks = allHooks.find(h => h.event === 'UserPromptSubmit');
      expect(userPromptHooks?.hooks).toHaveLength(2);
      
      const sessionStartHooks = allHooks.find(h => h.event === 'SessionStart');
      expect(sessionStartHooks?.hooks).toHaveLength(1);
    });
  });
});