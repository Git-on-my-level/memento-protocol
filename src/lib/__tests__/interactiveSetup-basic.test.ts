import { InteractiveSetup } from '../interactiveSetup';
import { ComponentInstaller } from '../componentInstaller';
import { ConfigManager } from '../configManager';
import { LanguageOverrideManager } from '../languageOverrideManager';

jest.mock('inquirer', () => ({
  prompt: jest.fn()
}));
jest.mock('../componentInstaller');
jest.mock('../configManager');
jest.mock('../languageOverrideManager');
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('InteractiveSetup Basic', () => {
  let interactiveSetup: InteractiveSetup;
  const mockProjectRoot = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();
    (ComponentInstaller as jest.MockedClass<typeof ComponentInstaller>).mockImplementation(() => ({} as any));
    (ConfigManager as jest.MockedClass<typeof ConfigManager>).mockImplementation(() => ({} as any));
    (LanguageOverrideManager as jest.MockedClass<typeof LanguageOverrideManager>).mockImplementation(() => ({} as any));
    
    interactiveSetup = new InteractiveSetup(mockProjectRoot);
  });

  it('should create instance correctly', () => {
    expect(interactiveSetup).toBeDefined();
  });
});