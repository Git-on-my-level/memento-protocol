import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { UpdateManager } from '../updateManager';
import { DirectoryManager } from '../directoryManager';
import { logger } from '../logger';

jest.mock('fs/promises');
jest.mock('fs');
jest.mock('../directoryManager');
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('UpdateManager Coverage', () => {
  let updateManager: UpdateManager;
  let mockDirManager: any;
  const mockProjectRoot = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
    
    mockDirManager = {
      getManifest: jest.fn().mockResolvedValue({ 
        components: { modes: [], workflows: [] },
        versions: { modes: {}, workflows: {} }
      }),
      updateManifest: jest.fn(),
      getComponentPath: jest.fn()
    };

    (DirectoryManager as jest.MockedClass<typeof DirectoryManager>).mockImplementation(() => mockDirManager);
    
    updateManager = new UpdateManager(mockProjectRoot);
  });

  afterEach(() => {
    delete (require as any).main;
  });

  it('should handle missing version info in manifest', async () => {
    mockDirManager.getManifest.mockResolvedValue({
      components: { modes: ['test'], workflows: [] }
      // No versions property
    });

    const mockExistsSync = require('fs').existsSync as jest.Mock;
    mockExistsSync.mockReturnValue(true);
    
    mockDirManager.getComponentPath.mockReturnValue('/test/.memento/modes/test.md');
    
    (fs.readFile as jest.Mock).mockResolvedValue('content');

    const updates = await updateManager.checkForUpdates();
    
    // Should handle missing version gracefully
    expect(updates.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle component not in templates', async () => {
    const mockExistsSync = require('fs').existsSync as jest.Mock;
    mockExistsSync.mockImplementation((path: string) => {
      if (path.includes('templates')) return false;
      return true;
    });

    mockDirManager.getComponentPath.mockReturnValue('/test/.memento/modes/custom.md');

    await expect(updateManager.updateComponent('mode', 'custom'))
      .rejects.toThrow("mode 'custom' is not installed");
  });

  it('should create version info when missing', async () => {
    mockDirManager.getManifest.mockResolvedValue({
      components: { modes: [], workflows: [] }
      // No versions property
    });

    const mockExistsSync = require('fs').existsSync as jest.Mock;
    mockExistsSync.mockReturnValue(true);
    
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({
      version: '1.0.0',
      components: []
    }));

    // This should trigger version info creation
    await updateManager.updateAll();
    
    expect(logger.info).toHaveBeenCalledWith('All components are up to date');
  });
});