import { Command } from 'commander';
import { ConfigManager } from '../lib/configManager';
import { logger } from '../lib/logger';

const configCommand = new Command('config')
  .description('Manage ZCC configuration');

// Get subcommand
configCommand
  .command('get <key>')
  .description('Get a configuration value')
  .action(async (key: string) => {
    try {
      const configManager = new ConfigManager(process.cwd());
      const value = await configManager.get(key);
      
      if (value === undefined) {
        logger.info(`Configuration key '${key}' is not set`);
      } else {
        logger.info(`${key} = ${JSON.stringify(value, null, 2)}`);
      }
    } catch (error) {
      logger.error(`Failed to get configuration: ${error}`);
      process.exitCode = 1;
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
      
      // Try to parse value as JSON, fallback to string
      let parsedValue: any = value;
      try {
        parsedValue = JSON.parse(value);
      } catch {
        // Keep as string if not valid JSON
      }
      
      await configManager.set(key, parsedValue, options.global || false);
      logger.success(`Configuration updated: ${key} = ${JSON.stringify(parsedValue)}`);
    } catch (error) {
      logger.error(`Failed to set configuration: ${error}`);
      process.exitCode = 1;
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
      await configManager.unset(key, options.global || false);
      logger.success(`Configuration key '${key}' removed`);
    } catch (error) {
      logger.error(`Failed to unset configuration: ${error}`);
      process.exitCode = 1;
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
      process.exitCode = 1;
    }
  });

// Validate subcommand
configCommand
  .command('validate')
  .description('Validate configuration file against schema')
  .option('-g, --global', 'Validate global configuration')
  .option('--fix', 'Attempt to fix validation issues')
  .action(async (options: { global: boolean; fix: boolean }) => {
    try {
      const configManager = new ConfigManager(process.cwd());
      const result = await configManager.validateConfigFile(options.global || false);
      
      // Display validation results
      if (result.valid) {
        logger.success('Configuration is valid!');
      } else {
        logger.error('Configuration validation failed.');
      }
      
      // Show errors
      if (result.errors.length > 0) {
        logger.error('\nValidation errors:');
        result.errors.forEach(error => {
          logger.error(`  ✗ ${error}`);
        });
      }
      
      // Show warnings
      if (result.warnings.length > 0) {
        logger.warn('\nValidation warnings:');
        result.warnings.forEach(warning => {
          logger.warn(`  ⚠ ${warning}`);
        });
      }
      
      // Fix issues if requested
      if (options.fix && !result.valid) {
        logger.info('\nAttempting to fix validation issues...');
        const fixed = await configManager.fixConfigFile(options.global || false);
        if (fixed) {
          logger.success('Configuration issues have been fixed!');
        } else {
          logger.warn('Some issues could not be automatically fixed. Please review manually.');
        }
      }
      
      // Exit with error if validation failed
      if (!result.valid) {
        process.exitCode = 1;
      }
    } catch (error) {
      logger.error(`Failed to validate configuration: ${error}`);
      process.exitCode = 1;
    }
  });

export { configCommand };