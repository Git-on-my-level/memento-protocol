import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from './logger';

export interface CommandTemplate {
  name: string;
  description: string;
  allowedTools: string[];
  argumentHint?: string;
  body: string;
}

export class CommandGenerator {
  private claudeDir: string;
  private commandsDir: string;

  constructor(projectRoot: string) {
    this.claudeDir = path.join(projectRoot, '.claude');
    this.commandsDir = path.join(this.claudeDir, 'commands');
  }

  /**
   * Initialize the command system by generating all default commands
   */
  async initialize(): Promise<void> {
    // Ensure directories exist
    await this.ensureDirectories();
    
    // Generate ticket commands
    await this.generateTicketCommands();
    
    // Generate mode commands
    await this.generateModeCommands();
    
    // Generate memento commands
    await this.generateMementoCommands();
    
    logger.success('Claude Code custom commands generated');
  }

  /**
   * Ensure all required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.claudeDir, { recursive: true });
    await fs.mkdir(this.commandsDir, { recursive: true });
    await fs.mkdir(path.join(this.commandsDir, 'ticket'), { recursive: true });
    await fs.mkdir(path.join(this.commandsDir, 'mode'), { recursive: true });
    await fs.mkdir(path.join(this.commandsDir, 'memento'), { recursive: true });
  }

  /**
   * Generate ticket management commands
   */
  private async generateTicketCommands(): Promise<void> {
    // Main ticket command (interactive)
    const ticketMain: CommandTemplate = {
      name: 'ticket',
      description: 'Interactive ticket management',
      allowedTools: ['Bash(npx memento-protocol ticket:*)'],
      body: `# Ticket Management

Starting interactive ticket management...

!\`npx memento-protocol ticket\`

Use the interactive prompts above to manage your tickets, or use specific ticket commands:
- \`/ticket:create <name>\` - Create a new ticket
- \`/ticket:list\` - List all tickets by status
- \`/ticket:start <name>\` - Move ticket to in-progress
- \`/ticket:done <name>\` - Complete a ticket
- \`/ticket:context <name>\` - Load ticket context`
    };

    // Ticket create command
    const ticketCreate: CommandTemplate = {
      name: 'ticket/create',
      description: 'Create a new Memento Protocol ticket',
      allowedTools: ['Bash(npx memento-protocol ticket create:*)'],
      argumentHint: '<ticket-name>',
      body: `# Creating Ticket: $ARGUMENTS

!\`npx memento-protocol ticket create $ARGUMENTS\`

The ticket has been created successfully. You can now:
- Start working on it with \`/ticket:start $ARGUMENTS\`
- View all tickets with \`/ticket:list\`
- Load its context with \`/ticket:context $ARGUMENTS\``
    };

    // Ticket list command
    const ticketList: CommandTemplate = {
      name: 'ticket/list',
      description: 'List all Memento Protocol tickets by status',
      allowedTools: ['Bash(npx memento-protocol ticket list)', 'Bash(ls:.memento/tickets/*)'],
      body: `# Ticket Status Overview

!\`npx memento-protocol ticket list\`

Available ticket commands:
- \`/ticket:start <name>\` - Move ticket to in-progress
- \`/ticket:done <name>\` - Complete a ticket
- \`/ticket:context <name>\` - Load ticket context
- \`/ticket:create <name>\` - Create a new ticket`
    };

    // Ticket start command
    const ticketStart: CommandTemplate = {
      name: 'ticket/start',
      description: 'Move a ticket to in-progress status',
      allowedTools: ['Bash(npx memento-protocol ticket move:*)'],
      argumentHint: '<ticket-name>',
      body: `# Starting Ticket: $ARGUMENTS

!\`npx memento-protocol ticket move --to in-progress $ARGUMENTS\`

The ticket is now in progress. I'll work with the context and requirements from this ticket.
Use \`/ticket:context $ARGUMENTS\` to load the full ticket context if needed.`
    };

    // Ticket done command
    const ticketDone: CommandTemplate = {
      name: 'ticket/done',
      description: 'Mark a ticket as completed',
      allowedTools: ['Bash(npx memento-protocol ticket move:*)'],
      argumentHint: '<ticket-name>',
      body: `# Completing Ticket: $ARGUMENTS

!\`npx memento-protocol ticket move --to done $ARGUMENTS\`

The ticket has been marked as completed! Great work.
Use \`/ticket:list\` to see your updated ticket status.`
    };

    // Ticket context command
    const ticketContext: CommandTemplate = {
      name: 'ticket/context',
      description: 'Load ticket context into conversation',
      allowedTools: ['Bash(cat:.memento/tickets/*/*)'],
      argumentHint: '<ticket-name>',
      body: `# Loading Context for Ticket: $ARGUMENTS

!\`find .memento/tickets -name "*$ARGUMENTS*" -type f | head -1 | xargs cat 2>/dev/null || echo "Ticket '$ARGUMENTS' not found. Use /ticket:list to see available tickets."\`

I now have the full context for this ticket and will work according to its requirements and specifications.`
    };

    // Generate all ticket command files
    await this.generateCommandFile('ticket.md', ticketMain);
    await this.generateCommandFile('ticket/create.md', ticketCreate);
    await this.generateCommandFile('ticket/list.md', ticketList);
    await this.generateCommandFile('ticket/start.md', ticketStart);
    await this.generateCommandFile('ticket/done.md', ticketDone);
    await this.generateCommandFile('ticket/context.md', ticketContext);

    logger.info('Generated ticket management commands');
  }

