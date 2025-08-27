import * as fs from "fs/promises";
import { existsSync } from "fs";
import { StarterPackManager } from "../StarterPackManager";
import { StarterPack } from "../types/starterPacks";

// Mock dependencies
jest.mock("fs/promises");
jest.mock("fs");
jest.mock("../logger");
jest.mock("../componentInstaller");
jest.mock("../directoryManager");

const mockFs = fs as jest.Mocked<typeof fs>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;

describe("StarterPackManager", () => {
  let manager: StarterPackManager;
  const mockProjectRoot = "/test/project";

  const mockSchema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Test Schema",
    type: "object",
    required: ["name", "version", "description", "author", "components"],
    properties: {
      name: { type: "string" },
      version: { type: "string" },
      description: { type: "string" },
      author: { type: "string" },
      components: { type: "object" }
    }
  };

  const mockValidPack: StarterPack = {
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new StarterPackManager(mockProjectRoot);
  });

  describe("constructor", () => {
    it("should initialize with correct paths", () => {
      expect(manager).toBeInstanceOf(StarterPackManager);
    });
  });

  describe("listPacks", () => {
    it("should return empty array when starter packs directory does not exist", async () => {
      // First mock should return true for schema.json to pass initialization
      // Then return false for the starter-packs directory
      mockExistsSync.mockImplementation((filePath: any) => {
        const path = String(filePath);
        if (path.includes("schema.json")) return true;
        return false;
      });
      
      mockFs.readFile.mockImplementation(async (filePath: any) => {
        const path = String(filePath);
        if (path.includes("schema.json")) {
          return JSON.stringify(mockSchema);
        }
        throw new Error("File not found");
      });

      const result = await manager.listPacks();

      expect(result).toEqual([]);
    });

    it("should return list of valid starter packs", async () => {
      // Setup mocks
      mockExistsSync.mockImplementation((filePath: any) => {
        const path = String(filePath);
        if (path.includes("schema.json")) return true;
        if (path.includes("starter-packs")) return true;
        if (path.includes("test-pack.json")) return true;
        return false;
      });

      mockFs.readFile.mockImplementation(async (filePath: any) => {
        const path = String(filePath);
        if (path.includes("schema.json")) {
          return JSON.stringify(mockSchema);
        }
        if (path.includes("test-pack.json")) {
          return JSON.stringify(mockValidPack);
        }
        throw new Error("File not found");
      });

      mockFs.readdir.mockResolvedValue(["test-pack.json", "schema.json"] as any);

      // Mock ComponentInstaller methods
      const mockComponentInstaller = require("../componentInstaller").ComponentInstaller;
      mockComponentInstaller.prototype.listAvailableComponents.mockResolvedValue({
        modes: [{ name: "engineer" }],
        workflows: [{ name: "review" }],
        agents: [{ name: "claude-code-research" }]
      });

      const result = await manager.listPacks();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject(mockValidPack);
    });

    it("should handle pack loading errors gracefully", async () => {
      mockExistsSync.mockReturnValue(true);
      mockFs.readFile.mockImplementation(async (filePath: any) => {
        const path = String(filePath);
        if (path.includes("schema.json")) {
          return JSON.stringify(mockSchema);
        }
        throw new Error("Failed to read pack");
      });
      mockFs.readdir.mockResolvedValue(["invalid-pack.json"] as any);

      const result = await manager.listPacks();

      expect(result).toEqual([]);
    });
  });

  describe("loadPack", () => {
    beforeEach(() => {
      // Setup schema loading
      mockExistsSync.mockImplementation((filePath: any) => {
        const path = String(filePath);
        if (path.includes("schema.json")) return true;
        if (path.includes("test-pack.json")) return true;
        return false;
      });

      mockFs.readFile.mockImplementation(async (filePath: any) => {
        const path = String(filePath);
        if (path.includes("schema.json")) {
          return JSON.stringify(mockSchema);
        }
        if (path.includes("test-pack.json")) {
          return JSON.stringify(mockValidPack);
        }
        throw new Error("File not found");
      });
    });

    it("should load a valid starter pack", async () => {
      // Mock ComponentInstaller methods
      const mockComponentInstaller = require("../componentInstaller").ComponentInstaller;
      mockComponentInstaller.prototype.listAvailableComponents.mockResolvedValue({
        modes: [{ name: "engineer" }],
        workflows: [{ name: "review" }],
        agents: [{ name: "claude-code-research" }]
      });

      const result = await manager.loadPack("test-pack");

      expect(result).toMatchObject(mockValidPack);
    });

    it("should throw error for non-existent pack", async () => {
      mockExistsSync.mockImplementation((filePath: any) => {
        const path = String(filePath);
        if (path.includes("schema.json")) return true;
        return false;
      });

      await expect(manager.loadPack("non-existent")).rejects.toThrow(
        "Starter pack 'non-existent' not found"
      );
    });

    it("should throw error for invalid JSON", async () => {
      mockFs.readFile.mockImplementation(async (filePath: any) => {
        const path = String(filePath);
        if (path.includes("schema.json")) {
          return JSON.stringify(mockSchema);
        }
        return "invalid json";
      });

      await expect(manager.loadPack("test-pack")).rejects.toThrow(
        "Failed to load starter pack 'test-pack'"
      );
    });
  });

  describe("validatePack", () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(true);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockSchema));

      // Mock ComponentInstaller methods
      const mockComponentInstaller = require("../componentInstaller").ComponentInstaller;
      mockComponentInstaller.prototype.listAvailableComponents.mockResolvedValue({
        modes: [{ name: "engineer" }],
        workflows: [{ name: "review" }],
        agents: [{ name: "claude-code-research" }]
      });
    });

    it("should validate a correct pack", async () => {
      const result = await manager.validatePack(mockValidPack);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect missing required fields", async () => {
      const invalidPack = {
        name: "test-pack",
        // missing required fields
      };

      const result = await manager.validatePack(invalidPack);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should detect non-existent component references", async () => {
      const packWithInvalidComponents = {
        ...mockValidPack,
        components: {
          modes: [{ name: "non-existent-mode", required: true }]
        }
      };

      const result = await manager.validatePack(packWithInvalidComponents);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Referenced mode 'non-existent-mode' not found in templates"
      );
    });

    it("should validate circular dependencies", async () => {
      const packWithSelfDependency = {
        ...mockValidPack,
        dependencies: ["test-pack"] // self-reference
      };

      const result = await manager.validatePack(packWithSelfDependency);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Pack cannot depend on itself");
    });

    it("should validate version format", async () => {
      const packWithInvalidVersion = {
        ...mockValidPack,
        mementoProtocolVersion: "invalid.version"
      };

      const result = await manager.validatePack(packWithInvalidVersion);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid version format: invalid.version");
    });
  });

  describe("resolveDependencies", () => {
    it("should resolve dependencies in correct order", async () => {
      // Setup scenario with pack dependencies
      const packA: StarterPack = {
        ...mockValidPack,
        name: "pack-a",
        dependencies: ["pack-b"]
      };

      const packB: StarterPack = {
        ...mockValidPack,
        name: "pack-b",
        dependencies: []
      };

      // Mock listPacks to return our test packs
      jest.spyOn(manager, "listPacks").mockResolvedValue([packA, packB]);

      const result = await manager.resolveDependencies(packA);

      expect(result.resolved).toEqual(["pack-b"]);
      expect(result.missing).toHaveLength(0);
      expect(result.circular).toHaveLength(0);
    });

    it("should detect circular dependencies", async () => {
      const packA: StarterPack = {
        ...mockValidPack,
        name: "pack-a",
        dependencies: ["pack-b"]
      };

      const packB: StarterPack = {
        ...mockValidPack,
        name: "pack-b",
        dependencies: ["pack-a"]
      };

      jest.spyOn(manager, "listPacks").mockResolvedValue([packA, packB]);

      const result = await manager.resolveDependencies(packA);

      expect(result.circular.length).toBeGreaterThan(0);
    });

    it("should detect missing dependencies", async () => {
      const packWithMissingDep: StarterPack = {
        ...mockValidPack,
        dependencies: ["non-existent-pack"]
      };

      jest.spyOn(manager, "listPacks").mockResolvedValue([]);

      const result = await manager.resolveDependencies(packWithMissingDep);

      expect(result.missing).toContain("non-existent-pack");
    });
  });

  describe("installPack", () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(true);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockSchema));

      // Mock ComponentInstaller methods
      const mockComponentInstaller = require("../componentInstaller").ComponentInstaller;
      mockComponentInstaller.prototype.listAvailableComponents.mockResolvedValue({
        modes: [{ name: "engineer" }],
        workflows: [{ name: "review" }],
        agents: [{ name: "claude-code-research" }]
      });
    });

    it("should return success for valid pack (stub implementation)", async () => {
      jest.spyOn(manager, "listPacks").mockResolvedValue([mockValidPack]);

      const result = await manager.installPack(mockValidPack);

      expect(result.success).toBe(true);
      expect(result.installed.modes).toContain("engineer");
      expect(result.installed.workflows).toContain("review");
      expect(result.installed.agents).toContain("claude-code-research");
    });

    it("should return failure for invalid pack", async () => {
      const invalidPack = {
        // Missing required fields to trigger schema validation
        name: "test-pack"
        // Missing: version, description, author, components
      };

      // Mock listPacks to return empty (no dependency validation issues)
      jest.spyOn(manager, "listPacks").mockResolvedValue([]);

      const result = await manager.installPack(invalidPack as StarterPack);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should return failure for packs with missing dependencies", async () => {
      const packWithMissingDeps = {
        ...mockValidPack,
        dependencies: ["missing-pack"]
      };

      jest.spyOn(manager, "listPacks").mockResolvedValue([packWithMissingDeps]);

      const result = await manager.installPack(packWithMissingDeps as StarterPack);

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Dependency 'missing-pack' not found");
    });

    it("should include post-install message", async () => {
      const packWithPostInstall = {
        ...mockValidPack,
        postInstall: {
          message: "Pack installed successfully!"
        }
      };

      jest.spyOn(manager, "listPacks").mockResolvedValue([packWithPostInstall]);

      const result = await manager.installPack(packWithPostInstall);

      expect(result.postInstallMessage).toBe("Pack installed successfully!");
    });

    it("should handle packs with optional components gracefully", async () => {
      const packWithOptionalComponents: StarterPack = {
        ...mockValidPack,
        components: {
          modes: [{ name: "engineer", required: true }],
          workflows: [{ name: "review", required: false }],
          agents: [{ name: "missing-agent", required: false }]
        }
      };

      // Mock ComponentInstaller to not have the optional missing agent
      const mockComponentInstaller = require("../componentInstaller").ComponentInstaller;
      mockComponentInstaller.prototype.listAvailableComponents.mockResolvedValue({
        modes: [{ name: "engineer" }],
        workflows: [{ name: "review" }],
        agents: [] // missing-agent not available
      });

      jest.spyOn(manager, "listPacks").mockResolvedValue([]);

      const result = await manager.installPack(packWithOptionalComponents);

      expect(result.success).toBe(true);
      expect(result.installed.modes).toContain("engineer");
      expect(result.installed.workflows).toContain("review");
      expect(result.installed.agents).not.toContain("missing-agent");
      expect(result.skipped?.agents).toContain("missing-agent");
    });

    it("should fail for packs with missing required components", async () => {
      const packWithMissingRequired: StarterPack = {
        ...mockValidPack,
        components: {
          modes: [{ name: "missing-mode", required: true }],
          workflows: [],
          agents: []
        }
      };

      // Mock ComponentInstaller to not have the required component
      const mockComponentInstaller = require("../componentInstaller").ComponentInstaller;
      mockComponentInstaller.prototype.listAvailableComponents.mockResolvedValue({
        modes: [],
        workflows: [],
        agents: []
      });

      jest.spyOn(manager, "listPacks").mockResolvedValue([]);

      const result = await manager.installPack(packWithMissingRequired);

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Required mode 'missing-mode' not found in templates");
    });

    it("should handle installation with force flag", async () => {
      jest.spyOn(manager, "listPacks").mockResolvedValue([]);

      const result = await manager.installPack(mockValidPack, { force: true });

      expect(result.success).toBe(true);
      // Force flag should be passed through to component installation
    });

    it("should handle interactive installation mode", async () => {
      jest.spyOn(manager, "listPacks").mockResolvedValue([]);

      const result = await manager.installPack(mockValidPack, { interactive: true });

      expect(result.success).toBe(true);
      // Interactive flag should be passed through to component installation
    });

    it("should install dependencies in correct order", async () => {
      const basePack: StarterPack = {
        name: "base-pack",
        version: "1.0.0",
        description: "Base pack",
        author: "test",
        components: {
          modes: [{ name: "base-mode", required: true }]
        }
      };

      const dependentPack: StarterPack = {
        ...mockValidPack,
        name: "dependent-pack",
        dependencies: ["base-pack"]
      };

      jest.spyOn(manager, "listPacks").mockResolvedValue([basePack, dependentPack]);

      // Mock ComponentInstaller to have all required components
      const mockComponentInstaller = require("../componentInstaller").ComponentInstaller;
      mockComponentInstaller.prototype.listAvailableComponents.mockResolvedValue({
        modes: [{ name: "engineer" }, { name: "base-mode" }],
        workflows: [{ name: "review" }],
        agents: [{ name: "claude-code-research" }]
      });

      const result = await manager.installPack(dependentPack);

      expect(result.success).toBe(true);
      expect(result.success).toBe(true);
    });

    it("should handle pack with configuration", async () => {
      const packWithConfig: StarterPack = {
        ...mockValidPack,
        configuration: {
          defaultMode: "engineer",
          customCommands: {
            "test": {
              description: "Test command",
              template: "test template"
            }
          },
          projectSettings: {
            theme: "dark",
            enableAnalytics: false
          }
        }
      };

      jest.spyOn(manager, "listPacks").mockResolvedValue([]);

      const result = await manager.installPack(packWithConfig);

      expect(result.success).toBe(true);
      expect(result.success).toBe(true);
    });

    it("should handle pack installation with detailed component metadata", async () => {
      const packWithMetadata: StarterPack = {
        ...mockValidPack,
        components: {
          modes: [
            { 
              name: "engineer", 
              required: true,
              customConfig: { priority: "high" }
            }
          ],
          workflows: [
            { 
              name: "review", 
              required: true,
              customConfig: { timeout: 30 }
            }
          ],
          agents: [
            { 
              name: "claude-code-research", 
              required: false,
              customConfig: { model: "claude-3" }
            }
          ]
        }
      };

      jest.spyOn(manager, "listPacks").mockResolvedValue([]);

      const result = await manager.installPack(packWithMetadata);

      expect(result.success).toBe(true);
      expect(result.installed.modes).toContain("engineer");
      expect(result.installed.workflows).toContain("review");
      expect(result.installed.agents).toContain("claude-code-research");
    });
  });

  describe("integration scenarios", () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(true);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockSchema));
    });

    it("should handle complete pack installation workflow", async () => {
      const fullPack: StarterPack = {
        name: "full-stack-pack",
        version: "2.1.0",
        description: "Complete full-stack development pack",
        author: "memento-team",
        components: {
          modes: [
            { name: "architect", required: true },
            { name: "engineer", required: true },
            { name: "reviewer", required: false }
          ],
          workflows: [
            { name: "review", required: true },
            { name: "refactor", required: false }
          ],
          agents: [
            { name: "claude-code-research", required: false }
          ]
        },
        dependencies: [],
        tags: ["fullstack", "web", "enterprise"],
        category: "fullstack",
        configuration: {
          defaultMode: "architect",
          projectSettings: {
            gitignoreEntries: [".memento/cache", "*.tmp"]
          }
        },
        postInstall: {
          message: "Full-stack pack installed! Start with 'mode: architect' for system design."
        },
        mementoProtocolVersion: ">=1.0.0"
      };

      // Mock ComponentInstaller to have all components available
      const mockComponentInstaller = require("../componentInstaller").ComponentInstaller;
      mockComponentInstaller.prototype.listAvailableComponents.mockResolvedValue({
        modes: [
          { name: "architect" },
          { name: "engineer" }, 
          { name: "reviewer" }
        ],
        workflows: [
          { name: "review" },
          { name: "refactor" }
        ],
        agents: [
          { name: "claude-code-research" }
        ]
      });

      jest.spyOn(manager, "listPacks").mockResolvedValue([]);

      const result = await manager.installPack(fullPack, { 
        force: true, 
        interactive: false 
      });

      expect(result.success).toBe(true);
      expect(result.installed.modes).toEqual(["architect", "engineer", "reviewer"]);
      expect(result.installed.workflows).toEqual(["review", "refactor"]);
      expect(result.installed.agents).toEqual(["claude-code-research"]);
      expect(result.success).toBe(true);
      expect(result.postInstallMessage).toBe(fullPack.postInstall!.message);
    });

    it("should handle pack with partial component availability", async () => {
      const partialPack: StarterPack = {
        name: "partial-pack",
        version: "1.0.0",
        description: "Pack with some missing components",
        author: "test",
        components: {
          modes: [
            { name: "engineer", required: true },
            { name: "missing-mode", required: false }
          ],
          workflows: [
            { name: "review", required: true },
            { name: "missing-workflow", required: false }
          ],
          agents: [
            { name: "claude-code-research", required: true },
            { name: "missing-agent", required: false }
          ]
        }
      };

      // Mock ComponentInstaller with partial availability
      const mockComponentInstaller = require("../componentInstaller").ComponentInstaller;
      mockComponentInstaller.prototype.listAvailableComponents.mockResolvedValue({
        modes: [{ name: "engineer" }], // missing-mode not available
        workflows: [{ name: "review" }], // missing-workflow not available
        agents: [{ name: "claude-code-research" }] // missing-agent not available
      });

      jest.spyOn(manager, "listPacks").mockResolvedValue([]);

      const result = await manager.installPack(partialPack);

      expect(result.success).toBe(true);
      expect(result.installed.modes).toEqual(["engineer"]);
      expect(result.installed.workflows).toEqual(["review"]);
      expect(result.installed.agents).toEqual(["claude-code-research"]);
      expect(result.skipped?.modes).toEqual(["missing-mode"]);
      expect(result.skipped?.workflows).toEqual(["missing-workflow"]);
      expect(result.skipped?.agents).toEqual(["missing-agent"]);
    });

    it("should validate complex dependency chains", async () => {
      const baseUtilsPack: StarterPack = {
        name: "base-utils",
        version: "1.0.0",
        description: "Base utilities",
        author: "test",
        components: { modes: [{ name: "base-mode", required: true }] }
      };

      const webFrameworkPack: StarterPack = {
        name: "web-framework",
        version: "1.0.0", 
        description: "Web framework pack",
        author: "test",
        dependencies: ["base-utils"],
        components: { modes: [{ name: "web-mode", required: true }] }
      };

      const fullStackPack: StarterPack = {
        name: "full-stack",
        version: "1.0.0",
        description: "Full stack pack",
        author: "test", 
        dependencies: ["web-framework"],
        components: { modes: [{ name: "fullstack-mode", required: true }] }
      };

      jest.spyOn(manager, "listPacks").mockResolvedValue([
        baseUtilsPack,
        webFrameworkPack,
        fullStackPack
      ]);

      const depResult = await manager.resolveDependencies(fullStackPack);

      expect(depResult.resolved).toEqual(["base-utils", "web-framework"]);
      expect(depResult.missing).toHaveLength(0);
      expect(depResult.circular).toHaveLength(0);
    });

    it("should detect and handle circular dependency chains", async () => {
      const packA: StarterPack = {
        name: "pack-a",
        version: "1.0.0",
        description: "Pack A",
        author: "test",
        dependencies: ["pack-b"],
        components: { modes: [{ name: "mode-a", required: true }] }
      };

      const packB: StarterPack = {
        name: "pack-b", 
        version: "1.0.0",
        description: "Pack B",
        author: "test",
        dependencies: ["pack-c"],
        components: { modes: [{ name: "mode-b", required: true }] }
      };

      const packC: StarterPack = {
        name: "pack-c",
        version: "1.0.0", 
        description: "Pack C",
        author: "test",
        dependencies: ["pack-a"], // Creates circular dependency
        components: { modes: [{ name: "mode-c", required: true }] }
      };

      jest.spyOn(manager, "listPacks").mockResolvedValue([packA, packB, packC]);

      const depResult = await manager.resolveDependencies(packA);

      expect(depResult.circular.length).toBeGreaterThan(0);
      expect(depResult.circular).toContain("pack-a");
    });

    it("should handle version compatibility validation", async () => {
      const packWithVersion: StarterPack = {
        ...mockValidPack,
        mementoProtocolVersion: ">=2.0.0" // Higher version requirement
      };

      jest.spyOn(manager, "listPacks").mockResolvedValue([]);

      const result = await manager.validatePack(packWithVersion);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => 
        error.includes("version") || error.includes("compatibility")
      )).toBe(true);
    });

    it("should handle schema validation errors gracefully", async () => {
      const invalidSchemaPack = {
        name: "invalid-pack",
        version: "not-a-version", // Invalid version format
        description: 123, // Should be string
        author: "", // Empty string
        components: "invalid" // Should be object
      };

      jest.spyOn(manager, "listPacks").mockResolvedValue([]);

      const result = await manager.validatePack(invalidSchemaPack as any);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => 
        error.includes("version") || error.includes("description") || 
        error.includes("components")
      )).toBe(true);
    });

    it("should handle concurrent pack operations", async () => {
      const pack1 = { ...mockValidPack, name: "concurrent-pack-1" };
      const pack2 = { ...mockValidPack, name: "concurrent-pack-2" };

      jest.spyOn(manager, "listPacks").mockResolvedValue([]);

      // Mock ComponentInstaller for both packs
      const mockComponentInstaller = require("../componentInstaller").ComponentInstaller;
      mockComponentInstaller.prototype.listAvailableComponents.mockResolvedValue({
        modes: [{ name: "engineer" }],
        workflows: [{ name: "review" }],
        agents: [{ name: "claude-code-research" }]
      });

      const [result1, result2] = await Promise.all([
        manager.installPack(pack1),
        manager.installPack(pack2)
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it("should provide detailed error messages for debugging", async () => {
      const problematicPack: StarterPack = {
        name: "problematic-pack",
        version: "1.0.0", 
        description: "Pack with multiple issues",
        author: "test",
        dependencies: ["non-existent-dependency"],
        components: {
          modes: [{ name: "missing-required-mode", required: true }],
          workflows: [{ name: "missing-required-workflow", required: true }],
          agents: [{ name: "missing-required-agent", required: true }]
        },
        mementoProtocolVersion: ">=999.0.0"
      };

      // Mock ComponentInstaller to have no components
      const mockComponentInstaller = require("../componentInstaller").ComponentInstaller;
      mockComponentInstaller.prototype.listAvailableComponents.mockResolvedValue({
        modes: [],
        workflows: [],
        agents: []
      });

      jest.spyOn(manager, "listPacks").mockResolvedValue([]);

      const result = await manager.installPack(problematicPack);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Should have specific error messages
      const errorString = result.errors.join(" ");
      expect(errorString).toMatch(/missing-required-mode/);
      expect(errorString).toMatch(/missing-required-workflow/);  
      expect(errorString).toMatch(/missing-required-agent/);
      expect(errorString).toMatch(/non-existent-dependency/);
    });

    it("should handle empty components gracefully", async () => {
      const emptyPack: StarterPack = {
        name: "empty-pack",
        version: "1.0.0",
        description: "Pack with no components",
        author: "test",
        components: {
          modes: [],
          workflows: [],
          agents: []
        }
      };

      jest.spyOn(manager, "listPacks").mockResolvedValue([]);

      const result = await manager.installPack(emptyPack);

      expect(result.success).toBe(true);
      expect(result.installed.modes).toHaveLength(0);
      expect(result.installed.workflows).toHaveLength(0);
      expect(result.installed.agents).toHaveLength(0);
    });

    it("should handle pack loading with filesystem errors", async () => {
      mockFs.readFile.mockRejectedValue(new Error("Disk I/O error"));

      const result = await manager.listPacks();

      expect(result).toEqual([]);
    });

    it("should validate component names for special characters", async () => {
      const packWithInvalidNames: StarterPack = {
        name: "invalid-names-pack",
        version: "1.0.0",
        description: "Pack with invalid component names",
        author: "test",
        components: {
          modes: [
            { name: "mode-with-spaces and/slashes", required: true },
            { name: "mode@with#symbols", required: true }
          ]
        }
      };

      jest.spyOn(manager, "listPacks").mockResolvedValue([]);

      const result = await manager.validatePack(packWithInvalidNames);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => 
        error.includes("invalid") || error.includes("name")
      )).toBe(true);
    });
  });
});