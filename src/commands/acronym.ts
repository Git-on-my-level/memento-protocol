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

  bulkAdd(acronyms: Record<string, string>): void {
    Object.entries(acronyms).forEach(([acronym, expansion]) => {
      const key = this.config.settings.caseSensitive ? acronym : acronym.toUpperCase();
      this.config.acronyms[key] = expansion;
    });
    this.saveConfig();
  }

  importFromText(content: string): { imported: number; skipped: string[] } {
    const lines = content.split('\n').filter(line => line.trim());
    const imported = new Set<string>();
    const skipped: string[] = [];

    for (const line of lines) {
      const match = line.match(/^([A-Z0-9-_]+)\s*[:=]\s*(.+)$/i);
      if (match) {
        const [, acronym, expansion] = match;
        const key = this.config.settings.caseSensitive ? acronym.trim() : acronym.trim().toUpperCase();
        this.config.acronyms[key] = expansion.trim();
        imported.add(key);
      } else {
        skipped.push(line);
      }    
    }
    
    this.saveConfig();
    return { imported: imported.size, skipped };
  }

  importFromJson(jsonContent: string | object): { imported: number; errors: string[] } {
    let data: any;
    const errors: string[] = [];
    
    try {
      data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
    } catch (error) {
      errors.push('Invalid JSON format');
      return { imported: 0, errors };
    }

    // Handle preset format (with name, description, acronyms)
    const acronyms = data.acronyms || data;
    
    if (typeof acronyms !== 'object' || acronyms === null) {
      errors.push('Expected object with acronym definitions');
      return { imported: 0, errors };
    }

    let imported = 0;
    for (const [acronym, expansion] of Object.entries(acronyms)) {
      if (typeof expansion === 'string') {
        const key = this.config.settings.caseSensitive ? acronym : acronym.toUpperCase();
        this.config.acronyms[key] = expansion;
        imported++;
      } else {
        errors.push(`Skipped '${acronym}': expansion must be a string`);
      }
    }
    
    this.saveConfig();
    return { imported, errors };
  }

  exportToText(): string {
    const entries = Object.entries(this.config.acronyms)
      .sort(([a], [b]) => a.localeCompare(b));
    
    return entries.map(([acronym, expansion]) => `${acronym}: ${expansion}`).join('\n');
  }

  exportToJson(includeSettings: boolean = false): string {
    const data: any = {
      acronyms: this.config.acronyms
    };
    
    if (includeSettings) {
      data.settings = this.config.settings;
    }
    
    return JSON.stringify(data, null, 2);
  }

  loadPreset(presetName: string): { loaded: number; preset: string; error?: string } {
    try {
      // Try to find preset in templates directory
      const possiblePaths = [
        path.join(__dirname, '../../templates/acronyms', `${presetName}.json`),
        path.join(process.cwd(), 'templates/acronyms', `${presetName}.json`),
        path.join(process.cwd(), '.memento/acronyms', `${presetName}.json`)
      ];
      
      let presetPath = '';
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          presetPath = testPath;
          break;
        }
      }
      
      if (!presetPath) {
        return { loaded: 0, preset: presetName, error: `Preset '${presetName}' not found` };
      }
      
      const presetContent = fs.readFileSync(presetPath, 'utf-8');
      const result = this.importFromJson(presetContent);
      
      if (result.errors.length > 0) {
        return { loaded: result.imported, preset: presetName, error: result.errors.join(', ') };
      }
      
      return { loaded: result.imported, preset: presetName };
    } catch (error) {
      return { loaded: 0, preset: presetName, error: `Failed to load preset: ${error}` };
    }
  }

  listAvailablePresets(): Array<{ name: string; description: string }> {
    const presets: Array<{ name: string; description: string }> = [];
    
    const possibleDirs = [
      path.join(__dirname, '../../templates/acronyms'),
      path.join(process.cwd(), 'templates/acronyms'),
      path.join(process.cwd(), '.memento/acronyms')
    ];
    
    for (const dir of possibleDirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter(file => file.endsWith('.json'));
        
        for (const file of files) {
          try {
            const content = fs.readFileSync(path.join(dir, file), 'utf-8');
            const data = JSON.parse(content);
            const name = path.basename(file, '.json');
            
            presets.push({
              name,
              description: data.description || data.name || `Preset: ${name}`
            });
          } catch (error) {
            // Skip invalid JSON files
          }
        }
        break; // Use first directory that exists
      }
    }
    
    return presets;
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

