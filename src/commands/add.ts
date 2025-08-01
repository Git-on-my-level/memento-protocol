import { Command } from 'commander';
import { ComponentInstaller } from '../lib/componentInstaller';
import { DirectoryManager } from '../lib/directoryManager';
import { logger } from '../lib/logger';

export const addCommand = new Command('add')
  .description('Add components to your Memento Protocol setup')
  .argument('<type>', 'Component type (mode, workflow, agent)')
  .argument('[name]', 'Component name (optional, will prompt if not provided)')
  .action(async (type: string, name?: string) => {
    try {
      const dirManager = new DirectoryManager(process.cwd());
      
      // Check if initialized
      if (!dirManager.isInitialized()) {
        logger.error('Memento Protocol is not initialized in this project.');
        logger.info('Run "memento init" first.');
        process.exit(1);
      }

      const installer = new ComponentInstaller(process.cwd());
      
      // Validate component type
      if (!['mode', 'workflow', 'agent'].includes(type)) {
        logger.error(`Invalid component type: ${type}`);
        logger.info('Valid types are: mode, workflow, agent');
        process.exit(1);
      }

      // Install component
      if (name) {
        await installer.installComponent(type as 'mode' | 'workflow' | 'agent', name);
      } else {
        await installer.interactiveInstall(type as 'mode' | 'workflow' | 'agent');
      }
      
      logger.success('Component installed successfully!');
    } catch (error) {
      logger.error('Failed to add component:', error);
      process.exit(1);
    }
  });