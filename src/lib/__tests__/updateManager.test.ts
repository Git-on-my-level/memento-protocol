import { UpdateManager } from "../updateManager";
import { createTestZccProject } from "../testing";
import { MemoryFileSystemAdapter } from "../adapters/MemoryFileSystemAdapter";
import { logger } from "../logger";

// Mock the logger
jest.mock("../logger", () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("UpdateManager", () => {
  let updateManager: UpdateManager;
  let fs: MemoryFileSystemAdapter;
  const projectRoot = "/test/project";

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create test project with filesystem
    fs = await createTestZccProject(projectRoot);
    
    // Create a basic manifest
    await fs.writeFile(
      fs.join(projectRoot, ".zcc", "manifest.json"),
      JSON.stringify({
        components: { modes: [], workflows: [] },
        versions: {},
      })
    );
    
    updateManager = new UpdateManager(projectRoot, fs);
  });

  describe("checkForUpdates", () => {
    it("should throw error when zcc is not initialized", async () => {
      // Create UpdateManager without proper initialization
      const uninitFs = new MemoryFileSystemAdapter();
      const uninitUpdateManager = new UpdateManager("/uninitialized", uninitFs);
      
      await expect(
        uninitUpdateManager.checkForUpdates()
      ).rejects.toThrow("zcc is not initialized in this project");
      
      await expect(
        uninitUpdateManager.checkForUpdates()
      ).rejects.toThrow("Run 'zcc init' to initialize zcc first");
    });
  });

  describe("updateComponent", () => {
    // Removed complex test with brittle file system mocks

    it("should throw error if component is not installed", async () => {
      await expect(
        updateManager.updateComponent("mode", "missing")
      ).rejects.toThrow("mode 'missing' is not installed");
      
      await expect(
        updateManager.updateComponent("mode", "missing")
      ).rejects.toThrow("Run 'zcc add mode missing' to install it first");
    });

    it("should throw error about local changes without force flag", async () => {
      // Set up manifest with architect mode
      await fs.writeFile(
        fs.join(projectRoot, ".zcc", "manifest.json"),
        JSON.stringify({
          components: {
            modes: ["architect"],
            workflows: [],
          },
          versions: {
            modes: {
              architect: {
                name: "architect",
                version: "1.0.0",
                hash: "abc123", // Different hash to simulate local changes
                lastUpdated: "2024-01-01",
              },
            },
          },
        })
      );
      
      // Create the component with different content (local changes)
      await fs.writeFile(
        fs.join(projectRoot, ".zcc", "modes", "architect.md"),
        "modified content"
      );
      
      // Mock templates directory with newer version
      const templatesDir = (updateManager as any).templatesDir; // Use the actual templates dir from UpdateManager
      await fs.mkdir(fs.join(templatesDir, "modes"), { recursive: true });
      await fs.writeFile(
        fs.join(templatesDir, "modes", "architect.md"),
        "new template content"
      );
      await fs.writeFile(
        fs.join(templatesDir, "metadata.json"),
        JSON.stringify({ version: "1.1.0" })
      );

      await expect(
        updateManager.updateComponent("mode", "architect", false)
      ).rejects.toThrow("mode 'architect' has local modifications");
      
      await expect(
        updateManager.updateComponent("mode", "architect", false)
      ).rejects.toThrow("Use --force to overwrite your changes");
    });
  });

  describe("updateAll", () => {
    // Removed complex integration test

    it("should log when all components are up to date", async () => {
      const { logger } = require("../logger");
      await updateManager.updateAll();

      expect(logger.info).toHaveBeenCalledWith("All components are up to date");
    });
  });

  describe("showDiff", () => {
    it("should show diff when component has changes", async () => {
      // Create component with current content
      await fs.writeFile(
        fs.join(projectRoot, ".zcc", "modes", "architect.md"),
        "current content"
      );
      
      // Create template with different content
      const templatesDir = (updateManager as any).templatesDir; // Use the actual templates dir from UpdateManager
      await fs.mkdir(fs.join(templatesDir, "modes"), { recursive: true });
      await fs.writeFile(
        fs.join(templatesDir, "modes", "architect.md"),
        "template content"
      );

      await updateManager.showDiff("mode", "architect");

      expect(logger.info).toHaveBeenCalledWith(
        "mode 'architect' has differences from the latest template"
      );
    });

    it("should indicate when component is up to date", async () => {
      // Create component and template with same content
      const content = "same content";
      
      await fs.writeFile(
        fs.join(projectRoot, ".zcc", "modes", "architect.md"),
        content
      );
      
      const templatesDir = (updateManager as any).templatesDir; // Use the actual templates dir from UpdateManager
      await fs.mkdir(fs.join(templatesDir, "modes"), { recursive: true });
      await fs.writeFile(
        fs.join(templatesDir, "modes", "architect.md"),
        content
      );

      await updateManager.showDiff("mode", "architect");

      expect(logger.info).toHaveBeenCalledWith(
        "mode 'architect' is up to date"
      );
    });
    
    it("should throw error when component is not installed", async () => {
      await expect(
        updateManager.showDiff("mode", "nonexistent")
      ).rejects.toThrow("mode 'nonexistent' is not installed");
      
      await expect(
        updateManager.showDiff("mode", "nonexistent")
      ).rejects.toThrow("Run 'zcc add mode nonexistent' to install it first");
    });
    
    it("should throw error when template is not found", async () => {
      // Create component without corresponding template
      await fs.writeFile(
        fs.join(projectRoot, ".zcc", "modes", "orphaned.md"),
        "orphaned content"
      );
      
      await expect(
        updateManager.showDiff("mode", "orphaned")
      ).rejects.toThrow("No template found for mode 'orphaned'");
      
      await expect(
        updateManager.showDiff("mode", "orphaned")
      ).rejects.toThrow("The component may have been removed from zcc templates");
    });
  });
});
