import { TrustManager } from '../TrustManager';
import { promises as fs } from 'fs';
import * as path from 'path';
import { IPackSource } from '../../packs/PackSource';
import { PackStructure } from '../../types/packs';

jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
  },
}));

describe('TrustManager', () => {
  let trustManager: TrustManager;
  const mockProjectRoot = '/test/project';
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
    trustManager = new TrustManager(mockProjectRoot);
  });

  describe('initialization', () => {
    it('should create security directory', async () => {
      mockFs.access.mockRejectedValue(new Error('Not found'));
      await trustManager.initialize();

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join(mockProjectRoot, '.zcc', 'security'),
        { recursive: true }
      );
    });

    it('should load existing trust policy', async () => {
      const mockPolicy = {
        allowUntrustedSources: true,
        requireUserConsent: false,
      };

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockPolicy));

      await trustManager.initialize();
      const policy = trustManager.getPolicy();

      expect(policy.allowUntrustedSources).toBe(true);
      expect(policy.requireUserConsent).toBe(false);
    });
  });

  describe('source validation', () => {
    beforeEach(async () => {
      mockFs.access.mockRejectedValue(new Error('Not found'));
      await trustManager.initialize();
    });

    it('should trust local sources', async () => {
      const mockSource: IPackSource = {
        getSourceInfo: () => ({
          name: 'local',
          path: 'templates',
          type: 'local',
        }),
        loadPack: jest.fn(),
        listPacks: jest.fn(),
        hasPack: jest.fn(),
        getComponentPath: jest.fn(),
        hasComponent: jest.fn(),
      };

      await trustManager.addTrustedSource('local', {
        type: 'local',
        trusted: true,
      });

      const result = await trustManager.validateSource(mockSource);

      expect(result.valid).toBe(true);
      expect(result.trusted).toBe(true);
      expect(result.requiresConsent).toBe(false);
    });

    it('should flag untrusted remote sources', async () => {
      const mockSource: IPackSource = {
        getSourceInfo: () => ({
          name: 'github-unknown',
          path: 'https://github.com/unknown/repo',
          type: 'local',
          trustLevel: 'untrusted',
        } as any),
        loadPack: jest.fn(),
        listPacks: jest.fn(),
        hasPack: jest.fn(),
        getComponentPath: jest.fn(),
        hasComponent: jest.fn(),
      };

      const result = await trustManager.validateSource(mockSource);

      expect(result.valid).toBe(true);
      expect(result.trusted).toBe(false);
      expect(result.requiresConsent).toBe(true);
      expect(result.warnings).toContain(
        'Source is not trusted and requires user consent'
      );
    });

    it('should block sources from blocked domains', async () => {
      await trustManager.updatePolicy({
        blockedDomains: ['evil.com'],
      });

      const mockSource: IPackSource = {
        getSourceInfo: () => ({
          name: 'evil-source',
          path: 'https://evil.com/packs',
          type: 'remote',
        } as any),
        loadPack: jest.fn(),
        listPacks: jest.fn(),
        hasPack: jest.fn(),
        getComponentPath: jest.fn(),
        hasComponent: jest.fn(),
      };

      const result = await trustManager.validateSource(mockSource);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Source domain evil.com is blocked');
    });
  });

  describe('pack validation', () => {
    let mockSource: IPackSource;
    let mockPack: PackStructure;

    beforeEach(async () => {
      mockFs.access.mockRejectedValue(new Error('Not found'));
      await trustManager.initialize();

      mockSource = {
        getSourceInfo: () => ({
          name: 'test-source',
          path: 'test',
          type: 'local',
        }),
        loadPack: jest.fn(),
        listPacks: jest.fn(),
        hasPack: jest.fn(),
        getComponentPath: jest.fn(),
        hasComponent: jest.fn(),
      };

      mockPack = {
        manifest: {
          name: 'test-pack',
          version: '1.0.0',
          description: 'Test pack',
          author: 'test-author',
          components: {
            modes: [],
            workflows: [],
            agents: [],
          },
        },
        path: '/test/pack',
      };
    });

    it('should trust packs from trusted authors', async () => {
      mockPack = {
        ...mockPack,
        manifest: {
          ...mockPack.manifest,
          author: 'zcc',
        },
      };

      const result = await trustManager.validatePack(mockPack, mockSource);

      expect(result.valid).toBe(true);
      expect(result.trusted).toBe(true);
    });

    it('should warn about hooks in untrusted packs', async () => {
      mockPack = {
        ...mockPack,
        manifest: {
          ...mockPack.manifest,
          hooks: [
            { name: 'test-hook', trigger: 'pre-install' },
          ],
        },
      };

      const result = await trustManager.validatePack(mockPack, mockSource);

      expect(result.warnings).toContain(
        'Pack registers 1 hooks that will modify Claude Code behavior'
      );
      expect(result.requiresConsent).toBe(true);
    });

    it('should warn about disabled post-install commands', async () => {
      mockPack = {
        ...mockPack,
        manifest: {
          ...mockPack.manifest,
          postInstall: {
            message: 'Run npm install',
            commands: ['npm install'],
          },
        },
      };

      const result = await trustManager.validatePack(mockPack, mockSource);

      expect(result.warnings).toContain(
        'Pack contains post-install commands (disabled for security)'
      );
    });
  });

  describe('audit trail', () => {
    beforeEach(async () => {
      mockFs.access.mockRejectedValue(new Error('Not found'));
      await trustManager.initialize();
    });

    it('should record installations', async () => {
      const mockSource: IPackSource = {
        getSourceInfo: () => ({
          name: 'test-source',
          path: 'test',
          type: 'local',
        }),
        loadPack: jest.fn(),
        listPacks: jest.fn(),
        hasPack: jest.fn(),
        getComponentPath: jest.fn(),
        hasComponent: jest.fn(),
      };

      const mockPack: PackStructure = {
        manifest: {
          name: 'test-pack',
          version: '1.0.0',
          description: 'Test',
          author: 'test',
          components: { modes: [], workflows: [], agents: [] },
        },
        path: '/test',
      };

      await trustManager.recordInstallation(mockSource, mockPack, true);

      const history = trustManager.getInstallationHistory('test-pack');
      expect(history).toHaveLength(1);
      expect(history[0].packName).toBe('test-pack');
      expect(history[0].action).toBe('installed');
      expect(history[0].userConsent).toBe(true);
    });
  });

  describe('threat scanning', () => {
    it('should detect suspicious patterns', async () => {
      const mockPack: PackStructure = {
        manifest: {
          name: 'malicious-pack',
          version: '1.0.0',
          description: 'Test',
          author: 'hacker',
          components: {
            modes: [{ name: 'eval-mode', required: true }],
            workflows: [{ name: 'rm -rf workflow', required: false }],
            agents: [{ name: 'curl-pipe-sh', required: false }],
          },
        },
        path: '/test',
      };

      const threats = await trustManager.scanPackForThreats(mockPack);

      expect(threats).toContain('Suspicious pattern in component name: eval-mode');
      expect(threats).toContain('Suspicious pattern in component name: rm -rf workflow');
      expect(threats.length).toBeGreaterThan(0);
    });
  });
});