import { InteractiveSetup } from '../interactiveSetup';
import { ComponentInstaller } from '../componentInstaller';
import { ConfigManager } from '../configManager';
import { LanguageOverrideManager } from '../languageOverrideManager';
import { logger } from '../logger';
import inquirer from 'inquirer';

jest.mock('inquirer', () => ({
  prompt: jest.fn()
}));
jest.mock('../componentInstaller');
jest.mock('../configManager');
jest.mock('../languageOverrideManager');
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('InteractiveSetup', () => {
  let interactiveSetup: InteractiveSetup;
  let mockInstaller: jest.Mocked<ComponentInstaller>;
  let mockConfigManager: jest.Mocked<ConfigManager>;
  let mockLanguageManager: jest.Mocked<LanguageOverrideManager>;
  const mockProjectRoot = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();

    mockInstaller = {
      installComponent: jest.fn(),
      listAvailableComponents: jest.fn()
    } as any;

    mockConfigManager = {
      save: jest.fn()
    } as any;

    mockLanguageManager = {
      detectProjectLanguage: jest.fn(),
      installLanguageOverride: jest.fn()
    } as any;

    (ComponentInstaller as jest.MockedClass<typeof ComponentInstaller>).mockImplementation(() => mockInstaller);
    (ConfigManager as jest.MockedClass<typeof ConfigManager>).mockImplementation(() => mockConfigManager);
    (LanguageOverrideManager as jest.MockedClass<typeof LanguageOverrideManager>).mockImplementation(() => mockLanguageManager);

    interactiveSetup = new InteractiveSetup(mockProjectRoot);
  });

  describe('run', () => {
    const mockProjectInfo = {
      type: 'fullstack' as const,
      framework: 'Next.js',
      languages: ['typescript'],
      suggestedModes: ['architect', 'engineer'],
      suggestedWorkflows: ['review'],
      files: [],
      dependencies: {}
    };

    it('should complete interactive setup flow', async () => {
      mockInstaller.listAvailableComponents.mockResolvedValue({
        modes: [
          { name: 'architect', description: 'System design', tags: [], dependencies: [] },
          { name: 'engineer', description: 'Implementation', tags: [], dependencies: [] }
        ],
        workflows: [
          { name: 'review', description: 'Code review', tags: [], dependencies: [] }
        ]
      });

      mockLanguageManager.detectProjectLanguage.mockResolvedValue('typescript');

      (inquirer.prompt as any as jest.Mock)
        .mockResolvedValueOnce({ confirmed: true }) // Confirm project type
        .mockResolvedValueOnce({ // Select modes
          selectedModes: ['architect', 'engineer']
        })
        .mockResolvedValueOnce({ // Select workflows
          selectedWorkflows: ['review']
        })
        .mockResolvedValueOnce({ // Select languages
          selectedLanguages: ['typescript']
        })
        .mockResolvedValueOnce({ // Install language override
          installOverride: true
        })
        .mockResolvedValueOnce({ // Select default mode
          defaultMode: 'architect'
        })
        .mockResolvedValueOnce({ // Confirm setup
          confirmed: true
        });

      const result = await interactiveSetup.run(mockProjectInfo);

      expect(result).toEqual({
        projectInfo: mockProjectInfo,
        selectedModes: ['architect', 'engineer'],
        selectedWorkflows: ['review'],
        selectedLanguages: ['typescript'],
        defaultMode: 'architect'
      });

      expect(mockLanguageManager.detectProjectLanguage).toHaveBeenCalled();
      expect(mockLanguageManager.installLanguageOverride).toHaveBeenCalledWith('typescript');
    });

    it('should handle different project type selection', async () => {
      mockInstaller.listAvailableComponents.mockResolvedValue({
        modes: [],
        workflows: []
      });

      (inquirer.prompt as any as jest.Mock)
        .mockResolvedValueOnce({ confirmed: false }) // Don't confirm project type
        .mockResolvedValueOnce({ // Select new project type
          projectType: 'cli',
          framework: undefined,
          languages: ['javascript']
        })
        .mockResolvedValueOnce({ selectedModes: [] })
        .mockResolvedValueOnce({ selectedWorkflows: [] })
        .mockResolvedValueOnce({ selectedLanguages: [] })
        .mockResolvedValueOnce({ confirmed: true });

      await interactiveSetup.run(mockProjectInfo);

      expect(inquirer.prompt).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          name: 'projectType',
          type: 'list'
        })
      ]));
    });

    it('should throw error when setup is cancelled', async () => {
      mockInstaller.listAvailableComponents.mockResolvedValue({
        modes: [],
        workflows: []
      });

      (inquirer.prompt as any as jest.Mock)
        .mockResolvedValueOnce({ confirmed: true })
        .mockResolvedValueOnce({ selectedModes: [] })
        .mockResolvedValueOnce({ selectedWorkflows: [] })
        .mockResolvedValueOnce({ selectedLanguages: [] })
        .mockResolvedValueOnce({ confirmed: false }); // Cancel setup

      await expect(interactiveSetup.run(mockProjectInfo))
        .rejects.toThrow('Setup cancelled by user');
    });
  });

  describe('quickSetup', () => {
    it('should return recommended components', async () => {
      const mockProjectInfo = {
        type: 'web' as const,
        languages: ['typescript', 'javascript'],
        suggestedModes: ['engineer', 'reviewer'],
        suggestedWorkflows: ['refactor'],
        files: [],
        dependencies: {}
      };

      const result = await interactiveSetup.quickSetup(mockProjectInfo);

      expect(result).toEqual({
        projectInfo: mockProjectInfo,
        selectedModes: ['engineer', 'reviewer'],
        selectedWorkflows: ['refactor'],
        selectedLanguages: ['typescript', 'javascript'],
        defaultMode: 'engineer',
        skipRecommended: true
      });

      expect(logger.info).toHaveBeenCalledWith('\n⚡ Running quick setup with recommended components...\n');
    });
  });

  describe('applySetup', () => {
    it('should install all selected components', async () => {
      const setupOptions = {
        projectInfo: {} as any,
        selectedModes: ['architect', 'engineer'],
        selectedWorkflows: ['review', 'refactor'],
        selectedLanguages: ['typescript', 'python'],
        defaultMode: 'architect'
      };

      await interactiveSetup.applySetup(setupOptions);

      expect(mockInstaller.installComponent).toHaveBeenCalledWith('mode', 'architect');
      expect(mockInstaller.installComponent).toHaveBeenCalledWith('mode', 'engineer');
      expect(mockInstaller.installComponent).toHaveBeenCalledWith('workflow', 'review');
      expect(mockInstaller.installComponent).toHaveBeenCalledWith('workflow', 'refactor');

      expect(mockLanguageManager.installLanguageOverride).toHaveBeenCalledWith('typescript');
      expect(mockLanguageManager.installLanguageOverride).toHaveBeenCalledWith('python');

      expect(mockConfigManager.save).toHaveBeenCalledWith({
        defaultMode: 'architect',
        components: {
          modes: ['architect', 'engineer'],
          workflows: ['review', 'refactor'],
          languages: ['typescript', 'python']
        }
      });
    });

    it('should handle language override installation errors gracefully', async () => {
      const setupOptions = {
        projectInfo: {} as any,
        selectedModes: [],
        selectedWorkflows: [],
        selectedLanguages: ['rust'],
        defaultMode: undefined
      };

      mockLanguageManager.installLanguageOverride.mockRejectedValue(
        new Error('Language not supported')
      );

      await interactiveSetup.applySetup(setupOptions);

      expect(logger.warn).toHaveBeenCalledWith(
        'Could not install language override for rust: Language not supported'
      );
    });

    it('should skip config save when no components selected', async () => {
      const setupOptions = {
        projectInfo: {} as any,
        selectedModes: [],
        selectedWorkflows: [],
        selectedLanguages: [],
        defaultMode: undefined
      };

      await interactiveSetup.applySetup(setupOptions);

      expect(mockConfigManager.save).not.toHaveBeenCalled();
    });
  });
});