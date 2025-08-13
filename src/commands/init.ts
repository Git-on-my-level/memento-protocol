import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { DirectoryManager } from "../lib/directoryManager";
import { HookManager } from "../lib/hooks/HookManager";
import { CommandGenerator } from "../lib/commandGenerator";
import { ProjectDetector } from "../lib/projectDetector";
import { InteractiveSetup } from "../lib/interactiveSetup";
import { logger } from "../lib/logger";

interface NonInteractiveOptions {
  modes?: string[];
  workflows?: string[];
  hooks?: string[];
  defaultMode?: string;
  addToGitignore?: boolean;
}

/**
 * Parse non-interactive setup options from various sources
 */
function parseNonInteractiveOptions(
  cliOptions: any,
  cmd?: Command
): NonInteractiveOptions {
  const options: NonInteractiveOptions = {};
  const rawArgs: string[] = (cmd as any)?.rawArgs || process.argv;
  const hasFlag = (longFlag: string, shortFlag?: string) => {
    return (
      rawArgs.includes(longFlag) ||
      (shortFlag ? rawArgs.includes(shortFlag) : false)
    );
  };

  // 1. Check for config file
  if (
    cliOptions.config &&
    (hasFlag("--config", "-c") || !hasFlag("--all-recommended", "-a"))
  ) {
    try {
      const configPath = path.resolve(cliOptions.config);
      const configContent = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(configContent);

      if (config.modes && Array.isArray(config.modes)) {
        options.modes = config.modes;
      }
      if (config.workflows && Array.isArray(config.workflows)) {
        options.workflows = config.workflows;
      }
      if (config.hooks && Array.isArray(config.hooks)) {
        options.hooks = config.hooks;
      }
      if (config.defaultMode) {
        options.defaultMode = config.defaultMode;
      }
      if (config.addToGitignore !== undefined) {
        options.addToGitignore = config.addToGitignore;
      }
    } catch (error) {
      logger.warn(
        `Failed to read config file: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // 2. Override with environment variables
  if (process.env.MEMENTO_MODES) {
    options.modes = process.env.MEMENTO_MODES.split(",").map((m: string) =>
      m.trim()
    );
  }
  if (process.env.MEMENTO_WORKFLOWS) {
    options.workflows = process.env.MEMENTO_WORKFLOWS.split(",").map(
      (w: string) => w.trim()
    );
  }
  if (process.env.MEMENTO_HOOKS) {
    options.hooks = process.env.MEMENTO_HOOKS.split(",").map((h: string) =>
      h.trim()
    );
  }
  if (process.env.MEMENTO_DEFAULT_MODE) {
    options.defaultMode = process.env.MEMENTO_DEFAULT_MODE;
  }

  // 3. Override with CLI flags ONLY if explicitly provided in this invocation
  if (cliOptions.modes && hasFlag("--modes", "-m")) {
    options.modes = cliOptions.modes.split(",").map((m: string) => m.trim());
  }
  if (cliOptions.workflows && hasFlag("--workflows", "-w")) {
    options.workflows = cliOptions.workflows
      .split(",")
      .map((w: string) => w.trim());
  }
  if (cliOptions.hooks && hasFlag("--hooks", "-h")) {
    options.hooks = cliOptions.hooks.split(",").map((h: string) => h.trim());
  }
  if (cliOptions.defaultMode && hasFlag("--default-mode", "-d")) {
    options.defaultMode = cliOptions.defaultMode;
  }
  if (cliOptions.gitignore && hasFlag("--gitignore", "-g")) {
    options.addToGitignore = true;
  }

  return options;
}

export const initCommand = new Command("init")
  .description("Initialize Memento Protocol in the current project")
  .option("-f, --force", "Force initialization even if .memento already exists")
  .option(
    "-n, --non-interactive",
    "Non-interactive setup (no component installation)"
  )
  .option("-g, --gitignore", "Add .memento/ to .gitignore (defaults to false)")
  .option("-m, --modes <modes>", "Comma-separated list of modes to install")
  .option(
    "-w, --workflows <workflows>",
    "Comma-separated list of workflows to install"
  )
  .option("-h, --hooks <hooks>", "Comma-separated list of hooks to install")
  .option("-a, --all-recommended", "Install all recommended components")
  .option("-c, --config <path>", "Path to configuration file")
  .option("-d, --default-mode <mode>", "Set default mode")
  .action(async (options, command: Command) => {
    try {
      const projectRoot = process.cwd();
      const dirManager = new DirectoryManager(projectRoot);
      const hookManager = new HookManager(projectRoot);
      const commandGenerator = new CommandGenerator(projectRoot);
      const projectDetector = new ProjectDetector(projectRoot);

      // Check if already initialized
      if (dirManager.isInitialized() && !options.force) {
        logger.warn("Memento Protocol is already initialized in this project.");
        logger.info("Use --force to reinitialize.");
        return;
      }

      // Initialize directory structure
      logger.info("Initializing Memento Protocol...");
      await dirManager.initializeStructure();

      // Detect project type
      logger.info("Detecting project type...");
      const projectInfo = await projectDetector.detect();
      logger.info(
        `Project type: ${projectInfo.type}${
          projectInfo.framework ? ` (${projectInfo.framework})` : ""
        }`
      );

      // Run setup flow
      const interactiveSetup = new InteractiveSetup(projectRoot);
      let setupOptions;

      // Check for CI environment or explicit non-interactive mode
      const isNonInteractive =
        options.nonInteractive || process.env.CI === "true";

      if (isNonInteractive) {
        // Non-interactive setup with customization options
        logger.info("Running in non-interactive mode...");

        const nonInteractiveOpts = parseNonInteractiveOptions(options, command);
        let selectedModes: string[] = [];
        let selectedWorkflows: string[] = [];
        let selectedHooks: string[] = [];

        // Prefer explicit selections from config/env/CLI over "all recommended"
        const hasExplicitSelections = Boolean(
          (nonInteractiveOpts.modes && nonInteractiveOpts.modes.length > 0) ||
            (nonInteractiveOpts.workflows &&
              nonInteractiveOpts.workflows.length > 0) ||
            (nonInteractiveOpts.hooks && nonInteractiveOpts.hooks.length > 0) ||
            nonInteractiveOpts.defaultMode
        );

        if (hasExplicitSelections) {
          selectedModes = nonInteractiveOpts.modes || [];
          selectedWorkflows = nonInteractiveOpts.workflows || [];
          selectedHooks = nonInteractiveOpts.hooks || [];
        } else if (options.allRecommended) {
          selectedModes = projectInfo.suggestedModes;
          selectedWorkflows = projectInfo.suggestedWorkflows;
          // Get all available hooks for --all-recommended
          const availableHooks = await hookManager.listTemplates();
          selectedHooks = availableHooks;
        }

        setupOptions = {
          projectInfo,
          selectedModes,
          selectedWorkflows,
          selectedHooks,
          selectedLanguages: [],
          defaultMode: nonInteractiveOpts.defaultMode,
          addToGitignore: nonInteractiveOpts.addToGitignore || false,
        };
      } else {
        // Interactive setup (default)
        setupOptions = await interactiveSetup.run(projectInfo);
      }

      // Update .gitignore if requested via CLI flag or interactive setup
      if (options.gitignore || setupOptions.addToGitignore) {
        await dirManager.ensureGitignore();
      }

      // Apply setup (install components and save config)
      if (
        setupOptions.selectedModes.length > 0 ||
        setupOptions.selectedWorkflows.length > 0 ||
        (setupOptions.selectedHooks && setupOptions.selectedHooks.length > 0)
      ) {
        logger.space();
        logger.info("Installing selected components...");
        await interactiveSetup.applySetup({
          ...setupOptions,
          force: options.force,
        });
      }

      // Generate hook infrastructure
      logger.space();
      logger.info("Generating Claude Code hook infrastructure...");
      await hookManager.initialize();

      // Generate custom commands
      logger.info("Generating Claude Code custom commands...");
      await commandGenerator.initialize();

      logger.space();
      logger.success("Memento Protocol initialized successfully!");
      logger.space();
      logger.info("To use with Claude Code:");
      logger.info(
        '  - Say "mode: [name]" to activate a mode (fuzzy matching supported)'
      );
      logger.info('  - Say "workflow: [name]" to execute a workflow');
      logger.info("  - Use custom commands: /ticket, /mode, /memento:status");
      if (setupOptions.defaultMode) {
        logger.info(
          `  - Default mode "${setupOptions.defaultMode}" will be used when no mode is specified`
        );
      }
      if (setupOptions.selectedHooks && setupOptions.selectedHooks.length > 0) {
        logger.info(
          `  - Installed hooks: ${setupOptions.selectedHooks.join(", ")}`
        );
      }
      logger.space();
      logger.info('Run "memento --help" to see all available commands.');
      logger.info('Run "memento hook list" to see installed hooks.');
    } catch (error) {
      logger.error("Failed to initialize Memento Protocol:", error);
      process.exit(1);
    }
  });
