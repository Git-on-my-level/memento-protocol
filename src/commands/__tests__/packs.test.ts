import { packsCommand } from '../packs';
import { StarterPackManager } from '../../lib/StarterPackManager';
import { logger } from '../../lib/logger';
import { PackStructure } from '../../lib/types/packs';

jest.mock('../../lib/StarterPackManager');
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    setVerbose: jest.fn(),
    setDebug: jest.fn(),
    setNoColor: jest.fn(),
    space: jest.fn(),
    newline: jest.fn(),
    progress: jest.fn(),
    clearProgress: jest.fn(),
  },
  getChalk: jest.fn(() => ({
    green: (s: string) => s,
    red: (s: string) => s,
    yellow: (s: string) => s,
    blue: (s: string) => s,
    cyan: (s: string) => s,
    gray: (s: string) => s,
    bold: (s: string) => s,
    dim: (s: string) => s,
  })),
  configureChalk: jest.fn(),
}));

describe('Packs Command', () => {
  let mockStarterPackManager: jest.Mocked<StarterPackManager>;
  let originalExit: any;

  const mockPacks: PackStructure[] = [
    {
      manifest: {
        name: 'frontend-react',
        version: '1.0.0',
        description: 'Complete React frontend development setup',
        author: 'zcc',
        category: 'frontend',
        tags: ['react', 'frontend'],
        components: {
          modes: [
            { name: 'component-engineer', required: true },
            { name: 'react-architect', required: false }
          ],
          workflows: [
            { name: 'component-creation', required: true },
            { name: 'state-management', required: true }
          ],
          agents: [
            { name: 'claude-code-research', required: false }
          ]
        },
        compatibleWith: ['javascript', 'typescript', 'react']
      },
      path: '/templates/starter-packs/frontend-react',
      componentsPath: '/templates/starter-packs/frontend-react/components'
    },
    {
      manifest: {
        name: 'backend-api',
        version: '1.2.0',
        description: 'RESTful API backend development setup',
        author: 'zcc',
        category: 'backend',
        tags: ['api', 'backend'],
        components: {
          modes: [
            { name: 'api-engineer', required: true }
          ],
          workflows: [
            { name: 'api-design', required: true },
            { name: 'testing-strategy', required: false }
          ]
        },
        compatibleWith: ['node', 'python', 'go']
      },
      path: '/templates/starter-packs/backend-api',
      componentsPath: '/templates/starter-packs/backend-api/components'
    },
    {
      manifest: {
        name: 'essentials',
        version: '1.0.0',
        description: 'Essential development modes and workflows',
        author: 'zcc',
        category: 'general',
        tags: ['basic', 'essentials'],
        components: {
          modes: [
            { name: 'engineer', required: true }
          ],
          workflows: [
            { name: 'review', required: true }
          ]
        },
        compatibleWith: ['generic']
      },
      path: '/templates/starter-packs/essentials',
      componentsPath: '/templates/starter-packs/essentials/components'
    }
  ];

  beforeEach(() => {
    // Clear all mocks completely
    jest.clearAllMocks();
    jest.resetAllMocks();
    
    // Create fresh mock for each test
    mockStarterPackManager = {
      listPacks: jest.fn(),
      loadPack: jest.fn(),
      hasPack: jest.fn(),
    } as any;

    (StarterPackManager as jest.MockedClass<typeof StarterPackManager>).mockImplementation(() => mockStarterPackManager);
    
    originalExit = process.exit;
    process.exit = jest.fn() as any;
    
    // Reset process.exitCode
    process.exitCode = 0;
  });

  afterEach(() => {
    process.exit = originalExit;
    process.exitCode = 0;
  });

  describe('packs list', () => {
    it('should list all available starter packs', async () => {
      mockStarterPackManager.listPacks.mockResolvedValue(mockPacks);

      await packsCommand.parseAsync(['node', 'test', 'list']);

      expect(mockStarterPackManager.listPacks).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Available Starter Packs'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Frontend:'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('frontend-react'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Backend:'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('backend-api'));
    });

    it('should show message when no packs available', async () => {
      mockStarterPackManager.listPacks.mockResolvedValue([]);

      await packsCommand.parseAsync(['node', 'test', 'list']);

      expect(logger.info).toHaveBeenCalledWith('No starter packs available.');
    });

    it('should filter packs by category', async () => {
      mockStarterPackManager.listPacks.mockResolvedValue(mockPacks);

      await packsCommand.parseAsync(['node', 'test', 'list', '--category', 'frontend']);

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Frontend:'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('frontend-react'));
      // Should not show backend packs
      expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('Backend:'));
    });

    it('should show available categories when filter has no matches', async () => {
      mockStarterPackManager.listPacks.mockResolvedValue(mockPacks);

      await packsCommand.parseAsync(['node', 'test', 'list', '--category', 'mobile']);

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('No starter packs found for category \'mobile\''));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Available categories:'));
    });

    it('should show detailed information with verbose flag', async () => {
      mockStarterPackManager.listPacks.mockResolvedValue([mockPacks[0]]);

      await packsCommand.parseAsync(['node', 'test', 'list', '--verbose']);

      expect(mockStarterPackManager.listPacks).toHaveBeenCalled();
      
      // Check that detailed information is shown (verbose mode)
      const allCalls = (logger.info as jest.Mock).mock.calls.map(call => call[0]);
      // Debug: log the actual calls to see what's happening
      // console.log('Logger calls:', allCalls);
      expect(allCalls.some((call: string) => call.includes('frontend-react') && call.includes('v1.0.0'))).toBe(true);
      expect(allCalls.some((call: string) => call.includes('Complete React frontend development setup'))).toBe(true);
      expect(allCalls.some((call: string) => call.includes('Components:'))).toBe(true);
      expect(allCalls.some((call: string) => call.includes('Tags:'))).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      mockStarterPackManager.listPacks.mockRejectedValue(new Error('Failed to load packs'));

      await packsCommand.parseAsync(['node', 'test', 'list']);

      expect(logger.error).toHaveBeenCalledWith('Failed to list starter packs:', expect.any(Error));
      expect(process.exitCode).toBe(1);
    });
  });

  describe('packs show', () => {
    it('should show detailed information for a specific pack', async () => {
      mockStarterPackManager.hasPack.mockResolvedValue(true);
      mockStarterPackManager.loadPack.mockResolvedValue(mockPacks[0]);

      await packsCommand.parseAsync(['node', 'test', 'show', 'frontend-react']);

      expect(mockStarterPackManager.hasPack).toHaveBeenCalledWith('frontend-react');
      expect(mockStarterPackManager.loadPack).toHaveBeenCalledWith('frontend-react');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('frontend-react (v1.0.0)'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Package Information:'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Components:'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Modes:'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('component-engineer'));
    });

    it('should show error when pack does not exist', async () => {
      mockStarterPackManager.hasPack.mockResolvedValue(false);

      await packsCommand.parseAsync(['node', 'test', 'show', 'nonexistent-pack']);

      expect(mockStarterPackManager.hasPack).toHaveBeenCalledWith('nonexistent-pack');
      expect(logger.error).toHaveBeenCalledWith('Starter pack \'nonexistent-pack\' not found.');
      expect(logger.info).toHaveBeenCalledWith('Run "zcc packs list" to see available packs.');
      expect(process.exitCode).toBe(1);
    });

    it('should show components with required/optional badges', async () => {
      const packWithOptionalComponents: PackStructure = {
        ...mockPacks[0],
        manifest: {
          ...mockPacks[0].manifest,
          components: {
            modes: [
              { name: 'required-mode', required: true },
              { name: 'optional-mode', required: false }
            ]
          }
        }
      };

      mockStarterPackManager.hasPack.mockResolvedValue(true);
      mockStarterPackManager.loadPack.mockResolvedValue(packWithOptionalComponents);

      await packsCommand.parseAsync(['node', 'test', 'show', 'frontend-react']);

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('[required]'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('[optional]'));
    });

    it('should show configuration when present', async () => {
      const packWithConfig: PackStructure = {
        ...mockPacks[0],
        manifest: {
          ...mockPacks[0].manifest,
          configuration: {
            defaultMode: 'component-engineer',
            customCommands: {
              component: {
                description: 'Create new component',
                template: '/component [name]'
              }
            }
          }
        }
      };

      mockStarterPackManager.hasPack.mockResolvedValue(true);
      mockStarterPackManager.loadPack.mockResolvedValue(packWithConfig);

      await packsCommand.parseAsync(['node', 'test', 'show', 'frontend-react']);

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Configuration:'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Default mode:'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Custom commands:'));
    });

    it('should show dependencies when present', async () => {
      const packWithDependencies: PackStructure = {
        ...mockPacks[0],
        manifest: {
          ...mockPacks[0].manifest,
          dependencies: ['essentials', 'common-utils']
        }
      };

      mockStarterPackManager.hasPack.mockResolvedValue(true);
      mockStarterPackManager.loadPack.mockResolvedValue(packWithDependencies);

      await packsCommand.parseAsync(['node', 'test', 'show', 'frontend-react']);

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Dependencies:'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('essentials'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('common-utils'));
    });

    it('should show post-install information when present', async () => {
      const packWithPostInstall: PackStructure = {
        ...mockPacks[0],
        manifest: {
          ...mockPacks[0].manifest,
          postInstall: {
            message: 'React pack installed!\nUse /mode component-engineer to get started.'
          }
        }
      };

      mockStarterPackManager.hasPack.mockResolvedValue(true);
      mockStarterPackManager.loadPack.mockResolvedValue(packWithPostInstall);

      await packsCommand.parseAsync(['node', 'test', 'show', 'frontend-react']);

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('After Installation:'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('React pack installed!'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('/mode component-engineer'));
    });

    it('should handle errors when loading pack details', async () => {
      mockStarterPackManager.hasPack.mockResolvedValue(true);
      mockStarterPackManager.loadPack.mockRejectedValue(new Error('Failed to load pack'));

      await packsCommand.parseAsync(['node', 'test', 'show', 'frontend-react']);

      expect(logger.error).toHaveBeenCalledWith('Failed to show starter pack details:', expect.any(Error));
      expect(process.exitCode).toBe(1);
    });
  });
});