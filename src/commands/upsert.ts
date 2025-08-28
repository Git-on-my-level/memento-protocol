import { Command } from "commander";
import { UpsertManager } from "../lib/upsertManager";
import { logger } from "../lib/logger";

export const upsertCommand = new Command("upsert")
  .description("Install new components and update existing ones")
  .option("-f, --force", "Force overwrite of existing components")
  .addHelpText('after', `
Examples:
  $ memento upsert                                # Smart init/update (most common)
  $ memento upsert --force                        # Force overwrite all components
  $ memento                                       # Same as 'memento upsert'

What upsert does:
  - If .memento doesn't exist: Run full initialization (like 'memento init')
  - If .memento exists: Update components to latest versions (like 'memento update')
  - Preserves existing configuration and customizations
  - Adds new built-in components that weren't previously available
  - Safely updates existing components unless --force is used

Smart behavior:
  $ memento upsert                                # Detects project state automatically
  # New project -> Runs interactive setup
  # Existing project -> Updates components preserving local changes
  # Existing with conflicts -> Asks for confirmation before overwriting

Force mode:
  $ memento upsert --force                        # Overwrites all components
  # Useful when you want to reset everything to latest templates
  # Loses any local customizations - use with caution

When to use upsert vs other commands:
  memento upsert         # Default choice - handles everything intelligently
  memento init           # When you want full control over initial setup
  memento update         # When you only want to update existing components
  memento add            # When you want to add specific components only

Typical workflows:
  $ memento                                       # Quick check/update (daily use)
  $ memento upsert --force                        # Reset everything (rare)
  $ cd new-project && memento                     # Setup new project
`)
  .action(async (options) => {
    try {
      const upsertManager = new UpsertManager(process.cwd());
      await upsertManager.upsert(options.force);
    } catch (error: any) {
      logger.error("Upsert failed:", error);
      process.exit(1);
    }
  });
