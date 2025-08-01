import { createUpdateCommand } from '../update';
import { UpdateManager } from '../../lib/updateManager';
import { logger } from '../../lib/logger';

jest.mock('../../lib/updateManager');
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  }
}));

describe('Update Command', () => {
  let mockUpdateManager: jest.Mocked<UpdateManager>;
  let originalExit: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateManager = {
      checkForUpdates: jest.fn(),
      updateComponent: jest.fn(),
      updateAll: jest.fn(),
      showDiff: jest.fn()
    } as any;

    (UpdateManager as jest.MockedClass<typeof UpdateManager>).mockImplementation(() => mockUpdateManager);
    
    originalExit = process.exit;
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  describe('check flag', () => {
    it('should show available updates', async () => {
      const updates = [
        {
          component: 'architect',
          type: 'mode' as const,
          currentVersion: '1.0.0',
          latestVersion: '1.1.0',
          hasLocalChanges: false
        },
        {
          component: 'review',
          type: 'workflow' as const,
          currentVersion: '1.0.0',
          latestVersion: '1.2.0',
          hasLocalChanges: true
        }
      ];

      mockUpdateManager.checkForUpdates.mockResolvedValue(updates);

      const cmd = createUpdateCommand();
      await cmd.parseAsync(['node', 'test', '--check']);

      expect(mockUpdateManager.checkForUpdates).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Checking for component updates...');
      expect(logger.info).toHaveBeenCalledWith('Found 2 update(s):\n');
      expect(logger.info).toHaveBeenCalledWith('  mode:architect - v1.0.0 → v1.1.0');
      expect(logger.info).toHaveBeenCalledWith('  workflow:review - v1.0.0 → v1.2.0 (has local changes)');
    });

    it('should report when all components are up to date', async () => {
      mockUpdateManager.checkForUpdates.mockResolvedValue([]);

      const cmd = createUpdateCommand();
      await cmd.parseAsync(['node', 'test', '--check']);

      expect(logger.success).toHaveBeenCalledWith('All components are up to date');
    });
  });

  describe('update specific component', () => {
    it('should update a specific component', async () => {
      const cmd = createUpdateCommand();
      await cmd.parseAsync(['node', 'test', 'mode:architect']);

      expect(mockUpdateManager.updateComponent).toHaveBeenCalledWith('mode', 'architect', false);
    });

    it('should force update with --force flag', async () => {
      const cmd = createUpdateCommand();
      await cmd.parseAsync(['node', 'test', 'mode:architect', '--force']);

      expect(mockUpdateManager.updateComponent).toHaveBeenCalledWith('mode', 'architect', true);
    });

    it('should handle invalid component format', async () => {
      const cmd = createUpdateCommand();
      await cmd.parseAsync(['node', 'test', 'invalid-format']);

      // Check that the error message contains the essential parts without being brittle
      const calls = (logger.error as jest.Mock).mock.calls;
      const errorCall = calls.find(call => call[0].includes('Invalid component format'));
      expect(errorCall).toBeDefined();
      expect(errorCall[0]).toMatch(/Invalid component format/);
      expect(errorCall[0]).toMatch(/mode.*name/);
      expect(errorCall[0]).toMatch(/workflow.*name/);
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('update all components', () => {
    it('should update all components', async () => {
      const cmd = createUpdateCommand();
      await cmd.parseAsync(['node', 'test']);

      expect(mockUpdateManager.updateAll).toHaveBeenCalledWith(false);
    });

    it('should force update all with --force flag', async () => {
      const cmd = createUpdateCommand();
      await cmd.parseAsync(['node', 'test', '--force']);

      expect(mockUpdateManager.updateAll).toHaveBeenCalledWith(true);
    });
  });

  describe('diff subcommand', () => {
    it('should show diff for a component', async () => {
      const cmd = createUpdateCommand();
      await cmd.parseAsync(['node', 'test', 'diff', 'mode:architect']);

      expect(mockUpdateManager.showDiff).toHaveBeenCalledWith('mode', 'architect');
    });

    it('should handle invalid component format in diff', async () => {
      const cmd = createUpdateCommand();
      await cmd.parseAsync(['node', 'test', 'diff', 'invalid']);

      // Check that the error message contains the essential parts without being brittle
      const calls = (logger.error as jest.Mock).mock.calls;
      const errorCall = calls.find(call => call[0].includes('Invalid component format'));
      expect(errorCall).toBeDefined();
      expect(errorCall[0]).toMatch(/Invalid component format/);
      expect(errorCall[0]).toMatch(/mode.*name/);
      expect(errorCall[0]).toMatch(/workflow.*name/);
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('error handling', () => {
    it('should handle errors in update operations', async () => {
      mockUpdateManager.updateAll.mockRejectedValue(new Error('Network error'));

      const cmd = createUpdateCommand();
      await cmd.parseAsync(['node', 'test']);

      expect(logger.error).toHaveBeenCalledWith('Update failed: Network error');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});