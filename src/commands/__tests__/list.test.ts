import { listCommand } from '../list';
import { DirectoryManager } from '../../lib/directoryManager';
import { ComponentInstaller } from '../../lib/componentInstaller';
import { logger } from '../../lib/logger';

jest.mock('../../lib/directoryManager');
jest.mock('../../lib/componentInstaller');
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('List Command', () => {
  let mockDirManager: jest.Mocked<DirectoryManager>;
  let mockInstaller: jest.Mocked<ComponentInstaller>;
  let originalExit: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDirManager = {
      isInitialized: jest.fn().mockReturnValue(true),
      validateStructure: jest.fn()
    } as any;

    mockInstaller = {
      listInstalledComponents: jest.fn(),
      listAvailableComponents: jest.fn(),
      validateDependencies: jest.fn()
    } as any;

    (DirectoryManager as jest.MockedClass<typeof DirectoryManager>).mockImplementation(() => mockDirManager);
    (ComponentInstaller as jest.MockedClass<typeof ComponentInstaller>).mockImplementation(() => mockInstaller);
    
    originalExit = process.exit;
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  describe('list available components (default)', () => {
    it('should list available components by default', async () => {
      mockInstaller.listAvailableComponents.mockResolvedValue({
        modes: [
          { name: 'architect', description: 'System design', tags: ['design'], dependencies: [] },
          { name: 'engineer', description: 'Implementation', tags: ['code'], dependencies: [] }
        ],
        workflows: [
          { name: 'review', description: 'Code review', tags: ['quality'], dependencies: ['reviewer'] }
        ],
        agents: []
      });

      await listCommand.parseAsync(['node', 'test']);

      expect(logger.info).toHaveBeenCalledWith('Available components:');
      expect(logger.info).toHaveBeenCalledWith('Modes:');
      expect(logger.info).toHaveBeenCalledWith('  - architect: System design');
      expect(logger.info).toHaveBeenCalledWith('  - engineer: Implementation');
      expect(logger.info).toHaveBeenCalledWith('Workflows:');
      expect(logger.info).toHaveBeenCalledWith('  - review: Code review');
    });
  });

  describe('list installed components', () => {
    it('should list installed modes and workflows with --installed flag', async () => {
      mockDirManager.isInitialized.mockReturnValue(true);
      mockInstaller.listInstalledComponents.mockResolvedValue({
        modes: ['architect', 'engineer'],
        workflows: ['review', 'refactor'],
        agents: []
      });

      await listCommand.parseAsync(['node', 'test', '--installed']);

      expect(logger.info).toHaveBeenCalledWith('Installed components:');
      expect(logger.info).toHaveBeenCalledWith('Modes:');
      expect(logger.info).toHaveBeenCalledWith('  - architect');
      expect(logger.info).toHaveBeenCalledWith('  - engineer');
      expect(logger.info).toHaveBeenCalledWith('Workflows:');
      expect(logger.info).toHaveBeenCalledWith('  - review');
      expect(logger.info).toHaveBeenCalledWith('  - refactor');
    });

    it('should handle no installed components', async () => {
      mockDirManager.isInitialized.mockReturnValue(true);
      mockInstaller.listInstalledComponents.mockResolvedValue({
        modes: [],
        workflows: [],
        agents: []
      });

      await listCommand.parseAsync(['node', 'test', '--installed']);

      expect(logger.info).toHaveBeenCalledWith('No components installed yet.');
      
      // Check that the help message contains essential parts without being brittle about exact wording
      const calls = (logger.info as jest.Mock).mock.calls;
      const helpMessage = calls.find(call => call[0].includes('memento add') && call[0].includes('to get started'));
      expect(helpMessage).toBeDefined();
      expect(helpMessage[0]).toMatch(/memento add mode/);
      expect(helpMessage[0]).toMatch(/memento add workflow/);
      expect(helpMessage[0]).toMatch(/to get started/);
    });

    it('should error when not initialized', async () => {
      mockDirManager.isInitialized.mockReturnValue(false);

      await listCommand.parseAsync(['node', 'test', '--installed']);

      expect(logger.error).toHaveBeenCalledWith('Memento Protocol is not initialized in this project.');
      expect(logger.info).toHaveBeenCalledWith('Run "memento init" first.');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('error handling', () => {
    it('should handle errors in listing', async () => {
      mockInstaller.listAvailableComponents.mockRejectedValue(new Error('Read error'));

      await listCommand.parseAsync(['node', 'test']);

      expect(logger.error).toHaveBeenCalledWith('Failed to list components:', expect.any(Error));
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});