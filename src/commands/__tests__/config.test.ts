import { configCommand } from '../config';
import { DirectoryManager } from '../../lib/directoryManager';
import { ConfigManager } from '../../lib/configManager';
import { logger } from '../../lib/logger';

jest.mock('../../lib/directoryManager');
jest.mock('../../lib/configManager');
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  }
}));

describe('Config Command', () => {
  let mockDirManager: jest.Mocked<DirectoryManager>;
  let mockConfigManager: jest.Mocked<ConfigManager>;
  let originalExit: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDirManager = {
      isInitialized: jest.fn().mockReturnValue(true)
    } as any;

    mockConfigManager = {
      get: jest.fn(),
      set: jest.fn(),
      load: jest.fn(),
      save: jest.fn()
    } as any;

    (DirectoryManager as jest.MockedClass<typeof DirectoryManager>).mockImplementation(() => mockDirManager);
    (ConfigManager as jest.MockedClass<typeof ConfigManager>).mockImplementation(() => mockConfigManager);
    
    originalExit = process.exit;
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  describe('show all config', () => {
    it('should display all configuration when no key provided', async () => {
      const mockConfig = {
        defaultMode: 'architect',
        components: {
          modes: ['architect', 'engineer'],
          workflows: ['review']
        }
      };
      mockConfigManager.load.mockResolvedValue(mockConfig);

      await configCommand.parseAsync(['node', 'test']);

      expect(logger.info).toHaveBeenCalledWith('\nCurrent Configuration:');
      expect(logger.info).toHaveBeenCalledWith(JSON.stringify(mockConfig, null, 2));
    });

    it('should handle empty config', async () => {
      mockConfigManager.load.mockResolvedValue({});

      await configCommand.parseAsync(['node', 'test']);

      expect(logger.info).toHaveBeenCalledWith('\nCurrent Configuration:');
      expect(logger.info).toHaveBeenCalledWith('{}');
    });
  });

  describe('get specific config', () => {
    it('should get a specific config value', async () => {
      mockConfigManager.get.mockResolvedValue('architect');

      await configCommand.parseAsync(['node', 'test', 'defaultMode']);

      expect(mockConfigManager.get).toHaveBeenCalledWith('defaultMode');
      expect(logger.info).toHaveBeenCalledWith('defaultMode: architect');
    });

    it('should handle undefined config values', async () => {
      mockConfigManager.get.mockResolvedValue(undefined);

      await configCommand.parseAsync(['node', 'test', 'nonexistent']);

      expect(logger.info).toHaveBeenCalledWith('nonexistent: undefined');
    });

    it('should display complex values as JSON', async () => {
      mockConfigManager.get.mockResolvedValue({ modes: ['architect', 'engineer'] });

      await configCommand.parseAsync(['node', 'test', 'components']);

      expect(logger.info).toHaveBeenCalledWith('components: {"modes":["architect","engineer"]}');
    });
  });

  describe('set config', () => {
    it('should set a config value', async () => {
      await configCommand.parseAsync(['node', 'test', 'defaultMode', 'engineer']);

      expect(mockConfigManager.set).toHaveBeenCalledWith('defaultMode', 'engineer');
      expect(mockConfigManager.save).toHaveBeenCalled();
      expect(logger.success).toHaveBeenCalledWith('Configuration updated: defaultMode = engineer');
    });

    it('should handle JSON values', async () => {
      await configCommand.parseAsync(['node', 'test', 'components.modes', '["architect","reviewer"]']);

      expect(mockConfigManager.set).toHaveBeenCalledWith('components.modes', ['architect', 'reviewer']);
    });

    it('should handle boolean values', async () => {
      await configCommand.parseAsync(['node', 'test', 'experimental.enabled', 'true']);

      expect(mockConfigManager.set).toHaveBeenCalledWith('experimental.enabled', true);
    });

    it('should handle numeric values', async () => {
      await configCommand.parseAsync(['node', 'test', 'maxTickets', '10']);

      expect(mockConfigManager.set).toHaveBeenCalledWith('maxTickets', 10);
    });
  });

  describe('global config', () => {
    it('should handle global flag for get', async () => {
      mockConfigManager.get.mockResolvedValue('dark');

      await configCommand.parseAsync(['node', 'test', 'theme', '--global']);

      expect(mockConfigManager.get).toHaveBeenCalledWith('theme', true);
    });

    it('should handle global flag for set', async () => {
      await configCommand.parseAsync(['node', 'test', 'theme', 'light', '--global']);

      expect(mockConfigManager.set).toHaveBeenCalledWith('theme', 'light', true);
      expect(mockConfigManager.save).toHaveBeenCalledWith(expect.anything(), true);
    });
  });

  describe('error handling', () => {
    it('should error when not initialized', async () => {
      mockDirManager.isInitialized.mockReturnValue(false);

      await configCommand.parseAsync(['node', 'test']);

      expect(logger.error).toHaveBeenCalledWith('Memento Protocol is not initialized. Run "memento init" first.');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle errors in config operations', async () => {
      mockConfigManager.load.mockRejectedValue(new Error('File not found'));

      await configCommand.parseAsync(['node', 'test']);

      expect(logger.error).toHaveBeenCalledWith('Failed to manage configuration: File not found');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});