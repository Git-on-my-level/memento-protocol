import { initCommand } from '../init';
import { DirectoryManager } from '../../lib/directoryManager';
import { ClaudeMdGenerator } from '../../lib/claudeMdGenerator';
import { ProjectDetector } from '../../lib/projectDetector';
import { InteractiveSetup } from '../../lib/interactiveSetup';
import { logger } from '../../lib/logger';
import inquirer from 'inquirer';

jest.mock('inquirer', () => ({
  prompt: jest.fn()
}));
jest.mock('../../lib/directoryManager');
jest.mock('../../lib/claudeMdGenerator');
jest.mock('../../lib/projectDetector');
jest.mock('../../lib/interactiveSetup');
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('Init Command', () => {
  let mockDirManager: jest.Mocked<DirectoryManager>;
  let mockClaudeMdGen: jest.Mocked<ClaudeMdGenerator>;
  let mockProjectDetector: jest.Mocked<ProjectDetector>;
  let mockInteractiveSetup: jest.Mocked<InteractiveSetup>;
  let originalExit: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDirManager = {
      isInitialized: jest.fn(),
      initializeStructure: jest.fn(),
      ensureGitignore: jest.fn()
    } as any;

    mockClaudeMdGen = {
      exists: jest.fn(),
      readExisting: jest.fn(),
      generate: jest.fn()
    } as any;

    mockProjectDetector = {
      detect: jest.fn()
    } as any;

    mockInteractiveSetup = {
      run: jest.fn(),
      quickSetup: jest.fn(),
      applySetup: jest.fn()
    } as any;

    (DirectoryManager as jest.MockedClass<typeof DirectoryManager>).mockImplementation(() => mockDirManager);
    (ClaudeMdGenerator as jest.MockedClass<typeof ClaudeMdGenerator>).mockImplementation(() => mockClaudeMdGen);
    (ProjectDetector as jest.MockedClass<typeof ProjectDetector>).mockImplementation(() => mockProjectDetector);
    (InteractiveSetup as jest.MockedClass<typeof InteractiveSetup>).mockImplementation(() => mockInteractiveSetup);
    
    originalExit = process.exit;
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  describe('successful initialization', () => {
    it('should initialize with quick setup', async () => {
      mockDirManager.isInitialized.mockReturnValue(false);
      mockClaudeMdGen.exists.mockResolvedValue(false);
      mockProjectDetector.detect.mockResolvedValue({
        type: 'fullstack',
        framework: 'Next.js',
        languages: ['typescript'],
        suggestedModes: ['architect', 'engineer'],
        suggestedWorkflows: ['review'],
        files: [],
        dependencies: {}
      });
      mockInteractiveSetup.quickSetup.mockResolvedValue({
        projectInfo: { type: 'fullstack' } as any,
        selectedModes: ['architect'],
        selectedWorkflows: ['review'],
        selectedLanguages: ['typescript']
      });

      await initCommand.parseAsync(['node', 'test', '--quick']);

      expect(mockDirManager.initializeStructure).toHaveBeenCalled();
      expect(mockDirManager.ensureGitignore).toHaveBeenCalled();
      expect(mockInteractiveSetup.quickSetup).toHaveBeenCalled();
      expect(mockInteractiveSetup.applySetup).toHaveBeenCalled();
      expect(mockClaudeMdGen.generate).toHaveBeenCalled();
      expect(logger.success).toHaveBeenCalledWith('Memento Protocol initialized successfully!');
    });

    it('should initialize with interactive setup', async () => {
      mockDirManager.isInitialized.mockReturnValue(false);
      mockClaudeMdGen.exists.mockResolvedValue(false);
      mockProjectDetector.detect.mockResolvedValue({
        type: 'web',
        languages: ['javascript'],
        suggestedModes: ['engineer'],
        suggestedWorkflows: [],
        files: [],
        dependencies: {}
      });
      mockInteractiveSetup.run.mockResolvedValue({
        projectInfo: { type: 'web' } as any,
        selectedModes: ['engineer', 'reviewer'],
        selectedWorkflows: ['refactor'],
        selectedLanguages: []
      });

      await initCommand.parseAsync(['node', 'test']);

      expect(mockInteractiveSetup.run).toHaveBeenCalled();
      expect(mockInteractiveSetup.applySetup).toHaveBeenCalled();
    });

    it('should preserve existing CLAUDE.md content', async () => {
      mockDirManager.isInitialized.mockReturnValue(false);
      mockClaudeMdGen.exists.mockResolvedValue(true);
      mockClaudeMdGen.readExisting.mockResolvedValue('# Existing content\nProject docs');
      (inquirer.prompt as jest.Mock).mockResolvedValue({ preserveExisting: true });
      
      mockProjectDetector.detect.mockResolvedValue({
        type: 'unknown',
        languages: [],
        suggestedModes: [],
        suggestedWorkflows: [],
        files: [],
        dependencies: {}
      });
      mockInteractiveSetup.quickSetup.mockResolvedValue({
        projectInfo: { type: 'unknown' } as any,
        selectedModes: [],
        selectedWorkflows: [],
        selectedLanguages: []
      });

      await initCommand.parseAsync(['node', 'test', '--quick']);

      expect(mockClaudeMdGen.generate).toHaveBeenCalledWith('# Existing content\nProject docs');
    });
  });

  describe('error handling', () => {
    it('should error when already initialized without force flag', async () => {
      mockDirManager.isInitialized.mockReturnValue(true);

      await initCommand.parseAsync(['node', 'test']);

      expect(logger.error).toHaveBeenCalledWith(
        'Memento Protocol is already initialized. Use --force to reinitialize.'
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should reinitialize with force flag', async () => {
      mockDirManager.isInitialized.mockReturnValue(true);
      mockClaudeMdGen.exists.mockResolvedValue(false);
      mockProjectDetector.detect.mockResolvedValue({
        type: 'cli',
        languages: [],
        suggestedModes: [],
        suggestedWorkflows: [],
        files: [],
        dependencies: {}
      });
      mockInteractiveSetup.quickSetup.mockResolvedValue({
        projectInfo: { type: 'cli' } as any,
        selectedModes: [],
        selectedWorkflows: [],
        selectedLanguages: []
      });

      await initCommand.parseAsync(['node', 'test', '--force', '--quick']);

      expect(logger.warn).toHaveBeenCalledWith('Force reinitializing Memento Protocol...');
      expect(mockDirManager.initializeStructure).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      mockDirManager.isInitialized.mockReturnValue(false);
      mockDirManager.initializeStructure.mockRejectedValue(new Error('Permission denied'));

      await initCommand.parseAsync(['node', 'test', '--quick']);

      expect(logger.error).toHaveBeenCalledWith('Failed to initialize: Permission denied');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle setup cancellation', async () => {
      mockDirManager.isInitialized.mockReturnValue(false);
      mockClaudeMdGen.exists.mockResolvedValue(false);
      mockProjectDetector.detect.mockResolvedValue({
        type: 'unknown',
        languages: [],
        suggestedModes: [],
        suggestedWorkflows: [],
        files: [],
        dependencies: {}
      });
      mockInteractiveSetup.run.mockRejectedValue(new Error('Setup cancelled by user'));

      await initCommand.parseAsync(['node', 'test']);

      expect(logger.error).toHaveBeenCalledWith('Failed to initialize: Setup cancelled by user');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});