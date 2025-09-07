import { configCommand } from '../config';
import { DirectoryManager } from '../../lib/directoryManager';
import { ConfigManager, ZccConfig } from '../../lib/configManager';
import { logger } from '../../lib/logger';

jest.mock('../../lib/directoryManager');
jest.mock('../../lib/configManager');
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    setVerbose: jest.fn(),
    setDebug: jest.fn(),
    setNoColor: jest.fn(),
    space: jest.fn(),
    newline: jest.fn(),
    progress: jest.fn(),
    clearProgress: jest.fn(),
  },
  getChalk: jest.fn(() => ({
    green: (s: string) => s,
    red: (s: string) => s,
    yellow: (s: string) => s,
    blue: (s: string) => s,
    cyan: (s: string) => s,
    gray: (s: string) => s,
    bold: (s: string) => s,
    dim: (s: string) => s,
  })),
  configureChalk: jest.fn(),
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
      unset: jest.fn(),
      list: jest.fn(),
      load: jest.fn(),
      save: jest.fn()
    } as any;

    (DirectoryManager as jest.MockedClass<typeof DirectoryManager>).mockImplementation(() => mockDirManager);
    (ConfigManager as jest.MockedClass<typeof ConfigManager>).mockImplementation(() => mockConfigManager);
    
    originalExit = process.exit;
    process.exit = jest.fn() as any;
    
    // Reset process.exitCode
    process.exitCode = 0;
  });

  afterEach(() => {
    process.exit = originalExit;
    process.exitCode = 0;
  });

  describe('list subcommand', () => {
    it('should display all configuration', async () => {
      const mockConfig = {
        defaultMode: 'architect',
        components: {
          modes: ['architect', 'engineer'],
          workflows: ['review']
        }
      };
      mockConfigManager.list.mockResolvedValue(mockConfig);

      await configCommand.parseAsync(['node', 'test', 'list']);

      expect(mockConfigManager.list).toHaveBeenCalledWith(false);
      expect(logger.info).toHaveBeenCalledWith(JSON.stringify(mockConfig, null, 2));
    });

    it('should handle empty config', async () => {
      mockConfigManager.list.mockResolvedValue({});

      await configCommand.parseAsync(['node', 'test', 'list']);

      expect(logger.info).toHaveBeenCalledWith('No configuration values set');
    });

    it('should handle global flag for list', async () => {
      const mockConfig: ZccConfig = { defaultMode: 'architect' };
      mockConfigManager.list.mockResolvedValue(mockConfig);

      await configCommand.parseAsync(['node', 'test', 'list', '--global']);

      expect(mockConfigManager.list).toHaveBeenCalledWith(true);
    });
  });

  describe('get subcommand', () => {
    it('should get a specific config value', async () => {
      mockConfigManager.get.mockResolvedValue('architect');

      await configCommand.parseAsync(['node', 'test', 'get', 'defaultMode']);

      expect(mockConfigManager.get).toHaveBeenCalledWith('defaultMode');
      expect(logger.info).toHaveBeenCalledWith('defaultMode = "architect"');
    });

    it('should handle undefined config values', async () => {
      mockConfigManager.get.mockResolvedValue(undefined);

      await configCommand.parseAsync(['node', 'test', 'get', 'nonexistent']);

      expect(logger.info).toHaveBeenCalledWith("Configuration key 'nonexistent' is not set");
    });

    it('should display complex values as JSON', async () => {
      mockConfigManager.get.mockResolvedValue({ modes: ['architect', 'engineer'] });

      await configCommand.parseAsync(['node', 'test', 'get', 'components']);

      expect(logger.info).toHaveBeenCalledWith('components = {\n  "modes": [\n    "architect",\n    "engineer"\n  ]\n}');
    });
  });

  describe('set subcommand', () => {
    it('should set a config value', async () => {
      await configCommand.parseAsync(['node', 'test', 'set', 'defaultMode', 'engineer']);

      expect(mockConfigManager.set).toHaveBeenCalledWith('defaultMode', 'engineer', false);
      expect(logger.success).toHaveBeenCalledWith('Configuration updated: defaultMode = "engineer"');
    });

    it('should handle JSON values', async () => {
      await configCommand.parseAsync(['node', 'test', 'set', 'components.modes', '["architect","reviewer"]']);

      expect(mockConfigManager.set).toHaveBeenCalledWith('components.modes', ['architect', 'reviewer'], false);
      expect(logger.success).toHaveBeenCalledWith('Configuration updated: components.modes = ["architect","reviewer"]');
    });

    it('should handle boolean values', async () => {
      await configCommand.parseAsync(['node', 'test', 'set', 'experimental.enabled', 'true']);

      expect(mockConfigManager.set).toHaveBeenCalledWith('experimental.enabled', true, false);
    });

    it('should handle numeric values', async () => {
      await configCommand.parseAsync(['node', 'test', 'set', 'maxTickets', '10']);

      expect(mockConfigManager.set).toHaveBeenCalledWith('maxTickets', 10, false);
    });

    it('should handle global flag for set', async () => {
      await configCommand.parseAsync(['node', 'test', 'set', 'theme', 'light', '--global']);

      expect(mockConfigManager.set).toHaveBeenCalledWith('theme', 'light', true);
    });
  });

  describe('unset subcommand', () => {
    it('should unset a config value', async () => {
      await configCommand.parseAsync(['node', 'test', 'unset', 'defaultMode']);

      expect(mockConfigManager.unset).toHaveBeenCalledWith('defaultMode', false);
      expect(logger.success).toHaveBeenCalledWith("Configuration key 'defaultMode' removed");
    });

    it('should handle global flag for unset', async () => {
      await configCommand.parseAsync(['node', 'test', 'unset', 'theme', '--global']);

      expect(mockConfigManager.unset).toHaveBeenCalledWith('theme', true);
    });
  });

  describe('error handling', () => {
    it('should handle errors in get operations', async () => {
      mockConfigManager.get.mockRejectedValue(new Error('File not found'));

      await configCommand.parseAsync(['node', 'test', 'get', 'someKey']);

      expect(logger.error).toHaveBeenCalledWith('Failed to get configuration: Error: File not found');
      expect(process.exitCode).toBe(1);
    });

    it('should handle errors in set operations', async () => {
      mockConfigManager.set.mockRejectedValue(new Error('Permission denied'));

      await configCommand.parseAsync(['node', 'test', 'set', 'key', 'value']);

      expect(logger.error).toHaveBeenCalledWith('Failed to set configuration: Error: Permission denied');
      expect(process.exitCode).toBe(1);
    });

    it('should handle errors in list operations', async () => {
      mockConfigManager.list.mockRejectedValue(new Error('Config error'));

      await configCommand.parseAsync(['node', 'test', 'list']);

      expect(logger.error).toHaveBeenCalledWith('Failed to list configuration: Error: Config error');
      expect(process.exitCode).toBe(1);
    });
  });
});