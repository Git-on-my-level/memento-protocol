import inquirer from 'inquirer';
import { ProjectInfo } from './projectDetector';
import { ComponentInstaller } from './componentInstaller';
import { ConfigManager } from './configManager';
import { LanguageOverrideManager } from './languageOverrideManager';
import { logger } from './logger';

export interface SetupOptions {
  projectInfo: ProjectInfo;
  selectedModes: string[];
  selectedWorkflows: string[];
  selectedLanguages: string[];
  defaultMode?: string;
  skipRecommended?: boolean;
  force?: boolean;
  addToGitignore?: boolean;
}

export class InteractiveSetup {
  private componentInstaller: ComponentInstaller;
  private configManager: ConfigManager;
  private languageManager: LanguageOverrideManager;

  constructor(projectRoot: string) {
    this.componentInstaller = new ComponentInstaller(projectRoot);
    this.configManager = new ConfigManager(projectRoot);
    this.languageManager = new LanguageOverrideManager(projectRoot);
  }

  /**
   * Run interactive setup flow
   */
  async run(projectInfo: ProjectInfo): Promise<SetupOptions> {
    logger.space();
    logger.info('🚀 Welcome to Memento Protocol Interactive Setup!');
    logger.space();

    // Confirm project type
    const projectTypeConfirmed = await this.confirmProjectType(projectInfo);
    if (!projectTypeConfirmed) {
      projectInfo = await this.selectProjectType();
    }

    // Select components
    const componentSelections = await this.selectComponents(projectInfo);

    // Check for language overrides
    await this.checkLanguageOverrides();

    // Configure default mode
    const defaultMode = await this.selectDefaultMode(componentSelections.selectedModes);

    // Ask about gitignore
    const addToGitignore = await this.askGitignoreOption();

    // Show summary and confirm
    const confirmed = await this.confirmSetup({
      projectInfo,
      ...componentSelections,
      defaultMode,
      addToGitignore
    });

    if (!confirmed) {
      throw new Error('Setup cancelled by user');
    }

    return {
      projectInfo,
      ...componentSelections,
      defaultMode,
      addToGitignore
    };
  }

  /**
   * Quick setup with all recommended components
   */
  async quickSetup(projectInfo: ProjectInfo): Promise<SetupOptions> {
    logger.space();
    logger.info('⚡ Running quick setup with recommended components...');
    logger.space();

    return {
      projectInfo,
      selectedModes: projectInfo.suggestedModes,
      selectedWorkflows: projectInfo.suggestedWorkflows,
      selectedLanguages: projectInfo.languages,
      defaultMode: projectInfo.suggestedModes[0],
      skipRecommended: true,
      addToGitignore: false
    };
  }

