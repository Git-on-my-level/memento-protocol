import { ComponentInstaller } from '../componentInstaller';
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

describe('ComponentInstaller Basic', () => {
  let installer: ComponentInstaller;
  const mockProjectRoot = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
    
    (DirectoryManager as jest.MockedClass<typeof DirectoryManager>).mockImplementation(() => ({
      getManifest: jest.fn().mockResolvedValue({ components: { modes: [], workflows: [] } }),
      updateManifest: jest.fn(),
      getComponentPath: jest.fn()
    } as any));
    
    installer = new ComponentInstaller(mockProjectRoot);
  });

  it('should create instance correctly', () => {
    expect(installer).toBeDefined();
  });
});