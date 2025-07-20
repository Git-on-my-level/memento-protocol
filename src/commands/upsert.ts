import { Command } from "commander";
import { UpsertManager } from "../lib/upsertManager";
import { logger } from "../lib/logger";

export const upsertCommand = new Command("upsert")
  .description("Install new components and update existing ones")
  .option("-f, --force", "Force overwrite of existing components")
  .action(async (options) => {
    try {
      const upsertManager = new UpsertManager(process.cwd());
      await upsertManager.upsert(options.force);
    } catch (error: any) {
      logger.error("Upsert failed:", error);
      process.exit(1);
    }
  });
