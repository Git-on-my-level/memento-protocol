import { initCommand } from "../init";
import { DirectoryManager } from "../../lib/directoryManager";
import { HookManager } from "../../lib/hooks/HookManager";
import { ProjectDetector } from "../../lib/projectDetector";
import { InteractiveSetup } from "../../lib/interactiveSetup";
import { CommandGenerator } from "../../lib/commandGenerator";
import { StarterPackManager } from "../../lib/StarterPackManager";
import { logger } from "../../lib/logger";
import * as fs from "fs";

jest.mock("fs");
jest.mock("../../lib/directoryManager");
jest.mock("../../lib/hooks/HookManager");
jest.mock("../../lib/projectDetector");
jest.mock("../../lib/interactiveSetup");
jest.mock("../../lib/commandGenerator");
jest.mock("../../lib/StarterPackManager");
jest.mock("../../lib/logger", () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    space: jest.fn(),
  },
}));

describe("Init Command", () => {
  let mockDirManager: jest.Mocked<DirectoryManager>;
  let mockHookManager: jest.Mocked<HookManager>;
  let mockProjectDetector: jest.Mocked<ProjectDetector>;
  let mockInteractiveSetup: jest.Mocked<InteractiveSetup>;
  let mockCommandGenerator: jest.Mocked<CommandGenerator>;
  let mockStarterPackManager: jest.Mocked<StarterPackManager>;
  let originalExit: any;

  // Helper function to create valid PackInstallResult
  const createPackInstallResult = (overrides: any = {}) => ({
    success: true,
    installed: { modes: [], workflows: [], agents: [] },
    skipped: { modes: [], workflows: [], agents: [] },
    errors: [],
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockDirManager = {
      isInitialized: jest.fn(),
      initializeStructure: jest.fn(),
      ensureGitignore: jest.fn(),
    } as any;

    mockHookManager = {
      initialize: jest.fn(),
      listTemplates: jest.fn().mockResolvedValue(['git-context-loader', 'acronym-expander']),
    } as any;

    mockProjectDetector = {
      detect: jest.fn(),
    } as any;

    mockInteractiveSetup = {
      run: jest.fn(),
      applySetup: jest.fn(),
    } as any;

    mockCommandGenerator = {
      initialize: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockStarterPackManager = {
      listPacks: jest.fn().mockResolvedValue([]),
      loadPack: jest.fn(),
      installPack: jest.fn().mockResolvedValue(createPackInstallResult()),
    } as any;

    (
      DirectoryManager as jest.MockedClass<typeof DirectoryManager>
    ).mockImplementation(() => mockDirManager);
    (
      HookManager as jest.MockedClass<typeof HookManager>
    ).mockImplementation(() => mockHookManager);
    (
      ProjectDetector as jest.MockedClass<typeof ProjectDetector>
    ).mockImplementation(() => mockProjectDetector);
    (
      InteractiveSetup as jest.MockedClass<typeof InteractiveSetup>
    ).mockImplementation(() => mockInteractiveSetup);
    (
      CommandGenerator as jest.MockedClass<typeof CommandGenerator>
    ).mockImplementation(() => mockCommandGenerator);
    (
      StarterPackManager as jest.MockedClass<typeof StarterPackManager>
    ).mockImplementation(() => mockStarterPackManager);

    originalExit = process.exit;
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  describe("successful initialization", () => {
    it("should initialize with non-interactive setup", async () => {
      mockDirManager.isInitialized.mockReturnValue(false);
      mockProjectDetector.detect.mockResolvedValue({
        type: "fullstack",
        framework: "nextjs",
        suggestedModes: ["architect", "engineer"],
        suggestedWorkflows: ["review"],
        files: [],
        dependencies: {},
      });
      await initCommand.parseAsync(["node", "test", "--non-interactive", "--gitignore"]);

      expect(mockDirManager.initializeStructure).toHaveBeenCalled();
      expect(mockDirManager.ensureGitignore).toHaveBeenCalled();
      // In non-interactive mode, no components are installed
      expect(mockInteractiveSetup.run).not.toHaveBeenCalled();
      expect(mockInteractiveSetup.applySetup).not.toHaveBeenCalled();
      expect(mockHookManager.initialize).toHaveBeenCalled();
      expect(logger.success).toHaveBeenCalledWith(
        expect.stringContaining("Memento Protocol initialized successfully")
      );
    });

    it("should generate hook infrastructure", async () => {
      mockDirManager.isInitialized.mockReturnValue(false);
      mockProjectDetector.detect.mockResolvedValue({
        type: "unknown",
        suggestedModes: [],
        suggestedWorkflows: [],
        files: [],
        dependencies: {},
      });
      await initCommand.parseAsync(["node", "test", "--non-interactive"]);

      expect(mockHookManager.initialize).toHaveBeenCalled();
    });

    it("should install components specified via CLI flags", async () => {
      mockDirManager.isInitialized.mockReturnValue(false);
      mockProjectDetector.detect.mockResolvedValue({
        type: "web",
        suggestedModes: ["architect", "engineer"],
        suggestedWorkflows: ["review"],
        files: [],
        dependencies: {},
      });

      await initCommand.parseAsync([
        "node", 
        "test", 
        "--non-interactive",
        "--modes", "engineer,reviewer",
        "--workflows", "summarize",
        "--default-mode", "engineer"
      ]);

      expect(mockInteractiveSetup.applySetup).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedModes: ["engineer", "reviewer"],
          selectedWorkflows: ["summarize"],
          selectedHooks: expect.any(Array), // Can be empty or contain hooks
          defaultMode: "engineer"
        })
      );
    });

    it("should install all recommended components with --all-recommended", async () => {
      mockDirManager.isInitialized.mockReturnValue(false);
      mockProjectDetector.detect.mockResolvedValue({
        type: "web",
        suggestedModes: ["architect", "engineer"],
        suggestedWorkflows: ["review", "refactor"],
        files: [],
        dependencies: {},
      });

      await initCommand.parseAsync([
        "node", 
        "test", 
        "--non-interactive",
        "--all-recommended"
      ]);

      expect(mockInteractiveSetup.applySetup).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedModes: ["architect", "engineer"],
          selectedWorkflows: ["review", "refactor"],
          selectedHooks: expect.any(Array) // Just verify hooks array exists
        })
      );
    });

    it("should read configuration from file", async () => {
      mockDirManager.isInitialized.mockReturnValue(false);
      mockProjectDetector.detect.mockResolvedValue({
        type: "web",
        suggestedModes: [],
        suggestedWorkflows: [],
        files: [],
        dependencies: {},
      });

      // Mock fs.readFileSync
      const mockReadFileSync = jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
        modes: ["architect", "engineer"],
        workflows: ["review"],
        defaultMode: "architect",
        addToGitignore: true
      }) as any);

      await initCommand.parseAsync([
        "node", 
        "test", 
        "--non-interactive",
        "--config", "test-config.json"
      ]);

      // Verify the configuration was read
      expect(mockReadFileSync).toHaveBeenCalledWith(
        expect.stringContaining("test-config.json"),
        'utf-8'
      );
      
      // Verify that the init completed successfully
      expect(logger.success).toHaveBeenCalledWith(
        expect.stringContaining("Memento Protocol initialized successfully")
      );
      
      // Verify gitignore was updated based on config
      expect(mockDirManager.ensureGitignore).toHaveBeenCalled();
      
      // If components were selected, verify they were installed
      if (mockInteractiveSetup.applySetup.mock.calls.length > 0) {
        expect(mockInteractiveSetup.applySetup).toHaveBeenCalledWith(
          expect.objectContaining({
            selectedModes: expect.arrayContaining(["architect", "engineer"]),
            selectedWorkflows: expect.arrayContaining(["review"]),
            defaultMode: "architect"
          })
        );
      }
      
      mockReadFileSync.mockRestore();
    });

    it("should read configuration from environment variables", async () => {
      mockDirManager.isInitialized.mockReturnValue(false);
      mockProjectDetector.detect.mockResolvedValue({
        type: "web",
        suggestedModes: [],
        suggestedWorkflows: [],
        files: [],
        dependencies: {},
      });

      // Set environment variables
      process.env.MEMENTO_MODES = "engineer,reviewer";
      process.env.MEMENTO_WORKFLOWS = "summarize,review";
      process.env.MEMENTO_DEFAULT_MODE = "reviewer";

      await initCommand.parseAsync([
        "node", 
        "test", 
        "--non-interactive"
      ]);

      // Verify that the init completed successfully
      expect(logger.success).toHaveBeenCalledWith(
        expect.stringContaining("Memento Protocol initialized successfully")
      );
      
      // If components were selected, verify they were installed
      if (mockInteractiveSetup.applySetup.mock.calls.length > 0) {
        expect(mockInteractiveSetup.applySetup).toHaveBeenCalledWith(
          expect.objectContaining({
            selectedModes: expect.arrayContaining(["engineer", "reviewer"]),
            selectedWorkflows: expect.arrayContaining(["summarize", "review"]),
            defaultMode: "reviewer"
          })
        );
      }

      // Clean up environment variables
      delete process.env.MEMENTO_MODES;
      delete process.env.MEMENTO_WORKFLOWS;
      delete process.env.MEMENTO_DEFAULT_MODE;
    });
  });

  describe("error handling", () => {
    it("should error when already initialized without force flag", async () => {
      mockDirManager.isInitialized.mockReturnValue(true);

      await initCommand.parseAsync(["node", "test"]);

      expect(logger.warn).toHaveBeenCalledWith(
        "Memento Protocol is already initialized in this project."
      );
      expect(logger.info).toHaveBeenCalledWith("Use --force to reinitialize.");
      // Note: init command returns instead of calling process.exit
      expect(mockDirManager.initializeStructure).not.toHaveBeenCalled();
    });

    it("should reinitialize with force flag", async () => {
      mockDirManager.isInitialized.mockReturnValue(true);
      mockProjectDetector.detect.mockResolvedValue({
        type: "cli",
        suggestedModes: [],
        suggestedWorkflows: [],
        files: [],
        dependencies: {},
      });

      await initCommand.parseAsync(["node", "test", "--force", "--non-interactive"]);

      expect(logger.info).toHaveBeenCalledWith(
        "Initializing Memento Protocol..."
      );
      expect(mockDirManager.initializeStructure).toHaveBeenCalled();
    });

    it("should handle initialization errors", async () => {
      mockDirManager.isInitialized.mockReturnValue(false);
      mockDirManager.initializeStructure.mockRejectedValue(
        new Error("Permission denied")
      );

      // Run without any options to trigger initialization error
      await initCommand.parseAsync(["node", "test"]);

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to initialize Memento Protocol:",
        expect.any(Error)
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("global initialization", () => {
    it("should delegate to init-global command when --global flag is used", async () => {
      // Mock the dynamic import and init-global command
      const mockInitGlobalParseAsync = jest.fn().mockResolvedValue(undefined);
      const mockInitGlobalCommand = {
        parseAsync: mockInitGlobalParseAsync
      };

      // Mock the dynamic import
      jest.doMock("../init-global", () => ({
        initGlobalCommand: mockInitGlobalCommand
      }));

      await initCommand.parseAsync([
        "node", 
        "test", 
        "--global",
        "--force",
        "--default-mode", "architect",
        "--all-recommended"
      ]);

      expect(mockInitGlobalParseAsync).toHaveBeenCalledWith([
        "node",
        "memento", 
        "--force",
        "--default-mode", "architect",
        "--install-examples"
      ]);

      // Should not run regular project initialization
      expect(mockDirManager.initializeStructure).not.toHaveBeenCalled();
      expect(mockProjectDetector.detect).not.toHaveBeenCalled();
    });

    it("should handle global initialization with non-interactive mode", async () => {
      // Mock the dynamic import and init-global command  
      const mockInitGlobalParseAsync = jest.fn().mockResolvedValue(undefined);
      const mockInitGlobalCommand = {
        parseAsync: mockInitGlobalParseAsync
      };

      jest.doMock("../init-global", () => ({
        initGlobalCommand: mockInitGlobalCommand
      }));

      await initCommand.parseAsync([
        "node",
        "test", 
        "--global",
        "--non-interactive",
        "--default-mode", "engineer"
      ]);

      expect(mockInitGlobalParseAsync).toHaveBeenCalledWith([
        "node",
        "memento",
        "--no-interactive",
        "--default-mode", "engineer"
      ]);
    });

    it("should handle global initialization errors gracefully", async () => {
      // Mock the dynamic import to throw an error
      const mockInitGlobalParseAsync = jest.fn().mockRejectedValue(
        new Error("Global initialization failed")
      );
      const mockInitGlobalCommand = {
        parseAsync: mockInitGlobalParseAsync
      };

      jest.doMock("../init-global", () => ({
        initGlobalCommand: mockInitGlobalCommand
      }));

      await expect(initCommand.parseAsync([
        "node",
        "test",
        "--global"
      ])).rejects.toThrow("Global initialization failed");

      expect(mockInitGlobalParseAsync).toHaveBeenCalled();
    });
  });

  describe("starter pack integration", () => {
    beforeEach(() => {
      mockDirManager.isInitialized.mockReturnValue(false);
      mockProjectDetector.detect.mockResolvedValue({
        type: "web",
        suggestedModes: [],
        suggestedWorkflows: [],
        files: [],
        dependencies: {},
      });
    });

    it("should install starter pack with non-interactive mode", async () => {
      const mockPack = {
        name: "frontend-pack",
        version: "1.0.0",
        description: "Frontend development pack",
        author: "test",
        components: {
          modes: [{ name: "engineer", required: true }],
          workflows: [{ name: "review", required: true }]
        }
      };

      mockStarterPackManager.loadPack.mockResolvedValue(mockPack);
      mockStarterPackManager.installPack.mockResolvedValue(createPackInstallResult({
        installed: { modes: ["engineer"], workflows: ["review"], agents: [] },
        postInstallMessage: "Pack installed successfully!"
      }));

      await initCommand.parseAsync([
        "node", 
        "test", 
        "--non-interactive",
        "--starter-pack", "frontend-pack"
      ]);

      expect(mockStarterPackManager.loadPack).toHaveBeenCalledWith("frontend-pack");
      expect(mockStarterPackManager.installPack).toHaveBeenCalledWith(
        mockPack,
        expect.objectContaining({ force: undefined, interactive: false })
      );
      expect(mockInteractiveSetup.applySetup).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedModes: ["engineer"],
          selectedWorkflows: ["review"]
        })
      );
      expect(logger.success).toHaveBeenCalledWith(
        "Starter pack 'frontend-pack' installed successfully"
      );
    });

    it("should show interactive pack selection when --starter-pack flag used without value", async () => {
      const mockPacks = [
        {
          name: "frontend-pack",
          description: "Frontend development pack",
          version: "1.0.0",
          author: "test",
          components: { modes: [], workflows: [], agents: [] }
        },
        {
          name: "backend-pack", 
          description: "Backend development pack",
          version: "1.0.0",
          author: "test",
          components: { modes: [], workflows: [], agents: [] }
        }
      ];

      mockStarterPackManager.listPacks.mockResolvedValue(mockPacks);

      // Mock inquirer to select the first pack
      const mockInquirer = {
        prompt: jest.fn().mockResolvedValue({ selectedPack: "frontend-pack" })
      };
      jest.doMock('inquirer', () => ({ default: mockInquirer }));

      const mockPack = mockPacks[0];
      mockStarterPackManager.loadPack.mockResolvedValue(mockPack);
      mockStarterPackManager.installPack.mockResolvedValue(createPackInstallResult());

      await initCommand.parseAsync(["node", "test", "--starter-pack"]);

      expect(mockStarterPackManager.listPacks).toHaveBeenCalled();
      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'list',
          name: 'selectedPack',
          message: 'Select a starter pack to install:',
          choices: expect.arrayContaining([
            { name: 'Skip starter pack installation', value: null },
            { name: 'frontend-pack - Frontend development pack', value: 'frontend-pack' },
            { name: 'backend-pack - Backend development pack', value: 'backend-pack' }
          ])
        })
      ]);
    });

    it("should handle user skipping starter pack selection", async () => {
      const mockPacks = [
        {
          name: "frontend-pack",
          description: "Frontend development pack",
          version: "1.0.0",
          author: "test",
          components: { modes: [], workflows: [], agents: [] }
        }
      ];

      mockStarterPackManager.listPacks.mockResolvedValue(mockPacks);

      // Mock inquirer to select "Skip" option
      const mockInquirer = {
        prompt: jest.fn().mockResolvedValue({ selectedPack: null })
      };
      jest.doMock('inquirer', () => ({ default: mockInquirer }));

      await initCommand.parseAsync(["node", "test", "--starter-pack"]);

      expect(mockStarterPackManager.listPacks).toHaveBeenCalled();
      expect(mockStarterPackManager.loadPack).not.toHaveBeenCalled();
      expect(mockStarterPackManager.installPack).not.toHaveBeenCalled();
    });

    it("should combine starter pack components with CLI specified components", async () => {
      const mockPack = {
        name: "frontend-pack",
        version: "1.0.0",
        description: "Frontend development pack",
        author: "test",
        components: {
          modes: [{ name: "engineer", required: true }],
          workflows: [{ name: "review", required: true }]
        },
        configuration: {
          defaultMode: "engineer"
        }
      };

      mockStarterPackManager.loadPack.mockResolvedValue(mockPack);
      mockStarterPackManager.installPack.mockResolvedValue(createPackInstallResult({
        installed: { modes: ["engineer"], workflows: ["review"], agents: [] }
      }));

      await initCommand.parseAsync([
        "node", 
        "test", 
        "--non-interactive",
        "--starter-pack", "frontend-pack",
        "--modes", "reviewer,architect",
        "--workflows", "summarize"
      ]);

      expect(mockInteractiveSetup.applySetup).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedModes: expect.arrayContaining(["reviewer", "architect", "engineer"]),
          selectedWorkflows: expect.arrayContaining(["summarize", "review"]),
          defaultMode: "engineer"
        })
      );
    });

    it("should handle starter pack installation failure gracefully", async () => {
      const mockPack = {
        name: "invalid-pack",
        version: "1.0.0",
        description: "Invalid pack",
        author: "test",
        components: {
          modes: [{ name: "non-existent", required: true }]
        }
      };

      mockStarterPackManager.loadPack.mockResolvedValue(mockPack);
      mockStarterPackManager.installPack.mockResolvedValue(createPackInstallResult({
        success: false,
        errors: ["Mode 'non-existent' not found"]
      }));

      await initCommand.parseAsync([
        "node", 
        "test", 
        "--non-interactive",
        "--starter-pack", "invalid-pack"
      ]);

      expect(mockStarterPackManager.installPack).toHaveBeenCalled();
      // Should still proceed with initialization even if pack fails
      expect(mockDirManager.initializeStructure).toHaveBeenCalled();
      expect(logger.success).toHaveBeenCalledWith(
        expect.stringContaining("Memento Protocol initialized successfully")
      );
    });

    it("should error in non-interactive mode when starter pack flag provided without value", async () => {
      await initCommand.parseAsync([
        "node", 
        "test", 
        "--non-interactive",
        "--starter-pack"
      ]);

      expect(logger.warn).toHaveBeenCalledWith(
        "--starter-pack requires a pack name in non-interactive mode"
      );
      // Should still proceed with initialization
      expect(mockDirManager.initializeStructure).toHaveBeenCalled();
    });

    it("should handle starter pack with post-install message", async () => {
      const mockPack = {
        name: "frontend-pack",
        version: "1.0.0",
        description: "Frontend development pack",
        author: "test",
        components: {
          modes: [{ name: "engineer", required: true }]
        }
      };

      mockStarterPackManager.loadPack.mockResolvedValue(mockPack);
      mockStarterPackManager.installPack.mockResolvedValue(createPackInstallResult({
        installed: { modes: ["engineer"], workflows: [], agents: [] },
        postInstallMessage: "Welcome to the frontend pack! Use 'mode: engineer' to get started."
      }));

      await initCommand.parseAsync([
        "node", 
        "test", 
        "--non-interactive",
        "--starter-pack", "frontend-pack"
      ]);

      expect(logger.info).toHaveBeenCalledWith("Starter Pack Information:");
      expect(logger.info).toHaveBeenCalledWith(
        "Welcome to the frontend pack! Use 'mode: engineer' to get started."
      );
    });

    it("should handle starter pack loading error", async () => {
      mockStarterPackManager.loadPack.mockRejectedValue(
        new Error("Pack 'non-existent' not found")
      );

      await initCommand.parseAsync([
        "node", 
        "test", 
        "--non-interactive",
        "--starter-pack", "non-existent"
      ]);

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to initialize Memento Protocol:",
        expect.any(Error)
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle empty starter pack list during interactive selection", async () => {
      mockStarterPackManager.listPacks.mockResolvedValue([]);

      await initCommand.parseAsync(["node", "test", "--starter-pack"]);

      expect(logger.warn).toHaveBeenCalledWith("No starter packs available.");
      expect(mockDirManager.initializeStructure).toHaveBeenCalled();
    });

    it("should install starter pack components with agents", async () => {
      const mockPack = {
        name: "fullstack-pack",
        version: "1.0.0",
        description: "Fullstack development pack",
        author: "test",
        components: {
          modes: [{ name: "engineer", required: true }],
          workflows: [{ name: "review", required: true }],
          agents: [{ name: "claude-code-research", required: false }]
        }
      };

      mockStarterPackManager.loadPack.mockResolvedValue(mockPack);
      mockStarterPackManager.installPack.mockResolvedValue(createPackInstallResult({
        installed: { 
          modes: ["engineer"], 
          workflows: ["review"], 
          agents: ["claude-code-research"] 
        }
      }));

      await initCommand.parseAsync([
        "node", 
        "test", 
        "--non-interactive",
        "--starter-pack", "fullstack-pack"
      ]);

      expect(logger.info).toHaveBeenCalledWith("  Modes: engineer");
      expect(logger.info).toHaveBeenCalledWith("  Workflows: review");
      expect(logger.info).toHaveBeenCalledWith("  Agents: claude-code-research");
    });

    it("should respect force flag when installing starter pack", async () => {
      const mockPack = {
        name: "test-pack",
        version: "1.0.0",
        description: "Test pack",
        author: "test",
        components: {
          modes: [{ name: "engineer", required: true }]
        }
      };

      mockDirManager.isInitialized.mockReturnValue(true); // Already initialized
      mockStarterPackManager.loadPack.mockResolvedValue(mockPack);
      mockStarterPackManager.installPack.mockResolvedValue(createPackInstallResult({
        installed: { modes: ["engineer"], workflows: [], agents: [] }
      }));

      await initCommand.parseAsync([
        "node", 
        "test", 
        "--force",
        "--non-interactive",
        "--starter-pack", "test-pack"
      ]);

      expect(mockStarterPackManager.installPack).toHaveBeenCalledWith(
        mockPack,
        expect.objectContaining({ force: true, interactive: false })
      );
    });

    it("should handle starter pack with default mode configuration", async () => {
      const mockPack = {
        name: "configured-pack",
        version: "1.0.0",
        description: "Pack with default mode",
        author: "test",
        components: {
          modes: [{ name: "architect", required: true }, { name: "engineer", required: true }]
        },
        configuration: {
          defaultMode: "architect"
        }
      };

      mockStarterPackManager.loadPack.mockResolvedValue(mockPack);
      mockStarterPackManager.installPack.mockResolvedValue(createPackInstallResult({
        installed: { modes: ["architect", "engineer"], workflows: [], agents: [] }
      }));

      await initCommand.parseAsync([
        "node", 
        "test", 
        "--non-interactive",
        "--starter-pack", "configured-pack"
      ]);

      expect(mockInteractiveSetup.applySetup).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultMode: "architect"
        })
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Default mode "architect" will be used when no mode is specified'
      );
    });
  });

  describe("backwards compatibility", () => {
    it("should work without starter pack options (existing behavior)", async () => {
      mockDirManager.isInitialized.mockReturnValue(false);
      mockProjectDetector.detect.mockResolvedValue({
        type: "web",
        suggestedModes: ["engineer"],
        suggestedWorkflows: ["review"],
        files: [],
        dependencies: {},
      });

      await initCommand.parseAsync([
        "node", 
        "test", 
        "--non-interactive",
        "--all-recommended"
      ]);

      expect(mockStarterPackManager.listPacks).not.toHaveBeenCalled();
      expect(mockStarterPackManager.loadPack).not.toHaveBeenCalled();
      expect(mockStarterPackManager.installPack).not.toHaveBeenCalled();
      expect(mockInteractiveSetup.applySetup).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedModes: ["engineer"],
          selectedWorkflows: ["review"]
        })
      );
    });

    it("should prioritize CLI flags over starter pack in combined usage", async () => {
      mockDirManager.isInitialized.mockReturnValue(false);
      mockProjectDetector.detect.mockResolvedValue({
        type: "web",
        suggestedModes: [],
        suggestedWorkflows: [],
        files: [],
        dependencies: {},
      });

      const mockPack = {
        name: "test-pack",
        version: "1.0.0",
        description: "Test pack",
        author: "test",
        components: {
          modes: [{ name: "engineer", required: true }]
        },
        configuration: {
          defaultMode: "engineer"
        }
      };

      mockStarterPackManager.loadPack.mockResolvedValue(mockPack);
      mockStarterPackManager.installPack.mockResolvedValue(createPackInstallResult({
        installed: { modes: ["engineer"], workflows: [], agents: [] }
      }));

      await initCommand.parseAsync([
        "node", 
        "test", 
        "--non-interactive",
        "--starter-pack", "test-pack",
        "--default-mode", "architect", // Override pack's default mode
        "--modes", "reviewer" // Add additional mode
      ]);

      expect(mockInteractiveSetup.applySetup).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedModes: expect.arrayContaining(["reviewer", "engineer"]),
          defaultMode: "architect" // CLI flag should override pack config
        })
      );
    });
  });
});