import { createLanguageCommand } from '../language';
import { LanguageOverrideManager } from '../../lib/languageOverrideManager';
import { DirectoryManager } from '../../lib/directoryManager';
import { logger } from '../../lib/logger';
import inquirer from 'inquirer';

jest.mock('inquirer', () => ({
  prompt: jest.fn()
}));
jest.mock('../../lib/languageOverrideManager');
jest.mock('../../lib/directoryManager');
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('Language Command', () => {
  let mockLanguageManager: jest.Mocked<LanguageOverrideManager>;
  let mockDirManager: jest.Mocked<DirectoryManager>;
  let originalExit: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLanguageManager = {
      detectProjectLanguage: jest.fn(),
      listAvailableOverrides: jest.fn(),
      installLanguageOverride: jest.fn()
    } as any;

    mockDirManager = {
      isInitialized: jest.fn().mockReturnValue(true)
    } as any;

    (LanguageOverrideManager as jest.MockedClass<typeof LanguageOverrideManager>).mockImplementation(() => mockLanguageManager);
    (DirectoryManager as jest.MockedClass<typeof DirectoryManager>).mockImplementation(() => mockDirManager);
    
    originalExit = process.exit;
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  describe('main command', () => {
    it('should auto-detect and install language override', async () => {
      mockLanguageManager.detectProjectLanguage.mockResolvedValue('typescript');
      (inquirer.prompt as jest.Mock).mockResolvedValue({ install: true });

      const cmd = createLanguageCommand();
      await cmd.parseAsync(['node', 'test']);

      expect(logger.info).toHaveBeenCalledWith('Detected project language: typescript');
      expect(mockLanguageManager.installLanguageOverride).toHaveBeenCalledWith('typescript');
    });

    it('should handle when no language is detected', async () => {
      mockLanguageManager.detectProjectLanguage.mockResolvedValue(null);
      mockLanguageManager.listAvailableOverrides.mockResolvedValue(['typescript', 'python']);
      (inquirer.prompt as jest.Mock).mockResolvedValue({ language: 'python' });

      const cmd = createLanguageCommand();
      await cmd.parseAsync(['node', 'test']);

      expect(logger.warn).toHaveBeenCalledWith('Could not detect project language');
      expect(mockLanguageManager.installLanguageOverride).toHaveBeenCalledWith('python');
    });

    it('should handle when user declines installation', async () => {
      mockLanguageManager.detectProjectLanguage.mockResolvedValue('typescript');
      (inquirer.prompt as jest.Mock).mockResolvedValue({ install: false });

      const cmd = createLanguageCommand();
      await cmd.parseAsync(['node', 'test']);

      expect(mockLanguageManager.installLanguageOverride).not.toHaveBeenCalled();
    });

    it('should show error when not initialized', async () => {
      mockDirManager.isInitialized.mockReturnValue(false);

      const cmd = createLanguageCommand();
      await cmd.parseAsync(['node', 'test']);

      expect(logger.error).toHaveBeenCalledWith('Memento Protocol is not initialized. Run "memento init" first.');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle installation errors', async () => {
      mockLanguageManager.detectProjectLanguage.mockResolvedValue('typescript');
      mockLanguageManager.installLanguageOverride.mockRejectedValue(new Error('Not found'));
      mockLanguageManager.listAvailableOverrides.mockResolvedValue(['python', 'javascript']);
      (inquirer.prompt as jest.Mock).mockResolvedValue({ install: true });

      const cmd = createLanguageCommand();
      await cmd.parseAsync(['node', 'test']);

      expect(logger.error).toHaveBeenCalledWith('Not found');
      expect(logger.info).toHaveBeenCalledWith('Available language overrides:');
      expect(logger.info).toHaveBeenCalledWith('  - python');
      expect(logger.info).toHaveBeenCalledWith('  - javascript');
    });
  });

  describe('detect subcommand', () => {
    it('should detect and display project language', async () => {
      mockLanguageManager.detectProjectLanguage.mockResolvedValue('python');

      const cmd = createLanguageCommand();
      await cmd.parseAsync(['node', 'test', 'detect']);

      expect(logger.success).toHaveBeenCalledWith('Detected language: python');
    });

    it('should warn when no language detected', async () => {
      mockLanguageManager.detectProjectLanguage.mockResolvedValue(null);

      const cmd = createLanguageCommand();
      await cmd.parseAsync(['node', 'test', 'detect']);

      expect(logger.warn).toHaveBeenCalledWith('Could not detect project language');
    });
  });

  describe('list subcommand', () => {
    it('should list available language overrides', async () => {
      mockLanguageManager.listAvailableOverrides.mockResolvedValue(['typescript', 'python', 'go']);

      const cmd = createLanguageCommand();
      await cmd.parseAsync(['node', 'test', 'list']);

      expect(logger.info).toHaveBeenCalledWith('Available language overrides:');
      expect(logger.info).toHaveBeenCalledWith('  - typescript');
      expect(logger.info).toHaveBeenCalledWith('  - python');
      expect(logger.info).toHaveBeenCalledWith('  - go');
    });

    it('should handle empty list', async () => {
      mockLanguageManager.listAvailableOverrides.mockResolvedValue([]);

      const cmd = createLanguageCommand();
      await cmd.parseAsync(['node', 'test', 'list']);

      expect(logger.info).toHaveBeenCalledWith('No language overrides available');
    });
  });

  describe('install subcommand', () => {
    it('should install specific language override', async () => {
      const cmd = createLanguageCommand();
      await cmd.parseAsync(['node', 'test', 'install', 'rust']);

      expect(mockLanguageManager.installLanguageOverride).toHaveBeenCalledWith('rust');
    });

    it('should handle installation errors', async () => {
      mockLanguageManager.installLanguageOverride.mockRejectedValue(new Error('Invalid language'));

      const cmd = createLanguageCommand();
      await cmd.parseAsync(['node', 'test', 'install', 'cobol']);

      expect(logger.error).toHaveBeenCalledWith('Installation failed: Invalid language');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should check initialization before install', async () => {
      mockDirManager.isInitialized.mockReturnValue(false);

      const cmd = createLanguageCommand();
      await cmd.parseAsync(['node', 'test', 'install', 'python']);

      expect(logger.error).toHaveBeenCalledWith('Memento Protocol is not initialized. Run "memento init" first.');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});