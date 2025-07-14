import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { ComponentInstaller } from '../componentInstaller';
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

describe('ComponentInstaller Coverage', () => {
  let installer: ComponentInstaller;
  let mockDirManager: any;
  const mockProjectRoot = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.replaceProperty(require, 'main', { filename: '/test/cli.js' });
    
    mockDirManager = {
      getManifest: jest.fn().mockResolvedValue({ 
        components: { 
          modes: [], 
          workflows: [], 
          updated: '' 
        } 
      }),
      updateManifest: jest.fn(),
      getComponentPath: jest.fn().mockReturnValue('/test/.memento/modes/test.md')
    };

    (DirectoryManager as jest.MockedClass<typeof DirectoryManager>).mockImplementation(() => mockDirManager);
    
    installer = new ComponentInstaller(mockProjectRoot);
  });

  it('should handle missing metadata gracefully', async () => {
    (existsSync as jest.Mock).mockReturnValue(false);
    
    const result = await installer.listAvailableComponents();
    
    expect(result.modes).toEqual([]);
    expect(result.workflows).toEqual([]);
  });

  it('should list installed components with defaults', async () => {
    mockDirManager.getManifest.mockResolvedValue({
      components: {
        // Missing modes and workflows properties
      }
    });

    const result = await installer.listInstalledComponents();
    
    expect(result.modes).toEqual([]);
    expect(result.workflows).toEqual([]);
  });
});