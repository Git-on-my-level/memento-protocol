import { SourceRegistry } from '../SourceRegistry';
import { promises as fs } from 'fs';
import * as path from 'path';

jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
  },
}));

describe('SourceRegistry', () => {
  let registry: SourceRegistry;
  const mockProjectRoot = '/test/project';
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
    registry = new SourceRegistry(mockProjectRoot);
  });

  describe('initialization', () => {
    it('should load existing configuration', async () => {
      const mockConfig = {
        sources: [
          {
            id: 'local',
            type: 'local',
            enabled: true,
            priority: 1,
            config: { path: 'templates' },
          },
          {
            id: 'github-test',
            type: 'github',
            enabled: true,
            priority: 10,
            config: {
              owner: 'test-owner',
              repo: 'test-repo',
            },
          },
        ],
        defaultSource: 'local',
      };

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockConfig));

      await registry.initialize();

      expect(mockFs.readFile).toHaveBeenCalledWith(
        path.join(mockProjectRoot, '.zcc', 'sources.json'),
        'utf-8'
      );
    });

    it('should create default configuration if none exists', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));

      await registry.initialize();

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(mockProjectRoot, '.zcc', 'sources.json'),
        expect.stringContaining('"id": "local"')
      );
    });
  });

  describe('source management', () => {
    beforeEach(async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));
      await registry.initialize();
    });

    it('should add a new source', async () => {
      const newSource = {
        id: 'my-packs',
        type: 'github' as const,
        enabled: true,
        priority: 5,
        config: {
          owner: 'myuser',
          repo: 'my-packs',
        },
      };

      // Mock the source creation and validation
      const mockListPacks = jest.fn().mockResolvedValue(['pack1', 'pack2']);
      jest.spyOn(registry as any, 'createSource').mockResolvedValue({
        listPacks: mockListPacks,
      });

      await registry.addSource(newSource);

      const config = registry.getSourceConfig('my-packs');
      expect(config).toEqual(newSource);
      expect(mockListPacks).toHaveBeenCalled();
    });

    it('should prevent duplicate source IDs', async () => {
      const source = {
        id: 'local',
        type: 'local' as const,
        enabled: true,
        priority: 1,
        config: { path: 'templates' },
      };

      await expect(registry.addSource(source)).rejects.toThrow(
        'Source with ID local already exists'
      );
    });

    it('should remove a source', async () => {
      const source = {
        id: 'test-source',
        type: 'github' as const,
        enabled: true,
        priority: 10,
        config: {
          owner: 'test',
          repo: 'test',
        },
      };

      jest.spyOn(registry as any, 'createSource').mockResolvedValue({
        listPacks: jest.fn().mockResolvedValue([]),
      });

      await registry.addSource(source);
      await registry.removeSource('test-source');

      const config = registry.getSourceConfig('test-source');
      expect(config).toBeUndefined();
    });

    it('should not allow removing the local source', async () => {
      await expect(registry.removeSource('local')).rejects.toThrow(
        'Cannot remove the local source'
      );
    });

    it('should update source configuration', async () => {
      const source = {
        id: 'test-source',
        type: 'github' as const,
        enabled: true,
        priority: 10,
        config: {
          owner: 'test',
          repo: 'test',
        },
      };

      jest.spyOn(registry as any, 'createSource').mockResolvedValue({
        listPacks: jest.fn().mockResolvedValue([]),
      });

      await registry.addSource(source);
      await registry.updateSource('test-source', { priority: 5 });

      const config = registry.getSourceConfig('test-source');
      expect(config?.priority).toBe(5);
    });
  });

  describe('pack discovery', () => {
    beforeEach(async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));
      await registry.initialize();
    });

    it('should find pack in default source first', async () => {
      const mockLocalSource = {
        hasPack: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(registry, 'getSource').mockReturnValue(mockLocalSource as any);

      const result = await registry.findPack('test-pack');

      expect(result).toEqual({
        source: mockLocalSource,
        sourceId: 'local',
      });
    });

    it('should search other sources by priority', async () => {
      const mockLocalSource = {
        hasPack: jest.fn().mockResolvedValue(false),
      };

      const mockGitHubSource = {
        hasPack: jest.fn().mockResolvedValue(true),
      };

      // Add a GitHub source
      const githubConfig = {
        id: 'github-test',
        type: 'github' as const,
        enabled: true,
        priority: 10,
        config: {
          owner: 'test',
          repo: 'test',
        },
      };

      jest.spyOn(registry as any, 'createSource')
        .mockResolvedValueOnce(mockGitHubSource)
        .mockResolvedValue({
          listPacks: jest.fn().mockResolvedValue([]),
        });

      await registry.addSource(githubConfig);

      jest.spyOn(registry, 'getSource')
        .mockImplementation((id) => {
          if (id === 'local') return mockLocalSource as any;
          if (id === 'github-test') return mockGitHubSource as any;
          return undefined;
        });

      const result = await registry.findPack('test-pack');

      expect(result).toEqual({
        source: mockGitHubSource,
        sourceId: 'github-test',
      });
      expect(mockLocalSource.hasPack).toHaveBeenCalledWith('test-pack');
      expect(mockGitHubSource.hasPack).toHaveBeenCalledWith('test-pack');
    });

    it('should list packs from all sources', async () => {
      const mockLocalSource = {
        listPacks: jest.fn().mockResolvedValue(['local-pack1', 'local-pack2']),
      };

      jest.spyOn(registry, 'getSource').mockReturnValue(mockLocalSource as any);

      const packsBySource = await registry.listAllPacks();

      expect(packsBySource.get('local')).toEqual(['local-pack1', 'local-pack2']);
    });
  });
});