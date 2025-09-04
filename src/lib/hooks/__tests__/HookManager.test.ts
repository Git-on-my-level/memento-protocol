import { HookManager } from '../HookManager';
import { HookConfig } from '../types';
import { createTestFileSystem } from '../../testing';

// Mock the dependencies that aren't file system related
jest.mock('../HookValidator', () => ({
  HookValidator: class {
    validateScript = jest.fn().mockReturnValue({ valid: true, errors: [], warnings: [] });
    validateHookConfig = jest.fn().mockReturnValue({ valid: true, errors: [], warnings: [] });
    validateDependencies = jest.fn().mockResolvedValue([]);
    testHook = jest.fn().mockResolvedValue({ success: true });
  }
}));

jest.mock('../PermissionGenerator', () => ({
  PermissionGenerator: class {
    generatePermissions = jest.fn().mockResolvedValue({ read: [], write: [] });
  }
}));

jest.mock('../builtin/ZccRoutingHook', () => ({
  ZccRoutingHook: class {
    generate = jest.fn().mockResolvedValue(undefined);
  }
}));

jest.mock('../../packagePaths', () => ({
  PackagePaths: {
    getTemplatesDir: () => '/templates'
  }
}));

jest.mock('../../logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
}));

describe('HookManager', () => {
  const projectRoot = '/project';

  describe('initialize', () => {
    it('should create all required directories', async () => {
      const fs = await createTestFileSystem({});

      const hookManager = new HookManager(projectRoot, fs);
      await hookManager.initialize();

      expect(await fs.exists('/project/.claude')).toBe(true);
      expect(await fs.exists('/project/.zcc/hooks')).toBe(true);
      expect(await fs.exists('/project/.zcc/hooks/definitions')).toBe(true);
      expect(await fs.exists('/project/.zcc/hooks/scripts')).toBe(true);
      expect(await fs.exists('/project/.zcc/hooks/templates')).toBe(true);
    });

    it('should generate builtin hooks', async () => {
      const fs = await createTestFileSystem({});

      const hookManager = new HookManager(projectRoot, fs);
      await hookManager.initialize();

      // Should create the routing hook definition
      expect(await fs.exists('/project/.zcc/hooks/definitions/zcc-routing.json')).toBe(true);
      
      const routingDef = JSON.parse(await fs.readFile('/project/.zcc/hooks/definitions/zcc-routing.json', 'utf-8') as string);
      expect(routingDef.hooks[0].id).toBe('zcc-routing');
      expect(routingDef.hooks[0].event).toBe('UserPromptSubmit');
    });

    it('should generate Claude settings', async () => {
      const fs = await createTestFileSystem({});

      const hookManager = new HookManager(projectRoot, fs);
      await hookManager.initialize();

      expect(await fs.exists('/project/.claude/settings.local.json')).toBe(true);
      
      const settings = JSON.parse(await fs.readFile('/project/.claude/settings.local.json', 'utf-8') as string);
      expect(settings.hooks).toBeDefined();
      expect(settings.permissions).toBeDefined();
    });

    it('should load existing hook definitions', async () => {
      const fs = await createTestFileSystem({
        '/project/.zcc/hooks/definitions/custom-hook.json': JSON.stringify({
          version: '1.0.0',
          hooks: [{
            id: 'custom-hook',
            name: 'Custom Hook',
            event: 'SessionStart',
            enabled: true,
            command: 'echo custom'
          }]
        })
      });

      const hookManager = new HookManager(projectRoot, fs);
      await hookManager.initialize();

      const allHooks = hookManager.getAllHooks();
      const sessionStartHooks = allHooks.find(h => h.event === 'SessionStart');
      expect(sessionStartHooks?.hooks.some(h => h.id === 'custom-hook')).toBe(true);
    });
  });

  describe('addHook', () => {
    it('should add hook to registry and update Claude settings', async () => {
      const fs = await createTestFileSystem({});

      const hookManager = new HookManager(projectRoot, fs);
      await hookManager.initialize();

      const hookConfig: HookConfig = {
        id: 'new-hook',
        name: 'New Hook',
        event: 'PreToolUse',
        enabled: true,
        command: 'echo new',
        matcher: { type: 'tool', pattern: 'Read' }
      };

      await hookManager.addHook(hookConfig);

      const allHooks = hookManager.getAllHooks();
      const preToolHooks = allHooks.find(h => h.event === 'PreToolUse');
      expect(preToolHooks?.hooks.some(h => h.id === 'new-hook')).toBe(true);

      // Should update Claude settings
      const settings = JSON.parse(await fs.readFile('/project/.claude/settings.local.json', 'utf-8') as string);
      expect(settings.hooks.PreToolUse).toBeDefined();
    });
  });

  describe('removeHook', () => {
    it('should remove hook from registry and update Claude settings', async () => {
      const fs = await createTestFileSystem({
        '/project/.zcc/hooks/definitions/remove-me.json': JSON.stringify({
          version: '1.0.0',
          hooks: [{
            id: 'remove-me',
            name: 'Remove Me',
            event: 'UserPromptSubmit',
            enabled: true,
            command: 'echo remove'
          }]
        })
      });

      const hookManager = new HookManager(projectRoot, fs);
      await hookManager.initialize();

      // Verify hook exists
      let allHooks = hookManager.getAllHooks();
      let userPromptHooks = allHooks.find(h => h.event === 'UserPromptSubmit');
      expect(userPromptHooks?.hooks.some(h => h.id === 'remove-me')).toBe(true);

      const removed = await hookManager.removeHook('remove-me');

      expect(removed).toBe(true);
      
      allHooks = hookManager.getAllHooks();
      userPromptHooks = allHooks.find(h => h.event === 'UserPromptSubmit');
      expect(userPromptHooks?.hooks.some(h => h.id === 'remove-me')).toBe(false);

      // Definition file should be removed
      expect(await fs.exists('/project/.zcc/hooks/definitions/remove-me.json')).toBe(false);
    });

    it('should return false for non-existent hook', async () => {
      const fs = await createTestFileSystem({});

      const hookManager = new HookManager(projectRoot, fs);
      await hookManager.initialize();

      const removed = await hookManager.removeHook('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('createHookFromTemplate', () => {
    it('should create hook from JSON template', async () => {
      const fs = await createTestFileSystem({
        '/templates/hooks/test-template.json': JSON.stringify({
          name: 'Test Template Hook',
          event: 'UserPromptSubmit',
          enabled: true,
          command: 'echo template',
          description: 'A test template'
        })
      });

      const hookManager = new HookManager(projectRoot, fs);
      await hookManager.initialize();

      await hookManager.createHookFromTemplate('test-template', {
        id: 'from-template'
      });

      const allHooks = hookManager.getAllHooks();
      const userPromptHooks = allHooks.find(h => h.event === 'UserPromptSubmit');
      const createdHook = userPromptHooks?.hooks.find(h => h.id === 'from-template');
      
      expect(createdHook).toBeDefined();
      expect(createdHook?.name).toBe('Test Template Hook');
      expect(createdHook?.config.command).toBe('echo template');

      // Should save definition file
      expect(await fs.exists('/project/.zcc/hooks/definitions/from-template.json')).toBe(true);
    });

    it('should create hook with script from template', async () => {
      const fs = await createTestFileSystem({
        '/templates/hooks/script-template.json': JSON.stringify({
          name: 'Script Template Hook',
          event: 'SessionStart',
          enabled: true,
          command: '${HOOK_SCRIPT}',
          description: 'A script template'
        }),
        '/templates/hooks/script-template.sh': '#!/bin/bash\necho "Hello from script template"'
      });

      const hookManager = new HookManager(projectRoot, fs);
      await hookManager.initialize();

      await hookManager.createHookFromTemplate('script-template', {
        id: 'script-hook'
      });

      const allHooks = hookManager.getAllHooks();
      const sessionStartHooks = allHooks.find(h => h.event === 'SessionStart');
      const createdHook = sessionStartHooks?.hooks.find(h => h.id === 'script-hook');
      
      expect(createdHook).toBeDefined();
      expect(createdHook?.config.command).toBe('./.zcc/hooks/scripts/script-template.sh');

      // Should create script file
      expect(await fs.exists('/project/.zcc/hooks/scripts/script-template.sh')).toBe(true);
      
      const scriptContent = await fs.readFile('/project/.zcc/hooks/scripts/script-template.sh', 'utf-8');
      expect(scriptContent).toBe('#!/bin/bash\necho "Hello from script template"');
    });

    it('should update existing hook when recreating', async () => {
      const fs = await createTestFileSystem({
        '/templates/hooks/update-template.json': JSON.stringify({
          name: 'Updated Template Hook',
          event: 'UserPromptSubmit',
          enabled: true,
          command: 'echo updated',
          description: 'An updated template'
        }),
        '/project/.zcc/hooks/definitions/update-test.json': JSON.stringify({
          version: '1.0.0',
          hooks: [{
            id: 'update-test',
            name: 'Old Hook',
            event: 'UserPromptSubmit',
            enabled: true,
            command: 'echo old'
          }]
        }),
        '/project/.zcc/hooks/scripts/update-test.sh': '#!/bin/bash\necho "old script"'
      });

      const hookManager = new HookManager(projectRoot, fs);
      await hookManager.initialize();

      await hookManager.createHookFromTemplate('update-template', {
        id: 'update-test'
      });

      const allHooks = hookManager.getAllHooks();
      const userPromptHooks = allHooks.find(h => h.event === 'UserPromptSubmit');
      const updatedHook = userPromptHooks?.hooks.find(h => h.id === 'update-test');
      
      expect(updatedHook?.name).toBe('Updated Template Hook');
      expect(updatedHook?.config.command).toBe('echo updated');
    });

    it('should throw error for missing template', async () => {
      const fs = await createTestFileSystem({});

      const hookManager = new HookManager(projectRoot, fs);
      await hookManager.initialize();

      await expect(
        hookManager.createHookFromTemplate('non-existent-template', { id: 'test' })
      ).rejects.toThrow();
    });

    it('should throw error for script template without script file', async () => {
      const fs = await createTestFileSystem({
        '/templates/hooks/missing-script.json': JSON.stringify({
          name: 'Missing Script Hook',
          event: 'UserPromptSubmit',
          enabled: true,
          command: '${HOOK_SCRIPT}'
        })
      });

      const hookManager = new HookManager(projectRoot, fs);
      await hookManager.initialize();

      await expect(
        hookManager.createHookFromTemplate('missing-script', { id: 'test' })
      ).rejects.toThrow('Script template not found: missing-script.sh');
    });
  });

  describe('listTemplates', () => {
    it('should list available JSON templates', async () => {
      const fs = await createTestFileSystem({
        '/templates/hooks/template1.json': '{}',
        '/templates/hooks/template2.json': '{}',
        '/templates/hooks/template1.sh': '#!/bin/bash',
        '/templates/hooks/README.md': '# Templates'
      });

      const hookManager = new HookManager(projectRoot, fs);

      const templates = await hookManager.listTemplates();

      expect(templates).toContain('template1');
      expect(templates).toContain('template2');
      expect(templates).not.toContain('template1.sh');
      expect(templates).not.toContain('README.md');
    });

    it('should return empty array when templates directory does not exist', async () => {
      const fs = await createTestFileSystem({});

      const hookManager = new HookManager(projectRoot, fs);

      const templates = await hookManager.listTemplates();
      expect(templates).toEqual([]);
    });
  });

  describe('getAllHooks', () => {
    it('should return all hooks grouped by event', async () => {
      const fs = await createTestFileSystem({
        '/project/.zcc/hooks/definitions/hook1.json': JSON.stringify({
          version: '1.0.0',
          hooks: [{
            id: 'hook1',
            name: 'Hook 1',
            event: 'UserPromptSubmit',
            enabled: true,
            command: 'echo hook1'
          }]
        }),
        '/project/.zcc/hooks/definitions/hook2.json': JSON.stringify({
          version: '1.0.0',
          hooks: [{
            id: 'hook2',
            name: 'Hook 2',
            event: 'SessionStart',
            enabled: true,
            command: 'echo hook2'
          }]
        })
      });

      const hookManager = new HookManager(projectRoot, fs);
      await hookManager.initialize();

      const allHooks = hookManager.getAllHooks();

      expect(allHooks.length).toBeGreaterThanOrEqual(2);
      
      const userPromptHooks = allHooks.find(h => h.event === 'UserPromptSubmit');
      const sessionStartHooks = allHooks.find(h => h.event === 'SessionStart');
      
      expect(userPromptHooks?.hooks.some(h => h.id === 'hook1')).toBe(true);
      expect(sessionStartHooks?.hooks.some(h => h.id === 'hook2')).toBe(true);
    });
  });

  describe('cleanupTimestampedHooks', () => {
    it('should cleanup timestamped hooks during initialization', async () => {
      const fs = await createTestFileSystem({
        '/project/.zcc/hooks/definitions/old-hook-1234567890123.json': JSON.stringify({
          version: '1.0.0',
          hooks: [{
            id: 'old-hook-1234567890123',
            name: 'Old Timestamped Hook',
            event: 'UserPromptSubmit',
            enabled: true,
            command: './.zcc/hooks/scripts/old-hook-1234567890123.sh'
          }]
        }),
        '/project/.zcc/hooks/scripts/old-hook-1234567890123.sh': '#!/bin/bash\necho "old timestamped"'
      });

      const hookManager = new HookManager(projectRoot, fs);
      await hookManager.initialize();

      // Old timestamped files should be cleaned up
      expect(await fs.exists('/project/.zcc/hooks/definitions/old-hook.json')).toBe(true);
      expect(await fs.exists('/project/.zcc/hooks/scripts/old-hook.sh')).toBe(true);
      expect(await fs.exists('/project/.zcc/hooks/definitions/old-hook-1234567890123.json')).toBe(false);
      expect(await fs.exists('/project/.zcc/hooks/scripts/old-hook-1234567890123.sh')).toBe(false);

      const allHooks = hookManager.getAllHooks();
      const userPromptHooks = allHooks.find(h => h.event === 'UserPromptSubmit');
      const cleanedHook = userPromptHooks?.hooks.find(h => h.id === 'old-hook');
      
      expect(cleanedHook).toBeDefined();
      expect(cleanedHook?.config.command).toBe('./.zcc/hooks/scripts/old-hook.sh');
    });
  });

  describe('Claude settings generation', () => {
    it('should merge hooks with existing settings', async () => {
      const fs = await createTestFileSystem({
        '/project/.claude/settings.local.json': JSON.stringify({
          customSetting: 'preserved',
          hooks: {
            CustomEvent: [{
              matcher: '*',
              hooks: [{ type: 'command', command: 'echo existing' }]
            }]
          }
        }),
        '/project/.zcc/hooks/definitions/new-hook.json': JSON.stringify({
          version: '1.0.0',
          hooks: [{
            id: 'new-hook',
            name: 'New Hook',
            event: 'UserPromptSubmit',
            enabled: true,
            command: 'echo new'
          }]
        })
      });

      const hookManager = new HookManager(projectRoot, fs);
      await hookManager.initialize();

      const settings = JSON.parse(await fs.readFile('/project/.claude/settings.local.json', 'utf-8') as string);
      
      expect(settings.customSetting).toBe('preserved');
      expect(settings.hooks.CustomEvent).toBeDefined();
      expect(settings.hooks.UserPromptSubmit).toBeDefined();
    });

    it('should handle PreToolUse and PostToolUse hooks with tool matchers', async () => {
      const fs = await createTestFileSystem({
        '/project/.zcc/hooks/definitions/tool-hook.json': JSON.stringify({
          version: '1.0.0',
          hooks: [{
            id: 'tool-hook',
            name: 'Tool Hook',
            event: 'PreToolUse',
            enabled: true,
            command: 'echo before read',
            matcher: { type: 'tool', pattern: 'Read' }
          }]
        })
      });

      const hookManager = new HookManager(projectRoot, fs);
      await hookManager.initialize();

      const settings = JSON.parse(await fs.readFile('/project/.claude/settings.local.json', 'utf-8') as string);
      
      expect(settings.hooks.PreToolUse).toBeDefined();
      const toolHook = settings.hooks.PreToolUse.find((h: any) => h.matcher === 'Read');
      expect(toolHook).toBeDefined();
    });

    it('should skip disabled hooks', async () => {
      const fs = await createTestFileSystem({
        '/project/.zcc/hooks/definitions/disabled-hook.json': JSON.stringify({
          version: '1.0.0',
          hooks: [{
            id: 'disabled-hook',
            name: 'Disabled Hook',
            event: 'UserPromptSubmit',
            enabled: false,
            command: 'echo disabled'
          }]
        })
      });

      const hookManager = new HookManager(projectRoot, fs);
      await hookManager.initialize();

      const settings = JSON.parse(await fs.readFile('/project/.claude/settings.local.json', 'utf-8') as string);
      
      // UserPromptSubmit should only have the built-in routing hook
      const userPromptHooks = settings.hooks.UserPromptSubmit || [];
      expect(userPromptHooks.every((h: any) => !h.hooks.some((hook: any) => hook.command.includes('disabled')))).toBe(true);
    });
  });
});