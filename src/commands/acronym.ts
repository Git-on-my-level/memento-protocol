import { Command } from 'commander';
import { logger } from '../lib/logger';
import { FileSystemAdapter } from '../lib/adapters/FileSystemAdapter';
import { NodeFileSystemAdapter } from '../lib/adapters/NodeFileSystemAdapter';

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
  private fs: FileSystemAdapter;

  constructor(projectRoot: string, fsAdapter?: FileSystemAdapter) {
    this.fs = fsAdapter || new NodeFileSystemAdapter();
    this.configPath = this.fs.join(projectRoot, '.memento', 'acronyms.json');
    this.config = this.loadConfig();
  }

  private loadConfig(): AcronymConfig {
    try {
      if (this.fs.existsSync(this.configPath)) {
        const content = this.fs.readFileSync(this.configPath, 'utf-8') as string;
        return JSON.parse(content);
      }
    } catch (error) {
      logger.warn('Failed to load acronym config, using defaults');
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
    const dir = this.fs.dirname(this.configPath);
    if (!this.fs.existsSync(dir)) {
      this.fs.mkdirSync(dir, { recursive: true });
    }
    this.fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
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

}

const acronymCommand = new Command('acronym')
  .description('Manage acronym expansions for Claude Code')
  .addHelpText('after', `
Examples:
  $ memento acronym add apm "autonomous project manager"  # Add acronym expansion
  $ memento acronym add eng "engineer"                    # Add simple acronym
  $ memento acronym add dbg "debug and troubleshoot"     # Add debugging acronym
  $ memento acronym add rev "code review workflow"       # Add review acronym
  $ memento acronym list                                  # Show all acronyms
  $ memento acronym ls                                    # Same as list (alias)
  $ memento acronym remove apm                           # Remove an acronym
  $ memento acronym rm eng                               # Same as remove (alias)

Common acronym patterns:
  $ memento acronym add apm "autonomous-project-manager"  # Mode names
  $ memento acronym add cw "code-warrior"                # Alternative mode names
  $ memento acronym add rv "review"                      # Workflow shortcuts
  $ memento acronym add opt "optimize"                   # Workflow abbreviations
  $ memento acronym add tdd "test-driven-development"    # Development practices
  $ memento acronym add api "application programming interface"  # Technical terms

Bulk setup example:
  $ memento acronym add apm "autonomous-project-manager"
  $ memento acronym add eng "engineer" 
  $ memento acronym add arch "architect"
  $ memento acronym add rev "review"
  $ memento acronym add dbg "debug"

How acronyms work:
  - Used by fuzzy matching in 'memento add mode apm' -> finds 'autonomous-project-manager'
  - Case-insensitive by default (APM = apm)
  - Whole word matching for better accuracy
  - Stored in .memento/acronyms.json for persistence
  - Works across all component types (modes, workflows, agents, etc.)

Configuration:
  - Settings stored in .memento/acronyms.json
  - Supports case-sensitive and whole-word-only options
  - Automatically created when first acronym is added
`);

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
      
      if (Object.keys(acronyms).length === 0) {
        logger.info('No acronyms configured.');
        return;
      }
      
      logger.info('Configured Acronyms:');
      logger.space();
      
      Object.entries(acronyms).forEach(([acronym, expansion]) => {
        logger.info(`  ${acronym} → ${expansion}`);
      });
    } catch (error) {
      logger.error('Failed to list acronyms:', error);
      process.exit(1);
    }
  });


export { acronymCommand, AcronymManager };