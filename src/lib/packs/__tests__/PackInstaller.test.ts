import { PackInstaller } from "../PackInstaller";
import { PackStructure } from "../../types/packs";
import { createTestZccProject } from "../../testing";
import { MemoryFileSystemAdapter } from "../../adapters/MemoryFileSystemAdapter";
import { LocalPackSource } from "../PackSource";

// Mock DirectoryManager to prevent actual filesystem operations
jest.mock("../../directoryManager");
jest.mock("../../logger");

describe("PackInstaller", () => {
  let installer: PackInstaller;
  let fs: MemoryFileSystemAdapter;
  let packSource: LocalPackSource;
  const mockProjectRoot = "/test/project";

  const mockValidPack: PackStructure = {
    manifest: {
      name: "test-pack",
      version: "1.0.0",
      description: "Test starter pack",
      author: "test-author",
      components: {
        modes: [{ name: "engineer", required: true }],
        workflows: [{ name: "review", required: true }],
        agents: [{ name: "claude-code-research", required: false }]
      },
      tags: ["test"],
      category: "general"
    },
    path: "/test/templates/starter-packs/test-pack",
    componentsPath: "/test/templates/starter-packs/test-pack/components"
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create test filesystem with pack structure
    fs = await createTestZccProject(mockProjectRoot, {
      // Pack templates
      '/test/templates/starter-packs/test-pack/manifest.json': JSON.stringify(mockValidPack.manifest),
      '/test/templates/starter-packs/test-pack/components/modes/engineer.md': '# Engineer Mode\n\nYou are a software engineer.',
      '/test/templates/starter-packs/test-pack/components/workflows/review.md': '# Code Review Workflow\n\nReview code systematically.',
      '/test/templates/starter-packs/test-pack/components/agents/claude-code-research.md': '# Research Agent\n\nSpecialized in research tasks.',
    });

    packSource = new LocalPackSource("/test/templates/starter-packs", fs);
    installer = new PackInstaller(mockProjectRoot, fs);

    // Mock DirectoryManager
    const mockDirectoryManager = require("../../directoryManager").DirectoryManager;
    mockDirectoryManager.prototype.initializeStructure = jest.fn().mockResolvedValue(undefined);
    mockDirectoryManager.prototype.ensureProjectRoot = jest.fn().mockReturnValue(undefined);
  });

  describe("constructor", () => {
    it("should initialize with correct paths", () => {
      expect(installer).toBeInstanceOf(PackInstaller);
    });
  });

  describe("installPack", () => {
    it("should successfully install a valid pack", async () => {
      const result = await installer.installPack(mockValidPack, packSource);

      expect(result.success).toBe(true);
      expect(result.installed.modes).toContain("engineer");
      expect(result.installed.workflows).toContain("review");
      expect(result.installed.agents).toContain("claude-code-research");

      // Verify files were created
      expect(await fs.exists(`${mockProjectRoot}/.zcc/modes/engineer.md`)).toBe(true);
      expect(await fs.exists(`${mockProjectRoot}/.zcc/workflows/review.md`)).toBe(true);
      expect(await fs.exists(`${mockProjectRoot}/.claude/agents/claude-code-research.md`)).toBe(true);
    });

    it("should skip existing components without force flag", async () => {
      // Pre-create an existing component
      await fs.writeFile(`${mockProjectRoot}/.zcc/modes/engineer.md`, '# Existing Engineer Mode');

      const result = await installer.installPack(mockValidPack, packSource, { force: false });

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Conflict: mode 'engineer' already exists");
    });

    it("should overwrite existing components with force flag", async () => {
      // Pre-create an existing component
      await fs.writeFile(`${mockProjectRoot}/.zcc/modes/engineer.md`, '# Existing Engineer Mode');

      const result = await installer.installPack(mockValidPack, packSource, { force: true });

      expect(result.success).toBe(true);
      expect(result.installed.modes).toContain("engineer");
      
      // Verify content was updated
      const content = await fs.readFile(`${mockProjectRoot}/.zcc/modes/engineer.md`, 'utf-8');
      expect(content).toContain('# Engineer Mode');
      expect(content).toContain('You are a software engineer');
    });

    it("should handle dry run mode", async () => {
      const result = await installer.installPack(mockValidPack, packSource, { dryRun: true });

      expect(result.success).toBe(true);
      
      // Verify no files were actually created
      expect(await fs.exists(`${mockProjectRoot}/.zcc/modes/engineer.md`)).toBe(false);
      expect(await fs.exists(`${mockProjectRoot}/.zcc/workflows/review.md`)).toBe(false);
      expect(await fs.exists(`${mockProjectRoot}/.claude/agents/claude-code-research.md`)).toBe(false);
    });

    it("should skip optional components when specified", async () => {
      const result = await installer.installPack(mockValidPack, packSource, { skipOptional: true });

      expect(result.success).toBe(true);
      expect(result.installed.modes).toContain("engineer");
      expect(result.installed.workflows).toContain("review");
      expect(result.skipped.agents).toContain("claude-code-research");
      
      // Verify optional agent was not installed
      expect(await fs.exists(`${mockProjectRoot}/.claude/agents/claude-code-research.md`)).toBe(false);
    });

    it("should install pack configuration when provided", async () => {
      const packWithConfig: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
          configuration: {
            defaultMode: "engineer",
            projectSettings: {
              theme: "dark",
              enableAnalytics: false
            }
          }
        }
      };

      const result = await installer.installPack(packWithConfig, packSource);

      expect(result.success).toBe(true);
      
      // Verify configuration was written
      expect(await fs.exists(`${mockProjectRoot}/.zcc/config.json`)).toBe(true);
      const config = JSON.parse(await fs.readFile(`${mockProjectRoot}/.zcc/config.json`, 'utf-8') as string);
      expect(config.theme).toBe("dark");
      expect(config.enableAnalytics).toBe(false);
      expect(config.defaultMode).toBe("engineer");
    });

    it("should update project manifest after installation", async () => {
      const result = await installer.installPack(mockValidPack, packSource);

      expect(result.success).toBe(true);
      
      // Verify project manifest was updated
      expect(await fs.exists(`${mockProjectRoot}/.zcc/packs.json`)).toBe(true);
      const manifest = JSON.parse(await fs.readFile(`${mockProjectRoot}/.zcc/packs.json`, 'utf-8') as string);
      expect(manifest.packs["test-pack"]).toBeDefined();
      expect(manifest.packs["test-pack"].version).toBe("1.0.0");
    });

    it("should handle installation errors gracefully", async () => {
      const invalidPack: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
          components: {
            modes: [{ name: "non-existent-mode", required: true }]
          }
        }
      };

      const result = await installer.installPack(invalidPack, packSource);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => 
        error.includes("non-existent-mode")
      )).toBe(true);
    });
  });

  describe("uninstallPack", () => {
    it("should return failure for non-existent pack", async () => {
      const result = await installer.uninstallPack("test-pack");

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Pack 'test-pack' is not installed");
    });
  });
});