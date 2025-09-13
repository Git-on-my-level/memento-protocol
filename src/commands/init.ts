import { Command } from "commander";
import { DirectoryManager } from "../lib/directoryManager";
import { HookManager } from "../lib/hooks/HookManager";
import { CommandGenerator } from "../lib/commandGenerator";
import { InteractiveSetup } from "../lib/interactiveSetup";
import { StarterPackManager } from "../lib/StarterPackManager";
import { logger } from "../lib/logger";
import { isForce } from "../lib/context";
import { MESSAGES } from "../lib/constants";
import chalk from "chalk";


export const initCommand = new Command("init")
  .description("Initialize zcc in the current project or globally")
  .option("-f, --force", "Force initialization even if .zcc already exists")
  .option("--global", "Initialize global ~/.zcc configuration instead of project")
  .option("-g, --gitignore", "Add .zcc/ to .gitignore (defaults to false)")
  .option("-p, --pack [name]", "Install a specific starter pack (headless), open pack picker, or 'list' to show available packs")
  .action(async (options) => {
    try {
      // Resolve force flag from both local options and global context
      const forceFlag = options.force || isForce();
      
      // Handle pack list request
      if (options.pack === 'list') {
        const starterPackManager = new StarterPackManager(process.cwd());
        const packs = await starterPackManager.listPacks();
        
        if (packs.length === 0) {
          logger.info('No starter packs available.');
          return;
        }
        
        logger.info(chalk.bold('Available Starter Packs:'));
        logger.info('');
        
        // Group packs by category for clean display
        const packsByCategory: Record<string, typeof packs> = {};
        for (const pack of packs) {
          const category = pack.manifest.category || 'general';
          if (!packsByCategory[category]) {
            packsByCategory[category] = [];
          }
          packsByCategory[category].push(pack);
        }
        
        for (const [category, categoryPacks] of Object.entries(packsByCategory)) {
          logger.info(chalk.blue(`${category.charAt(0).toUpperCase() + category.slice(1)}:`));
          
          for (const pack of categoryPacks) {
            const componentCount = (
              (pack.manifest.components.modes?.length || 0) +
              (pack.manifest.components.workflows?.length || 0) +
              (pack.manifest.components.agents?.length || 0) +
              (pack.manifest.components.hooks?.length || 0)
            );
            const componentText = componentCount === 1 ? 'component' : 'components';
            
            logger.info(`  ${chalk.green('●')} ${pack.manifest.name} - ${pack.manifest.description}`);
            logger.info(`    ${chalk.dim(`${componentCount} ${componentText} • ${pack.manifest.author} • v${pack.manifest.version}`)}`);
          }
          logger.info('');
        }
        
        logger.info(chalk.dim('Run "zcc init -p <name>" to install a pack.'));
        logger.info(chalk.dim('Run "zcc packs show <name>" for detailed pack information.'));
        return;
      }
      
      // Handle global initialization
      if (options.global) {
        const { initializeGlobal } = await import("../lib/globalInit");
        
        // If a pack is provided, run non-interactively
        const isPackProvided = options.pack && typeof options.pack === 'string';
        
        await initializeGlobal({
          force: forceFlag,
          interactive: !isPackProvided
        });
        
        // If pack was provided, install it to global scope
        if (isPackProvided) {
          logger.space();
          logger.info(`Installing starter pack to global scope: ${options.pack}...`);
          
          // Use global path for StarterPackManager
          const os = await import("os");
          const globalRoot = process.env.HOME || os.homedir();
          const globalStarterPackManager = new StarterPackManager(globalRoot);
          
          const packResult = await globalStarterPackManager.installPack(options.pack, {
            force: forceFlag,
            interactive: false
          });
          
          if (!packResult.success) {
            logger.error("Global starter pack installation failed:");
            packResult.errors.forEach(error => logger.error(`  ${error}`));
            process.exitCode = 1;
            return;
          }
          
          logger.success(MESSAGES.SUCCESS_MESSAGES.GLOBAL_PACK_INSTALLED(options.pack));
          
          if (packResult.postInstallMessage) {
            logger.space();
            logger.info(MESSAGES.INFO_HEADERS.STARTER_PACK_INFO);
            logger.info(packResult.postInstallMessage);
          }
          
          logger.space();
          logger.success("Global zcc with starter pack initialized successfully!");
          logger.space();
          logger.info(MESSAGES.INFO_HEADERS.CLAUDE_CODE_USAGE);
          logger.info(
            MESSAGES.USAGE_INSTRUCTIONS.MODE_ACTIVATION
          );
          logger.info(MESSAGES.USAGE_INSTRUCTIONS.WORKFLOW_EXECUTION);
          logger.info(MESSAGES.USAGE_INSTRUCTIONS.CUSTOM_COMMANDS);
          logger.space();
          logger.info(MESSAGES.HELP_INSTRUCTIONS.COMMAND_HELP);
          logger.info(MESSAGES.HELP_INSTRUCTIONS.GLOBAL_CONFIG);
        }
        
        return;
      }

      
      const projectRoot = process.cwd();
      const dirManager = new DirectoryManager(projectRoot);
      const hookManager = new HookManager(projectRoot);
      const commandGenerator = new CommandGenerator(projectRoot);
      const starterPackManager = new StarterPackManager(projectRoot);

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
      if (options.pack && typeof options.pack === 'string') {
        // Headless pack installation with specific pack name
        logger.info(`Installing starter pack: ${options.pack}`);
        const packResult = await starterPackManager.installPack(options.pack, { 
          force: forceFlag,
          interactive: false 
        });
        
        if (!packResult.success) {
          logger.error("Starter pack installation failed:");
          packResult.errors.forEach(error => logger.error(`  ${error}`));
          process.exitCode = 1;
          return;
        }
        
        logger.success(MESSAGES.SUCCESS_MESSAGES.PACK_INSTALLED(options.pack));
        
        // Generate hook infrastructure
        logger.space();
        logger.info("Generating Claude Code hook infrastructure...");
        await hookManager.initialize(forceFlag);

        // Generate custom commands
        logger.info("Generating Claude Code custom commands...");
        await commandGenerator.initialize();

        // Update .gitignore if requested and not global
        if (options.gitignore) {
          await dirManager.ensureGitignore();
        }

        logger.space();
        logger.success(MESSAGES.SUCCESS_MESSAGES.ZCC_INITIALIZED);
        logger.space();
        logger.info(MESSAGES.INFO_HEADERS.CLAUDE_CODE_USAGE);
        logger.info(
          MESSAGES.USAGE_INSTRUCTIONS.MODE_ACTIVATION
        );
        logger.info(MESSAGES.USAGE_INSTRUCTIONS.WORKFLOW_EXECUTION);
        logger.info(MESSAGES.USAGE_INSTRUCTIONS.CUSTOM_COMMANDS);
        if (packResult.postInstallMessage) {
          logger.space();
          logger.info("Starter Pack Information:");
          logger.info(packResult.postInstallMessage);
        }
        logger.space();
        logger.info(MESSAGES.HELP_INSTRUCTIONS.COMMAND_HELP);
        logger.info(MESSAGES.HELP_INSTRUCTIONS.HOOK_LIST);
        return;
      }
      
      // If --pack flag is present without value, or no pack flag at all, run interactive setup
      

      // Run interactive setup
      const interactiveSetup = new InteractiveSetup(projectRoot);
      const setupOptions = await interactiveSetup.run();

      // Handle global installation scope
      if (setupOptions.installScope === 'global') {
        const { initializeGlobal } = await import("../lib/globalInit");
        
        // Initialize global zcc with pack installation if selected
        await initializeGlobal({
          force: forceFlag,
          interactive: false, // We already collected the options
          defaultMode: setupOptions.defaultMode,
          installExamples: false // Don't install examples, we'll install the selected pack
        });
        
        // If a pack was selected, install it to global scope
        if (setupOptions.selectedPack) {
          logger.space();
          logger.info(`Installing starter pack to global scope: ${setupOptions.selectedPack}...`);
          
          // Use global path for StarterPackManager
          const os = await import("os");
          const globalRoot = process.env.HOME || os.homedir();
          const globalStarterPackManager = new StarterPackManager(globalRoot);
          
          const packResult = await globalStarterPackManager.installPack(setupOptions.selectedPack, {
            force: forceFlag,
            interactive: false
          });
          
          if (!packResult.success) {
            logger.error("Global starter pack installation failed:");
            packResult.errors.forEach(error => logger.error(`  ${error}`));
            process.exitCode = 1;
            return;
          }
          
          logger.success(MESSAGES.SUCCESS_MESSAGES.GLOBAL_PACK_INSTALLED(setupOptions.selectedPack));
          
          if (packResult.postInstallMessage) {
            logger.space();
            logger.info(MESSAGES.INFO_HEADERS.STARTER_PACK_INFO);
            logger.info(packResult.postInstallMessage);
          }
        }
        
        logger.space();
        logger.success(MESSAGES.SUCCESS_MESSAGES.GLOBAL_ZCC_INITIALIZED);
        logger.space();
        logger.info(MESSAGES.INFO_HEADERS.CLAUDE_CODE_USAGE);
        logger.info(
          MESSAGES.USAGE_INSTRUCTIONS.MODE_ACTIVATION
        );
        logger.info(MESSAGES.USAGE_INSTRUCTIONS.WORKFLOW_EXECUTION);
        logger.info(MESSAGES.USAGE_INSTRUCTIONS.CUSTOM_COMMANDS);
        if (setupOptions.defaultMode) {
          logger.info(
            `  - Default mode "${setupOptions.defaultMode}" will be used when no mode is specified`
          );
        }
        logger.space();
        logger.info(MESSAGES.HELP_INSTRUCTIONS.COMMAND_HELP);
        logger.info(MESSAGES.HELP_INSTRUCTIONS.GLOBAL_CONFIG);
        return;
      }

      // Update .gitignore if requested (only for project installations)
      if (options.gitignore || setupOptions.addToGitignore) {
        await dirManager.ensureGitignore();
      }

      // Apply setup (install pack and save config)
      const shouldApplySetup = (
        setupOptions.selectedPack ||
        setupOptions.defaultMode
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
      await hookManager.initialize(forceFlag);

      // Generate custom commands
      logger.info("Generating Claude Code custom commands...");
      await commandGenerator.initialize();

      logger.space();
      logger.success(MESSAGES.SUCCESS_MESSAGES.ZCC_INITIALIZED);
      logger.space();
      logger.info(MESSAGES.INFO_HEADERS.CLAUDE_CODE_USAGE);
      logger.info(
        MESSAGES.USAGE_INSTRUCTIONS.MODE_ACTIVATION
      );
      logger.info(MESSAGES.USAGE_INSTRUCTIONS.WORKFLOW_EXECUTION);
      logger.info(MESSAGES.USAGE_INSTRUCTIONS.CUSTOM_COMMANDS);
      if (setupOptions.defaultMode) {
        logger.info(
          `  - Default mode "${setupOptions.defaultMode}" will be used when no mode is specified`
        );
      }
      logger.space();
      logger.info(MESSAGES.HELP_INSTRUCTIONS.COMMAND_HELP);
      logger.info(MESSAGES.HELP_INSTRUCTIONS.HOOK_LIST);
    } catch (error) {
      logger.error("Failed to initialize zcc:", error);
      process.exitCode = 1;
      return;
    }
  });

