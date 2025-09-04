import { HookConfigLoader } from '../HookConfigLoader';
import { HookDefinition } from '../types';
import { createTestFileSystem } from '../../testing';

describe('HookConfigLoader', () => {
  describe('loadAll', () => {
    it('should load JSON hook definitions from directory', async () => {
      const fs = await createTestFileSystem({
        '/project/.zcc/hooks/definitions/hook1.json': JSON.stringify({
          version: '1.0.0',
          hooks: [
            {
              id: 'hook1',
              name: 'Test Hook 1',
              event: 'UserPromptSubmit',
              enabled: true,
              command: 'echo test1'
            }
          ]
        }),
        '/project/.zcc/hooks/definitions/hook2.json': JSON.stringify({
          version: '1.0.0',
          hooks: [
            {
              id: 'hook2',
              name: 'Test Hook 2',
              event: 'SessionStart',
              enabled: false,
              command: 'echo test2'
            }
          ]
        })
      });

      const loader = new HookConfigLoader('/project/.zcc/hooks/definitions', fs);
      const definitions = await loader.loadAll();

      expect(definitions).toHaveLength(2);
      expect(definitions[0].hooks[0].id).toBe('hook1');
      expect(definitions[1].hooks[0].id).toBe('hook2');
    });

    it('should skip non-JSON files', async () => {
      const fs = await createTestFileSystem({
        '/project/.zcc/hooks/definitions/hook1.json': JSON.stringify({
          version: '1.0.0',
          hooks: []
        }),
        '/project/.zcc/hooks/definitions/README.md': '# Hooks',
        '/project/.zcc/hooks/definitions/script.sh': '#!/bin/bash\necho test'
      });

      const loader = new HookConfigLoader('/project/.zcc/hooks/definitions', fs);
      const definitions = await loader.loadAll();

      expect(definitions).toHaveLength(1);
    });

    it('should handle empty directory gracefully', async () => {
      const fs = await createTestFileSystem({
        '/project/.zcc/hooks/definitions/': ''
      });

      const loader = new HookConfigLoader('/project/.zcc/hooks/definitions', fs);
      const definitions = await loader.loadAll();

      expect(definitions).toHaveLength(0);
    });

    it('should handle non-existent directory gracefully', async () => {
      const fs = await createTestFileSystem({});

      const loader = new HookConfigLoader('/project/.zcc/hooks/definitions', fs);
      const definitions = await loader.loadAll();

      expect(definitions).toHaveLength(0);
    });

    it('should skip invalid JSON files and continue loading', async () => {
      const fs = await createTestFileSystem({
        '/project/.zcc/hooks/definitions/valid.json': JSON.stringify({
          version: '1.0.0',
          hooks: [{ id: 'valid', name: 'Valid Hook', event: 'UserPromptSubmit', enabled: true, command: 'echo valid' }]
        }),
        '/project/.zcc/hooks/definitions/invalid.json': '{ invalid json',
        '/project/.zcc/hooks/definitions/another.json': JSON.stringify({
          version: '1.0.0',
          hooks: [{ id: 'another', name: 'Another Hook', event: 'SessionStart', enabled: true, command: 'echo another' }]
        })
      });

      const loader = new HookConfigLoader('/project/.zcc/hooks/definitions', fs);
      const definitions = await loader.loadAll();

      expect(definitions).toHaveLength(2);
      expect(definitions.map(d => d.hooks[0].id)).toContain('valid');
      expect(definitions.map(d => d.hooks[0].id)).toContain('another');
    });
  });

  describe('loadDefinition', () => {
    it('should load a single JSON definition file', async () => {
      const fs = await createTestFileSystem({
        '/project/hook.json': JSON.stringify({
          version: '1.0.0',
          hooks: [
            {
              id: 'test-hook',
              name: 'Test Hook',
              event: 'UserPromptSubmit',
              enabled: true,
              command: 'echo test'
            }
          ]
        })
      });

      const loader = new HookConfigLoader('/definitions', fs);
      const definition = await loader.loadDefinition('/project/hook.json');

      expect(definition.version).toBe('1.0.0');
      expect(definition.hooks).toHaveLength(1);
      expect(definition.hooks[0].id).toBe('test-hook');
    });

    it('should throw error for YAML files', async () => {
      const fs = await createTestFileSystem({
        '/project/hook.yaml': 'version: 1.0.0\nhooks: []'
      });

      const loader = new HookConfigLoader('/definitions', fs);
      
      await expect(loader.loadDefinition('/project/hook.yaml')).rejects.toThrow('YAML support not yet implemented');
    });

    it('should throw error for unsupported file formats', async () => {
      const fs = await createTestFileSystem({
        '/project/hook.txt': 'some text'
      });

      const loader = new HookConfigLoader('/definitions', fs);
      
      await expect(loader.loadDefinition('/project/hook.txt')).rejects.toThrow('Unsupported file format');
    });

    it('should throw error for invalid JSON', async () => {
      const fs = await createTestFileSystem({
        '/project/hook.json': '{ invalid json'
      });

      const loader = new HookConfigLoader('/definitions', fs);
      
      await expect(loader.loadDefinition('/project/hook.json')).rejects.toThrow();
    });
  });

  describe('saveDefinition', () => {
    it('should save JSON definition to file', async () => {
      const fs = await createTestFileSystem({});

      const definition: HookDefinition = {
        version: '1.0.0',
        hooks: [
          {
            id: 'save-test',
            name: 'Save Test Hook',
            event: 'UserPromptSubmit',
            enabled: true,
            command: 'echo save-test'
          }
        ]
      };

      const loader = new HookConfigLoader('/project/.zcc/hooks/definitions', fs);
      await loader.saveDefinition(definition, 'save-test.json');

      const savedContent = await fs.readFile('/project/.zcc/hooks/definitions/save-test.json', 'utf-8') as string;
      const parsed = JSON.parse(savedContent);
      
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.hooks[0].id).toBe('save-test');
    });

    it('should throw error for non-JSON files', async () => {
      const fs = await createTestFileSystem({});
      const definition: HookDefinition = { version: '1.0.0', hooks: [] };

      const loader = new HookConfigLoader('/definitions', fs);
      
      await expect(loader.saveDefinition(definition, 'test.yaml')).rejects.toThrow('Unsupported file format');
    });
  });

  describe('deleteDefinition', () => {
    it('should delete definition file', async () => {
      const fs = await createTestFileSystem({
        '/project/.zcc/hooks/definitions/delete-me.json': JSON.stringify({
          version: '1.0.0',
          hooks: []
        })
      });

      const loader = new HookConfigLoader('/project/.zcc/hooks/definitions', fs);
      
      expect(await fs.exists('/project/.zcc/hooks/definitions/delete-me.json')).toBe(true);
      
      await loader.deleteDefinition('delete-me.json');
      
      expect(await fs.exists('/project/.zcc/hooks/definitions/delete-me.json')).toBe(false);
    });

    it('should throw error when file does not exist', async () => {
      const fs = await createTestFileSystem({});

      const loader = new HookConfigLoader('/project/.zcc/hooks/definitions', fs);
      
      await expect(loader.deleteDefinition('non-existent.json')).rejects.toThrow();
    });
  });
});