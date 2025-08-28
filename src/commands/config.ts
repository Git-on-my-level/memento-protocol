import { Command } from 'commander';
import { ConfigManager } from '../lib/configManager';
import { logger } from '../lib/logger';

const configCommand = new Command('config')
  .description('Manage Memento configuration')
  .addHelpText('after', `
Examples:
  $ memento config get defaultMode                # Get current default mode
  $ memento config get ui.colorOutput             # Get color output setting
  $ memento config set defaultMode engineer       # Set default mode to engineer
  $ memento config set ui.colorOutput true        # Enable colored output
  $ memento config set ui.verboseLogging false    # Disable verbose logging
  $ memento config unset defaultMode              # Remove default mode setting
  $ memento config list                           # List all configuration values
  $ memento config list --global                  # List only global configuration

Setting different value types:
  $ memento config set defaultMode "engineer"     # String value
  $ memento config set ui.colorOutput true        # Boolean value
  $ memento config set maxComponents 10           # Number value
  $ memento config set customModes '["dev","prod"]'  # JSON array value
  $ memento config set theme.colors '{"primary":"blue","accent":"green"}'  # JSON object

Global vs project configuration:
  $ memento config set defaultMode architect --global     # Set in global ~/.memento
  $ memento config set ui.colorOutput false --global      # Set global color setting
  $ memento config unset defaultMode --global             # Remove from global config
  $ memento config list --global                          # Show only global settings

Configuration hierarchy (highest precedence first):
  1. Project .memento/config.yaml
  2. Global ~/.memento/config.yaml
  3. Built-in defaults

Common configuration keys:
  defaultMode              - Default AI mode to use
  ui.colorOutput           - Enable/disable colored terminal output
  ui.verboseLogging        - Enable/disable verbose logging
  integrations.git.*       - Git-specific settings
  components.modes[]       - List of installed modes
  components.workflows[]   - List of installed workflows
`);

// Get subcommand
configCommand
  .command('get <key>')
  .description('Get a configuration value')
  .action(async (key: string) => {
    try {
      const configManager = new ConfigManager(process.cwd());
      const trimmedKey = key.trim();
      const value = await configManager.get(trimmedKey);
      
      if (value === undefined) {
        logger.info(`Configuration key '${trimmedKey}' is not set`);
      } else {
        logger.info(`${trimmedKey} = ${JSON.stringify(value, null, 2)}`);
      }
    } catch (error) {
      logger.error(`Failed to get configuration: ${error}`);
      process.exit(1);
    }
  });

// Set subcommand
configCommand
  .command('set <key> <value>')
  .description('Set a configuration value')
  .option('-g, --global', 'Set in global configuration')
  .action(async (key: string, value: string, options: { global: boolean }) => {
    try {
      const configManager = new ConfigManager(process.cwd());
      
      // Trim whitespace from key and value to prevent user confusion
      const trimmedKey = key.trim();
      const trimmedValue = value.trim();
      
      // Try to parse value as JSON, fallback to string
      let parsedValue: any = trimmedValue;
      try {
        parsedValue = JSON.parse(trimmedValue);
      } catch {
        // Keep as string if not valid JSON
      }
      
      await configManager.set(trimmedKey, parsedValue, options.global || false);
      logger.success(`Configuration updated: ${trimmedKey} = ${JSON.stringify(parsedValue)}`);
    } catch (error) {
      logger.error(`Failed to set configuration: ${error}`);
      process.exit(1);
    }
  });

// Unset subcommand
configCommand
  .command('unset <key>')
  .description('Remove a configuration value')
  .option('-g, --global', 'Remove from global configuration')
  .action(async (key: string, options: { global: boolean }) => {
    try {
      const configManager = new ConfigManager(process.cwd());
      const trimmedKey = key.trim();
      await configManager.unset(trimmedKey, options.global || false);
      logger.success(`Configuration key '${trimmedKey}' removed`);
    } catch (error) {
      logger.error(`Failed to unset configuration: ${error}`);
      process.exit(1);
    }
  });

// List subcommand
configCommand
  .command('list')
  .description('List all configuration values')
  .option('-g, --global', 'List only global configuration')
  .action(async (options: { global: boolean }) => {
    try {
      const configManager = new ConfigManager(process.cwd());
      const config = await configManager.list(options.global || false);
      
      if (Object.keys(config).length === 0) {
        logger.info('No configuration values set');
      } else {
        logger.info(JSON.stringify(config, null, 2));
      }
    } catch (error) {
      logger.error(`Failed to list configuration: ${error}`);
      process.exit(1);
    }
  });

export { configCommand };