import { Command } from "commander";
import { DirectoryManager } from "../lib/directoryManager";
import { HookManager } from "../lib/hooks/HookManager";
import { CommandGenerator } from "../lib/commandGenerator";
import { InteractiveSetup } from "../lib/interactiveSetup";
import { StarterPackManager } from "../lib/StarterPackManager";
import { logger } from "../lib/logger";
import { isForce } from "../lib/context";


export const initCommand = new Command("init")
  .description("Initialize zcc in the current project or globally")
  .option("-f, --force", "Force initialization even if .zcc already exists")
  .option("--global", "Initialize global ~/.zcc configuration instead of project")
  .option("-g, --gitignore", "Add .zcc/ to .gitignore (defaults to false)")
  .option("-p, --pack <name>", "Install a specific starter pack (headless)")
  .action(async (options) => {
    try {
      // Resolve force flag from both local options and global context
      const forceFlag = options.force || isForce();
      
      // Handle global initialization
      if (options.global) {
        const { initializeGlobal } = await import("../lib/globalInit");
        
        await initializeGlobal({
          force: forceFlag,
          interactive: true
        });
        return;
      }

      
      const projectRoot = process.cwd();
      const dirManager = new DirectoryManager(projectRoot);
      const hookManager = new HookManager(projectRoot);
      const commandGenerator = new CommandGenerator(projectRoot);
      const starterPackManager = new StarterPackManager(projectRoot);
      // const componentInstaller = new ComponentInstaller(projectRoot); // Not used in pack-based setup

      // Check if already initialized
      if (dirManager.isInitialized() && !forceFlag) {
        logger.warn("zcc is already initialized in this project.");
        logger.info("Use --force to reinitialize.");
        return;
      }

      
      // Initialize directory structure
      logger.info("Initializing zcc...");
      await dirManager.initializeStructure(forceFlag);

      

      
      // Handle pack installation if specified
      if (options.pack) {
        logger.info(`Installing starter pack: ${options.pack}`);
        const packResult = await starterPackManager.installPack(options.pack, { 
          force: forceFlag,
          interactive: false 
        });
        
        if (!packResult.success) {
          logger.error("Starter pack installation failed:");
          packResult.errors.forEach(error => logger.error(`  ${error}`));
          process.exit(1);
        }
        
        logger.success(`Starter pack '${options.pack}' installed successfully`);
        
        // Generate hook infrastructure
        logger.space();
        logger.info("Generating Claude Code hook infrastructure...");
        await hookManager.initialize();

        // Generate custom commands
        logger.info("Generating Claude Code custom commands...");
        await commandGenerator.initialize();

        // Update .gitignore if requested and not global
        if (options.gitignore) {
          await dirManager.ensureGitignore();
        }

        logger.space();
        logger.success("zcc initialized successfully!");
        logger.space();
        logger.info("To use with Claude Code:");
        logger.info(
          '  - Say "mode: [name]" to activate a mode (fuzzy matching supported)'
        );
        logger.info('  - Say "workflow: [name]" to execute a workflow');
        logger.info("  - Use custom commands: /ticket, /mode, /zcc:status");
        if (packResult.postInstallMessage) {
          logger.space();
          logger.info("Starter Pack Information:");
          logger.info(packResult.postInstallMessage);
        }
        logger.space();
        logger.info('Run "zcc --help" to see all available commands.');
        logger.info('Run "zcc hook list" to see installed hooks.');
        return;
      }
      

      // Run interactive setup
      const interactiveSetup = new InteractiveSetup(projectRoot);
      const setupOptions = await interactiveSetup.run();

      // Update .gitignore if requested
      if (options.gitignore || setupOptions.addToGitignore) {
        await dirManager.ensureGitignore();
      }

      // Apply setup (install pack and save config)
      const shouldApplySetup = (
        setupOptions.selectedPack ||
        setupOptions.defaultMode ||
        (setupOptions.selectedModes && setupOptions.selectedModes.length > 0) ||
        (setupOptions.selectedWorkflows && setupOptions.selectedWorkflows.length > 0) ||
        (setupOptions.selectedHooks && setupOptions.selectedHooks.length > 0) ||
        (setupOptions.selectedAgents && setupOptions.selectedAgents.length > 0)
      );
      
      if (shouldApplySetup) {
        logger.space();
        if (setupOptions.selectedPack) {
          logger.info(`Installing starter pack: ${setupOptions.selectedPack}...`);
        } else {
          logger.info("Installing selected components...");
        }
        await interactiveSetup.applySetup({
          ...setupOptions,
          force: forceFlag,
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
      logger.space();
      logger.info('Run "zcc --help" to see all available commands.');
      logger.info('Run "zcc hook list" to see installed hooks.');
    } catch (error) {
      logger.error("Failed to initialize zcc:", error);
      process.exit(1);
    }
  });

