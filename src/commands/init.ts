import { Command } from 'commander';
import { DirectoryManager } from '../lib/directoryManager';
import { ClaudeMdGenerator } from '../lib/claudeMdGenerator';
import { ProjectDetector } from '../lib/projectDetector';
import { InteractiveSetup } from '../lib/interactiveSetup';
import { logger } from '../lib/logger';

export const initCommand = new Command('init')
  .description('Initialize Memento Protocol in the current project')
  .option('-f, --force', 'Force initialization even if .memento already exists')
  .option('-q, --quick', 'Quick setup with recommended components')
  .option('-i, --interactive', 'Interactive setup mode (default)')
  .option('-g, --gitignore', 'Add .memento/ to .gitignore (defaults to false)')
  .action(async (options) => {
    try {
      const projectRoot = process.cwd();
      const dirManager = new DirectoryManager(projectRoot);
      const claudeMdGenerator = new ClaudeMdGenerator(projectRoot);
      const projectDetector = new ProjectDetector(projectRoot);
      
      // Check if already initialized
      if (dirManager.isInitialized() && !options.force) {
        logger.warn('Memento Protocol is already initialized in this project.');
        logger.info('Use --force to reinitialize.');
        return;
      }

      // Initialize directory structure
      logger.info('Initializing Memento Protocol...');
      await dirManager.initializeStructure();
      
      // Detect project type
      logger.info('Detecting project type...');
      const projectInfo = await projectDetector.detect();
      logger.info(`Project type: ${projectInfo.type}${projectInfo.framework ? ` (${projectInfo.framework})` : ''}`);
      
      // Run setup flow
      const interactiveSetup = new InteractiveSetup(projectRoot);
      let setupOptions;
      
      if (options.quick) {
        // Quick setup with recommended components
        setupOptions = await interactiveSetup.quickSetup(projectInfo);
      } else if (options.interactive !== false) {
        // Interactive setup (default)
        setupOptions = await interactiveSetup.run(projectInfo);
      } else {
        // Basic setup without component installation
        setupOptions = {
          projectInfo,
          selectedModes: [],
          selectedWorkflows: [],
          selectedLanguages: [],
          addToGitignore: false
        };
      }
      
      // Update .gitignore if requested via CLI flag or interactive setup
      if (options.gitignore || setupOptions.addToGitignore) {
        await dirManager.ensureGitignore();
      }
      
      // Apply setup (install components and save config)
      if (setupOptions.selectedModes.length > 0 || 
          setupOptions.selectedWorkflows.length > 0) {
        logger.space();
        logger.info('Installing selected components...');
        await interactiveSetup.applySetup({
          ...setupOptions,
          force: options.force
        });
      }
      
      // Generate or update CLAUDE.md
      logger.space();
      logger.info('Generating CLAUDE.md router...');
      const existingClaudeMd = await claudeMdGenerator.readExisting();
      await claudeMdGenerator.generate(existingClaudeMd || undefined);
      
      logger.space();
      logger.success('Memento Protocol initialized successfully!');
      logger.space();
      logger.info('To use with Claude Code:');
      logger.info('  - Say "act as [mode]" to switch behavioral patterns');
      logger.info('  - Say "execute [workflow]" to run procedures');
      logger.info('  - Say "create ticket [name]" to start persistent work');
      logger.space();
      logger.info('Run "memento --help" to see all available commands.');
    } catch (error) {
      logger.error('Failed to initialize Memento Protocol:', error);
      process.exit(1);
    }
  });