acronymCommand
  .command('import <file>')
  .description('Import acronyms from a file')
  .option('--format <format>', 'File format: text or json', 'auto')
  .option('--merge', 'Merge with existing acronyms (default: replace)', false)
  .action((file: string, options: { format: string; merge: boolean }) => {
    try {
      const manager = new AcronymManager(process.cwd());
      
      if (!fs.existsSync(file)) {
        logger.error(`File not found: ${file}`);
        process.exit(1);
      }
      
      const content = fs.readFileSync(file, 'utf-8');
      const format = options.format === 'auto' 
        ? (file.endsWith('.json') ? 'json' : 'text')
        : options.format;
      
      // Clear existing acronyms unless merging
      if (!options.merge) {
        manager.clear();
      }
      
      if (format === 'json') {
        const result = manager.importFromJson(content);
        if (result.errors.length > 0) {
          logger.warn('Import completed with warnings:');
          result.errors.forEach(error => logger.warn(`  - ${error}`));
        }
        logger.success(`Imported ${result.imported} acronyms from ${file}`);
      } else {
        const result = manager.importFromText(content);
        if (result.skipped.length > 0) {
          logger.warn('Skipped lines that could not be parsed:');
          result.skipped.forEach(line => logger.warn(`  - ${line}`));
        }
        logger.success(`Imported ${result.imported} acronyms from ${file}`);
      }
    } catch (error) {
      logger.error('Failed to import acronyms:', error);
      process.exit(1);
    }
  });

acronymCommand
  .command('export')
  .description('Export acronyms to stdout or a file')
  .option('--format <format>', 'Export format: text or json', 'text')
  .option('--output <file>', 'Output file (default: stdout)')
  .option('--include-settings', 'Include settings in JSON export', false)
  .action((options: { format: string; output?: string; includeSettings: boolean }) => {
    try {
      const manager = new AcronymManager(process.cwd());
      const acronyms = manager.list();
      
      if (Object.keys(acronyms).length === 0) {
        logger.warn('No acronyms to export.');
        return;
      }
      
      const content = options.format === 'json'
        ? manager.exportToJson(options.includeSettings)
        : manager.exportToText();
      
      if (options.output) {
        fs.writeFileSync(options.output, content);
        logger.success(`Exported ${Object.keys(acronyms).length} acronyms to ${options.output}`);
      } else {
        console.log(content);
      }
    } catch (error) {
      logger.error('Failed to export acronyms:', error);
      process.exit(1);
    }
  });

acronymCommand
  .command('use <preset>')
  .description('Load a preset collection of acronyms')
  .option('--merge', 'Merge with existing acronyms (default: replace)', false)
  .action((preset: string, options: { merge: boolean }) => {
    try {
      const manager = new AcronymManager(process.cwd());
      
      if (!options.merge) {
        manager.clear();
      }
      
      const result = manager.loadPreset(preset);
      
      if (result.error) {
        logger.error(result.error);
        
        // Show available presets if preset not found
        if (result.error.includes('not found')) {
          const available = manager.listAvailablePresets();
          if (available.length > 0) {
            logger.info('\nAvailable presets:');
            available.forEach(p => {
              logger.info(`  ${p.name} - ${p.description}`);
            });
          }
        }
        
        process.exit(1);
      }
      
      logger.success(`Loaded ${result.loaded} acronyms from '${result.preset}' preset`);
    } catch (error) {
      logger.error('Failed to load preset:', error);
      process.exit(1);
    }
  });

acronymCommand
  .command('presets')
  .description('List available preset collections')
  .action(() => {
    try {
      const manager = new AcronymManager(process.cwd());
      const presets = manager.listAvailablePresets();
      
      if (presets.length === 0) {
        logger.info('No preset collections found.');
        return;
      }
      
      logger.info('Available preset collections:');
      presets.forEach(preset => {
        logger.info(`  ${preset.name} - ${preset.description}`);
      });
    } catch (error) {
      logger.error('Failed to list presets:', error);
      process.exit(1);
    }
  });

export { acronymCommand, AcronymManager };