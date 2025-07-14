import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { LanguageOverrideManager } from '../languageOverrideManager';
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

describe('LanguageOverrideManager Coverage', () => {
  let languageManager: LanguageOverrideManager;
  const mockProjectRoot = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.replaceProperty(require, 'main', { filename: '/test/cli.js' });
    
    (DirectoryManager as jest.MockedClass<typeof DirectoryManager>).mockImplementation(() => ({
      getComponentPath: jest.fn().mockReturnValue('/test/.memento/languages/typescript.md'),
      getManifest: jest.fn().mockResolvedValue({ components: { languages: {} } }),
      updateManifest: jest.fn()
    } as any));
    
    languageManager = new LanguageOverrideManager(mockProjectRoot);
  });

  it('should detect Go project', async () => {
    const mockExistsSync = require('fs').existsSync as jest.Mock;
    mockExistsSync.mockImplementation((path: string) => path.endsWith('go.mod'));

    const result = await languageManager.detectProjectLanguage();
    expect(result).toBe('go');
  });

  it('should detect Rust project', async () => {
    const mockExistsSync = require('fs').existsSync as jest.Mock;
    mockExistsSync.mockImplementation((path: string) => path.endsWith('Cargo.toml'));

    const result = await languageManager.detectProjectLanguage();
    expect(result).toBe('rust');
  });

  it('should handle file read errors during language detection', async () => {
    const mockExistsSync = require('fs').existsSync as jest.Mock;
    mockExistsSync.mockImplementation((path: string) => path.endsWith('package.json'));
    
    (fs.readFile as jest.Mock).mockRejectedValue(new Error('Read error'));

    const result = await languageManager.detectProjectLanguage();
    expect(result).toBe('javascript');
  });

  it('should list available overrides from empty directory', async () => {
    const mockExistsSync = require('fs').existsSync as jest.Mock;
    mockExistsSync.mockReturnValue(false);

    const result = await languageManager.listAvailableOverrides();
    expect(result).toEqual([]);
  });

  it('should handle readdir errors', async () => {
    const mockExistsSync = require('fs').existsSync as jest.Mock;
    mockExistsSync.mockReturnValue(true);
    
    (fs.readdir as jest.Mock).mockRejectedValue(new Error('Read error'));

    const result = await languageManager.listAvailableOverrides();
    expect(result).toEqual([]);
  });
});