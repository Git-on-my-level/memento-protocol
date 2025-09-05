import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import inquirer from "inquirer";
import { DirectoryManager } from "../lib/directoryManager";
import { HookManager } from "../lib/hooks/HookManager";
import { CommandGenerator } from "../lib/commandGenerator";
import { InteractiveSetup } from "../lib/interactiveSetup";
import { StarterPackManager } from "../lib/StarterPackManager";
import { ComponentInstaller } from "../lib/componentInstaller";
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
  if (process.env.ZCC_MODES) {
    options.modes = process.env.ZCC_MODES.split(",").map((m: string) =>
      m.trim()
    );
  }
  if (process.env.ZCC_WORKFLOWS) {
    options.workflows = process.env.ZCC_WORKFLOWS.split(",").map(
      (w: string) => w.trim()
    );
  }
  if (process.env.ZCC_HOOKS) {
    options.hooks = process.env.ZCC_HOOKS.split(",").map((h: string) =>
      h.trim()
    );
  }
  if (process.env.ZCC_DEFAULT_MODE) {
    options.defaultMode = process.env.ZCC_DEFAULT_MODE;
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
  .description("Initialize zcc in the current project or globally")
  .option("-f, --force", "Force initialization even if .zcc already exists")
  .option(
    "-n, --non-interactive",
    "Non-interactive setup (no component installation)"
  )
  .option("--global", "Initialize global ~/.zcc configuration instead of project")
  .option("-g, --gitignore", "Add .zcc/ to .gitignore (defaults to false)")
  .option("-m, --modes <modes>", "Comma-separated list of modes to install")
  .option(
    "-w, --workflows <workflows>",
    "Comma-separated list of workflows to install"
  )
  .option("-h, --hooks <hooks>", "Comma-separated list of hooks to install")
  .option("-a, --all-recommended", "Install all recommended components")
  .option("-c, --config <path>", "Path to configuration file")
  .option("-d, --default-mode <mode>", "Set default mode")
  .option("-s, --starter-pack [pack]", "Install a starter pack (interactive selection if no pack specified)")
  .action(async (options, command: Command) => {
    try {
      
      // Handle global initialization
      if (options.global) {
        const { initGlobalCommand } = await import("./init-global");
        // Re-run with init-global command, preserving relevant options
        const args = ["node", "zcc"];
        
        if (options.force) args.push("--force");
        if (options.nonInteractive) args.push("--no-interactive");
        if (options.defaultMode) args.push("--default-mode", options.defaultMode);
        if (options.allRecommended) args.push("--install-examples");
        
        await initGlobalCommand.parseAsync(args);
        return;
      }

      
      const projectRoot = process.cwd();
      const dirManager = new DirectoryManager(projectRoot);
      const hookManager = new HookManager(projectRoot);
      const commandGenerator = new CommandGenerator(projectRoot);
      const starterPackManager = new StarterPackManager(projectRoot);
      const componentInstaller = new ComponentInstaller(projectRoot);

      // Check if already initialized
      if (dirManager.isInitialized() && !options.force) {
        logger.warn("zcc is already initialized in this project.");
        logger.info("Use --force to reinitialize.");
        return;
      }

      
      // Initialize directory structure
      logger.info("Initializing zcc...");
      await dirManager.initializeStructure(options.force);

      
      // Check for CI environment or explicit non-interactive mode
      const isNonInteractive =
        options.nonInteractive || process.env.CI === "true";
        

      
      // Handle starter pack installation first if requested
      let packResult = null;
      if (options.starterPack !== undefined) {
        packResult = await handleStarterPackInstallation(
          starterPackManager,
          options.starterPack,
          isNonInteractive,
          options.force
        );
        
        // If pack installation failed, stop here
        if (!packResult.success) {
          logger.error("Starter pack installation failed:");
          packResult.errors.forEach(error => logger.error(`  ${error}`));
          process.exit(1);
        }
      }
      

      // Run setup flow
      const interactiveSetup = new InteractiveSetup(projectRoot);
      let setupOptions;

      if (isNonInteractive) {
        // Non-interactive setup with customization options
        logger.info("Running in non-interactive mode...");

        const nonInteractiveOpts = parseNonInteractiveOptions(options, command);
        let selectedModes: string[] = [];
        let selectedWorkflows: string[] = [];
        let selectedHooks: string[] = [];
        let selectedAgents: string[] = [];

        // DEBUG: Check packResult and nonInteractiveOpts

        // Prefer explicit selections from config/env/CLI over "all recommended"
        const hasExplicitSelections = Boolean(
          (nonInteractiveOpts.modes && nonInteractiveOpts.modes.length > 0) ||
            (nonInteractiveOpts.workflows &&
              nonInteractiveOpts.workflows.length > 0) ||
            (nonInteractiveOpts.hooks && nonInteractiveOpts.hooks.length > 0) ||
            nonInteractiveOpts.defaultMode ||
            packResult  // If we installed a pack, consider that as explicit selection
        );


        if (hasExplicitSelections) {
          selectedModes = nonInteractiveOpts.modes || [];
          selectedWorkflows = nonInteractiveOpts.workflows || [];
          selectedHooks = nonInteractiveOpts.hooks || [];
          
          // Merge starter pack components with CLI-specified components
          if (packResult && packResult.success && packResult.installed) {
            // Add pack components to the selection (avoid duplicates)
            const packModes = packResult.installed.modes || [];
            const packWorkflows = packResult.installed.workflows || [];
            const packAgents = packResult.installed.agents || [];
            const packHooks = packResult.installed.hooks || [];

            selectedModes = [...new Set([...selectedModes, ...packModes])];
            selectedWorkflows = [...new Set([...selectedWorkflows, ...packWorkflows])];
            selectedAgents = [...new Set([...selectedAgents, ...packAgents])];
            selectedHooks = [...new Set([...selectedHooks, ...packHooks])];
          }
        } else if (options.allRecommended) {
          // For --all-recommended, get all available components
          const availableComponents = await componentInstaller.listAvailableComponents();
          selectedModes = availableComponents.modes.map(m => m.name);
          selectedWorkflows = availableComponents.workflows.map(w => w.name);
          selectedAgents = availableComponents.agents.map(a => a.name);
          // Get all available hooks for --all-recommended
          const availableHooks = await hookManager.listTemplates();
          selectedHooks = availableHooks;
        } else if (packResult && packResult.success && packResult.installed) {
          // If only a starter pack is installed (no explicit CLI selections), still include pack components
          selectedModes = [...(packResult.installed.modes || [])];
          selectedWorkflows = [...(packResult.installed.workflows || [])];
          selectedAgents = [...(packResult.installed.agents || [])];
          selectedHooks = [...(packResult.installed.hooks || [])];
        }

        setupOptions = {
          selectedModes,
          selectedWorkflows,
          selectedHooks,
          selectedAgents,  // Now properly populated from above
          selectedLanguages: [],
          defaultMode: nonInteractiveOpts.defaultMode || packResult?.defaultMode,
          addToGitignore: nonInteractiveOpts.addToGitignore || false,
        };
        
      } else {
        // Interactive setup (default)
        setupOptions = await interactiveSetup.run();
      }

      // Update .gitignore if requested via CLI flag or interactive setup
      if (options.gitignore || setupOptions.addToGitignore) {
        await dirManager.ensureGitignore();
      }

      // Apply setup (install components and save config)
      
      const shouldApplySetup = (
        setupOptions.selectedModes.length > 0 ||
        setupOptions.selectedWorkflows.length > 0 ||
        (setupOptions.selectedHooks && setupOptions.selectedHooks.length > 0) ||
        (setupOptions.selectedAgents && setupOptions.selectedAgents.length > 0) ||
        setupOptions.defaultMode // Apply setup if defaultMode needs to be saved
      );
      
      if (shouldApplySetup) {
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
      logger.success("zcc initialized successfully!");
      logger.space();
      logger.info("To use with Claude Code:");
      logger.info(
        '  - Say "mode: [name]" to activate a mode (fuzzy matching supported)'
      );
      logger.info('  - Say "workflow: [name]" to execute a workflow');
      logger.info("  - Use custom commands: /ticket, /mode, /zcc:status");
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
      if (packResult?.postInstallMessage) {
        logger.space();
        logger.info("Starter Pack Information:");
        logger.info(packResult.postInstallMessage);
      }
      logger.space();
      logger.info('Run "zcc --help" to see all available commands.');
      logger.info('Run "zcc hook list" to see installed hooks.');
    } catch (error) {
      logger.error("Failed to initialize zcc:", error);
      process.exit(1);
    }
  });

/**
 * Handle starter pack installation based on options
 */
async function handleStarterPackInstallation(
  starterPackManager: StarterPackManager,
  packName: string | boolean,
  isNonInteractive: boolean,
  force?: boolean
): Promise<{
  success: boolean;
  installed: { modes: string[]; workflows: string[]; agents: string[]; hooks: string[] };
  skipped: { modes: string[]; workflows: string[]; agents: string[]; hooks: string[] };
  errors: string[];
  postInstallMessage?: string;
  defaultMode?: string;
}> {
  // If --starter-pack was provided without a value, show interactive selection
  
  if (packName === true && !isNonInteractive) {
    const availablePacks = await starterPackManager.listPacks();
    
    if (availablePacks.length === 0) {
      logger.warn("No starter packs available.");
      return { success: true, installed: { modes: [], workflows: [], agents: [], hooks: [] }, skipped: { modes: [], workflows: [], agents: [], hooks: [] }, errors: [] };
    }

    const { selectedPack } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedPack',
        message: 'Select a starter pack to install:',
        choices: [
          { name: 'Skip starter pack installation', value: null },
          ...availablePacks.map(pack => ({
            name: `${pack.manifest.name} - ${pack.manifest.description}`,
            value: pack.manifest.name
          }))
        ]
      }
    ]);

    if (!selectedPack) {
      return { success: true, installed: { modes: [], workflows: [], agents: [], hooks: [] }, skipped: { modes: [], workflows: [], agents: [], hooks: [] }, errors: [] };
    }
    
    packName = selectedPack;
  } else if (packName === true) {
    // Non-interactive mode but no pack name provided
    logger.warn("--starter-pack requires a pack name in non-interactive mode");
    return { success: false, installed: { modes: [], workflows: [], agents: [], hooks: [] }, skipped: { modes: [], workflows: [], agents: [], hooks: [] }, errors: ["Pack name required"] };
  }

  if (typeof packName === 'string') {
    logger.info(`Installing starter pack: ${packName}`);
    const result = await starterPackManager.installPack(packName, { force, interactive: !isNonInteractive });
    
    if (result.success) {
      logger.success(`Starter pack '${packName}' installed successfully`);
      if (result.installed.modes.length > 0) {
        logger.info(`  Modes: ${result.installed.modes.join(', ')}`);
      }
      if (result.installed.workflows.length > 0) {
        logger.info(`  Workflows: ${result.installed.workflows.join(', ')}`);
      }
      if (result.installed.agents.length > 0) {
        logger.info(`  Agents: ${result.installed.agents.join(', ')}`);
      }
      if (result.installed.hooks && result.installed.hooks.length > 0) {
        logger.info(`  Hooks: ${result.installed.hooks.join(', ')}`);
      }
    }
    
    // Load pack to get default mode for return value
    try {
      const packStructure = await starterPackManager.loadPack(packName);
      const returnValue = { 
        success: result.success,
        installed: {
          modes: [...result.installed.modes],
          workflows: [...result.installed.workflows],
          agents: [...result.installed.agents],
          hooks: [...(result.installed.hooks || [])]
        },
        skipped: {
          modes: [...result.skipped.modes],
          workflows: [...result.skipped.workflows],
          agents: [...result.skipped.agents],
          hooks: [...(result.skipped.hooks || [])]
        },
        errors: [...result.errors],
        postInstallMessage: result.postInstallMessage,
        defaultMode: packStructure.manifest.configuration?.defaultMode
      };
      return returnValue;
    } catch (error) {
      const returnValue = {
        success: result.success,
        installed: {
          modes: [...result.installed.modes],
          workflows: [...result.installed.workflows],
          agents: [...result.installed.agents],
          hooks: [...(result.installed.hooks || [])]
        },
        skipped: {
          modes: [...result.skipped.modes],
          workflows: [...result.skipped.workflows],
          agents: [...result.skipped.agents],
          hooks: [...(result.skipped.hooks || [])]
        },
        errors: [...result.errors],
        postInstallMessage: result.postInstallMessage
      };
      return returnValue;
    }
  }

  return { success: true, installed: { modes: [], workflows: [], agents: [], hooks: [] }, skipped: { modes: [], workflows: [], agents: [], hooks: [] }, errors: [] };
}
