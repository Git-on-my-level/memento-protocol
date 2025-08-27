import { MementoCore } from "../../lib/MementoCore";
import { logger } from "../../lib/logger";
import * as fs from "fs/promises";
import * as os from "os";
import { existsSync } from "fs";
import inquirer from "inquirer";

jest.mock("fs/promises");
jest.mock("fs");
jest.mock("inquirer");
jest.mock("../../lib/MementoCore");
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

// Import the command once
import { initGlobalCommand } from "../init-global";

describe("Init Global Command", () => {
  let mockFs: jest.Mocked<typeof fs>;
  let mockExistsSync: jest.MockedFunction<typeof existsSync>;
  let mockInquirer: jest.Mocked<typeof inquirer>;
  let mockOs: jest.Mocked<typeof os>;
  let mockMementoCore: jest.Mocked<MementoCore>;
  let originalProcessExit: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules(); // Reset module cache to get fresh command instance
    
    mockFs = fs as jest.Mocked<typeof fs>;
    mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
    mockInquirer = inquirer as jest.Mocked<typeof inquirer>;
    mockOs = os as jest.Mocked<typeof os>;

    // Mock os.homedir to return a consistent test path
    mockOs.homedir.mockReturnValue("/home/testuser");

    // Mock fs operations
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);

    // Mock MementoCore
    const mockScope = {
      initialize: jest.fn().mockResolvedValue(undefined),
    };
    
    mockMementoCore = {
      getScopes: jest.fn().mockReturnValue({ global: mockScope }),
    } as any;
    
    (MementoCore as jest.MockedClass<typeof MementoCore>).mockImplementation(
      () => mockMementoCore
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
      mockExistsSync.mockReturnValue(false);
      
      await initGlobalCommand.parseAsync([
        "node", 
        "test", 
        "--no-interactive"
      ]);

      expect(mockFs.mkdir).toHaveBeenCalledWith("/home/testuser/.memento", { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        "/home/testuser/.memento/config.yaml",
        expect.stringContaining("# Memento Protocol Global Configuration"),
        "utf-8"
      );
      expect(logger.success).toHaveBeenCalledWith(
        "Global Memento Protocol initialized successfully! 🎉"
      );
    });

    it("should not initialize when already exists without force flag", async () => {
      mockExistsSync.mockReturnValue(true);

      await initGlobalCommand.parseAsync([
        "node", 
        "test", 
        "--no-interactive"
      ]);

      expect(mockFs.mkdir).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        "Global Memento Protocol is already initialized."
      );
    });

    it("should reinitialize when force flag is provided", async () => {
      mockExistsSync.mockReturnValue(true);

      await initGlobalCommand.parseAsync([
        "node", 
        "test", 
        "--force",
        "--no-interactive"
      ]);

      expect(mockFs.mkdir).toHaveBeenCalledWith("/home/testuser/.memento", { recursive: true });
      expect(logger.success).toHaveBeenCalledWith(
        "Global Memento Protocol initialized successfully! 🎉"
      );
    });
  });

  describe("interactive setup", () => {
    it("should run interactive setup when interactive option is true", async () => {
      mockExistsSync.mockReturnValue(false);
      mockInquirer.prompt.mockResolvedValue({
        defaultMode: "engineer",
        colorOutput: true,
        verboseLogging: false,
        installExamples: true,
      });

      await initGlobalCommand.parseAsync([
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
      mockExistsSync.mockReturnValue(false);

      await initGlobalCommand.parseAsync([
        "node", 
        "test", 
        "--no-interactive",
        "--default-mode", "architect",
        "--no-color-output",
        "--verbose-logging"
      ]);

      expect(mockInquirer.prompt).not.toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        "/home/testuser/.memento/config.yaml",
        expect.stringContaining('defaultMode: "architect"'),
        "utf-8"
      );
    });

  });

  describe("example component installation", () => {
    it("should install example components when installExamples is true", async () => {
      mockExistsSync.mockReturnValue(false);

      await initGlobalCommand.parseAsync([
        "node", 
        "test", 
        "--no-interactive",
        "--install-examples"
      ]);

      // Check that example directories are created
      const expectedDirs = [
        "/home/testuser/.memento/modes",
        "/home/testuser/.memento/workflows",
        "/home/testuser/.memento/scripts",
        "/home/testuser/.memento/hooks",
        "/home/testuser/.memento/agents",
        "/home/testuser/.memento/commands",
        "/home/testuser/.memento/templates",
      ];

      expectedDirs.forEach(dir => {
        expect(mockFs.mkdir).toHaveBeenCalledWith(dir, { recursive: true });
      });

      // Check that example script is created
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        "/home/testuser/.memento/scripts/hello.sh",
        expect.stringContaining("echo \"Hello from global Memento Protocol!\""),
        { mode: 0o755 }
      );
    });

    it("should skip example components when installExamples is false", async () => {
      mockExistsSync.mockReturnValue(false);

      await initGlobalCommand.parseAsync([
        "node", 
        "test", 
        "--no-interactive",
        "--no-install-examples"
      ]);

      // Should not create example directories (only the base config)
      expect(mockFs.mkdir).toHaveBeenCalledWith("/home/testuser/.memento", { recursive: true });
      expect(mockFs.mkdir).toHaveBeenCalledTimes(1);
    });
  });

  describe("configuration generation", () => {
    it("should generate proper config.yaml with comments", async () => {
      mockExistsSync.mockReturnValue(false);

      await initGlobalCommand.parseAsync([
        "node", 
        "test", 
        "--no-interactive",
        "--default-mode", "engineer",
        "--color-output",
        "--no-verbose-logging"
      ]);

      const writeFileCall = mockFs.writeFile.mock.calls.find(
        call => call[0] === "/home/testuser/.memento/config.yaml"
      );

      expect(writeFileCall).toBeDefined();
      const configContent = writeFileCall![1] as string;

      expect(configContent).toContain("# Memento Protocol Global Configuration");
      expect(configContent).toContain('defaultMode: "engineer"');
      expect(configContent).toContain("colorOutput: true");
      expect(configContent).toContain("verboseLogging: false");
      expect(configContent).toContain("# Documentation:");
    });

    it("should handle configurations without default mode", async () => {
      mockExistsSync.mockReturnValue(false);
      
      await initGlobalCommand.parseAsync([
        "node", 
        "test", 
        "--no-interactive",
        // No defaultMode specified
        "--color-output",
        "--no-verbose-logging"
      ]);

      const writeFileCall = mockFs.writeFile.mock.calls.find(
        call => call[0] === "/home/testuser/.memento/config.yaml"
      );

      const configContent = writeFileCall![1] as string;
      // Just check that a config file is generated and contains basic structure
      expect(configContent).toContain("# Memento Protocol Global Configuration");
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
      mockExistsSync.mockReturnValue(false);
      mockFs.mkdir.mockRejectedValue(new Error("Permission denied"));

      await initGlobalCommand.parseAsync([
        "node", 
        "test", 
        "--no-interactive"
      ]);

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to initialize global Memento Protocol:",
        expect.any(Error)
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle MementoCore initialization errors", async () => {
      mockExistsSync.mockReturnValue(false);
      const mockScope = {
        initialize: jest.fn().mockRejectedValue(new Error("Core initialization failed")),
      };
      
      mockMementoCore.getScopes.mockReturnValue({ global: mockScope } as any);

      await initGlobalCommand.parseAsync([
        "node", 
        "test", 
        "--no-interactive"
      ]);

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to initialize global Memento Protocol:",
        expect.any(Error)
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("informational output", () => {
    it("should provide helpful next steps after successful initialization", async () => {
      mockExistsSync.mockReturnValue(false);

      await initGlobalCommand.parseAsync([
        "node", 
        "test", 
        "--no-interactive"
      ]);

      expect(logger.info).toHaveBeenCalledWith("What's next:");
      expect(logger.info).toHaveBeenCalledWith(
        "  • Run 'memento init' in any project to apply global settings"
      );
      expect(logger.info).toHaveBeenCalledWith(
        "  • Edit ~/.memento/config.yaml to customize global preferences"
      );
      expect(logger.info).toHaveBeenCalledWith(
        "Global configuration takes effect in all new project setups."
      );
    });

    it("should show correct paths in success message", async () => {
      mockExistsSync.mockReturnValue(false);

      await initGlobalCommand.parseAsync([
        "node", 
        "test", 
        "--no-interactive"
      ]);

      expect(logger.info).toHaveBeenCalledWith("Configuration saved to:");
      expect(logger.info).toHaveBeenCalledWith("  /home/testuser/.memento/config.yaml");
    });
  });
});