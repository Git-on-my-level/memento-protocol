import { UpdateManager } from '../updateManager';
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

describe('UpdateManager Basic', () => {
  let updateManager: UpdateManager;
  const mockProjectRoot = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(require, 'main', { value: { filename: '/test/cli.js' }, configurable: true });
    updateManager = new UpdateManager(mockProjectRoot);
  });

  afterEach(() => {
    delete (require as any).main;
  });

  it('should create instance correctly', () => {
    expect(updateManager).toBeDefined();
  });

  it('should handle showDiff errors gracefully', async () => {
    const mockExistsSync = require('fs').existsSync as jest.Mock;
    mockExistsSync.mockReturnValue(false);

    (DirectoryManager.prototype.getComponentPath as jest.Mock).mockReturnValue('/test/.memento/modes/architect.md');

    await expect(updateManager.showDiff('mode', 'architect'))
      .rejects.toThrow("mode 'architect' is not installed");
  });
});