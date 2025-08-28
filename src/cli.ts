import { Command } from "commander";
import { initCommand } from "./commands/init";
import { initGlobalCommand } from "./commands/init-global";
import { addCommand } from "./commands/add";
import { listCommand } from "./commands/list";
import { ticketCommand } from "./commands/ticket";
import { configCommand } from "./commands/config";
import { createUpdateCommand } from "./commands/update";
import { upsertCommand } from "./commands/upsert";
import { hookCommand } from "./commands/hook";
import { acronymCommand } from "./commands/acronym";
import { logger } from "./lib/logger";
import { handleError } from "./lib/errors";
import { resourceManager } from "./lib/utils/ResourceManager";

// Version will be injected during build
const version = process.env.VERSION || "0.1.0";

const program = new Command();

program
  .name("memento")
  .description("A lightweight meta-framework for Claude Code")
  .version(version)
  .option("-v, --verbose", "enable verbose output")
  .option("-d, --debug", "enable debug output")
  .option("-h, --help", "display help for command")
  .addHelpText(
    "after",
    `
Examples:
  $ memento                                       # Smart init/update (most common)
  $ memento init                                  # Interactive project initialization  
  $ memento init --starter-pack frontend-react   # Initialize with React starter pack
  $ memento init-global                           # Setup global ~/.memento configuration
  $ memento add mode engineer                     # Add engineer mode to project
  $ memento add workflow review                   # Add code review workflow
  $ memento list                                  # Show all available components
  $ memento list --type mode --verbose            # Show modes with descriptions
  $ memento ticket create "user authentication"   # Create persistent work ticket
  $ memento config set defaultMode architect      # Set default AI mode
  $ memento update --check                        # Check for component updates
  $ memento acronym add apm "autonomous-project-manager"  # Add acronym expansion

Quick start workflows:
  # New project setup
  $ cd my-project && memento init --starter-pack frontend-react
  
  # Daily usage
  $ memento                                       # Quick check and update
  $ memento ticket create "fix login bug"         # Start new work
  $ memento add mode architect                    # Add specialized mode
  
  # Team setup
  $ memento init-global --default-mode engineer   # Setup team defaults
  $ memento config set ui.colorOutput true        # Configure preferences

Component management:
  $ memento add mode eng                          # Fuzzy match (finds engineer)
  $ memento add mode apm                          # Acronym match (finds autonomous-project-manager)
  $ memento list --conflicts                      # Show conflicting components
  $ memento update mode:engineer --force          # Force update specific mode

For Claude Code users:
  • Say "mode: architect" to switch AI personality
  • Say "workflow: review" to execute code review workflow  
  • Say "/mode engineer" to use custom slash command
  • Say "/ticket create auth" to start persistent work
  • Reference tickets: "Continue work on auth ticket"

Global vs project configuration:
  ~/.memento/     - Global settings and shared components
  .memento/       - Project-specific configuration and components
  Configuration hierarchy: project -> global -> built-in defaults

For more information:
  GitHub: https://github.com/git-on-my-level/memento-protocol
  Documentation: https://github.com/git-on-my-level/memento-protocol#readme
  Issues & Support: https://github.com/git-on-my-level/memento-protocol/issues`
  )
  .hook("preAction", (thisCommand) => {
    const options = thisCommand.opts();
    if (options.verbose) {
      logger.setVerbose(true);
    }
    if (options.debug) {
      logger.setDebug(true);
    }
  });

// Register commands
program.addCommand(initCommand);
program.addCommand(initGlobalCommand);
program.addCommand(addCommand);
program.addCommand(listCommand);
program.addCommand(ticketCommand);
program.addCommand(configCommand);
program.addCommand(createUpdateCommand());
program.addCommand(upsertCommand);
program.addCommand(hookCommand);
program.addCommand(acronymCommand);

// Enhanced global error handling with resource cleanup
process.on("unhandledRejection", async (error) => {
  logger.debug("Unhandled promise rejection detected, cleaning up resources...");
  try {
    await resourceManager.cleanup();
  } catch (cleanupError) {
    logger.debug(`Resource cleanup failed: ${cleanupError}`);
  }
  handleError(error, program.opts().verbose);
});

process.on("uncaughtException", async (error) => {
  logger.debug("Uncaught exception detected, cleaning up resources...");
  try {
    await resourceManager.cleanup();
  } catch (cleanupError) {
    logger.debug(`Resource cleanup failed: ${cleanupError}`);
  }
  handleError(error, program.opts().verbose);
});

// Graceful shutdown handlers
process.on("SIGINT", async () => {
  logger.debug("SIGINT received, performing graceful shutdown...");
  try {
    await resourceManager.cleanup();
    process.exit(0);
  } catch (error) {
    logger.debug(`Shutdown cleanup failed: ${error}`);
    process.exit(1);
  }
});

process.on("SIGTERM", async () => {
  logger.debug("SIGTERM received, performing graceful shutdown...");
  try {
    await resourceManager.cleanup();
    process.exit(0);
  } catch (error) {
    logger.debug(`Shutdown cleanup failed: ${error}`);
    process.exit(1);
  }
});

// Handle process exit to ensure cleanup
process.on("exit", (code) => {
  const stats = resourceManager.getResourceStats();
  if (stats.totalResources > 0) {
    logger.debug(`Process exiting with ${stats.totalResources} uncleaned resources`);
  }
});

// Check if no command is provided before parsing
const args = process.argv.slice(2);
if (args.length === 0) {
  // No command provided, run upsert
  (async () => {
    try {
      const upsertManager = new (
        await import("./lib/upsertManager")
      ).UpsertManager(process.cwd());
      await upsertManager.upsert();
    } catch (error: any) {
      logger.error(`Upsert failed: ${error.message}`);
      process.exit(1);
    }
  })();
} else if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
  // Show help
  program.outputHelp();
} else {
  // Parse command line arguments normally
  program.parse(process.argv);
}
