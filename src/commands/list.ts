import { Command } from 'commander';
import { ComponentInstaller } from '../lib/componentInstaller';
import { DirectoryManager } from '../lib/directoryManager';
import { logger } from '../lib/logger';

export const listCommand = new Command('list')
  .description('List available or installed components')
  .option('-i, --installed', 'Show only installed components')
  .action(async (options) => {
    try {
      const installer = new ComponentInstaller(process.cwd());
      
      if (options.installed) {
        const dirManager = new DirectoryManager(process.cwd());
        
        if (!dirManager.isInitialized()) {
          logger.error('Memento Protocol is not initialized in this project.');
          logger.info('Run "memento init" first.');
          process.exit(1);
        }
        
        const installed = await installer.listInstalledComponents();
        
        logger.info('Installed components:');
        logger.info('');
        
        if (installed.modes.length > 0) {
          logger.info('Modes:');
          installed.modes.forEach(mode => {
            logger.info(`  - ${mode}`);
          });
          logger.info('');
        }
        
        if (installed.workflows.length > 0) {
          logger.info('Workflows:');
          installed.workflows.forEach(workflow => {
            logger.info(`  - ${workflow}`);
          });
        }
        
        if (installed.modes.length === 0 && installed.workflows.length === 0) {
          logger.info('No components installed yet.');
          logger.info('Run "memento add mode" or "memento add workflow" to get started.');
        }
      } else {
        const available = await installer.listAvailableComponents();
        
        logger.info('Available components:');
        logger.info('');
        
        logger.info('Modes:');
        available.modes.forEach(mode => {
          logger.info(`  - ${mode.name}: ${mode.description}`);
        });
        logger.info('');
        
        logger.info('Workflows:');
        available.workflows.forEach(workflow => {
          logger.info(`  - ${workflow.name}: ${workflow.description}`);
        });
      }
    } catch (error) {
      logger.error('Failed to list components:', error);
      process.exit(1);
    }
  });