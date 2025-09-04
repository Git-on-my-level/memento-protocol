import { Command } from "commander";
import * as os from "os";
import inquirer from "inquirer";
import { ZccCore } from "../lib/ZccCore";
import { MementoConfig } from "../lib/configSchema";
import { logger } from "../lib/logger";
import { FileSystemError } from "../lib/errors";
import { FileSystemAdapter } from "../lib/adapters/FileSystemAdapter";
import { NodeFileSystemAdapter } from "../lib/adapters/NodeFileSystemAdapter";

interface GlobalInitOptions {
  force?: boolean;
  interactive?: boolean;
  defaultMode?: string;
  colorOutput?: boolean;
  verboseLogging?: boolean;
  installExamples?: boolean;
}

interface GlobalInitContext {
  options: GlobalInitOptions;
  globalPath: string;
  configPath: string;
  fs: FileSystemAdapter;
}


/**
 * Generate config.yaml content with comments
 */
function generateConfigYaml(config: MementoConfig): string {
  return `# zcc Global Configuration
# This file configures zcc settings that apply across all your projects.
# Project-specific .zcc/config.yaml files can override these settings.
#
# Documentation: https://github.com/git-on-my-level/memento-protocol#configuration

# Default mode to activate when none is specified in a project
# Uncomment and set to your preferred mode (e.g., "engineer", "architect", "reviewer")
${config.defaultMode ? `defaultMode: "${config.defaultMode}"` : '# defaultMode: "engineer"'}

# UI preferences that enhance your development experience
ui:
  # Enable colored terminal output for better readability
  colorOutput: ${config.ui?.colorOutput ?? true}
  
  # Enable verbose logging for troubleshooting (recommended: false for daily use)
  verboseLogging: ${config.ui?.verboseLogging ?? false}

# Global integrations configuration
# Configure tools and services that apply to all your projects
integrations: {}
  # Examples:
  # git:
  #   autoStash: true
  #   defaultBranch: "main" 
  # docker:
  #   defaultRegistry: "your-registry.com"

# Component preferences
components:
  # Modes that should be available globally (can be overridden per project)
  modes: []
    # Examples:
    # - "engineer"
    # - "architect" 
    # - "reviewer"
  
  # Workflows that should be available globally
  workflows: []
    # Examples:
    # - "review"
    # - "debug"
    # - "optimize"

# Advanced: Custom template sources for additional components
# customTemplateSources: []
  # Examples:
  # - "https://github.com/your-org/memento-templates"
  # - "/path/to/local/custom/templates"

# Preferred workflows for quick access
# preferredWorkflows: []
  # Examples:
  # - "review"
  # - "summarize"
  # - "debug"
`;
}

/**
 * Interactive setup for global configuration
 */
async function runInteractiveSetup(): Promise<MementoConfig> {
  logger.info("🌟 Welcome to zcc Global Setup!");
  logger.info("This will create your ~/.zcc global configuration.");
  logger.space();

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "defaultMode",
      message: "Default mode to use across projects (leave empty for none):",
      validate: (input: string) => {
        if (input && !/^[a-z-]+$/.test(input)) {
          return "Mode names should contain only lowercase letters and hyphens";
        }
        return true;
      }
    },
    {
      type: "confirm",
      name: "colorOutput",
      message: "Enable colored terminal output?",
      default: true
    },
    {
      type: "confirm",
      name: "verboseLogging",
      message: "Enable verbose logging by default?",
      default: false
    },
    {
      type: "confirm",
      name: "installExamples",
      message: "Install example global components (modes and workflows)?",
      default: true
    }
  ]);

  const config: MementoConfig = {
    ui: {
      colorOutput: answers.colorOutput,
      verboseLogging: answers.verboseLogging
    }
  };

  if (answers.defaultMode && answers.defaultMode.trim()) {
    config.defaultMode = answers.defaultMode.trim();
  }

  return config;
}

/**
 * Install example components to global ~/.zcc
 */
