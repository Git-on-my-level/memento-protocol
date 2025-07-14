import { Command } from 'commander';
import { DirectoryManager } from '../lib/directoryManager';
import { logger } from '../lib/logger';

export const initCommand = new Command('init')
  .description('Initialize Memento Protocol in the current project')
  .option('-f, --force', 'Force initialization even if .memento already exists')
  .action(async (options) => {
    try {
      const dirManager = new DirectoryManager(process.cwd());
      
      // Check if already initialized
      if (dirManager.isInitialized() && !options.force) {
        logger.warn('Memento Protocol is already initialized in this project.');
        logger.info('Use --force to reinitialize.');
        return;
      }

      // Initialize directory structure
      logger.info('Initializing Memento Protocol...');
      await dirManager.initializeStructure();
      
      // Update .gitignore
      await dirManager.ensureGitignore();
      
      logger.success('Memento Protocol initialized successfully!');
      logger.info('Next steps:');
      logger.info('  - Run "memento add mode" to install a mode');
      logger.info('  - Run "memento add workflow" to install a workflow');
      logger.info('  - Run "memento list" to see available components');
    } catch (error) {
      logger.error('Failed to initialize Memento Protocol:', error);
      process.exit(1);
    }
  });