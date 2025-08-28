import { FileSystemAdapter } from "./adapters/FileSystemAdapter";
import { NodeFileSystemAdapter } from "./adapters/NodeFileSystemAdapter";
import { logger } from "./logger";

export interface CommandTemplate {
  name: string;
  description: string;
  allowedTools: string[];
  argumentHint?: string;
  body: string;
}

export class CommandGenerator {
  private projectRoot: string;
  private claudeDir: string;
  private commandsDir: string;
  private fs: FileSystemAdapter;

  constructor(projectRoot: string, fs?: FileSystemAdapter) {
    this.projectRoot = projectRoot;
    this.fs = fs || new NodeFileSystemAdapter();
    this.claudeDir = this.fs.join(projectRoot, ".claude");
    this.commandsDir = this.fs.join(this.claudeDir, "commands");
  }

  /**
   * Initialize the command system by generating all default commands
   */
  async initialize(): Promise<void> {
    // Ensure directories exist
    await this.ensureDirectories();

    // Validate dependencies before generating commands
    await this.validateDependencies();

    // Generate ticket commands
    await this.generateTicketCommands();

    // Generate mode commands
    await this.generateModeCommands();

    // Generate memento commands
    await this.generateMementoCommands();

    logger.success("Claude Code custom commands generated");
  }

  /**
   * Ensure all required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    await this.fs.mkdir(this.claudeDir, { recursive: true });
    await this.fs.mkdir(this.commandsDir, { recursive: true });
  }

  /**
   * Generate ticket management commands
   */
  private async generateTicketCommands(): Promise<void> {
    // Main ticket command (list if no args, load context if args provided)
    const ticketMain: CommandTemplate = {
      name: "ticket",
      description: "Manage tickets stored as .md files in .memento/tickets/ directories",
      allowedTools: ["Bash(sh .memento/scripts/ticket-context.sh)"],
      argumentHint: "[ticket-name]",
      body: `# Ticket Management

!\`sh .memento/scripts/ticket-context.sh $ARGUMENTS\`

I now have ticket information loaded. Use Read tool to access actual ticket content.`,
    };

    // Generate ticket command file
    await this.generateCommandFile("ticket.md", ticketMain);

    logger.info("Generated ticket management commands");
  }

  /**
   * Generate mode management commands
   */
  private async generateModeCommands(): Promise<void> {
    // Main mode command (list if no args, set mode if args provided)
    const modeMain: CommandTemplate = {
      name: "mode",
      description: "List available modes or switch to a specific mode",
      allowedTools: ["Bash(sh .memento/scripts/mode-switch.sh)"],
      argumentHint: "[mode-name]",
      body: `# Mode Management

!\`sh .memento/scripts/mode-switch.sh $ARGUMENTS\`

${"" /* No arguments: Shows available modes */}
${"" /* With arguments: Loads and activates the specified mode */}
I'll now operate according to the mode guidelines shown above.`,
    };

    // Generate mode command file
    await this.generateCommandFile("mode.md", modeMain);

    logger.info("Generated mode management commands");
  }

  /**
   * Generate memento system commands
   */
  private async generateMementoCommands(): Promise<void> {
    // Main memento command (shows status)
    const mementoMain: CommandTemplate = {
      name: "memento",
      description: "Show current Memento Protocol project status",
      allowedTools: [
        "Bash(npx memento-protocol ticket list)",
        "Bash(ls:.memento/modes/)",
        "Bash(ls:.memento/workflows/)",
        "Bash(head:CLAUDE.md)",
      ],
      body: `# Memento Protocol Status

## Active Tickets
!\`npx memento-protocol ticket list 2>/dev/null || echo "No tickets found"\`

## Available Modes
!\`ls -1 .memento/modes/ 2>/dev/null | head -10 || echo "No modes installed"\`

## Available Workflows  
!\`ls -1 .memento/workflows/ 2>/dev/null | head -10 || echo "No workflows installed"\`

## Current Configuration
!\`head -20 CLAUDE.md 2>/dev/null || echo "CLAUDE.md not found"\``,
    };

    // Generate memento command file
    await this.generateCommandFile("memento.md", mementoMain);

    logger.info("Generated memento system commands");
  }

  /**
   * Generate a single command file from a template
   */
  private async generateCommandFile(
    filePath: string,
    template: CommandTemplate
  ): Promise<void> {
    const fullPath = this.fs.join(this.commandsDir, filePath);

    // Create frontmatter with allowed tools and metadata
    const frontmatter = [
      "---",
      `allowed-tools: ${template.allowedTools.join(", ")}`,
      ...(template.argumentHint
        ? [`argument-hint: ${template.argumentHint}`]
        : []),
      `description: ${template.description}`,
      "---",
      "",
    ].join("\n");

    const content = frontmatter + template.body;

    await this.fs.writeFile(fullPath, content);
    logger.debug(`Generated command: ${filePath}`);
  }

  /**
   * Check if commands are already installed
   */
  async areCommandsInstalled(): Promise<boolean> {
    try {
      const ticketExists = await this.fs.exists(this.fs.join(this.commandsDir, "ticket.md"));
      const modeExists = await this.fs.exists(this.fs.join(this.commandsDir, "mode.md"));
      const mementoExists = await this.fs.exists(this.fs.join(this.commandsDir, "memento.md"));
      return ticketExists && modeExists && mementoExists;
    } catch {
      return false;
    }
  }

  /**
   * Clean up all generated commands
   */
  async cleanup(): Promise<void> {
    try {
      await this.fs.rmdir(this.commandsDir);
      logger.info("Cleaned up Claude Code commands");
    } catch (error) {
      logger.warn(`Failed to cleanup commands: ${error}`);
    }
  }

  /**
   * Validate that all dependencies for custom commands exist
   * This prevents the regression where commands are generated but required scripts don't exist
   */
  private async validateDependencies(): Promise<void> {
    const requiredScripts = [
      ".memento/scripts/ticket-context.sh",
      ".memento/scripts/mode-switch.sh"
    ];

    const missing: string[] = [];

    for (const scriptPath of requiredScripts) {
      const fullPath = this.fs.join(this.projectRoot, scriptPath);
      if (!this.fs.existsSync(fullPath)) {
        missing.push(scriptPath);
      }
    }

    if (missing.length > 0) {
      const errorMessage = [
        "Missing required scripts for custom commands:",
        ...missing.map(script => `  - ${script}`),
        "",
        "This indicates that the .memento directory structure is incomplete.",
        "Please run 'memento init --force' to regenerate the required files."
      ].join("\n");
      
      throw new Error(errorMessage);
    }

    logger.debug("All command dependencies validated successfully");
  }
}
