import { ZccCore } from "../../lib/ZccCore";
import { logger } from "../../lib/logger";
import * as os from "os";
import inquirer from "inquirer";
import { createTestFileSystem } from "../../lib/testing";
import { NodeFileSystemAdapter } from "../../lib/adapters/NodeFileSystemAdapter";

jest.mock("inquirer");
jest.mock("../../lib/ZccCore");
jest.mock("../../lib/logger", () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    space: jest.fn(),
  },
}));
jest.mock("os");
jest.mock("../../lib/adapters/NodeFileSystemAdapter");

// Import the command once
import { initGlobalCommand } from "../init-global";

describe("Init Global Command", () => {
  let mockInquirer: jest.Mocked<typeof inquirer>;
  let mockOs: jest.Mocked<typeof os>;
  let mockZccCore: jest.Mocked<ZccCore>;
  let originalProcessExit: any;
  let testFs: any;

  // Helper to run command with our test filesystem
  const runInitGlobalCommand = async (args: string[]) => {
    return await initGlobalCommand.parseAsync(args);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules(); // Reset module cache to get fresh command instance
    
    mockInquirer = inquirer as jest.Mocked<typeof inquirer>;
    mockOs = os as jest.Mocked<typeof os>;

    // Create test filesystem
    testFs = await createTestFileSystem();

    // Mock NodeFileSystemAdapter to return our test filesystem instance
    (NodeFileSystemAdapter as jest.MockedClass<typeof NodeFileSystemAdapter>).mockImplementation(() => testFs);

    // Mock os.homedir to return a consistent test path
    mockOs.homedir.mockReturnValue("/home/testuser");

    // Mock ZccCore
    const mockScope = {
      initialize: jest.fn().mockResolvedValue(undefined),
    };
    
    mockZccCore = {
      getScopes: jest.fn().mockReturnValue({ global: mockScope }),
    } as any;
    
    (ZccCore as jest.MockedClass<typeof ZccCore>).mockImplementation(
      () => mockZccCore
    );

    // Mock process.exit
    originalProcessExit = process.exit;
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    process.exit = originalProcessExit;
  });

  describe("basic functionality", () => {
    it("should initialize global directory when not exists", async () => {
      await runInitGlobalCommand([
        "node", 
        "test", 
        "--no-interactive"
      ]);

      // Verify filesystem operations happened in our test filesystem
      const globalDirExists = await testFs.exists("/home/testuser/.zcc");
      const configExists = await testFs.exists("/home/testuser/.zcc/config.yaml");
      
      expect(globalDirExists).toBe(true);
      expect(configExists).toBe(true);
      
      const configContent = await testFs.readFile("/home/testuser/.zcc/config.yaml", "utf-8");
      expect(configContent).toContain("# zcc Global Configuration");
      
      expect(logger.success).toHaveBeenCalledWith(
        "Global zcc initialized successfully! 🎉"
      );
    });

    it("should not initialize when already exists without force flag", async () => {
      // Pre-create the global directory in our test filesystem
      await testFs.mkdir("/home/testuser/.zcc", { recursive: true });
      
      await runInitGlobalCommand([
        "node", 
        "test", 
        "--no-interactive"
      ]);

      expect(logger.warn).toHaveBeenCalledWith(
        "Global zcc is already initialized."
      );
    });

    it("should reinitialize when force flag is provided", async () => {
      // Pre-create the global directory in our test filesystem
      await testFs.mkdir("/home/testuser/.zcc", { recursive: true });
      
      await runInitGlobalCommand([
        "node", 
        "test", 
        "--force",
        "--no-interactive"
      ]);

      const configExists = await testFs.exists("/home/testuser/.zcc/config.yaml");
      expect(configExists).toBe(true);
      
      expect(logger.success).toHaveBeenCalledWith(
        "Global zcc initialized successfully! 🎉"
      );
    });
  });

  describe("interactive setup", () => {
    it("should run interactive setup when interactive option is true", async () => {
      mockInquirer.prompt.mockResolvedValue({
        defaultMode: "engineer",
        colorOutput: true,
        verboseLogging: false,
        installExamples: true,
      });

      await runInitGlobalCommand([
        "node", 
        "test", 
        "--interactive"
      ]);

      expect(mockInquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: "defaultMode",
            message: "Default mode to use across projects (leave empty for none):",
          }),
          expect.objectContaining({
            name: "colorOutput",
            message: "Enable colored terminal output?",
          }),
        ])
      );
    });

    it("should use CLI options when interactive is false", async () => {
      await runInitGlobalCommand([
        "node", 
        "test", 
        "--no-interactive",
        "--default-mode", "architect",
        "--no-color-output",
        "--verbose-logging"
      ]);

      expect(mockInquirer.prompt).not.toHaveBeenCalled();
      
      const configContent = await testFs.readFile("/home/testuser/.zcc/config.yaml", "utf-8");
      expect(configContent).toContain('defaultMode: "architect"');
    });

  });

  describe("example component installation", () => {
    it("should install example components when installExamples is true", async () => {
      await runInitGlobalCommand([
        "node", 
        "test", 
        "--no-interactive",
        "--install-examples"
      ]);

      // Check that example directories are created
      const expectedDirs = [
        "/home/testuser/.zcc/modes",
        "/home/testuser/.zcc/workflows",
        "/home/testuser/.zcc/scripts",
        "/home/testuser/.zcc/hooks",
        "/home/testuser/.zcc/agents",
        "/home/testuser/.zcc/commands",
        "/home/testuser/.zcc/templates",
      ];

      for (const dir of expectedDirs) {
        const exists = await testFs.exists(dir);
        expect(exists).toBe(true);
      }

      // Check that example script is created
      const scriptExists = await testFs.exists("/home/testuser/.zcc/scripts/hello.sh");
      expect(scriptExists).toBe(true);
      
      const scriptContent = await testFs.readFile("/home/testuser/.zcc/scripts/hello.sh", "utf-8");
      expect(scriptContent).toContain("echo \"Hello from global zcc!\"");
    });

    it("should skip example components when installExamples is false", async () => {
      await runInitGlobalCommand([
        "node", 
        "test", 
        "--no-interactive",
        "--no-install-examples"
      ]);

      // Should only have the base directory, not the example subdirectories
      const globalDirExists = await testFs.exists("/home/testuser/.zcc");
      const scriptDirExists = await testFs.exists("/home/testuser/.zcc/scripts");
      
      expect(globalDirExists).toBe(true);
      expect(scriptDirExists).toBe(false);
    });
  });

  describe("configuration generation", () => {
    it("should generate proper config.yaml with comments", async () => {
      await runInitGlobalCommand([
        "node", 
        "test", 
        "--no-interactive",
        "--default-mode", "engineer",
        "--color-output",
        "--no-verbose-logging"
      ]);

      const configContent = await testFs.readFile("/home/testuser/.zcc/config.yaml", "utf-8");

      expect(configContent).toContain("# zcc Global Configuration");
      expect(configContent).toContain('defaultMode: "engineer"');
      expect(configContent).toContain("colorOutput: true");
      expect(configContent).toContain("verboseLogging: false");
      expect(configContent).toContain("# Documentation:");
    });

    it("should handle configurations without default mode", async () => {
      await runInitGlobalCommand([
        "node", 
        "test", 
        "--no-interactive",
        // No defaultMode specified
        "--color-output",
        "--no-verbose-logging"
      ]);

      const configContent = await testFs.readFile("/home/testuser/.zcc/config.yaml", "utf-8");
      
      // Just check that a config file is generated and contains basic structure
      expect(configContent).toContain("# zcc Global Configuration");
      expect(configContent).toContain("colorOutput: true");
      expect(configContent).toContain("verboseLogging: false");
      // Check that it doesn't have empty defaultMode values
      expect(configContent).not.toContain('defaultMode: ""');
      expect(configContent).not.toContain('defaultMode: null');
      expect(configContent).not.toContain('defaultMode: undefined');
    });
  });

  describe("error handling", () => {
    it("should handle file system errors gracefully", async () => {
      // Mock NodeFileSystemAdapter to throw errors
      const errorFs = await createTestFileSystem();
      errorFs.mkdir = jest.fn().mockRejectedValue(new Error("Permission denied"));
      (NodeFileSystemAdapter as jest.MockedClass<typeof NodeFileSystemAdapter>).mockImplementation(() => errorFs);

      await initGlobalCommand.parseAsync([
        "node", 
        "test", 
        "--no-interactive"
      ]);

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to initialize global zcc:",
        expect.any(Error)
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle ZccCore initialization errors", async () => {
      const mockScope = {
        initialize: jest.fn().mockRejectedValue(new Error("Core initialization failed")),
      };
      
      mockZccCore.getScopes.mockReturnValue({ global: mockScope } as any);

      await runInitGlobalCommand([
        "node", 
        "test", 
        "--no-interactive"
      ]);

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to initialize global zcc:",
        expect.any(Error)
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("informational output", () => {
    it("should provide helpful next steps after successful initialization", async () => {
      await runInitGlobalCommand([
        "node", 
        "test", 
        "--no-interactive"
      ]);

      expect(logger.info).toHaveBeenCalledWith("What's next:");
      expect(logger.info).toHaveBeenCalledWith(
        "  • Run 'zcc init' in any project to apply global settings"
      );
      expect(logger.info).toHaveBeenCalledWith(
        "  • Edit ~/.zcc/config.yaml to customize global preferences"
      );
      expect(logger.info).toHaveBeenCalledWith(
        "Global configuration takes effect in all new project setups."
      );
    });

    it("should show correct paths in success message", async () => {
      await runInitGlobalCommand([
        "node", 
        "test", 
        "--no-interactive"
      ]);

      expect(logger.info).toHaveBeenCalledWith("Configuration saved to:");
      expect(logger.info).toHaveBeenCalledWith("  /home/testuser/.zcc/config.yaml");
    });
  });
});