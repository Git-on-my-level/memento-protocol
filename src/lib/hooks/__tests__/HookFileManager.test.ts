import { HookFileManager } from '../HookFileManager';
import { HookConfig } from '../types';
import { createTestFileSystem } from '../../testing';

describe('HookFileManager', () => {
  const projectRoot = '/project';
  const hooksDir = '/project/.memento/hooks';
  const definitionsDir = '/project/.memento/hooks/definitions';

  describe('removeHookFiles', () => {
    it('should remove hook definition file', async () => {
      const fs = await createTestFileSystem({
        [`${definitionsDir}/test-hook.json`]: JSON.stringify({
          version: '1.0.0',
          hooks: []
        })
      });

      const fileManager = new HookFileManager(projectRoot, hooksDir, definitionsDir, fs);
      
      const hook: HookConfig = {
        id: 'test-hook',
        name: 'Test Hook',
        event: 'UserPromptSubmit',
        enabled: true,
        command: 'echo test'
      };

      expect(await fs.exists(`${definitionsDir}/test-hook.json`)).toBe(true);
      
      await fileManager.removeHookFiles(hook);
      
      expect(await fs.exists(`${definitionsDir}/test-hook.json`)).toBe(false);
    });

    it('should remove script file if it is in hooks directory', async () => {
      const scriptPath = `${hooksDir}/scripts/test-script.sh`;
      const fs = await createTestFileSystem({
        [`${definitionsDir}/test-hook.json`]: JSON.stringify({ version: '1.0.0', hooks: [] }),
        [scriptPath]: '#!/bin/bash\necho "test"'
      });

      const fileManager = new HookFileManager(projectRoot, hooksDir, definitionsDir, fs);
      
      const hook: HookConfig = {
        id: 'test-hook',
        name: 'Test Hook',
        event: 'UserPromptSubmit',
        enabled: true,
        command: './.memento/hooks/scripts/test-script.sh'
      };

      expect(await fs.exists(scriptPath)).toBe(true);
      
      await fileManager.removeHookFiles(hook);
      
      expect(await fs.exists(scriptPath)).toBe(false);
    });

    it('should not remove script file outside hooks directory', async () => {
      const scriptPath = '/usr/bin/external-script.sh';
      const fs = await createTestFileSystem({
        [`${definitionsDir}/test-hook.json`]: JSON.stringify({ version: '1.0.0', hooks: [] }),
        [scriptPath]: '#!/bin/bash\necho "test"'
      });

      const fileManager = new HookFileManager(projectRoot, hooksDir, definitionsDir, fs);
      
      const hook: HookConfig = {
        id: 'test-hook',
        name: 'Test Hook',
        event: 'UserPromptSubmit',
        enabled: true,
        command: scriptPath
      };

      expect(await fs.exists(scriptPath)).toBe(true);
      
      await fileManager.removeHookFiles(hook);
      
      expect(await fs.exists(scriptPath)).toBe(true); // Should not be deleted
    });

    it('should handle missing files gracefully', async () => {
      const fs = await createTestFileSystem({});

      const fileManager = new HookFileManager(projectRoot, hooksDir, definitionsDir, fs);
      
      const hook: HookConfig = {
        id: 'non-existent',
        name: 'Non-existent Hook',
        event: 'UserPromptSubmit',
        enabled: true,
        command: 'echo test'
      };

      // Should not throw error
      await expect(fileManager.removeHookFiles(hook)).resolves.not.toThrow();
    });
  });

  describe('writeScriptFile', () => {
    it('should write script file with correct permissions', async () => {
      const fs = await createTestFileSystem({});

      const fileManager = new HookFileManager(projectRoot, hooksDir, definitionsDir, fs);
      
      const scriptContent = '#!/bin/bash\necho "Hello, World!"';
      const commandPath = await fileManager.writeScriptFile('test-script', scriptContent);

      expect(commandPath).toBe('./.memento/hooks/scripts/test-script.sh');
      
      const savedContent = await fs.readFile(`${hooksDir}/scripts/test-script.sh`, 'utf-8');
      expect(savedContent).toBe(scriptContent);
    });

    it('should create scripts directory if it does not exist', async () => {
      const fs = await createTestFileSystem({});

      const fileManager = new HookFileManager(projectRoot, hooksDir, definitionsDir, fs);
      
      expect(await fs.exists(`${hooksDir}/scripts`)).toBe(false);
      
      await fileManager.writeScriptFile('test-script', '#!/bin/bash\necho test');
      
      expect(await fs.exists(`${hooksDir}/scripts`)).toBe(true);
      expect(await fs.exists(`${hooksDir}/scripts/test-script.sh`)).toBe(true);
    });

    it('should return relative path from project root', async () => {
      const fs = await createTestFileSystem({});

      const fileManager = new HookFileManager(projectRoot, hooksDir, definitionsDir, fs);
      
      const commandPath = await fileManager.writeScriptFile('relative-test', '#!/bin/bash\necho test');
      
      expect(commandPath).toBe('./.memento/hooks/scripts/relative-test.sh');
      expect(commandPath.startsWith('./')).toBe(true);
    });
  });

  describe('saveHookDefinition', () => {
    it('should save hook definition to JSON file', async () => {
      const fs = await createTestFileSystem({});

      const fileManager = new HookFileManager(projectRoot, hooksDir, definitionsDir, fs);
      
      const hookConfig: HookConfig = {
        id: 'save-test',
        name: 'Save Test Hook',
        event: 'UserPromptSubmit',
        enabled: true,
        command: 'echo test',
        priority: 50
      };

      await fileManager.saveHookDefinition(hookConfig);
      
      expect(await fs.exists(`${definitionsDir}/save-test.json`)).toBe(true);
      
      const savedContent = await fs.readFile(`${definitionsDir}/save-test.json`, 'utf-8') as string;
      const parsed = JSON.parse(savedContent);
      
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.hooks).toHaveLength(1);
      expect(parsed.hooks[0].id).toBe('save-test');
      expect(parsed.hooks[0].priority).toBe(50);
    });

    it('should create definitions directory if it does not exist', async () => {
      const fs = await createTestFileSystem({});

      const fileManager = new HookFileManager(projectRoot, hooksDir, definitionsDir, fs);
      
      expect(await fs.exists(definitionsDir)).toBe(false);
      
      const hookConfig: HookConfig = {
        id: 'test',
        name: 'Test Hook',
        event: 'UserPromptSubmit',
        enabled: true,
        command: 'echo test'
      };

      await fileManager.saveHookDefinition(hookConfig);
      
      expect(await fs.exists(definitionsDir)).toBe(true);
    });
  });

  describe('cleanupTimestampedHooks', () => {
    it('should rename timestamped hooks to clean names', async () => {
      const fs = await createTestFileSystem({
        [`${definitionsDir}/test-hook-1234567890123.json`]: JSON.stringify({
          version: '1.0.0',
          hooks: []
        }),
        [`${hooksDir}/scripts/test-hook-1234567890123.sh`]: '#!/bin/bash\necho "test"'
      });

      const fileManager = new HookFileManager(projectRoot, hooksDir, definitionsDir, fs);
      
      const mockRegistry = {
        removeHook: jest.fn(),
        addHook: jest.fn()
      };

      const oldHook = {
        config: {
          id: 'test-hook-1234567890123',
          name: 'Test Hook',
          event: 'UserPromptSubmit',
          enabled: true,
          command: './.memento/hooks/scripts/test-hook-1234567890123.sh'
        }
      };

      const allHooks = [{
        event: 'UserPromptSubmit',
        hooks: [oldHook]
      }];

      await fileManager.cleanupTimestampedHooks(allHooks, mockRegistry);

      // Verify old hook was removed and new one added
      expect(mockRegistry.removeHook).toHaveBeenCalledWith('test-hook-1234567890123');
      expect(mockRegistry.addHook).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-hook',
          command: './.memento/hooks/scripts/test-hook.sh'
        })
      );

      // Verify files were renamed
      expect(await fs.exists(`${hooksDir}/scripts/test-hook.sh`)).toBe(true);
      expect(await fs.exists(`${hooksDir}/scripts/test-hook-1234567890123.sh`)).toBe(false);
      
      expect(await fs.exists(`${definitionsDir}/test-hook.json`)).toBe(true);
      expect(await fs.exists(`${definitionsDir}/test-hook-1234567890123.json`)).toBe(false);
    });

    it('should handle multiple timestamped hooks', async () => {
      const fs = await createTestFileSystem({
        [`${definitionsDir}/hook1-1234567890123.json`]: JSON.stringify({ version: '1.0.0', hooks: [] }),
        [`${definitionsDir}/hook2-9876543210987.json`]: JSON.stringify({ version: '1.0.0', hooks: [] })
      });

      const fileManager = new HookFileManager(projectRoot, hooksDir, definitionsDir, fs);
      
      const mockRegistry = {
        removeHook: jest.fn(),
        addHook: jest.fn()
      };

      const allHooks = [{
        event: 'UserPromptSubmit',
        hooks: [
          { config: { id: 'hook1-1234567890123', name: 'Hook 1', event: 'UserPromptSubmit', enabled: true, command: 'echo hook1' } },
          { config: { id: 'hook2-9876543210987', name: 'Hook 2', event: 'UserPromptSubmit', enabled: true, command: 'echo hook2' } }
        ]
      }];

      await fileManager.cleanupTimestampedHooks(allHooks, mockRegistry);

      expect(mockRegistry.removeHook).toHaveBeenCalledTimes(2);
      expect(mockRegistry.addHook).toHaveBeenCalledTimes(2);
      
      expect(await fs.exists(`${definitionsDir}/hook1.json`)).toBe(true);
      expect(await fs.exists(`${definitionsDir}/hook2.json`)).toBe(true);
    });

    it('should skip hooks without timestamp pattern', async () => {
      const fs = await createTestFileSystem({});

      const fileManager = new HookFileManager(projectRoot, hooksDir, definitionsDir, fs);
      
      const mockRegistry = {
        removeHook: jest.fn(),
        addHook: jest.fn()
      };

      const allHooks = [{
        event: 'UserPromptSubmit',
        hooks: [
          { config: { id: 'clean-hook', name: 'Clean Hook', event: 'UserPromptSubmit', enabled: true, command: 'echo test' } }
        ]
      }];

      await fileManager.cleanupTimestampedHooks(allHooks, mockRegistry);

      expect(mockRegistry.removeHook).not.toHaveBeenCalled();
      expect(mockRegistry.addHook).not.toHaveBeenCalled();
    });
  });
});