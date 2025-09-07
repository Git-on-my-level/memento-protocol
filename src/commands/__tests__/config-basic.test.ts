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

describe('Config Command Basic', () => {
  let mockDirManager: any;
  let mockConfigManager: any;
  let originalExit: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDirManager = {
      isInitialized: jest.fn().mockReturnValue(true)
    };

    mockConfigManager = {
      load: jest.fn().mockResolvedValue({}),
      get: jest.fn(),
      set: jest.fn(),
      save: jest.fn()
    };

    (DirectoryManager as jest.MockedClass<typeof DirectoryManager>).mockImplementation(() => mockDirManager);
    (ConfigManager as jest.MockedClass<typeof ConfigManager>).mockImplementation(() => mockConfigManager);
    
    originalExit = process.exit;
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  it('should handle basic get operations', async () => {
    mockConfigManager.get.mockResolvedValue('test-value');
    
    await configCommand.parseAsync(['node', 'test', 'get', 'someKey']);
    
    expect(mockConfigManager.get).toHaveBeenCalledWith('someKey');
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('someKey'));
  });

  it('should handle basic set operations', async () => {
    await configCommand.parseAsync(['node', 'test', 'set', 'someKey', 'someValue']);
    
    expect(mockConfigManager.set).toHaveBeenCalledWith('someKey', 'someValue', false);
    expect(logger.success).toHaveBeenCalledWith(expect.stringContaining('Configuration updated'));
  });
});