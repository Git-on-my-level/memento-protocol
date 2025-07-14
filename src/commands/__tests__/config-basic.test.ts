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
    expect(logger.info).toHaveBeenCalledWith('someKey = "test-value"');
  });

  it('should handle basic set operations', async () => {
    await configCommand.parseAsync(['node', 'test', 'set', 'someKey', 'someValue']);
    
    expect(mockConfigManager.set).toHaveBeenCalledWith('someKey', 'someValue', false);
    expect(logger.success).toHaveBeenCalledWith('Configuration updated: someKey = "someValue"');
  });
});