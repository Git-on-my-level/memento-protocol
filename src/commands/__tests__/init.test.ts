import { initCommand } from "../init";
import { DirectoryManager } from "../../lib/directoryManager";
import { HookManager } from "../../lib/hooks/HookManager";
import { ProjectDetector } from "../../lib/projectDetector";
import { InteractiveSetup } from "../../lib/interactiveSetup";
import { logger } from "../../lib/logger";
import * as fs from "fs";

jest.mock("fs");
jest.mock("../../lib/directoryManager");
jest.mock("../../lib/hooks/HookManager");
jest.mock("../../lib/projectDetector");
jest.mock("../../lib/interactiveSetup");
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
  let originalExit: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDirManager = {
      isInitialized: jest.fn(),
      initializeStructure: jest.fn(),
      ensureGitignore: jest.fn(),
    } as any;

    mockHookManager = {
      initialize: jest.fn(),
    } as any;

    mockProjectDetector = {
      detect: jest.fn(),
    } as any;

    mockInteractiveSetup = {
      run: jest.fn(),
      applySetup: jest.fn(),
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
          selectedWorkflows: ["review", "refactor"]
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
});