  /**
   * Confirm detected project type
   */
  private async confirmProjectType(projectInfo: ProjectInfo): Promise<boolean> {
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: `Detected project type: ${projectInfo.type}${
          projectInfo.framework ? ` (${projectInfo.framework})` : ''
        }. Is this correct?`,
        default: true
      }
    ]);

    return confirmed;
  }

  /**
   * Manually select project type
   */
  private async selectProjectType(): Promise<ProjectInfo> {
    const { type } = await inquirer.prompt([
      {
        type: 'list',
        name: 'type',
        message: 'Select your project type:',
        choices: [
          { name: 'Web Application', value: 'web' },
          { name: 'Node.js Backend', value: 'backend' },
          { name: 'Full-Stack Application', value: 'fullstack' },
          { name: 'CLI Tool', value: 'cli' },
          { name: 'Library/Package', value: 'library' },
          { name: 'Unknown/Other', value: 'unknown' }
        ]
      }
    ]);

    // Follow up with framework selection for web projects
    let framework: string | undefined;
    if (type === 'web' || type === 'fullstack') {
      const frameworkAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'framework',
          message: 'Select your framework:',
          choices: [
            { name: 'React', value: 'react' },
            { name: 'Vue', value: 'vue' },
            { name: 'Angular', value: 'angular' },
            { name: 'Next.js', value: 'nextjs' },
            { name: 'Nuxt', value: 'nuxt' },
            { name: 'Other/None', value: undefined }
          ]
        }
      ]);
      framework = frameworkAnswer.framework;
    }

    // Select languages
    const { languages } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'languages',
        message: 'Select the programming languages used:',
        choices: [
          { name: 'TypeScript', value: 'typescript' },
          { name: 'JavaScript', value: 'javascript' },
          { name: 'Python', value: 'python' },
          { name: 'Go', value: 'go' },
          { name: 'Rust', value: 'rust' },
          { name: 'Java', value: 'java' }
        ],
        default: ['typescript']
      }
    ]);

    return this.createProjectInfo(type, framework, languages);
  }

  /**
   * Select components to install
   */
  private async selectComponents(projectInfo: ProjectInfo) {
    // Get available components
    const availableComponents = await this.componentInstaller.listAvailableComponents();

    // Select modes
    const { selectedModes } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedModes',
        message: 'Select modes (behavioral patterns) to install:',
        choices: availableComponents.modes.map((mode: any) => ({
          name: `${mode.name} - ${mode.description}`,
          value: mode.name,
          checked: projectInfo.suggestedModes.includes(mode.name)
        })),
        validate: (input: any) => input.length > 0 || 'Please select at least one mode'
      }
    ]);

    // Select workflows
    const { selectedWorkflows } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedWorkflows',
        message: 'Select workflows (procedures) to install:',
        choices: availableComponents.workflows.map((workflow: any) => ({
          name: `${workflow.name} - ${workflow.description}`,
          value: workflow.name,
          checked: projectInfo.suggestedWorkflows.includes(workflow.name)
        }))
      }
    ]);

    // Select language overrides
    const languageChoices = [
      { name: 'TypeScript', value: 'typescript' },
      { name: 'JavaScript', value: 'javascript' },
      { name: 'Python', value: 'python' },
      { name: 'Go', value: 'go' },
      { name: 'Rust', value: 'rust' },
      { name: 'Java', value: 'java' }
    ];
    
    const { selectedLanguages } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedLanguages',
        message: 'Select language-specific enhancements:',
        choices: languageChoices.map(lang => ({
          ...lang,
          checked: projectInfo.languages.includes(lang.value)
        }))
      }
    ]);

    return { selectedModes, selectedWorkflows, selectedLanguages };
  }

  /**
   * Select default mode
   */
  private async selectDefaultMode(selectedModes: string[]): Promise<string | undefined> {
    if (selectedModes.length === 0) {
      return undefined;
    }

    if (selectedModes.length === 1) {
      return selectedModes[0];
    }

    const { defaultMode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'defaultMode',
        message: 'Select the default mode to activate:',
        choices: [
          { name: 'None', value: undefined },
          ...selectedModes.map(mode => ({ name: mode, value: mode }))
        ]
      }
    ]);

    return defaultMode;
  }

  /**
   * Ask about gitignore option
   */
  private async askGitignoreOption(): Promise<boolean> {
    const { addToGitignore } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addToGitignore',
        message: 'Add .memento/ to .gitignore?',
        default: false
      }
    ]);

    return addToGitignore;
  }

  /**
   * Check and suggest language overrides
   */
  private async checkLanguageOverrides(): Promise<void> {
    const detectedLanguage = await this.languageManager.detectProjectLanguage();
    
    if (detectedLanguage) {
      logger.space();
      logger.info(`🔍 Detected project language: ${detectedLanguage}`);
      
      const { installOverride } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'installOverride',
          message: `Would you like to install language-specific enhancements for ${detectedLanguage}?`,
          default: true
        }
      ]);
      
      if (installOverride) {
        try {
          await this.languageManager.installLanguageOverride(detectedLanguage);
          logger.success(`Installed ${detectedLanguage} language enhancements`);
        } catch (error: any) {
          logger.warn(`Could not install ${detectedLanguage} enhancements: ${error.message}`);
        }
      }
    }
  }

  /**
   * Show setup summary and confirm
   */
  private async confirmSetup(options: SetupOptions): Promise<boolean> {
    logger.space();
    logger.info('📋 Setup Summary:');
    logger.space();
    logger.info(`Project Type: ${options.projectInfo.type}`);
    if (options.projectInfo.framework) {
      logger.info(`Framework: ${options.projectInfo.framework}`);
    }
    logger.space();
    logger.info(`Modes: ${options.selectedModes.join(', ') || 'None'}`);
    logger.info(`Workflows: ${options.selectedWorkflows.join(', ') || 'None'}`);
    logger.info(`Languages: ${options.selectedLanguages.join(', ') || 'None'}`);
    if (options.defaultMode) {
      logger.info(`Default Mode: ${options.defaultMode}`);
    }
    logger.info(`Add to .gitignore: ${options.addToGitignore ? 'Yes' : 'No'}`);
    logger.space();

    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'Proceed with this configuration?',
        default: true
      }
    ]);

    return confirmed;
  }

  /**
   * Create ProjectInfo from manual selection
   */
  private createProjectInfo(
    type: any,
    framework?: any,
    languages: string[] = []
  ): ProjectInfo {
    // Define suggestions based on project type
    const suggestions: Record<string, { modes: string[], workflows: string[] }> = {
      web: {
        modes: ['architect', 'engineer', 'reviewer'],
        workflows: ['refactor', 'test-generation']
      },
      backend: {
        modes: ['architect', 'engineer', 'reviewer'],
        workflows: ['api-design', 'database-migration']
      },
      fullstack: {
        modes: ['project-manager', 'architect', 'engineer', 'reviewer'],
        workflows: ['feature-implementation', 'refactor']
      },
      cli: {
        modes: ['engineer', 'reviewer'],
        workflows: ['cli-design', 'test-generation']
      },
      library: {
        modes: ['architect', 'engineer'],
        workflows: ['api-design', 'documentation']
      },
      unknown: {
        modes: ['engineer'],
        workflows: []
      }
    };

    const suggestion = suggestions[type] || suggestions.unknown;

    return {
      type,
      framework,
      languages,
      suggestedModes: suggestion.modes,
      suggestedWorkflows: suggestion.workflows,
      files: [],
      dependencies: {}
    };
  }

  /**
   * Apply setup options (install components and save config)
   */
  async applySetup(options: SetupOptions): Promise<void> {
    // Install selected modes
    for (const mode of options.selectedModes) {
      await this.componentInstaller.installComponent('mode', mode, options.force);
    }

    // Install selected workflows
    for (const workflow of options.selectedWorkflows) {
      await this.componentInstaller.installComponent('workflow', workflow, options.force);
    }

    // Install selected language overrides
    for (const language of options.selectedLanguages) {
      try {
        await this.languageManager.installLanguageOverride(language);
      } catch (error: any) {
        logger.warn(`Could not install language override for ${language}: ${error.message}`);
      }
    }

    // Save configuration
    if (options.defaultMode || options.selectedModes.length > 0) {
      const config = {
        defaultMode: options.defaultMode,
        components: {
          modes: options.selectedModes,
          workflows: options.selectedWorkflows,
          languages: options.selectedLanguages
        }
      };
      await this.configManager.save(config);
    }
  }
}