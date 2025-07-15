import { Command } from "commander";
import { initCommand } from "./commands/init";
import { addCommand } from "./commands/add";
import { listCommand } from "./commands/list";
import { ticketCommand } from "./commands/ticket";
import { configCommand } from "./commands/config";
import { createUpdateCommand } from "./commands/update";
import { logger } from "./lib/logger";
import { handleError } from "./lib/errors";

// Version will be injected during build
const version = "0.1.0";

const program = new Command();

program
  .name("memento")
  .description("A lightweight meta-framework for Claude Code")
  .version(version)
  .option("-v, --verbose", "enable verbose output")
  .option("-d, --debug", "enable debug output")
  .addHelpText(
    "after",
    `
Examples:
  $ memento init                    # Initialize Memento Protocol in a project
  $ memento add mode architect      # Add the architect mode
  $ memento add workflow review     # Add the code review workflow
  $ memento ticket create "auth"    # Create a ticket for authentication work
  $ memento list --installed        # Show installed components

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

// Global error handling
process.on("unhandledRejection", (error) => {
  handleError(error, program.opts().verbose);
});

process.on("uncaughtException", (error) => {
  handleError(error, program.opts().verbose);
});

// Parse command line arguments
program.parse(process.argv);

// Show help if no command is provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
