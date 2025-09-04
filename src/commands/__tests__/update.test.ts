import { createUpdateCommand } from '../update';
import { UpdateManager } from '../../lib/updateManager';
import { DirectoryManager } from '../../lib/directoryManager';
import { logger } from '../../lib/logger';

jest.mock('../../lib/updateManager');
jest.mock('../../lib/directoryManager');
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }
}));

describe('Update Command', () => {
  let mockUpdateManager: jest.Mocked<UpdateManager>;
  let mockDirectoryManager: jest.Mocked<DirectoryManager>;
  let originalExit: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateManager = {
      checkForUpdates: jest.fn(),
      updateComponent: jest.fn(),
      updateAll: jest.fn(),
      showDiff: jest.fn()
    } as any;
    
    mockDirectoryManager = {
      isInitialized: jest.fn().mockReturnValue(true),
    } as any;

    (UpdateManager as jest.MockedClass<typeof UpdateManager>).mockImplementation(() => mockUpdateManager);
    (DirectoryManager as jest.MockedClass<typeof DirectoryManager>).mockImplementation(() => mockDirectoryManager);
    
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

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid component format'));
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Expected format:'));
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Examples:'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });
    
    it('should handle invalid component type', async () => {
      const cmd = createUpdateCommand();
      await cmd.parseAsync(['node', 'test', 'invalid:architect']);

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid component type'));
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Valid types are: mode, workflow'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });
    
    it('should handle empty component name', async () => {
      const cmd = createUpdateCommand();
      await cmd.parseAsync(['node', 'test', 'mode:']);

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Component name cannot be empty'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });
    
    it('should handle too many colons in component format', async () => {
      const cmd = createUpdateCommand();
      await cmd.parseAsync(['node', 'test', 'mode:architect:extra']);

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid component format'));
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

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid component format'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });
    
    it('should handle zcc not initialized in diff', async () => {
      mockDirectoryManager.isInitialized.mockReturnValue(false);
      const cmd = createUpdateCommand();
      await cmd.parseAsync(['node', 'test', 'diff', 'mode:architect']);

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('zcc is not initialized'));
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Run \'zcc init\' to initialize'));
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
    
    it('should handle zcc not initialized error', async () => {
      mockDirectoryManager.isInitialized.mockReturnValue(false);
      const cmd = createUpdateCommand();
      await cmd.parseAsync(['node', 'test']);

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('zcc is not initialized'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });
    
    it('should handle component not installed error', async () => {
      mockUpdateManager.updateComponent.mockRejectedValue(
        new Error('mode \'architect\' is not installed.\nRun \'zcc add mode architect\' to install it first.')
      );
      
      const cmd = createUpdateCommand();
      await cmd.parseAsync(['node', 'test', 'mode:architect']);

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('mode \'architect\' is not installed'));
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Run \'zcc add mode architect\' to install'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });
    
    it('should handle local modifications error', async () => {
      mockUpdateManager.updateComponent.mockRejectedValue(
        new Error('mode \'architect\' has local modifications.\nUse --force to overwrite your changes')
      );
      
      const cmd = createUpdateCommand();
      await cmd.parseAsync(['node', 'test', 'mode:architect']);

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('local modifications'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });
    
    it('should handle template not found error', async () => {
      mockUpdateManager.updateComponent.mockRejectedValue(
        new Error('Template for mode \'architect\' not found.\nThe component may have been removed')
      );
      
      const cmd = createUpdateCommand();
      await cmd.parseAsync(['node', 'test', 'mode:architect']);

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Template for mode \'architect\' not found'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});