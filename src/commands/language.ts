import { Command } from 'commander';
import { LanguageOverrideManager } from '../lib/languageOverrideManager';
import { DirectoryManager } from '../lib/directoryManager';
import { logger } from '../lib/logger';
import inquirer from 'inquirer';

export function createLanguageCommand(): Command {
  const cmd = new Command('language');
  
  cmd
    .description('Manage language-specific overrides')
    .action(async () => {
      try {
        const projectRoot = process.cwd();
        const dirManager = new DirectoryManager(projectRoot);
        
        if (!dirManager.isInitialized()) {
          logger.error('Memento Protocol is not initialized. Run "memento init" first.');
          process.exit(1);
        }

        const languageManager = new LanguageOverrideManager(projectRoot);
        
        // Auto-detect and suggest installation
        const detectedLanguage = await languageManager.detectProjectLanguage();
        
        if (!detectedLanguage) {
          logger.warn('Could not detect project language');
          const available = await languageManager.listAvailableOverrides();
          
          if (available.length > 0) {
            const { language } = await inquirer.prompt([
              {
                type: 'list',
                name: 'language',
                message: 'Select a language override to install:',
                choices: available
              }
            ]);
            
            await languageManager.installLanguageOverride(language);
          } else {
            logger.error('No language overrides available');
          }
        } else {
          logger.info(`Detected project language: ${detectedLanguage}`);
          
          const { install } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'install',
              message: `Install language override for ${detectedLanguage}?`,
              default: true
            }
          ]);
          
          if (install) {
            try {
              await languageManager.installLanguageOverride(detectedLanguage);
            } catch (error: any) {
              logger.error(error.message);
              
              // Show available alternatives
              const available = await languageManager.listAvailableOverrides();
              if (available.length > 0) {
                logger.info('Available language overrides:');
                available.forEach(lang => logger.info(`  - ${lang}`));
              }
            }
          }
        }
      } catch (error: any) {
        logger.error(`Failed to manage language overrides: ${error.message}`);
        process.exit(1);
      }
    });

  // Subcommand to detect language
  cmd
    .command('detect')
    .description('Detect the project language')
    .action(async () => {
      try {
        const projectRoot = process.cwd();
        const languageManager = new LanguageOverrideManager(projectRoot);
        
        const language = await languageManager.detectProjectLanguage();
        
        if (language) {
          logger.success(`Detected language: ${language}`);
        } else {
          logger.warn('Could not detect project language');
        }
      } catch (error: any) {
        logger.error(`Detection failed: ${error.message}`);
        process.exit(1);
      }
    });

  // Subcommand to list available overrides
  cmd
    .command('list')
    .description('List available language overrides')
    .action(async () => {
      try {
        const projectRoot = process.cwd();
        const languageManager = new LanguageOverrideManager(projectRoot);
        
        const available = await languageManager.listAvailableOverrides();
        
        if (available.length === 0) {
          logger.info('No language overrides available');
          return;
        }

        logger.info('Available language overrides:');
        available.forEach(lang => logger.info(`  - ${lang}`));
      } catch (error: any) {
        logger.error(`Failed to list overrides: ${error.message}`);
        process.exit(1);
      }
    });

  // Subcommand to install a specific override
  cmd
    .command('install <language>')
    .description('Install a specific language override')
    .action(async (language: string) => {
      try {
        const projectRoot = process.cwd();
        const dirManager = new DirectoryManager(projectRoot);
        
        if (!dirManager.isInitialized()) {
          logger.error('Memento Protocol is not initialized. Run "memento init" first.');
          process.exit(1);
        }

        const languageManager = new LanguageOverrideManager(projectRoot);
        await languageManager.installLanguageOverride(language);
      } catch (error: any) {
        logger.error(`Installation failed: ${error.message}`);
        process.exit(1);
      }
    });

  return cmd;
}