  /**
   * Generate mode management commands
   */
  private async generateModeCommands(): Promise<void> {
    // Main mode command (interactive)
    const modeMain: CommandTemplate = {
      name: 'mode',
      description: 'Switch between modes interactively',
      allowedTools: ['Bash(ls:.memento/modes/)', 'Bash(cat:.memento/modes/*)'],
      body: `# Mode Management

## Available Modes
!\`ls -1 .memento/modes/ 2>/dev/null || echo "No modes installed. Run 'memento add mode' to install modes."\`

Use mode commands:
- \`/mode:list\` - List all available modes
- \`/mode:set <mode-name>\` - Switch to a specific mode
- \`/mode:current\` - Show current active mode

Which mode would you like to activate?`
    };

    // Mode list command
    const modeList: CommandTemplate = {
      name: 'mode/list',
      description: 'List all available Memento Protocol modes',
      allowedTools: ['Bash(ls:.memento/modes/)', 'Bash(head:.memento/modes/*)'],
      body: `# Available Modes

!\`for mode in .memento/modes/*.md; do if [ -f "$mode" ]; then echo "## $(basename "$mode" .md)"; head -3 "$mode" | tail -1; echo; fi; done 2>/dev/null || echo "No modes installed."\`

Use \`/mode:set <mode-name>\` to activate a mode.`
    };

    // Mode set command
    const modeSet: CommandTemplate = {
      name: 'mode/set',
      description: 'Switch to a specific Memento Protocol mode',
      allowedTools: ['Bash(cat:.memento/modes/*)'],
      argumentHint: '<mode-name>',
      body: `# Switching to Mode: $ARGUMENTS

!\`cat .memento/modes/$ARGUMENTS.md 2>/dev/null || echo "Mode '$ARGUMENTS' not found. Use /mode:list to see available modes."\`

I'll now operate according to the $ARGUMENTS mode guidelines shown above.`
    };

    // Mode current command
    const modeCurrent: CommandTemplate = {
      name: 'mode/current',
      description: 'Show current active mode from CLAUDE.md',
      allowedTools: ['Bash(grep:CLAUDE.md)', 'Bash(sed:CLAUDE.md)'],
      body: `# Current Active Mode

!\`grep -A 10 "## Current Mode" CLAUDE.md 2>/dev/null | head -15 || echo "No active mode found in CLAUDE.md"\`

The mode shown above is currently active. Use \`/mode:set <mode-name>\` to switch to a different mode.`
    };

    // Generate all mode command files
    await this.generateCommandFile('mode.md', modeMain);
    await this.generateCommandFile('mode/list.md', modeList);
    await this.generateCommandFile('mode/set.md', modeSet);
    await this.generateCommandFile('mode/current.md', modeCurrent);

    logger.info('Generated mode management commands');
  }

