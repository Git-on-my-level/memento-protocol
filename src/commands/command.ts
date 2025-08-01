import { Command } from 'commander';
import { CommandGenerator } from '../lib/commandGenerator';
import { logger } from '../lib/logger';
import { handleError } from '../lib/errors';

const commandCommand = new Command('command')
  .description('Manage Claude Code custom commands')
  .addHelpText('after', `
Examples:
  $ memento command install        # Install/update all custom commands
  $ memento command status         # Check if commands are installed
  $ memento command cleanup        # Remove all custom commands
`);

// Install commands subcommand
commandCommand
  .command('install')
  .description('Install or update Claude Code custom commands')
  .option('-f, --force', 'Force reinstall even if commands already exist')
  .action(async (options) => {
    try {
      const projectRoot = process.cwd();
      const commandGenerator = new CommandGenerator(projectRoot);
      
      if (!options.force) {
        const alreadyInstalled = await commandGenerator.areCommandsInstalled();
        if (alreadyInstalled) {
          logger.info('Commands already installed. Use --force to reinstall.');
          return;
        }
      }
      
      logger.info('Installing Claude Code custom commands...');
      await commandGenerator.initialize();
      logger.success('Custom commands installed successfully!');
      logger.space();
      logger.info('Available commands:');
      logger.info('  - /ticket, /ticket:create, /ticket:list, /ticket:start, /ticket:done, /ticket:context');
      logger.info('  - /mode, /mode:list, /mode:set, /mode:current');
      logger.info('  - /memento:status, /memento:sync, /memento:init');
      logger.space();
      logger.info('Commands are installed in .claude/commands/ directory');
    } catch (error) {
      handleError(error);
    }
  });

// Status subcommand
commandCommand
  .command('status')
  .description('Check if custom commands are installed')
  .action(async () => {
    try {
      const projectRoot = process.cwd();
      const commandGenerator = new CommandGenerator(projectRoot);
      
      const installed = await commandGenerator.areCommandsInstalled();
      
      if (installed) {
        logger.success('Custom commands are installed');
        logger.info('Commands available in .claude/commands/ directory');
      } else {
        logger.warn('Custom commands are not installed');
        logger.info('Run "memento command install" to install them');
      }
    } catch (error) {
      handleError(error);
    }
  });

// Cleanup subcommand
commandCommand
  .command('cleanup')
  .description('Remove all custom commands')
  .action(async () => {
    try {
      const projectRoot = process.cwd();
      const commandGenerator = new CommandGenerator(projectRoot);
      
      logger.info('Removing custom commands...');
      await commandGenerator.cleanup();
      logger.success('Custom commands removed');
    } catch (error) {
      handleError(error);
    }
  });

export { commandCommand };