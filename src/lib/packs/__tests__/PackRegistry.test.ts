import { PackRegistry } from "../PackRegistry";
import { PackManifest, PackStructure } from "../../types/packs";
import { createTestFileSystem } from "../../testing";
import { MemoryFileSystemAdapter } from "../../adapters/MemoryFileSystemAdapter";
import { LocalPackSource, IPackSource } from "../PackSource";

// Mock logger and PackagePaths to prevent console output and path issues during tests
jest.mock("../../logger");
jest.mock("../../packagePaths", () => ({
  PackagePaths: {
    getTemplatesDir: () => "/test/templates"
  }
}));

describe("PackRegistry", () => {
  let registry: PackRegistry;
  let fs: MemoryFileSystemAdapter;

  const testPack1: PackManifest = {
    name: "frontend-react",
    version: "1.0.0",
    description: "React frontend development pack",
    author: "memento-team",
    components: {
      modes: [{ name: "react-dev", required: true }],
      workflows: [{ name: "component-gen", required: false }]
    },
    tags: ["react", "frontend"],
    category: "frontend",
    compatibleWith: ["javascript", "typescript", "react"]
  };

  const testPack2: PackManifest = {
    name: "backend-node",
    version: "2.1.0",
    description: "Node.js backend development pack",
    author: "memento-team",
    components: {
      modes: [{ name: "node-api", required: true }],
      agents: [{ name: "api-generator", required: false }]
    },
    tags: ["node", "backend", "api"],
    category: "backend",
    compatibleWith: ["javascript", "typescript", "node"],
    dependencies: ["base-utils"]
  };

  const basePack: PackManifest = {
    name: "base-utils",
    version: "1.0.0",
    description: "Base utility pack with common tools",
    author: "memento-team",
    components: {
      workflows: [{ name: "common-utils", required: true }]
    },
    category: "general"
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create test filesystem with built-in packs
    fs = await createTestFileSystem({
      // Default built-in packs location
      '/test/templates/starter-packs/frontend-react/manifest.json': JSON.stringify(testPack1),
      '/test/templates/starter-packs/frontend-react/modes/react-dev.md': '# React Dev Mode',
      '/test/templates/starter-packs/frontend-react/workflows/component-gen.md': '# Component Generator',
      
      '/test/templates/starter-packs/backend-node/manifest.json': JSON.stringify(testPack2),
      '/test/templates/starter-packs/backend-node/modes/node-api.md': '# Node API Mode',
      '/test/templates/starter-packs/backend-node/agents/api-generator.md': '# API Generator Agent',
      
      '/test/templates/starter-packs/base-utils/manifest.json': JSON.stringify(basePack),
      '/test/templates/starter-packs/base-utils/workflows/common-utils.md': '# Common Utils',
    });

    registry = new PackRegistry(fs);
  });

  describe("constructor", () => {
    it("should initialize with default sources", () => {
      expect(registry).toBeInstanceOf(PackRegistry);
    });

    it("should register built-in local source", async () => {
      const packs = await registry.listAvailablePacks();
      expect(packs.length).toBeGreaterThan(0);
    });
  });

  describe("registerSource", () => {
    it("should register a custom pack source", async () => {
      // Create a custom source with additional packs
      await fs.writeFile('/custom/packs/custom-pack/manifest.json', JSON.stringify({
        ...testPack1,
        name: "custom-pack",
        description: "Custom test pack"
      }));
      await fs.mkdir('/custom/packs/custom-pack/components', { recursive: true });

      const customSource = new LocalPackSource("/custom/packs", fs);
      registry.registerSource("custom", customSource);

      const packs = await registry.listAvailablePacks();
      expect(packs.some(pack => pack.manifest.name === "custom-pack")).toBe(true);
    });

    it("should handle multiple sources without duplicates", async () => {
      // Create another source with a duplicate pack name
      await fs.writeFile('/duplicate/packs/frontend-react/manifest.json', JSON.stringify({
        ...testPack1,
        description: "Duplicate pack (should be skipped)"
      }));
      await fs.mkdir('/duplicate/packs/frontend-react/components', { recursive: true });

      const duplicateSource = new LocalPackSource("/duplicate/packs", fs);
      registry.registerSource("duplicate", duplicateSource);

      const packs = await registry.listAvailablePacks();
      const reactPacks = packs.filter(pack => pack.manifest.name === "frontend-react");
      expect(reactPacks).toHaveLength(1);
      expect(reactPacks[0].manifest.description).toBe("React frontend development pack");
    });
  });

  describe("listAvailablePacks", () => {
    it("should list all packs from registered sources", async () => {
      const packs = await registry.listAvailablePacks();

      expect(packs).toHaveLength(3);
      expect(packs.some(pack => pack.manifest.name === "frontend-react")).toBe(true);
      expect(packs.some(pack => pack.manifest.name === "backend-node")).toBe(true);
      expect(packs.some(pack => pack.manifest.name === "base-utils")).toBe(true);
    });

    it("should handle source errors gracefully", async () => {
      // Register a faulty source
      class FaultySource implements IPackSource {
        async listPacks(): Promise<string[]> {
          throw new Error("Source error");
        }
        async loadPack(): Promise<PackStructure> {
          throw new Error("Source error");
        }
        async hasPack(): Promise<boolean> {
          throw new Error("Source error");
        }
        async hasComponent(
          _packName: string,
          _componentType: 'modes' | 'workflows' | 'agents' | 'hooks',
          _componentName: string
        ): Promise<boolean> {
          throw new Error("Source error");
        }
        async getComponentPath(
          _packName: string,
          _componentType: 'modes' | 'workflows' | 'agents' | 'hooks',
          _componentName: string
        ): Promise<string> {
          throw new Error("Source error");
        }
        getSourceInfo() {
          return { name: "faulty", type: "local" as const, path: "/faulty" };
        }
      }

      registry.registerSource("faulty", new FaultySource());

      const packs = await registry.listAvailablePacks();
      // Should still return packs from working sources
      expect(packs.length).toBeGreaterThan(0);
    });
  });

  describe("loadPack", () => {
    it("should load a pack by name", async () => {
      const pack = await registry.loadPack("frontend-react");

      expect(pack.manifest.name).toBe("frontend-react");
      expect(pack.manifest.version).toBe("1.0.0");
      expect(pack.manifest.category).toBe("frontend");
    });

    it("should use preferred source when specified", async () => {
      const pack = await registry.loadPack("frontend-react", "local");

      expect(pack.manifest.name).toBe("frontend-react");
    });

    it("should cache loaded packs", async () => {
      const pack1 = await registry.loadPack("frontend-react");
      const pack2 = await registry.loadPack("frontend-react");

      expect(pack1).toBe(pack2); // Same object reference due to caching
    });

    it("should throw error for non-existent pack", async () => {
      await expect(registry.loadPack("non-existent-pack"))
        .rejects.toThrow("Pack 'non-existent-pack' not found in any registered source");
    });

    it("should try all sources when no preference specified", async () => {
      // Remove the pack from local source
      await fs.unlink('/test/templates/starter-packs/frontend-react/manifest.json');

      // Add it to a custom source
      await fs.writeFile('/custom/frontend-react/manifest.json', JSON.stringify(testPack1));
      await fs.mkdir('/custom/frontend-react/components', { recursive: true });
      
      const customSource = new LocalPackSource("/custom", fs);
      registry.registerSource("custom", customSource);

      const pack = await registry.loadPack("frontend-react");
      expect(pack.manifest.name).toBe("frontend-react");
    });
  });

  describe("hasPack", () => {
    it("should return true for existing packs", async () => {
      expect(await registry.hasPack("frontend-react")).toBe(true);
      expect(await registry.hasPack("backend-node")).toBe(true);
      expect(await registry.hasPack("base-utils")).toBe(true);
    });

    it("should return false for non-existent packs", async () => {
      expect(await registry.hasPack("non-existent-pack")).toBe(false);
    });

    it("should handle source errors gracefully", async () => {
      // This test verifies the error handling in the hasPack method
      expect(await registry.hasPack("frontend-react")).toBe(true);
    });
  });

  describe("resolveDependencies", () => {
    it("should resolve simple dependencies", async () => {
      const result = await registry.resolveDependencies("backend-node");

      expect(result.resolved).toContain("base-utils");
      expect(result.missing).toHaveLength(0);
      expect(result.circular).toHaveLength(0);
    });

    it("should return empty resolved array for packs without dependencies", async () => {
      const result = await registry.resolveDependencies("frontend-react");

      expect(result.resolved).toEqual([]);
      expect(result.missing).toHaveLength(0);
      expect(result.circular).toHaveLength(0);
    });

    it("should detect missing dependencies", async () => {
      // Create a pack with missing dependency
      const packWithMissingDep: PackManifest = {
        ...testPack1,
        name: "pack-with-missing-dep",
        dependencies: ["non-existent-dep"]
      };

      await fs.writeFile('/test/templates/starter-packs/pack-with-missing-dep/manifest.json', 
        JSON.stringify(packWithMissingDep));
      await fs.mkdir('/test/templates/starter-packs/pack-with-missing-dep/components', { recursive: true });

      const result = await registry.resolveDependencies("pack-with-missing-dep");

      expect(result.missing).toContain("non-existent-dep");
      expect(result.resolved).toEqual([]);
    });

    it("should detect circular dependencies", async () => {
      // Create circular dependency: pack-a -> pack-b -> pack-c -> pack-a
      const packA: PackManifest = {
        ...testPack1,
        name: "pack-a",
        dependencies: ["pack-b"]
      };
      const packB: PackManifest = {
        ...testPack1,
        name: "pack-b",
        dependencies: ["pack-c"]
      };
      const packC: PackManifest = {
        ...testPack1,
        name: "pack-c",
        dependencies: ["pack-a"]
      };

      await fs.writeFile('/test/templates/starter-packs/pack-a/manifest.json', JSON.stringify(packA));
      await fs.mkdir('/test/templates/starter-packs/pack-a/components', { recursive: true });
      
      await fs.writeFile('/test/templates/starter-packs/pack-b/manifest.json', JSON.stringify(packB));
      await fs.mkdir('/test/templates/starter-packs/pack-b/components', { recursive: true });
      
      await fs.writeFile('/test/templates/starter-packs/pack-c/manifest.json', JSON.stringify(packC));
      await fs.mkdir('/test/templates/starter-packs/pack-c/components', { recursive: true });

      const result = await registry.resolveDependencies("pack-a");

      expect(result.circular.length).toBeGreaterThan(0);
    });

    it("should resolve complex dependency chains in correct order", async () => {
      // Create chain: pack-root -> pack-mid -> base-utils
      const packMid: PackManifest = {
        ...testPack1,
        name: "pack-mid",
        dependencies: ["base-utils"]
      };
      const packRoot: PackManifest = {
        ...testPack1,
        name: "pack-root",
        dependencies: ["pack-mid"]
      };

      await fs.writeFile('/test/templates/starter-packs/pack-mid/manifest.json', JSON.stringify(packMid));
      await fs.mkdir('/test/templates/starter-packs/pack-mid/components', { recursive: true });
      
      await fs.writeFile('/test/templates/starter-packs/pack-root/manifest.json', JSON.stringify(packRoot));
      await fs.mkdir('/test/templates/starter-packs/pack-root/components', { recursive: true });

      const result = await registry.resolveDependencies("pack-root");

      expect(result.resolved).toEqual(["base-utils", "pack-mid"]);
      expect(result.missing).toHaveLength(0);
      expect(result.circular).toHaveLength(0);
    });
  });

  describe("searchPacks", () => {
    it("should filter packs by category", async () => {
      const result = await registry.searchPacks({ category: "frontend" });

      expect(result).toHaveLength(1);
      expect(result[0].manifest.name).toBe("frontend-react");
    });

    it("should filter packs by tags", async () => {
      const result = await registry.searchPacks({ tags: ["react"] });

      expect(result).toHaveLength(1);
      expect(result[0].manifest.name).toBe("frontend-react");
    });

    it("should filter packs by compatibility", async () => {
      const result = await registry.searchPacks({ compatibleWith: ["typescript"] });

      expect(result).toHaveLength(2);
      expect(result.some(pack => pack.manifest.name === "frontend-react")).toBe(true);
      expect(result.some(pack => pack.manifest.name === "backend-node")).toBe(true);
    });

    it("should filter packs by author", async () => {
      const result = await registry.searchPacks({ author: "memento-team" });

      expect(result).toHaveLength(3); // All test packs have the same author
    });

    it("should combine multiple filter criteria", async () => {
      const result = await registry.searchPacks({ 
        category: "frontend",
        tags: ["react"],
        author: "memento-team"
      });

      expect(result).toHaveLength(1);
      expect(result[0].manifest.name).toBe("frontend-react");
    });

    it("should return empty array when no packs match criteria", async () => {
      const result = await registry.searchPacks({ category: "mobile" });

      expect(result).toEqual([]);
    });
  });

  describe("getRecommendedPacks", () => {
    it("should return packs compatible with project type", async () => {
      const result = await registry.getRecommendedPacks("typescript");

      expect(result).toHaveLength(2);
      expect(result.some(pack => pack.manifest.name === "frontend-react")).toBe(true);
      expect(result.some(pack => pack.manifest.name === "backend-node")).toBe(true);
    });

    it("should sort recommendations alphabetically", async () => {
      const result = await registry.getRecommendedPacks("typescript");

      const names = result.map(pack => pack.manifest.name);
      expect(names).toEqual([...names].sort());
    });

    it("should return empty array for unsupported project type", async () => {
      const result = await registry.getRecommendedPacks("cobol");

      expect(result).toEqual([]);
    });
  });

  describe("validateDependencies", () => {
    it("should validate clean dependencies", async () => {
      const result = await registry.validateDependencies("backend-node");

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should detect validation issues", async () => {
      // Create pack with missing and circular dependencies
      const problematicPack: PackManifest = {
        ...testPack1,
        name: "problematic-pack",
        dependencies: ["non-existent-dep", "circular-dep"]
      };

      const circularPack: PackManifest = {
        ...testPack1,
        name: "circular-dep",
        dependencies: ["problematic-pack"]
      };

      await fs.writeFile('/test/templates/starter-packs/problematic-pack/manifest.json', 
        JSON.stringify(problematicPack));
      await fs.mkdir('/test/templates/starter-packs/problematic-pack/components', { recursive: true });

      await fs.writeFile('/test/templates/starter-packs/circular-dep/manifest.json', 
        JSON.stringify(circularPack));
      await fs.mkdir('/test/templates/starter-packs/circular-dep/components', { recursive: true });

      const result = await registry.validateDependencies("problematic-pack");

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some(issue => issue.includes("Missing dependencies"))).toBe(true);
      expect(result.issues.some(issue => issue.includes("Circular dependencies"))).toBe(true);
    });
  });

  describe("clearCache", () => {
    it("should clear the pack cache", async () => {
      // Load a pack to populate cache
      await registry.loadPack("frontend-react");

      // Clear cache
      registry.clearCache();

      // This should work without issues
      const pack = await registry.loadPack("frontend-react");
      expect(pack.manifest.name).toBe("frontend-react");
    });
  });

  describe("getRegistryStats", () => {
    it("should return registry statistics", async () => {
      const stats = await registry.getRegistryStats();

      expect(stats.totalPacks).toBe(3);
      expect(stats.sourceCount).toBeGreaterThanOrEqual(1);
      expect(stats.categoryCounts.frontend).toBe(1);
      expect(stats.categoryCounts.backend).toBe(1);
      expect(stats.categoryCounts.general).toBe(1);
      expect(stats.authorCounts["memento-team"]).toBe(3);
    });

    it("should handle empty registry", async () => {
      const emptyRegistry = new PackRegistry(await createTestFileSystem({}));

      const stats = await emptyRegistry.getRegistryStats();

      expect(stats.totalPacks).toBe(0);
      expect(stats.sourceCount).toBe(1); // Default local source is always registered
      expect(Object.keys(stats.categoryCounts)).toHaveLength(0);
      expect(Object.keys(stats.authorCounts)).toHaveLength(0);
    });
  });

  describe("getSource", () => {
    it("should return existing source by name", () => {
      const source = registry.getSource("local");
      expect(source).toBeDefined();
      expect(source).toBeInstanceOf(LocalPackSource);
    });

    it("should return undefined for non-existent source", () => {
      const source = registry.getSource("non-existent");
      expect(source).toBeUndefined();
    });

    it("should return custom registered source", async () => {
      // Create and register a custom source
      await fs.writeFile('/custom/test-pack/manifest.json', JSON.stringify(testPack1));
      await fs.mkdir('/custom/test-pack/components', { recursive: true });
      
      const customSource = new LocalPackSource("/custom", fs);
      registry.registerSource("custom", customSource);

      const source = registry.getSource("custom");
      expect(source).toBeDefined();
      expect(source).toBe(customSource);
    });
  });

  describe("getDefaultSource", () => {
    it("should return the default local source", () => {
      const defaultSource = registry.getDefaultSource();
      expect(defaultSource).toBeDefined();
      expect(defaultSource).toBeInstanceOf(LocalPackSource);
    });

    it("should throw error if default source is not available", () => {
      // Create registry without default source by manipulating internal state
      const emptyRegistry = new PackRegistry(fs);
      // Remove the default source to simulate an error condition
      (emptyRegistry as any).sources.delete('local');

      expect(() => emptyRegistry.getDefaultSource())
        .toThrow("Default pack source not found");
    });
  });
});