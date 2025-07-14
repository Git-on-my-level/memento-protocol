import * as fs from 'fs/promises';
import { UpdateManager } from '../updateManager';
import { DirectoryManager } from '../directoryManager';

// Mock the modules
jest.mock('fs/promises');
jest.mock('fs');
jest.mock('../directoryManager');
jest.mock('../componentInstaller');
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('UpdateManager', () => {
  let updateManager: UpdateManager;
  const mockProjectRoot = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock require.main before creating the instance
    Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
    updateManager = new UpdateManager(mockProjectRoot);
  });

  afterEach(() => {
    delete (require as any).main;
  });

  describe('checkForUpdates', () => {
    it('should return empty array when all components are up to date', async () => {
      const mockManifest = {
        components: {
          modes: ['architect'],
          workflows: ['review']
        },
        versions: {
          modes: {
            architect: {
              name: 'architect',
              version: '1.0.0',
              hash: 'abc123',
              lastUpdated: '2024-01-01'
            }
          },
          workflows: {
            review: {
              name: 'review',
              version: '1.0.0',
              hash: 'def456',
              lastUpdated: '2024-01-01'
            }
          }
        }
      };

      (DirectoryManager.prototype.getManifest as jest.Mock).mockResolvedValue(mockManifest);
      
      // Mock file existence and content
      const mockExistsSync = require('fs').existsSync as jest.Mock;
      mockExistsSync.mockReturnValue(true);
      
      (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('architect.md')) {
          return Promise.resolve('architect content');
        }
        if (filePath.includes('review.md')) {
          return Promise.resolve('review content');
        }
        if (filePath.includes('metadata.json')) {
          return Promise.resolve(JSON.stringify({
            version: '1.0.0',
            components: [
              { name: 'architect', version: '1.0.0' },
              { name: 'review', version: '1.0.0' }
            ]
          }));
        }
        return Promise.resolve('');
      });

      const updates = await updateManager.checkForUpdates();
      expect(updates).toHaveLength(0);
    });

    it('should detect available updates', async () => {
      const mockManifest = {
        components: {
          modes: ['architect'],
          workflows: []
        },
        versions: {
          modes: {
            architect: {
              name: 'architect',
              version: '1.0.0',
              hash: 'abc123',
              lastUpdated: '2024-01-01'
            }
          }
        }
      };

      (DirectoryManager.prototype.getManifest as jest.Mock).mockResolvedValue(mockManifest);
      
      const mockExistsSync = require('fs').existsSync as jest.Mock;
      mockExistsSync.mockReturnValue(true);
      
      (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('architect.md') && filePath.includes('.memento')) {
          return Promise.resolve('old architect content');
        }
        if (filePath.includes('architect.md') && filePath.includes('templates')) {
          return Promise.resolve('new architect content');
        }
        if (filePath.includes('metadata.json')) {
          return Promise.resolve(JSON.stringify({
            version: '1.1.0',
            components: [
              { name: 'architect', version: '1.1.0' }
            ]
          }));
        }
        return Promise.resolve('');
      });

      const updates = await updateManager.checkForUpdates();
      expect(updates).toHaveLength(1);
      expect(updates[0]).toMatchObject({
        component: 'architect',
        type: 'mode',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        hasLocalChanges: true // Because hash doesn't match
      });
    });
  });

  describe('updateComponent', () => {
    it('should update a component successfully', async () => {
      const mockExistsSync = require('fs').existsSync as jest.Mock;
      mockExistsSync.mockReturnValue(true);

      const mockManifest = {
        components: {
          modes: ['architect'],
          workflows: []
        },
        versions: {
          modes: {
            architect: {
              name: 'architect',
              version: '1.0.0',
              hash: 'abc123',
              lastUpdated: '2024-01-01'
            }
          }
        }
      };

      (DirectoryManager.prototype.getManifest as jest.Mock).mockResolvedValue(mockManifest);
      (DirectoryManager.prototype.updateManifest as jest.Mock).mockResolvedValue(undefined);
      (DirectoryManager.prototype.getComponentPath as jest.Mock).mockReturnValue('/test/.memento/modes/architect.md');

      (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('architect.md') && filePath.includes('.memento')) {
          return Promise.resolve('old content');
        }
        if (filePath.includes('architect.md') && filePath.includes('templates')) {
          return Promise.resolve('new content');
        }
        if (filePath.includes('metadata.json')) {
          return Promise.resolve(JSON.stringify({
            version: '1.1.0',
            components: [
              { name: 'architect', version: '1.1.0' }
            ]
          }));
        }
        return Promise.resolve('');
      });

      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

      await updateManager.updateComponent('mode', 'architect');

      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/.memento/modes/architect.md',
        'new content'
      );
    });

    it('should throw error if component is not installed', async () => {
      const mockExistsSync = require('fs').existsSync as jest.Mock;
      mockExistsSync.mockReturnValue(false);

      (DirectoryManager.prototype.getComponentPath as jest.Mock).mockReturnValue('/test/.memento/modes/missing.md');

      await expect(updateManager.updateComponent('mode', 'missing')).rejects.toThrow(
        "mode 'missing' is not installed"
      );
    });

    it('should warn about local changes without force flag', async () => {
      const mockExistsSync = require('fs').existsSync as jest.Mock;
      mockExistsSync.mockReturnValue(true);

      const mockManifest = {
        components: {
          modes: ['architect'],
          workflows: []
        },
        versions: {
          modes: {
            architect: {
              name: 'architect',
              version: '1.0.0',
              hash: 'abc123',
              lastUpdated: '2024-01-01'
            }
          }
        }
      };

      (DirectoryManager.prototype.getManifest as jest.Mock).mockResolvedValue(mockManifest);
      (DirectoryManager.prototype.getComponentPath as jest.Mock).mockReturnValue('/test/.memento/modes/architect.md');

      (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('architect.md') && filePath.includes('.memento')) {
          return Promise.resolve('modified content');
        }
        if (filePath.includes('architect.md') && filePath.includes('templates')) {
          return Promise.resolve('new content');
        }
        if (filePath.includes('metadata.json')) {
          return Promise.resolve(JSON.stringify({
            version: '1.1.0',
            components: [
              { name: 'architect', version: '1.1.0' }
            ]
          }));
        }
        return Promise.resolve('');
      });

      const { logger } = require('../logger');
      await updateManager.updateComponent('mode', 'architect', false);

      expect(logger.warn).toHaveBeenCalledWith(
        "mode 'architect' has local modifications. Use --force to overwrite."
      );
    });
  });

  describe('updateAll', () => {
    it('should update all components with available updates', async () => {
      const mockManifest = {
        components: {
          modes: ['architect', 'engineer'],
          workflows: ['review']
        },
        versions: {
          modes: {
            architect: {
              name: 'architect',
              version: '1.0.0',
              hash: 'abc123',
              lastUpdated: '2024-01-01'
            },
            engineer: {
              name: 'engineer',
              version: '1.0.0',
              hash: 'def456',
              lastUpdated: '2024-01-01'
            }
          },
          workflows: {
            review: {
              name: 'review',
              version: '1.0.0',
              hash: 'ghi789',
              lastUpdated: '2024-01-01'
            }
          }
        }
      };

      (DirectoryManager.prototype.getManifest as jest.Mock).mockResolvedValue(mockManifest);
      (DirectoryManager.prototype.updateManifest as jest.Mock).mockResolvedValue(undefined);
      (DirectoryManager.prototype.getComponentPath as jest.Mock).mockImplementation((type, name) => {
        return `/test/.memento/${type}/${name}.md`;
      });

      const mockExistsSync = require('fs').existsSync as jest.Mock;
      mockExistsSync.mockReturnValue(true);

      (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('metadata.json')) {
          return Promise.resolve(JSON.stringify({
            version: '1.1.0',
            components: [
              { name: 'architect', version: '1.1.0' },
              { name: 'engineer', version: '1.0.0' }, // No update
              { name: 'review', version: '1.1.0' }
            ]
          }));
        }
        if (filePath.includes('templates')) {
          return Promise.resolve('new content');
        }
        return Promise.resolve('old content');
      });

      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

      await updateManager.updateAll();

      // Should update architect and review, but not engineer
      expect(fs.writeFile).toHaveBeenCalledTimes(4); // 2 component updates + 2 manifest updates
    });

    it('should log when all components are up to date', async () => {
      const mockManifest = {
        components: {
          modes: [],
          workflows: []
        }
      };

      (DirectoryManager.prototype.getManifest as jest.Mock).mockResolvedValue(mockManifest);

      const { logger } = require('../logger');
      await updateManager.updateAll();

      expect(logger.info).toHaveBeenCalledWith('All components are up to date');
    });
  });

  describe('showDiff', () => {
    it('should show diff when component has changes', async () => {
      const mockExistsSync = require('fs').existsSync as jest.Mock;
      mockExistsSync.mockReturnValue(true);

      (DirectoryManager.prototype.getComponentPath as jest.Mock).mockReturnValue('/test/.memento/modes/architect.md');

      (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('.memento')) {
          return Promise.resolve('current content');
        }
        if (filePath.includes('templates')) {
          return Promise.resolve('template content');
        }
        return Promise.resolve('');
      });

      const { logger } = require('../logger');
      await updateManager.showDiff('mode', 'architect');

      expect(logger.info).toHaveBeenCalledWith("mode 'architect' has differences from the latest template");
    });

    it('should indicate when component is up to date', async () => {
      const mockExistsSync = require('fs').existsSync as jest.Mock;
      mockExistsSync.mockReturnValue(true);

      (DirectoryManager.prototype.getComponentPath as jest.Mock).mockReturnValue('/test/.memento/modes/architect.md');

      (fs.readFile as jest.Mock).mockResolvedValue('same content');

      const { logger } = require('../logger');
      await updateManager.showDiff('mode', 'architect');

      expect(logger.info).toHaveBeenCalledWith("mode 'architect' is up to date");
    });
  });
});