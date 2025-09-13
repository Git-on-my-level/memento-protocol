import { Command } from "commander";
import { initCommand } from "./commands/init";
import { ticketCommand } from "./commands/ticket";
import { configCommand } from "./commands/config";
import { hookCommand } from "./commands/hook";
import { acronymCommand } from "./commands/acronym";
import { doctorCommand } from "./commands/doctor";
import { packCommand } from "./commands/pack";
import { sourceCommand } from "./commands/source";
import { searchCommand } from "./commands/search";
import { logger } from "./lib/logger";
import { handleError } from "./lib/errors";
import { cliContext } from "./lib/context";

// Version will be injected during build
// In dev mode, read from package.json
let version = process.env.VERSION;
if (!version) {
  try {
    const packageJson = require("../package.json");
    version = packageJson.version;
  } catch {
    version = "0.1.0"; // Fallback if package.json can't be read
  }
}

const program = new Command();

program
  .name("zcc")
  .description("A lightweight meta-framework for Claude Code")
  .version(version)
  .option("-v, --verbose", "enable verbose output")
  .option("-d, --debug", "enable debug output")
  .option("-y, --yes", "answer yes to all prompts (non-interactive mode)")
  .option("-f, --force", "force operations without confirmation prompts")
  .option("--no-color", "disable colored output")
  .addHelpText(
    "after",
    `
Examples:
  $ zcc init --pack webapp     # Initialize project with a starter pack
  $ zcc pack install webapp    # Install the webapp pack
  $ zcc pack list              # Show available packs
  $ zcc pack uninstall webapp  # Remove a pack
  $ zcc pack update            # Update installed packs
  $ zcc doctor                 # Run diagnostic checks
  $ zcc doctor --fix           # Run diagnostics and attempt fixes
  $ zcc ticket create "auth"   # Create a ticket for authentication work
  $ zcc pack list --installed  # Show installed packs

For more information, visit: https://github.com/git-on-my-level/zcc
Documentation: https://github.com/git-on-my-level/zcc#readme`
  )
  .hook("preAction", (thisCommand) => {
    // Get options from both parent and current command
    const options = thisCommand.opts();
    const parentOptions = thisCommand.parent?.opts() || {};
    const allOptions = { ...parentOptions, ...options };

    // Initialize CLI context with global options
    cliContext.initialize({
      verbose: allOptions.verbose || false,
      debug: allOptions.debug || false,
      nonInteractive: allOptions.yes || false,
      force: allOptions.force || false,
      projectRoot: process.cwd(),
    });

    // Set logger options based on context
    if (cliContext.isVerbose()) {
      logger.setVerbose(true);
    }
    if (cliContext.isDebug()) {
      logger.setDebug(true);
    }
    if (allOptions.noColor) {
      logger.setNoColor(true);
    }
  });

// Register commands
program.addCommand(initCommand);
program.addCommand(ticketCommand);
program.addCommand(configCommand);
program.addCommand(hookCommand);
program.addCommand(acronymCommand);
program.addCommand(doctorCommand);
program.addCommand(packCommand);
program.addCommand(sourceCommand);
program.addCommand(searchCommand);

// Global error handling
process.on("unhandledRejection", (error) => {
  handleError(error, cliContext.isVerbose());
});

process.on("uncaughtException", (error) => {
  handleError(error, cliContext.isVerbose());
});

const args = process.argv.slice(2);
if (args.length === 0) {
  program.outputHelp();
} else {
  program.parse(process.argv);
}
