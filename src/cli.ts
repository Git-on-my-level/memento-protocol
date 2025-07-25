import { Command } from "commander";
import { initCommand } from "./commands/init";
import { addCommand } from "./commands/add";
import { listCommand } from "./commands/list";
import { ticketCommand } from "./commands/ticket";
import { configCommand } from "./commands/config";
import { createUpdateCommand } from "./commands/update";
import { upsertCommand } from "./commands/upsert";
import { logger } from "./lib/logger";
import { handleError } from "./lib/errors";

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
  $ memento                        # Initialize or update Memento Protocol
  $ memento init                   # Explicitly initialize Memento Protocol
  $ memento update                 # Explicitly update components
  $ memento add mode architect     # Add the architect mode
  $ memento add workflow review    # Add the code review workflow
  $ memento ticket create "auth"   # Create a ticket for authentication work
  $ memento list --installed       # Show installed components

For Claude Code users:
  Say "act as architect" to switch to architect mode
  Say "execute review" to run the code review workflow
  Say "create ticket X" to start persistent work

For more information, visit: https://github.com/git-on-my-level/memento-protocol
Documentation: https://github.com/git-on-my-level/memento-protocol#readme`
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
program.addCommand(addCommand);
program.addCommand(listCommand);
program.addCommand(ticketCommand);
program.addCommand(configCommand);
program.addCommand(createUpdateCommand());
program.addCommand(upsertCommand);

// Global error handling
process.on("unhandledRejection", (error) => {
  handleError(error, program.opts().verbose);
});

process.on("uncaughtException", (error) => {
  handleError(error, program.opts().verbose);
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
