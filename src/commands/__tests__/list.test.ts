import { listCommand } from '../list';
import { MementoCore } from '../../lib/MementoCore';
import { logger } from '../../lib/logger';

jest.mock('../../lib/MementoCore');
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    progress: jest.fn(),
    clearProgress: jest.fn(),
    step: jest.fn(),
  }
}));

describe('List Command', () => {
  let mockCore: jest.Mocked<MementoCore>;
  let originalExit: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockCore = {
      getStatus: jest.fn(),
      listComponentsWithSource: jest.fn(),
      hasProjectScope: jest.fn().mockReturnValue(true),
      hasGlobalScope: jest.fn().mockReturnValue(true)
    } as any;

    (MementoCore as jest.MockedClass<typeof MementoCore>).mockImplementation(() => mockCore);
    
    originalExit = process.exit;
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  describe('list components (default)', () => {
    it('should show status summary and components by default', async () => {
      mockCore.getStatus.mockResolvedValue({
        builtin: { available: true, path: '/templates', components: 15 },
        global: { exists: true, path: '/global/.memento', components: 2, hasConfig: true },
        project: { exists: true, path: '/project/.memento', components: 3, hasConfig: true },
        totalComponents: 20,
        uniqueComponents: 18
      });
      
      mockCore.listComponentsWithSource.mockResolvedValue({
        modes: [
          { 
            component: { name: 'architect', type: 'mode', path: '/templates/modes/architect.md', metadata: { description: 'System design' } },
            source: 'builtin'
          },
          { 
            component: { name: 'engineer', type: 'mode', path: '/project/.memento/modes/engineer.md', metadata: { description: 'Implementation' } },
            source: 'project'
          }
        ],
        workflows: [
          { 
            component: { name: 'review', type: 'workflow', path: '/global/.memento/workflows/review.md', metadata: { description: 'Code review' } },
            source: 'global'
          }
        ],
        agents: [],
        scripts: [],
        hooks: [],
        commands: [],
        templates: []
      });

      await listCommand.parseAsync(['node', 'test']);

      expect(logger.info).toHaveBeenCalledWith('Memento Protocol Status:');
      expect(logger.info).toHaveBeenCalledWith('Built-in:  ✓ 15 components');
      expect(logger.info).toHaveBeenCalledWith('Modes:');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('architect'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('engineer'));
      expect(logger.info).toHaveBeenCalledWith('Workflows:');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('review'));
    });
  });

  describe('legacy --installed flag', () => {
    it('should show all components with --installed flag (legacy behavior)', async () => {
      mockCore.getStatus.mockResolvedValue({
        builtin: { available: true, path: '/templates', components: 15 },
        global: { exists: true, path: '/global/.memento', components: 2, hasConfig: true },
        project: { exists: true, path: '/project/.memento', components: 3, hasConfig: true },
        totalComponents: 20,
        uniqueComponents: 18
      });
      
      mockCore.listComponentsWithSource.mockResolvedValue({
        modes: [
          { 
            component: { name: 'architect', type: 'mode', path: '/project/.memento/modes/architect.md', metadata: { description: 'System design' } },
            source: 'project'
          },
          { 
            component: { name: 'engineer', type: 'mode', path: '/global/.memento/modes/engineer.md', metadata: { description: 'Implementation' } },
            source: 'global'
          }
        ],
        workflows: [
          { 
            component: { name: 'review', type: 'workflow', path: '/project/.memento/workflows/review.md', metadata: { description: 'Code review' } },
            source: 'project'
          },
          { 
            component: { name: 'refactor', type: 'workflow', path: '/templates/workflows/refactor.md', metadata: { description: 'Refactoring assistant' } },
            source: 'builtin'
          }
        ],
        agents: [],
        scripts: [],
        hooks: [],
        commands: [],
        templates: []
      });

      await listCommand.parseAsync(['node', 'test', '--installed']);

      expect(logger.info).toHaveBeenCalledWith('Memento Protocol Status:');
      expect(logger.info).toHaveBeenCalledWith('Modes:');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('architect'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('engineer'));
      expect(logger.info).toHaveBeenCalledWith('Workflows:');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('review'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('refactor'));
    });

    it('should handle no components found', async () => {
      mockCore.getStatus.mockResolvedValue({
        builtin: { available: true, path: '/templates', components: 15 },
        global: { exists: false, path: '/global/.memento', components: 0, hasConfig: false },
        project: { exists: false, path: '/project/.memento', components: 0, hasConfig: false },
        totalComponents: 15,
        uniqueComponents: 15
      });
      
      mockCore.listComponentsWithSource.mockResolvedValue({
        modes: [],
        workflows: [],
        agents: [],
        scripts: [],
        hooks: [],
        commands: [],
        templates: []
      });

      await listCommand.parseAsync(['node', 'test', '--installed']);

      expect(logger.info).toHaveBeenCalledWith('No components found.');
      
      // Check that the help message contains essential parts without being brittle about exact wording
      const calls = (logger.info as jest.Mock).mock.calls;
      const helpMessage = calls.find(call => call[0].includes('To add components'));
      expect(helpMessage).toBeDefined();
      
      // Check for the existence of add commands in multiple calls
      const allCalls = calls.map(call => call[0]).join('\n');
      expect(allCalls).toMatch(/memento add mode/);
      expect(allCalls).toMatch(/memento add workflow/);
    });

    it('should work even without initialized scopes', async () => {
      // Test should work without checking scope existence
      
      mockCore.getStatus.mockResolvedValue({
        builtin: { available: true, path: '/templates', components: 15 },
        global: { exists: false, path: '/global/.memento', components: 0, hasConfig: false },
        project: { exists: false, path: '/project/.memento', components: 0, hasConfig: false },
        totalComponents: 15,
        uniqueComponents: 15
      });
      
      mockCore.listComponentsWithSource.mockResolvedValue({
        modes: [],
        workflows: [],
        agents: [],
        scripts: [],
        hooks: [],
        commands: [],
        templates: []
      });

      await listCommand.parseAsync(['node', 'test', '--installed']);

      // Should not error, just show available builtin components
      expect(logger.info).toHaveBeenCalledWith('Memento Protocol Status:');
      expect(logger.info).toHaveBeenCalledWith('Built-in:  ✓ 15 components');
    });
  });

  describe('error handling', () => {
    it('should handle errors in listing', async () => {
      mockCore.getStatus.mockRejectedValue(new Error('Read error'));

      await listCommand.parseAsync(['node', 'test']);

      expect(logger.error).toHaveBeenCalledWith('Failed to list components:', expect.any(Error));
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});