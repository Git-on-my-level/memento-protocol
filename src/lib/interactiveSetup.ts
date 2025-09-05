import inquirer from 'inquirer';
import { ComponentInstaller } from './componentInstaller';
import { ConfigManager } from './configManager';
import { logger } from './logger';
import { HookManager } from './hooks/HookManager';
import { PackagePaths } from './packagePaths';
import { FileSystemAdapter, NodeFileSystemAdapter } from './adapters';

export interface SetupOptions {
  selectedModes: string[];
  selectedWorkflows: string[];
  selectedHooks?: string[];
  selectedAgents?: string[];
  defaultMode?: string;
  skipRecommended?: boolean;
  force?: boolean;
  addToGitignore?: boolean;
  selectedLanguages?: string[];  // Keep for compatibility
}

export class InteractiveSetup {
  private componentInstaller: ComponentInstaller;
  private configManager: ConfigManager;
  private hookManager: HookManager;
  private fs: FileSystemAdapter;

  constructor(projectRoot: string, fs?: FileSystemAdapter) {
    this.fs = fs || new NodeFileSystemAdapter();
    this.componentInstaller = new ComponentInstaller(projectRoot, this.fs);
    this.configManager = new ConfigManager(projectRoot, this.fs);
    this.hookManager = new HookManager(projectRoot, this.fs);
  }

  /**
   * Run interactive setup flow
   */
  async run(): Promise<SetupOptions> {
    logger.space();
    logger.info('🚀 Welcome to zcc Interactive Setup!');
    logger.space();

    // Select components
    const componentSelections = await this.selectComponents();

    // Configure default mode
    const defaultMode = await this.selectDefaultMode(componentSelections.selectedModes);

    // Ask about gitignore
    const addToGitignore = await this.askGitignoreOption();

    // Show summary and confirm
    const confirmed = await this.confirmSetup({
      ...componentSelections,
      defaultMode,
      addToGitignore
    });

    if (!confirmed) {
      throw new Error('Setup cancelled by user');
    }

    return {
      ...componentSelections,
      defaultMode,
      addToGitignore,
      selectedLanguages: []  // Keep for compatibility
    };
  }


  /**
   * Select components to install
   */
  private async selectComponents() {
    // Get available components
    const availableComponents = await this.componentInstaller.listAvailableComponents();

    // Select modes - Default to ALL available modes
    const { selectedModes } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedModes',
        message: 'Select modes (behavioral patterns) to install:',
        choices: availableComponents.modes.map((mode: any) => ({
          name: mode.name,
          value: mode.name,
          checked: true  // Select all modes by default
        })),
        validate: (input: any) => input.length > 0 || 'Please select at least one mode'
      }
    ]);

    // Select workflows - Default to ALL available workflows
    const { selectedWorkflows } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedWorkflows',
        message: 'Select workflows (procedures) to install:',
        choices: availableComponents.workflows.map((workflow: any) => ({
          name: workflow.name,
          value: workflow.name,
          checked: true  // Select all workflows by default
        }))
      }
    ]);

    // Select hooks - Get available hook templates
    const availableHooks = await this.hookManager.listTemplates();
    let selectedHooks: string[] = [];
    
    if (availableHooks.length > 0) {
      // Get template details for better descriptions
      const hookChoices = [];
      for (const hookName of availableHooks) {
        try {
          const templatePath = this.fs.join(PackagePaths.getTemplatesDir(), 'hooks', `${hookName}.json`);
          const template = JSON.parse(this.fs.readFileSync(templatePath, 'utf8') as string);
          hookChoices.push({
            name: template.name,
            value: hookName,
            checked: true // Select all hooks by default
          });
        } catch {
          hookChoices.push({
            name: hookName,
            value: hookName,
            checked: false
          });
        }
      }

      const { hooks } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'hooks',
          message: 'Select Claude Code hooks to install:',
          choices: hookChoices
        }
      ]);
      selectedHooks = hooks;
    }

    // Select agents
    const { selectedAgents } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedAgents',
        message: 'Select Claude Code agents to install:',
        choices: availableComponents.agents.map((agent: any) => ({
          name: `${agent.name} - ${agent.description}`,
          value: agent.name,
          checked: false  // Don't select agents by default
        }))
      }
    ]);

    return { selectedModes, selectedWorkflows, selectedHooks, selectedAgents };
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
        message: 'Add .zcc/ to .gitignore?',
        default: false
      }
    ]);

    return addToGitignore;
  }


  /**
   * Show setup summary and confirm
   */
  private async confirmSetup(options: SetupOptions): Promise<boolean> {
    logger.space();
    logger.info('📋 Setup Summary:');
    logger.space();
    logger.info(`Modes: ${options.selectedModes.join(', ') || 'None'}`);
    logger.info(`Workflows: ${options.selectedWorkflows.join(', ') || 'None'}`);
    if (options.selectedHooks && options.selectedHooks.length > 0) {
      logger.info(`Hooks: ${options.selectedHooks.join(', ')}`);
    }
    if (options.selectedAgents && options.selectedAgents.length > 0) {
      logger.info(`Agents: ${options.selectedAgents.join(', ')}`);
    }
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

    // Install selected hooks
    if (options.selectedHooks && options.selectedHooks.length > 0) {
      for (const hook of options.selectedHooks) {
        await this.hookManager.createHookFromTemplate(hook, {});
        logger.success(`Installed hook: ${hook}`);
      }
    }

    // Install selected agents
    if (options.selectedAgents && options.selectedAgents.length > 0) {
      for (const agent of options.selectedAgents) {
        await this.componentInstaller.installComponent('agent', agent, options.force);
      }
    }

    // Save configuration
    if (options.defaultMode || options.selectedModes.length > 0) {
      const config = {
        defaultMode: options.defaultMode,
        components: {
          modes: options.selectedModes,
          workflows: options.selectedWorkflows,
          agents: options.selectedAgents || [],
        }
      };
      await this.configManager.save(config);
    }
  }
}