  /**
   * Generate memento system commands
   */
  private async generateMementoCommands(): Promise<void> {
    // Memento status command
    const mementoStatus: CommandTemplate = {
      name: 'memento/status',
      description: 'Show current Memento Protocol project status',
      allowedTools: [
        'Bash(npx memento-protocol ticket list)',
        'Bash(ls:.memento/modes/)',
        'Bash(ls:.memento/workflows/)',
        'Bash(head:CLAUDE.md)'
      ],
      body: `# Memento Protocol Status

## Active Tickets
!\`npx memento-protocol ticket list 2>/dev/null || echo "No tickets found"\`

## Available Modes
!\`ls -1 .memento/modes/ 2>/dev/null | head -10 || echo "No modes installed"\`

## Available Workflows  
!\`ls -1 .memento/workflows/ 2>/dev/null | head -10 || echo "No workflows installed"\`

## Current Configuration
!\`head -20 CLAUDE.md 2>/dev/null || echo "CLAUDE.md not found"\``
    };

    // Memento sync command
    const mementoSync: CommandTemplate = {
      name: 'memento/sync',
      description: 'Regenerate CLAUDE.md with current state',
      allowedTools: ['Bash(npx memento-protocol upsert)'],
      body: `# Synchronizing Memento Protocol

Regenerating CLAUDE.md with current project state...

!\`npx memento-protocol upsert\`

CLAUDE.md has been updated with the latest modes, workflows, and ticket information.`
    };

    // Memento init command
    const mementoInit: CommandTemplate = {
      name: 'memento/init',
      description: 'Initialize Memento Protocol in current project',
      allowedTools: ['Bash(npx memento-protocol init:*)'],
      body: `# Initializing Memento Protocol

!\`npx memento-protocol init --non-interactive --all-recommended\`

Memento Protocol has been initialized! You can now use:
- \`/ticket\` commands for ticket management
- \`/mode\` commands for mode switching
- \`/memento:status\` to check project status`
    };

    // Generate all memento command files
    await this.generateCommandFile('memento/status.md', mementoStatus);
    await this.generateCommandFile('memento/sync.md', mementoSync);
    await this.generateCommandFile('memento/init.md', mementoInit);

    logger.info('Generated memento system commands');
  }

  /**
   * Generate a single command file from a template
   */
  private async generateCommandFile(filePath: string, template: CommandTemplate): Promise<void> {
    const fullPath = path.join(this.commandsDir, filePath);
    
    // Create frontmatter with allowed tools and metadata
    const frontmatter = [
      '---',
      `allowed-tools: ${template.allowedTools.join(', ')}`,
      ...(template.argumentHint ? [`argument-hint: ${template.argumentHint}`] : []),
      `description: ${template.description}`,
      '---',
      ''
    ].join('\n');

    const content = frontmatter + template.body;
    
    await fs.writeFile(fullPath, content);
    logger.debug(`Generated command: ${filePath}`);
  }

  /**
   * Check if commands are already installed
   */
  async areCommandsInstalled(): Promise<boolean> {
    try {
      const ticketMainExists = await fs.access(path.join(this.commandsDir, 'ticket.md')).then(() => true).catch(() => false);
      const modeMainExists = await fs.access(path.join(this.commandsDir, 'mode.md')).then(() => true).catch(() => false);
      return ticketMainExists && modeMainExists;
    } catch {
      return false;
    }
  }

  /**
   * Clean up all generated commands
   */
  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.commandsDir, { recursive: true, force: true });
      logger.info('Cleaned up Claude Code commands');
    } catch (error) {
      logger.warn(`Failed to cleanup commands: ${error}`);
    }
  }
}