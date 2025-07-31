import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../lib/logger';

interface AcronymConfig {
  acronyms: Record<string, string>;
  settings: {
    caseSensitive: boolean;
    wholeWordOnly: boolean;
  };
}

class AcronymManager {
  private configPath: string;
  private config: AcronymConfig;

  constructor(projectRoot: string) {
    this.configPath = path.join(projectRoot, '.memento', 'acronyms.json');
    this.config = this.loadConfig();
  }

  private loadConfig(): AcronymConfig {
    if (fs.existsSync(this.configPath)) {
      try {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(content);
      } catch (error) {
        logger.warn('Failed to load acronym config, using defaults');
      }
    }
    
    return {
      acronyms: {},
      settings: {
        caseSensitive: false,
        wholeWordOnly: true
      }
    };
  }

  private saveConfig(): void {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  add(acronym: string, expansion: string): void {
    const key = this.config.settings.caseSensitive ? acronym : acronym.toUpperCase();
    this.config.acronyms[key] = expansion;
    this.saveConfig();
  }

  remove(acronym: string): boolean {
    const key = this.config.settings.caseSensitive ? acronym : acronym.toUpperCase();
    if (key in this.config.acronyms) {
      delete this.config.acronyms[key];
      this.saveConfig();
      return true;
    }
    return false;
  }

  list(): Record<string, string> {
    return this.config.acronyms;
  }

  clear(): void {
    this.config.acronyms = {};
    this.saveConfig();
  }

  getSettings(): AcronymConfig['settings'] {
    return this.config.settings;
  }

  updateSettings(settings: Partial<AcronymConfig['settings']>): void {
    this.config.settings = { ...this.config.settings, ...settings };
    this.saveConfig();
  }
}

const acronymCommand = new Command('acronym')
  .description('Manage acronym expansions for Claude Code');

acronymCommand
  .command('add <acronym> <expansion>')
  .description('Add or update an acronym expansion')
  .action((acronym: string, expansion: string) => {
    try {
      const manager = new AcronymManager(process.cwd());
      manager.add(acronym, expansion);
      logger.success(`Added acronym: ${acronym} → ${expansion}`);
    } catch (error) {
      logger.error('Failed to add acronym:', error);
      process.exit(1);
    }
  });

acronymCommand
  .command('remove <acronym>')
  .alias('rm')
  .description('Remove an acronym')
  .action((acronym: string) => {
    try {
      const manager = new AcronymManager(process.cwd());
      if (manager.remove(acronym)) {
        logger.success(`Removed acronym: ${acronym}`);
      } else {
        logger.warn(`Acronym not found: ${acronym}`);
      }
    } catch (error) {
      logger.error('Failed to remove acronym:', error);
      process.exit(1);
    }
  });

acronymCommand
  .command('list')
  .alias('ls')
  .description('List all configured acronyms')
  .action(() => {
    try {
      const manager = new AcronymManager(process.cwd());
      const acronyms = manager.list();
      const settings = manager.getSettings();
      
      if (Object.keys(acronyms).length === 0) {
        logger.info('No acronyms configured.');
        return;
      }
      
      logger.info('Configured Acronyms:');
      logger.info(`Settings: Case ${settings.caseSensitive ? 'Sensitive' : 'Insensitive'}, Whole Word: ${settings.wholeWordOnly ? 'Yes' : 'No'}`);
      logger.space();
      
      Object.entries(acronyms).forEach(([acronym, expansion]) => {
        logger.info(`  ${acronym} → ${expansion}`);
      });
    } catch (error) {
      logger.error('Failed to list acronyms:', error);
      process.exit(1);
    }
  });

acronymCommand
  .command('clear')
  .description('Clear all acronyms')
  .action(async () => {
    try {
      const manager = new AcronymManager(process.cwd());
      manager.clear();
      logger.success('Cleared all acronyms.');
    } catch (error) {
      logger.error('Failed to clear acronyms:', error);
      process.exit(1);
    }
  });

export { acronymCommand, AcronymManager };