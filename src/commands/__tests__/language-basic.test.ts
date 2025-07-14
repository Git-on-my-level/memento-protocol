import { createLanguageCommand } from '../language';
import { LanguageOverrideManager } from '../../lib/languageOverrideManager';
import { DirectoryManager } from '../../lib/directoryManager';
import { logger } from '../../lib/logger';

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
jest.mock('inquirer');

describe('Language Command Basic', () => {
  let mockLanguageManager: any;
  let mockDirManager: any;
  let originalExit: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLanguageManager = {
      detectProjectLanguage: jest.fn(),
      listAvailableOverrides: jest.fn().mockResolvedValue([]),
      installLanguageOverride: jest.fn()
    };

    mockDirManager = {
      isInitialized: jest.fn().mockReturnValue(true)
    };

    (LanguageOverrideManager as jest.MockedClass<typeof LanguageOverrideManager>).mockImplementation(() => mockLanguageManager);
    (DirectoryManager as jest.MockedClass<typeof DirectoryManager>).mockImplementation(() => mockDirManager);
    
    originalExit = process.exit;
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  it('should detect language successfully', async () => {
    mockLanguageManager.detectProjectLanguage.mockResolvedValue('javascript');
    
    const cmd = createLanguageCommand();
    await cmd.parseAsync(['node', 'test', 'detect']);
    
    expect(logger.success).toHaveBeenCalledWith('Detected language: javascript');
  });

  it('should list available overrides', async () => {
    mockLanguageManager.listAvailableOverrides.mockResolvedValue(['typescript', 'python']);
    
    const cmd = createLanguageCommand();
    await cmd.parseAsync(['node', 'test', 'list']);
    
    expect(logger.info).toHaveBeenCalledWith('Available language overrides:');
    expect(logger.info).toHaveBeenCalledWith('  - typescript');
    expect(logger.info).toHaveBeenCalledWith('  - python');
  });
});