async function installExampleComponents(ctx: GlobalInitContext): Promise<void> {
  // This would use the component installer to add some basic global components
  // For now, we'll create placeholder directories to show the structure
  const exampleDirs = [
    ctx.fs.join(ctx.globalPath, "modes"),
    ctx.fs.join(ctx.globalPath, "workflows"), 
    ctx.fs.join(ctx.globalPath, "scripts"),
    ctx.fs.join(ctx.globalPath, "hooks"),
    ctx.fs.join(ctx.globalPath, "agents"),
    ctx.fs.join(ctx.globalPath, "commands"),
    ctx.fs.join(ctx.globalPath, "templates")
  ];

  for (const dir of exampleDirs) {
    await ctx.fs.mkdir(dir, { recursive: true });
  }

  // Create a simple example script
  const exampleScript = `#!/bin/bash
# Example global script - customize as needed
echo "Hello from global zcc!"
`;

  await ctx.fs.writeFile(
    ctx.fs.join(ctx.globalPath, "scripts", "hello.sh"), 
    exampleScript,
    { encoding: 'utf8' }
  );

  logger.info("✅ Installed example global components");
}

export const initGlobalCommand = new Command("init-global")
  .description("Initialize global zcc configuration (~/.zcc)")
  .option("-f, --force", "Force initialization even if ~/.zcc already exists")  
  .option("-i, --interactive", "Run interactive setup (default: true)")
  .option("--no-interactive", "Skip interactive setup and use defaults")
  .option("-d, --default-mode <mode>", "Set default mode for all projects")
  .option("--color-output", "Enable colored terminal output")
  .option("--no-color-output", "Disable colored terminal output")
  .option("--verbose-logging", "Enable verbose logging by default")
  .option("--no-verbose-logging", "Disable verbose logging by default")  
  .option("--install-examples", "Install example global components")
  .option("--no-install-examples", "Skip installing example components")
  .action(async (options: GlobalInitOptions, _cmd?: Command, fsAdapter?: FileSystemAdapter) => {
    try {
      const fs = fsAdapter || new NodeFileSystemAdapter();
      const globalPath = fs.join(os.homedir(), ".zcc");
      const configPath = fs.join(globalPath, "config.yaml");
      
      const ctx: GlobalInitContext = {
        options,
        globalPath,
        configPath,
        fs
      };
      
      // Check if already initialized
      if (await fs.exists(globalPath) && !options.force) {
        logger.warn("Global zcc is already initialized.");
        logger.info(`Location: ${globalPath}`);
        logger.info("Use --force to reinitialize and overwrite existing configuration.");
        return;
      }

      logger.info("Initializing global zcc configuration...");
      logger.info(`Location: ${globalPath}`);
      logger.space();

      // Create global directory structure
      await fs.mkdir(globalPath, { recursive: true });

      let config: MementoConfig;

      // Run interactive setup or use provided options
      if (options.interactive !== false) {
        config = await runInteractiveSetup();
      } else {
        // Use CLI options or defaults
        config = {
          ui: {
            colorOutput: options.colorOutput ?? true,
            verboseLogging: options.verboseLogging ?? false
          }
        };
        
        if (options.defaultMode) {
          config.defaultMode = options.defaultMode;
        }
      }

      // Generate and save config file
      const configContent = generateConfigYaml(config);
      await ctx.fs.writeFile(ctx.configPath, configContent, { encoding: 'utf-8' });

      // Install example components if requested  
      const shouldInstallExamples = 
        options.installExamples ?? 
        (options.interactive !== false ? true : false);

      if (shouldInstallExamples) {
        await installExampleComponents(ctx);
      }

      // Initialize using ZccCore to create full structure
      const mementoCore = new ZccCore(process.cwd(), ctx.fs);
      const globalScope = mementoCore.getScopes().global;
      await globalScope.initialize();

      logger.space();
      logger.success("Global zcc initialized successfully! 🎉");
      logger.space();
      logger.info("Configuration saved to:");
      logger.info(`  ${ctx.configPath}`);
      logger.space();
      logger.info("What's next:");
      logger.info("  • Run 'zcc init' in any project to apply global settings");
      logger.info("  • Edit ~/.zcc/config.yaml to customize global preferences");
      logger.info("  • Add global modes/workflows to ~/.zcc/ for reuse across projects");
      logger.space();
      logger.info("Global configuration takes effect in all new project setups.");
      
    } catch (error) {
      if (error instanceof FileSystemError) {
        logger.error("File system error:", error.message);
        logger.info("Suggestion:", error.suggestion || "Check permissions and try again");
      } else {
        logger.error("Failed to initialize global zcc:", error);
      }
      process.exit(1);
    }
  });