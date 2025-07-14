import * as fs from 'fs/promises';
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
    jest.replaceProperty(require, 'main', { filename: '/test/cli.js' });
    updateManager = new UpdateManager(mockProjectRoot);
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