import { initCommand } from '../init';
import { DirectoryManager } from '../../lib/directoryManager';
import { ClaudeMdGenerator } from '../../lib/claudeMdGenerator';
import { ProjectDetector } from '../../lib/projectDetector';
import { InteractiveSetup } from '../../lib/interactiveSetup';
import { logger } from '../../lib/logger';

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

describe('Init Command Basic', () => {
  let mockDirManager: any;
  let mockClaudeMdGen: any;
  let mockProjectDetector: any;
  let mockInteractiveSetup: any;
  let originalExit: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDirManager = {
      isInitialized: jest.fn().mockReturnValue(false),
      initializeStructure: jest.fn(),
      ensureGitignore: jest.fn()
    };

    mockClaudeMdGen = {
      exists: jest.fn().mockResolvedValue(false),
      generate: jest.fn()
    };

    mockProjectDetector = {
      detect: jest.fn().mockResolvedValue({
        type: 'unknown',
        languages: [],
        suggestedModes: [],
        suggestedWorkflows: [],
        files: [],
        dependencies: {}
      })
    };

    mockInteractiveSetup = {
      quickSetup: jest.fn().mockResolvedValue({
        projectInfo: { type: 'unknown' },
        selectedModes: [],
        selectedWorkflows: [],
        selectedLanguages: []
      }),
      applySetup: jest.fn()
    };

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

  it('should successfully run basic init', async () => {
    await initCommand.parseAsync(['node', 'test', '--quick']);

    expect(mockDirManager.initializeStructure).toHaveBeenCalled();
    expect(mockClaudeMdGen.generate).toHaveBeenCalled();
    expect(logger.success).toHaveBeenCalledWith('Memento Protocol initialized successfully!');
  });
});