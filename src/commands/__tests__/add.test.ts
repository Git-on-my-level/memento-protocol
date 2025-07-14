import { addCommand } from '../add';
import { DirectoryManager } from '../../lib/directoryManager';
import { ComponentInstaller } from '../../lib/componentInstaller';
import { logger } from '../../lib/logger';

jest.mock('../../lib/directoryManager');
jest.mock('../../lib/componentInstaller');
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  }
}));

describe('Add Command', () => {
  let mockDirManager: jest.Mocked<DirectoryManager>;
  let mockInstaller: jest.Mocked<ComponentInstaller>;
  let originalExit: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDirManager = {
      isInitialized: jest.fn().mockReturnValue(true)
    } as any;

    mockInstaller = {
      installComponent: jest.fn(),
      interactiveInstall: jest.fn()
    } as any;

    (DirectoryManager as jest.MockedClass<typeof DirectoryManager>).mockImplementation(() => mockDirManager);
    (ComponentInstaller as jest.MockedClass<typeof ComponentInstaller>).mockImplementation(() => mockInstaller);
    
    originalExit = process.exit;
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  describe('add mode', () => {
    it('should install a specific mode', async () => {
      await addCommand.parseAsync(['node', 'test', 'mode', 'architect']);

      expect(mockInstaller.installComponent).toHaveBeenCalledWith('mode', 'architect');
    });

    it('should start interactive mode selection when no name provided', async () => {
      await addCommand.parseAsync(['node', 'test', 'mode']);

      expect(mockInstaller.interactiveInstall).toHaveBeenCalledWith('mode');
    });

    it('should handle installation errors', async () => {
      mockInstaller.installComponent.mockRejectedValue(new Error('Component not found'));

      await addCommand.parseAsync(['node', 'test', 'mode', 'invalid']);

      expect(logger.error).toHaveBeenCalledWith('Failed to add component: Component not found');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('add workflow', () => {
    it('should install a specific workflow', async () => {
      await addCommand.parseAsync(['node', 'test', 'workflow', 'review']);

      expect(mockInstaller.installComponent).toHaveBeenCalledWith('workflow', 'review');
    });

    it('should start interactive workflow selection when no name provided', async () => {
      await addCommand.parseAsync(['node', 'test', 'workflow']);

      expect(mockInstaller.interactiveInstall).toHaveBeenCalledWith('workflow');
    });
  });

  describe('validation', () => {
    it('should error when not initialized', async () => {
      mockDirManager.isInitialized.mockReturnValue(false);

      await addCommand.parseAsync(['node', 'test', 'mode', 'architect']);

      expect(logger.error).toHaveBeenCalledWith('Memento Protocol is not initialized. Run "memento init" first.');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle invalid component type', async () => {
      await addCommand.parseAsync(['node', 'test', 'invalid']);

      expect(process.exit).toHaveBeenCalled();
    });
  });
});