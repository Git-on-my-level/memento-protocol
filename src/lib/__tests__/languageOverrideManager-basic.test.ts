import { LanguageOverrideManager } from '../languageOverrideManager';
import { DirectoryManager } from '../directoryManager';

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

describe('LanguageOverrideManager Basic', () => {
  let languageManager: LanguageOverrideManager;
  const mockProjectRoot = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.replaceProperty(require, 'main', { filename: '/test/cli.js' });
    
    (DirectoryManager as jest.MockedClass<typeof DirectoryManager>).mockImplementation(() => ({
      getComponentPath: jest.fn()
    } as any));
    
    languageManager = new LanguageOverrideManager(mockProjectRoot);
  });

  it('should create instance correctly', () => {
    expect(languageManager).toBeDefined();
  });
});