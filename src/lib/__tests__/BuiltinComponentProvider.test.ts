import { BuiltinComponentProvider } from '../BuiltinComponentProvider';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock file system operations
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('BuiltinComponentProvider', () => {
  let provider: BuiltinComponentProvider;
  let tempDir: string;

  beforeEach(() => {
    jest.clearAllMocks();
    tempDir = path.join(os.tmpdir(), 'test-memento-' + Date.now());
    provider = new BuiltinComponentProvider(tempDir);
    
    // Mock basic file system structure
    mockFs.existsSync.mockImplementation((filePath) => {
      const pathStr = filePath.toString();
      return pathStr.includes('templates') || pathStr.endsWith('.md') || pathStr.endsWith('.json');
    });
  });

  describe('isAvailable', () => {
    it('should return true when templates directory exists', () => {
      mockFs.existsSync.mockReturnValue(true);
      
      expect(provider.isAvailable()).toBe(true);
    });

    it('should return false when templates directory does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      expect(provider.isAvailable()).toBe(false);
    });
  });

  describe('getTemplatesPath', () => {
    it('should return the correct templates path', () => {
      const templatesPath = provider.getTemplatesPath();
      
      expect(templatesPath).toBe(path.join(tempDir, 'templates'));
    });
  });

  describe('getComponents', () => {
    it('should load components from metadata.json when available', async () => {
      const mockMetadata = {
        templates: {
          modes: [
            {
              name: 'engineer',
              description: 'Engineering mode',
              tags: ['development'],
              version: '1.0.0'
            }
          ],
          workflows: [
            {
              name: 'review',
              description: 'Code review workflow',
              tags: ['review']
            }
          ]
        }
      };

      mockFs.existsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        return pathStr.includes('templates') || 
               pathStr.includes('metadata.json') ||
               pathStr.endsWith('engineer.md') ||
               pathStr.endsWith('review.md');
      });

      mockFs.readFileSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('metadata.json')) {
          return JSON.stringify(mockMetadata);
        }
        return 'mock file content';
      });

      const components = await provider.getComponents();
      
      expect(components).toHaveLength(2);
      expect(components[0].name).toBe('engineer');
      expect(components[0].type).toBe('mode');
      expect(components[0].isBuiltin).toBe(true);
      expect(components[0].metadata.description).toBe('Engineering mode');
      
      expect(components[1].name).toBe('review');
      expect(components[1].type).toBe('workflow');
    });

    it('should discover components from file system when metadata.json is not available', async () => {
      mockFs.existsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        // Templates directory exists, metadata.json does not, but individual files do
        if (pathStr.includes('templates') && !pathStr.includes('metadata.json')) {
          return true;
        }
        if (pathStr.endsWith('engineer.md')) {
          return true;
        }
        return false;
      });

      mockFs.readdirSync.mockImplementation((dirPath) => {
        const pathStr = dirPath.toString();
        if (pathStr.includes('templates') && !pathStr.includes('modes')) {
          // Return the type directories
          return ['modes', 'workflows', 'agents', 'scripts', 'hooks', 'commands', 'templates'] as any;
        }
        if (pathStr.includes('modes')) {
          return ['engineer.md'] as any;
        }
        return [] as any;
      });

      mockFs.statSync.mockReturnValue({
        isFile: () => true,
        isDirectory: () => false,
        size: 1024,
        mtime: new Date()
      } as any);

      mockFs.readFileSync.mockReturnValue('# Engineer Mode\n\nThis is an engineer mode.');

      const components = await provider.getComponents();
      
      expect(components.length).toBeGreaterThan(0);
      expect(components[0].name).toBe('engineer');
      expect(components[0].type).toBe('mode');
      expect(components[0].isBuiltin).toBe(true);
    });

    it('should return empty array when templates directory does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const components = await provider.getComponents();
      
      expect(components).toHaveLength(0);
    });

    it('should cache components after first load', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      await provider.getComponents();
      await provider.getComponents();
      
      // Should only check existence once per call due to caching
      expect(mockFs.existsSync).toHaveBeenCalledTimes(2); // Once per call
    });
  });

  describe('getComponent', () => {
    it('should return specific component by name and type', async () => {
      const mockMetadata = {
        templates: {
          modes: [
            {
              name: 'engineer',
              description: 'Engineering mode'
            }
          ]
        }
      };

      mockFs.existsSync.mockImplementation((filePath) => {
        return filePath.toString().includes('templates') || 
               filePath.toString().includes('metadata.json') ||
               filePath.toString().endsWith('engineer.md');
      });

      mockFs.readFileSync.mockImplementation((filePath) => {
        if (filePath.toString().includes('metadata.json')) {
          return JSON.stringify(mockMetadata);
        }
        return 'mock content';
      });

      const component = await provider.getComponent('engineer', 'mode');
      
      expect(component).toBeDefined();
      expect(component?.name).toBe('engineer');
      expect(component?.type).toBe('mode');
    });

    it('should return null when component not found', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const component = await provider.getComponent('nonexistent', 'mode');
      
      expect(component).toBeNull();
    });
  });

  describe('getComponentsByType', () => {
    it('should return only components of specified type', async () => {
      const mockMetadata = {
        templates: {
          modes: [
            { name: 'engineer', description: 'Engineering mode' },
            { name: 'architect', description: 'Architecture mode' }
          ],
          workflows: [
            { name: 'review', description: 'Code review' }
          ]
        }
      };

      mockFs.existsSync.mockImplementation((filePath) => {
        return filePath.toString().includes('templates') || 
               filePath.toString().includes('metadata.json') ||
               filePath.toString().endsWith('.md');
      });

      mockFs.readFileSync.mockImplementation((filePath) => {
        if (filePath.toString().includes('metadata.json')) {
          return JSON.stringify(mockMetadata);
        }
        return 'mock content';
      });

      const modes = await provider.getComponentsByType('mode');
      const workflows = await provider.getComponentsByType('workflow');
      
      expect(modes).toHaveLength(2);
      expect(workflows).toHaveLength(1);
      
      expect(modes.every(c => c.type === 'mode')).toBe(true);
      expect(workflows.every(c => c.type === 'workflow')).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should clear cached components', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      // Load components to populate cache
      await provider.getComponents();
      
      // Clear cache
      provider.clearCache();
      
      // Load components again
      await provider.getComponents();
      
      // Should make file system calls again due to cleared cache
      expect(mockFs.existsSync).toHaveBeenCalledTimes(4); // 2 calls per getComponents
    });
  });

  describe('metadata extraction', () => {
    it('should extract metadata from markdown files with frontmatter', async () => {
      const mockMdContent = `---
name: test-mode
description: Test mode
tags: [test, demo]
version: 1.0.0
---
# Test Mode

This is a test mode.`;

      // Mock gray-matter
      const mockMatter = {
        __esModule: true,
        default: jest.fn().mockReturnValue({
          data: {
            name: 'test-mode',
            description: 'Test mode',
            tags: ['test', 'demo'],
            version: '1.0.0'
          }
        })
      };

      jest.doMock('gray-matter', () => mockMatter.default);

      mockFs.existsSync.mockImplementation((filePath) => {
        return filePath.toString().includes('templates') && 
               !filePath.toString().includes('metadata.json');
      });

      mockFs.readdirSync.mockImplementation((dirPath) => {
        if (dirPath.toString().includes('modes')) {
          return ['test-mode.md'] as any;
        }
        return [] as any;
      });

      mockFs.statSync.mockReturnValue({
        isFile: () => true,
        size: 1024,
        mtime: new Date()
      } as any);

      mockFs.readFileSync.mockReturnValue(mockMdContent);

      // Re-require to get the mocked gray-matter
      const { BuiltinComponentProvider: TestProvider } = require('../BuiltinComponentProvider');
      const testProvider = new TestProvider(tempDir);

      const components = await testProvider.getComponents();
      
      expect(components.length).toBeGreaterThan(0);
      expect(components[0].metadata).toEqual({
        name: 'test-mode',
        description: 'Test mode',
        tags: ['test', 'demo'],
        version: '1.0.0'
      });
    });

    it('should handle JSON files', async () => {
      const mockJsonContent = {
        metadata: {
          description: 'Test hook',
          event: 'UserPromptSubmit'
        }
      };

      mockFs.existsSync.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('templates') && !pathStr.includes('metadata.json')) {
          return true;
        }
        if (pathStr.endsWith('test-hook.json')) {
          return true;
        }
        return false;
      });

      mockFs.readdirSync.mockImplementation((dirPath) => {
        const pathStr = dirPath.toString();
        if (pathStr.includes('templates') && !pathStr.includes('hooks')) {
          // Return the type directories
          return ['modes', 'workflows', 'agents', 'scripts', 'hooks', 'commands', 'templates'] as any;
        }
        if (pathStr.includes('hooks')) {
          return ['test-hook.json'] as any;
        }
        return [] as any;
      });

      mockFs.statSync.mockReturnValue({
        isFile: () => true,
        size: 512,
        mtime: new Date()
      } as any);

      mockFs.readFileSync.mockImplementation((filePath) => {
        if (filePath.toString().endsWith('.json')) {
          return JSON.stringify(mockJsonContent);
        }
        return 'mock content';
      });

      const components = await provider.getComponents();
      
      expect(components.length).toBeGreaterThan(0);
      const hookComponent = components.find(c => c.type === 'hook');
      expect(hookComponent?.metadata).toEqual(mockJsonContent.metadata);
    });
  });
});