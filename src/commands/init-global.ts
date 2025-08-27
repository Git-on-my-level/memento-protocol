import { Command } from "commander";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { existsSync } from "fs";
import inquirer from "inquirer";
import { MementoCore } from "../lib/MementoCore";
import { MementoConfig } from "../lib/configSchema";
import { logger } from "../lib/logger";
import { FileSystemError } from "../lib/errors";

interface GlobalInitOptions {
  force?: boolean;
  interactive?: boolean;
  defaultMode?: string;
  colorOutput?: boolean;
  verboseLogging?: boolean;
  installExamples?: boolean;
}


/**
 * Generate config.yaml content with comments
 */
function generateConfigYaml(config: MementoConfig): string {
  return `# Memento Protocol Global Configuration
# This file configures Memento Protocol settings that apply across all your projects.
# Project-specific .memento/config.yaml files can override these settings.
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
  logger.info("🌟 Welcome to Memento Protocol Global Setup!");
  logger.info("This will create your ~/.memento global configuration.");
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
 * Install example components to global ~/.memento
 */
async function installExampleComponents(globalPath: string): Promise<void> {
  // This would use the component installer to add some basic global components
  // For now, we'll create placeholder directories to show the structure
  const exampleDirs = [
    path.join(globalPath, "modes"),
    path.join(globalPath, "workflows"), 
    path.join(globalPath, "scripts"),
    path.join(globalPath, "hooks"),
    path.join(globalPath, "agents"),
    path.join(globalPath, "commands"),
    path.join(globalPath, "templates")
  ];

  for (const dir of exampleDirs) {
    await fs.mkdir(dir, { recursive: true });
  }

  // Create a simple example script
  const exampleScript = `#!/bin/bash
# Example global script - customize as needed
echo "Hello from global Memento Protocol!"
`;

  await fs.writeFile(
    path.join(globalPath, "scripts", "hello.sh"), 
    exampleScript,
    { mode: 0o755 }
  );

  logger.info("✅ Installed example global components");
}

export const initGlobalCommand = new Command("init-global")
  .description("Initialize global Memento Protocol configuration (~/.memento)")
  .option("-f, --force", "Force initialization even if ~/.memento already exists")  
  .option("-i, --interactive", "Run interactive setup (default: true)")
  .option("--no-interactive", "Skip interactive setup and use defaults")
  .option("-d, --default-mode <mode>", "Set default mode for all projects")
  .option("--color-output", "Enable colored terminal output")
  .option("--no-color-output", "Disable colored terminal output")
  .option("--verbose-logging", "Enable verbose logging by default")
  .option("--no-verbose-logging", "Disable verbose logging by default")  
  .option("--install-examples", "Install example global components")
  .option("--no-install-examples", "Skip installing example components")
  .action(async (options: GlobalInitOptions) => {
    try {
      const globalPath = path.join(os.homedir(), ".memento");
      const configPath = path.join(globalPath, "config.yaml");
      
      // Check if already initialized
      if (existsSync(globalPath) && !options.force) {
        logger.warn("Global Memento Protocol is already initialized.");
        logger.info(`Location: ${globalPath}`);
        logger.info("Use --force to reinitialize and overwrite existing configuration.");
        return;
      }

      logger.info("Initializing global Memento Protocol configuration...");
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
      await fs.writeFile(configPath, configContent, "utf-8");

      // Install example components if requested  
      const shouldInstallExamples = 
        options.installExamples ?? 
        (options.interactive !== false ? true : false);

      if (shouldInstallExamples) {
        await installExampleComponents(globalPath);
      }

      // Initialize using MementoCore to create full structure
      const mementoCore = new MementoCore(process.cwd());
      const globalScope = mementoCore.getScopes().global;
      await globalScope.initialize();

      logger.space();
      logger.success("Global Memento Protocol initialized successfully! 🎉");
      logger.space();
      logger.info("Configuration saved to:");
      logger.info(`  ${configPath}`);
      logger.space();
      logger.info("What's next:");
      logger.info("  • Run 'memento init' in any project to apply global settings");
      logger.info("  • Edit ~/.memento/config.yaml to customize global preferences");
      logger.info("  • Add global modes/workflows to ~/.memento/ for reuse across projects");
      logger.space();
      logger.info("Global configuration takes effect in all new project setups.");
      
    } catch (error) {
      if (error instanceof FileSystemError) {
        logger.error("File system error:", error.message);
        logger.info("Suggestion:", error.suggestion || "Check permissions and try again");
      } else {
        logger.error("Failed to initialize global Memento Protocol:", error);
      }
      process.exit(1);
    }
  });