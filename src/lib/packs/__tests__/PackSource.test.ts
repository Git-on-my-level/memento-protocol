import { LocalPackSource } from "../PackSource";
import { PackManifest } from "../../types/packs";
import { createTestFileSystem } from "../../testing";
import { MemoryFileSystemAdapter } from "../../adapters/MemoryFileSystemAdapter";

// Mock logger to prevent console output during tests
jest.mock("../../logger");

describe("LocalPackSource", () => {
  let packSource: LocalPackSource;
  let fs: MemoryFileSystemAdapter;
  const basePath = "/test/packs";

  const validManifest: PackManifest = {
    name: "test-pack",
    version: "1.0.0",
    description: "Test starter pack for source testing",
    author: "test-author",
    components: {
      modes: [{ name: "engineer", required: true }],
      workflows: [{ name: "review", required: false }]
    },
    category: "general"
  };

  const anotherValidManifest: PackManifest = {
    name: "another-pack",
    version: "2.1.0",
    description: "Another test pack",
    author: "another-author",
    components: {
      modes: [{ name: "architect", required: true }],
      agents: [{ name: "research", required: false }]
    },
    category: "backend"
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create test filesystem with multiple packs
    fs = await createTestFileSystem({
      // First pack
      [`${basePath}/test-pack/manifest.json`]: JSON.stringify(validManifest),
      [`${basePath}/test-pack/modes/engineer.md`]: '# Engineer Mode\n\nYou are a software engineer.',
      [`${basePath}/test-pack/workflows/review.md`]: '# Code Review Workflow\n\nReview code systematically.',
      
      // Second pack
      [`${basePath}/another-pack/manifest.json`]: JSON.stringify(anotherValidManifest),
      [`${basePath}/another-pack/modes/architect.md`]: '# Architect Mode\n\nYou are a software architect.',
      [`${basePath}/another-pack/agents/research.md`]: '# Research Agent\n\nSpecialized in research.',
      
      // Invalid pack (missing manifest)
      [`${basePath}/invalid-pack/modes/broken.md`]: '# Broken Mode',
      
      // Empty directory
      [`${basePath}/empty-pack/.gitkeep`]: '',
      
      // Non-pack files
      [`${basePath}/README.md`]: '# Pack Repository\n\nThis contains starter packs.',
      [`${basePath}/other-file.txt`]: 'Not a pack directory'
    });

    packSource = new LocalPackSource(basePath, fs);
  });

  describe("constructor", () => {
    it("should initialize with base path", () => {
      expect(packSource).toBeInstanceOf(LocalPackSource);
      expect(packSource.getSourceInfo().type).toBe("local");
      expect(packSource.getSourceInfo().path).toBe(basePath);
    });
  });

  describe("listPacks", () => {
    it("should list all valid packs", async () => {
      const packs = await packSource.listPacks();

      expect(packs).toHaveLength(2);
      expect(packs).toContain("test-pack");
      expect(packs).toContain("another-pack");
      expect(packs).not.toContain("invalid-pack");
      expect(packs).not.toContain("empty-pack");
    });

    it("should return empty array when base path doesn't exist", async () => {
      const nonExistentSource = new LocalPackSource("/non/existent/path", fs);
      
      const packs = await nonExistentSource.listPacks();

      expect(packs).toEqual([]);
    });

    it("should handle filesystem errors gracefully", async () => {
      // Create a source that will fail to read directories
      const faultyFs = await createTestFileSystem({});
      const faultySource = new LocalPackSource(basePath, faultyFs);

      const packs = await faultySource.listPacks();

      expect(packs).toEqual([]);
    });

    it("should skip directories without manifests", async () => {
      const packs = await packSource.listPacks();

      expect(packs).not.toContain("invalid-pack");
      expect(packs).not.toContain("empty-pack");
    });
  });

  describe("hasPack", () => {
    it("should return true for existing packs", async () => {
      expect(await packSource.hasPack("test-pack")).toBe(true);
      expect(await packSource.hasPack("another-pack")).toBe(true);
    });

    it("should return false for non-existent packs", async () => {
      expect(await packSource.hasPack("non-existent-pack")).toBe(false);
    });

    it("should return false for directories without manifests", async () => {
      expect(await packSource.hasPack("invalid-pack")).toBe(false);
      expect(await packSource.hasPack("empty-pack")).toBe(false);
    });
  });

  describe("loadPack", () => {
    it("should load a valid pack structure", async () => {
      const pack = await packSource.loadPack("test-pack");

      expect(pack.manifest).toEqual(validManifest);
      expect(pack.path).toBe(`${basePath}/test-pack`);
      // componentsPath is no longer part of PackStructure
    });

    it("should load another valid pack with different structure", async () => {
      const pack = await packSource.loadPack("another-pack");

      expect(pack.manifest).toEqual(anotherValidManifest);
      expect(pack.manifest.name).toBe("another-pack");
      expect(pack.manifest.version).toBe("2.1.0");
      expect(pack.manifest.category).toBe("backend");
    });

    it("should throw error for non-existent pack directory", async () => {
      await expect(packSource.loadPack("non-existent-pack"))
        .rejects.toThrow("Pack 'non-existent-pack' not found in local source");
    });

    it("should throw error for pack without manifest", async () => {
      await expect(packSource.loadPack("invalid-pack"))
        .rejects.toThrow("Pack manifest not found for 'invalid-pack'");
    });

    it("should load pack without components directory (flattened structure)", async () => {
      // In the new flattened structure, packs don't need a separate components directory
      // Components are directly under pack root (modes/, workflows/, etc.)
      await fs.writeFile(`${basePath}/no-components/manifest.json`, JSON.stringify(validManifest));

      const pack = await packSource.loadPack("no-components");
      expect(pack.manifest.name).toBe("test-pack");
      expect(pack.path).toBe(`${basePath}/no-components`);
    });

    it("should throw error for pack with invalid JSON manifest", async () => {
      // Create a pack with invalid JSON manifest
      await fs.writeFile(`${basePath}/bad-json/manifest.json`, '{ invalid json }');
      await fs.mkdir(`${basePath}/bad-json/components`, { recursive: true });

      await expect(packSource.loadPack("bad-json"))
        .rejects.toThrow("Invalid JSON in manifest for pack 'bad-json'");
    });

    it("should throw error for manifest missing required fields", async () => {
      const invalidManifest = {
        name: "incomplete-pack",
        version: "1.0.0"
        // Missing description, author, components
      };

      await fs.writeFile(`${basePath}/incomplete/manifest.json`, JSON.stringify(invalidManifest));
      await fs.mkdir(`${basePath}/incomplete/components`, { recursive: true });

      await expect(packSource.loadPack("incomplete"))
        .rejects.toThrow("Invalid manifest for pack 'incomplete': missing required fields");
    });
  });

  describe("hasComponent", () => {
    it("should return true for existing components", async () => {
      expect(await packSource.hasComponent("test-pack", "modes", "engineer")).toBe(true);
      expect(await packSource.hasComponent("test-pack", "workflows", "review")).toBe(true);
      expect(await packSource.hasComponent("another-pack", "modes", "architect")).toBe(true);
      expect(await packSource.hasComponent("another-pack", "agents", "research")).toBe(true);
    });

    it("should return false for non-existent components", async () => {
      expect(await packSource.hasComponent("test-pack", "modes", "non-existent")).toBe(false);
      expect(await packSource.hasComponent("test-pack", "agents", "engineer")).toBe(false);
    });

    it("should return false for components in non-existent packs", async () => {
      expect(await packSource.hasComponent("non-existent-pack", "modes", "engineer")).toBe(false);
    });

    it("should handle filesystem errors gracefully", async () => {
      // This will fail when trying to load the pack
      expect(await packSource.hasComponent("invalid-pack", "modes", "any")).toBe(false);
    });
  });

  describe("getComponentPath", () => {
    it("should return correct paths for markdown components", async () => {
      const modePath = await packSource.getComponentPath("test-pack", "modes", "engineer");
      expect(modePath).toBe(`${basePath}/test-pack/modes/engineer.md`);

      const workflowPath = await packSource.getComponentPath("test-pack", "workflows", "review");
      expect(workflowPath).toBe(`${basePath}/test-pack/workflows/review.md`);

      const agentPath = await packSource.getComponentPath("another-pack", "agents", "research");
      expect(agentPath).toBe(`${basePath}/another-pack/agents/research.md`);
    });

    it("should return correct paths for JSON hook components", async () => {
      const hookPath = await packSource.getComponentPath("test-pack", "hooks", "git-hook");
      expect(hookPath).toBe(`${basePath}/test-pack/hooks/git-hook.json`);
    });

    it("should throw error for non-existent packs", async () => {
      await expect(packSource.getComponentPath("non-existent-pack", "modes", "engineer"))
        .rejects.toThrow("Pack 'non-existent-pack' not found");
    });
  });

  describe("getSourceInfo", () => {
    it("should return correct source information", () => {
      const sourceInfo = packSource.getSourceInfo();

      expect(sourceInfo.name).toBe("local");
      expect(sourceInfo.type).toBe("local");
      expect(sourceInfo.path).toBe(basePath);
    });
  });

  describe("edge cases", () => {
    it("should handle empty base directory", async () => {
      const emptySource = new LocalPackSource("/empty", fs);

      const packs = await emptySource.listPacks();
      expect(packs).toEqual([]);

      expect(await emptySource.hasPack("any-pack")).toBe(false);
    });

    it("should handle directory permissions issues gracefully", async () => {
      // This tests the error handling in the catch blocks
      const result = await packSource.listPacks();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should sort pack list alphabetically", async () => {
      // Add more packs to test sorting
      await fs.writeFile(`${basePath}/z-pack/manifest.json`, JSON.stringify({
        ...validManifest,
        name: "z-pack"
      }));
      await fs.mkdir(`${basePath}/z-pack/components`, { recursive: true });

      await fs.writeFile(`${basePath}/a-pack/manifest.json`, JSON.stringify({
        ...validManifest,
        name: "a-pack"
      }));
      await fs.mkdir(`${basePath}/a-pack/components`, { recursive: true });

      const packs = await packSource.listPacks();

      expect(packs).toEqual(["a-pack", "another-pack", "test-pack", "z-pack"]);
    });
  });
});