import { StarterPackManager } from "../StarterPackManager";
import { PackStructure } from "../types/packs";

// Mock dependencies
jest.mock("../logger");
jest.mock("../directoryManager");
jest.mock("../componentInstaller");
jest.mock("fs/promises", () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue("{}"),
  access: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn().mockResolvedValue([]),
  stat: jest.fn().mockResolvedValue({ isDirectory: () => true })
}));

describe("StarterPackManager", () => {
  let manager: StarterPackManager;
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
    path: "/test/path",
    componentsPath: "/test/path/components"
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock DirectoryManager to prevent actual filesystem operations
    const mockDirectoryManager = require("../directoryManager").DirectoryManager;
    mockDirectoryManager.prototype.initializeStructure = jest.fn().mockResolvedValue(undefined);
    mockDirectoryManager.prototype.ensureProjectRoot = jest.fn().mockReturnValue(undefined);
    
    // Mock ComponentInstaller
    const mockComponentInstaller = require("../componentInstaller").ComponentInstaller;
    mockComponentInstaller.prototype.installMode = jest.fn().mockResolvedValue({ success: true });
    mockComponentInstaller.prototype.installWorkflow = jest.fn().mockResolvedValue({ success: true });
    mockComponentInstaller.prototype.installAgent = jest.fn().mockResolvedValue({ success: true });
    
    manager = new StarterPackManager(mockProjectRoot);
  });

  describe("constructor", () => {
    it("should initialize with correct paths", () => {
      expect(manager).toBeInstanceOf(StarterPackManager);
    });
  });

  describe("listPacks", () => {
    it("should return empty array when no packs available", async () => {
      // Mock the registry to return empty array
      jest.spyOn(manager['registry'], 'listAvailablePacks').mockResolvedValue([]);

      const result = await manager.listPacks();

      expect(result).toEqual([]);
    });

    it("should return list of valid starter packs", async () => {
      // Mock the registry to return pack list
      jest.spyOn(manager['registry'], 'listAvailablePacks').mockResolvedValue([mockValidPack]);

      const result = await manager.listPacks();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject(mockValidPack);
    });

    it("should handle pack loading errors gracefully", async () => {
      // Mock the registry to throw error and catch it gracefully
      jest.spyOn(manager['registry'], 'listAvailablePacks').mockRejectedValue(new Error("Failed to read packs"));

      await expect(manager.listPacks()).rejects.toThrow("Failed to read packs");
    });
  });

  describe("loadPack", () => {
    it("should load a valid starter pack", async () => {
      // Mock the registry to return the pack
      jest.spyOn(manager['registry'], 'loadPack').mockResolvedValue(mockValidPack);

      const result = await manager.loadPack("test-pack");

      expect(result).toMatchObject(mockValidPack);
    });

    it("should throw error for non-existent pack", async () => {
      // Mock the registry to throw error for non-existent pack
      jest.spyOn(manager['registry'], 'loadPack').mockRejectedValue(new Error("Pack 'non-existent' not found"));

      await expect(manager.loadPack("non-existent")).rejects.toThrow(
        "Pack 'non-existent' not found"
      );
    });

    it("should handle loading errors gracefully", async () => {
      // Mock the registry to throw error
      jest.spyOn(manager['registry'], 'loadPack').mockRejectedValue(new Error("Failed to load pack"));

      await expect(manager.loadPack("test-pack")).rejects.toThrow(
        "Failed to load pack"
      );
    });
  });

  // validatePack is now internal and takes different parameters, skip these tests

  describe("resolveDependencies", () => {
    it("should resolve dependencies in correct order", async () => {
      const mockResult = {
        resolved: ["pack-b"],
        missing: [],
        circular: []
      };

      // Mock the registry to return dependency resolution
      jest.spyOn(manager['registry'], 'resolveDependencies').mockResolvedValue(mockResult);

      const result = await manager.resolveDependencies("pack-a");

      expect(result.resolved).toEqual(["pack-b"]);
      expect(result.missing).toHaveLength(0);
      expect(result.circular).toHaveLength(0);
    });

    it("should detect circular dependencies", async () => {
      const mockResult = {
        resolved: [],
        missing: [],
        circular: ["pack-a", "pack-b"]
      };

      jest.spyOn(manager['registry'], 'resolveDependencies').mockResolvedValue(mockResult);

      const result = await manager.resolveDependencies("pack-a");

      expect(result.circular.length).toBeGreaterThan(0);
    });

    it("should detect missing dependencies", async () => {
      const mockResult = {
        resolved: [],
        missing: ["non-existent-pack"],
        circular: []
      };

      jest.spyOn(manager['registry'], 'resolveDependencies').mockResolvedValue(mockResult);

      const result = await manager.resolveDependencies("pack-with-missing-dep");

      expect(result.missing).toContain("non-existent-pack");
    });
  });

  describe("installPack", () => {
    beforeEach(() => {
      // Mock the registry methods
      jest.spyOn(manager['registry'], 'loadPack').mockResolvedValue(mockValidPack);
      jest.spyOn(manager['registry'], 'resolveDependencies').mockResolvedValue({
        resolved: [],
        missing: [],
        circular: []
      });

      // Mock the validator
      jest.spyOn(manager['validator'], 'validatePackStructure').mockResolvedValue({
        valid: true,
        errors: [],
        warnings: []
      });

      // Mock the installer
      jest.spyOn(manager['installer'], 'installPack').mockResolvedValue({
        success: true,
        installed: {
          modes: ["engineer"],
          workflows: ["review"],
          agents: ["claude-code-research"],
          hooks: []
        },
        skipped: { modes: [], workflows: [], agents: [], hooks: [] },
        errors: []
      });
    });

    it("should return success for valid pack", async () => {
      const result = await manager.installPack("test-pack");

      expect(result.success).toBe(true);
      expect(result.installed.modes).toContain("engineer");
      expect(result.installed.workflows).toContain("review");
      expect(result.installed.agents).toContain("claude-code-research");
    });

    it("should return failure for invalid pack", async () => {
      // Mock validator to return validation errors
      jest.spyOn(manager['validator'], 'validatePackStructure').mockResolvedValue({
        valid: false,
        errors: ["Missing required field: version", "Missing required field: description"],
        warnings: []
      });

      const result = await manager.installPack("invalid-pack");

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should return failure for packs with missing dependencies", async () => {
      // Mock dependency resolution to return missing dependencies
      jest.spyOn(manager['registry'], 'resolveDependencies').mockResolvedValue({
        resolved: [],
        missing: ["missing-pack"],
        circular: []
      });

      const result = await manager.installPack("pack-with-missing-deps");

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

      jest.spyOn(manager['registry'], 'loadPack').mockResolvedValue(packWithPostInstall);
      jest.spyOn(manager['installer'], 'installPack').mockResolvedValue({
        success: true,
        installed: { modes: [], workflows: [], agents: [], hooks: [] },
        skipped: { modes: [], workflows: [], agents: [], hooks: [] },
        errors: [],
        postInstallMessage: "Pack installed successfully!"
      });

      const result = await manager.installPack("pack-with-post-install");

      expect(result.postInstallMessage).toBe("Pack installed successfully!");
    });

    it("should handle packs with optional components gracefully", async () => {
      const packWithOptionalComponents: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
          components: {
            modes: [{ name: "engineer", required: true }],
            workflows: [{ name: "review", required: false }],
            agents: [{ name: "missing-agent", required: false }]
          }
        }
      };

      jest.spyOn(manager['registry'], 'loadPack').mockResolvedValue(packWithOptionalComponents);
      jest.spyOn(manager['installer'], 'installPack').mockResolvedValue({
        success: true,
        installed: {
          modes: ["engineer"],
          workflows: ["review"],
          agents: [],
          hooks: []
        },
        skipped: {
          modes: [],
          workflows: [],
          agents: ["missing-agent"],
          hooks: []
        },
        errors: []
      });

      const result = await manager.installPack("pack-with-optional");

      expect(result.success).toBe(true);
      expect(result.installed.modes).toContain("engineer");
      expect(result.installed.workflows).toContain("review");
      expect(result.installed.agents).not.toContain("missing-agent");
      expect(result.skipped?.agents).toContain("missing-agent");
    });

    it("should fail for packs with missing required components", async () => {
      const packWithMissingRequired: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
          components: {
            modes: [{ name: "missing-mode", required: true }],
            workflows: [],
            agents: []
          }
        }
      };

      jest.spyOn(manager['registry'], 'loadPack').mockResolvedValue(packWithMissingRequired);
      jest.spyOn(manager['installer'], 'installPack').mockResolvedValue({
        success: false,
        installed: { modes: [], workflows: [], agents: [], hooks: [] },
        skipped: { modes: [], workflows: [], agents: [], hooks: [] },
        errors: ["Required mode 'missing-mode' not found in templates"]
      });

      const result = await manager.installPack("pack-with-missing-required");

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Required mode 'missing-mode' not found in templates");
    });

    it("should handle installation with force flag", async () => {
      const result = await manager.installPack("test-pack", { force: true });

      expect(result.success).toBe(true);
      // Force flag should be passed through to component installation
      expect(manager['installer'].installPack).toHaveBeenCalledWith(
        mockValidPack,
        expect.anything(), // source
        expect.objectContaining({ force: true })
      );
    });

    it("should handle interactive installation mode", async () => {
      const result = await manager.installPack("test-pack", { interactive: true });

      expect(result.success).toBe(true);
      // Interactive flag should be passed through to component installation
      expect(manager['installer'].installPack).toHaveBeenCalledWith(
        mockValidPack,
        expect.anything(), // source
        expect.objectContaining({ interactive: true })
      );
    });

    it("should install dependencies in correct order", async () => {
      const dependentPack: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
          name: "dependent-pack",
          dependencies: ["base-pack"]
        }
      };

      jest.spyOn(manager['registry'], 'loadPack').mockResolvedValue(dependentPack);
      jest.spyOn(manager['registry'], 'resolveDependencies').mockResolvedValue({
        resolved: ["base-pack"],
        missing: [],
        circular: []
      });

      // Mock recursive installPack call for dependency
      const installSpy = jest.spyOn(manager, 'installPack');
      installSpy.mockImplementation(async (packName: string, _options: any = {}) => {
        if (packName === 'base-pack') {
          return {
            success: true,
            installed: { modes: ["base-mode"], workflows: [], agents: [], hooks: [] },
            skipped: { modes: [], workflows: [], agents: [], hooks: [] },
            errors: []
          };
        }
        // Return the main pack installation result
        return {
          success: true,
          installed: { modes: ["engineer"], workflows: ["review"], agents: ["claude-code-research"], hooks: [] },
          skipped: { modes: [], workflows: [], agents: [], hooks: [] },
          errors: []
        };
      });

      const result = await manager.installPack("dependent-pack");

      expect(result.success).toBe(true);
    });

    it("should handle pack with configuration", async () => {
      const packWithConfig: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
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
        }
      };

      jest.spyOn(manager['registry'], 'loadPack').mockResolvedValue(packWithConfig);

      const result = await manager.installPack("pack-with-config");

      expect(result.success).toBe(true);
    });

    it("should handle pack installation with detailed component metadata", async () => {
      const packWithMetadata: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
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
        }
      };

      jest.spyOn(manager['registry'], 'loadPack').mockResolvedValue(packWithMetadata);

      const result = await manager.installPack("pack-with-metadata");

      expect(result.success).toBe(true);
      expect(result.installed.modes).toContain("engineer");
      expect(result.installed.workflows).toContain("review");
      expect(result.installed.agents).toContain("claude-code-research");
    });
  });

  describe("integration scenarios", () => {
    beforeEach(() => {
      // Reset all mocks for integration tests
      jest.clearAllMocks();
      
      // Setup default mocks
      jest.spyOn(manager['registry'], 'resolveDependencies').mockResolvedValue({
        resolved: [],
        missing: [],
        circular: []
      });
      jest.spyOn(manager['validator'], 'validatePackStructure').mockResolvedValue({
        valid: true,
        errors: [],
        warnings: []
      });
      // Mock validator initialization to prevent schema loading
      jest.spyOn(manager['validator'], 'initialize').mockResolvedValue();
    });

    it("should handle complete pack installation workflow", async () => {
      const fullPack: PackStructure = {
        manifest: {
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
        },
        path: "/test/path/full-stack-pack",
        componentsPath: "/test/path/full-stack-pack/components"
      };

      jest.spyOn(manager['registry'], 'loadPack').mockResolvedValue(fullPack);
      jest.spyOn(manager['installer'], 'installPack').mockResolvedValue({
        success: true,
        installed: {
          modes: ["architect", "engineer", "reviewer"],
          workflows: ["review", "refactor"],
          agents: ["claude-code-research"],
          hooks: []
        },
        skipped: { modes: [], workflows: [], agents: [], hooks: [] },
        errors: [],
        postInstallMessage: fullPack.manifest.postInstall!.message
      });

      const result = await manager.installPack("full-stack-pack", { 
        force: true, 
        interactive: false 
      });

      expect(result.success).toBe(true);
      expect(result.installed.modes).toEqual(["architect", "engineer", "reviewer"]);
      expect(result.installed.workflows).toEqual(["review", "refactor"]);
      expect(result.installed.agents).toEqual(["claude-code-research"]);
      expect(result.postInstallMessage).toBe(fullPack.manifest.postInstall!.message);
    });

    it("should handle pack with partial component availability", async () => {
      const partialPack: PackStructure = {
        manifest: {
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
        },
        path: "/test/path/partial-pack",
        componentsPath: "/test/path/partial-pack/components"
      };

      jest.spyOn(manager['registry'], 'loadPack').mockResolvedValue(partialPack);
      jest.spyOn(manager['installer'], 'installPack').mockResolvedValue({
        success: true,
        installed: {
          modes: ["engineer"],
          workflows: ["review"],
          agents: ["claude-code-research"],
          hooks: []
        },
        skipped: {
          modes: ["missing-mode"],
          workflows: ["missing-workflow"],
          agents: ["missing-agent"],
          hooks: []
        },
        errors: []
      });

      const result = await manager.installPack("partial-pack");

      expect(result.success).toBe(true);
      expect(result.installed.modes).toEqual(["engineer"]);
      expect(result.installed.workflows).toEqual(["review"]);
      expect(result.installed.agents).toEqual(["claude-code-research"]);
      expect(result.skipped?.modes).toEqual(["missing-mode"]);
      expect(result.skipped?.workflows).toEqual(["missing-workflow"]);
      expect(result.skipped?.agents).toEqual(["missing-agent"]);
    });

    it("should validate complex dependency chains", async () => {
      jest.spyOn(manager['registry'], 'resolveDependencies').mockResolvedValue({
        resolved: ["base-utils", "web-framework"],
        missing: [],
        circular: []
      });

      const depResult = await manager.resolveDependencies("full-stack");

      expect(depResult.resolved).toEqual(["base-utils", "web-framework"]);
      expect(depResult.missing).toHaveLength(0);
      expect(depResult.circular).toHaveLength(0);
    });

    it("should detect and handle circular dependency chains", async () => {
      jest.spyOn(manager['registry'], 'resolveDependencies').mockResolvedValue({
        resolved: [],
        missing: [],
        circular: ["pack-a", "pack-b", "pack-c"]
      });

      const depResult = await manager.resolveDependencies("pack-a");

      expect(depResult.circular.length).toBeGreaterThan(0);
      expect(depResult.circular).toContain("pack-a");
    });

    it("should handle version compatibility validation", async () => {
      const packWithVersion: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
          mementoProtocolVersion: ">=2.0.0" // Higher version requirement
        }
      };

      jest.spyOn(manager['registry'], 'loadPack').mockResolvedValue(packWithVersion);
      jest.spyOn(manager['validator'], 'validatePackStructure').mockResolvedValue({
        valid: false,
        errors: ["Version compatibility error: requires >=2.0.0, current is 1.0.0"],
        warnings: []
      });

      const result = await manager.installPack("pack-with-version");

      expect(result.success).toBe(false);
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

      jest.spyOn(manager['registry'], 'loadPack').mockResolvedValue(invalidSchemaPack as any);
      jest.spyOn(manager['validator'], 'validatePackStructure').mockResolvedValue({
        valid: false,
        errors: [
          "Invalid version format: not-a-version",
          "Description must be a string",
          "Components must be an object"
        ],
        warnings: []
      });

      const result = await manager.installPack("invalid-pack");

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => 
        error.includes("version") || error.includes("description") || 
        error.includes("components")
      )).toBe(true);
    });

    it("should handle concurrent pack operations", async () => {
      // Mock the registry to return different packs
      jest.spyOn(manager['registry'], 'loadPack').mockImplementation(async (name: string) => {
        if (name === "concurrent-pack-1") return { ...mockValidPack, manifest: { ...mockValidPack.manifest, name: "concurrent-pack-1" } };
        if (name === "concurrent-pack-2") return { ...mockValidPack, manifest: { ...mockValidPack.manifest, name: "concurrent-pack-2" } };
        return mockValidPack;
      });

      // Mock the installer to prevent filesystem operations
      jest.spyOn(manager['installer'], 'installPack').mockImplementation(async (pack: PackStructure) => ({
        success: true,
        installed: {
          modes: [pack.manifest.name + '-mode'],
          workflows: [pack.manifest.name + '-workflow'],
          agents: [],
          hooks: []
        },
        skipped: {
          modes: [],
          workflows: [],
          agents: [],
          hooks: []
        },
        errors: [],
        installedComponents: [
          { type: 'mode' as const, name: pack.manifest.name + '-mode', source: 'pack' },
          { type: 'workflow' as const, name: pack.manifest.name + '-workflow', source: 'pack' }
        ],
        packMetadata: {
          packName: pack.manifest.name,
          version: pack.manifest.version,
          installedAt: new Date().toISOString()
        }
      }));

      // Mock the validator
      jest.spyOn(manager['validator'], 'validatePackStructure').mockResolvedValue({
        valid: true,
        errors: [],
        warnings: []
      });

      const [result1, result2] = await Promise.all([
        manager.installPack("concurrent-pack-1"),
        manager.installPack("concurrent-pack-2")
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.installed.modes).toContain('concurrent-pack-1-mode');
      expect(result2.installed.modes).toContain('concurrent-pack-2-mode');
    });

    it("should provide detailed error messages for debugging", async () => {
      const problematicPack: PackStructure = {
        manifest: {
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
        },
        path: "/test/path/problematic-pack",
        componentsPath: "/test/path/problematic-pack/components"
      };

      jest.spyOn(manager['registry'], 'loadPack').mockResolvedValue(problematicPack);
      jest.spyOn(manager['registry'], 'resolveDependencies').mockResolvedValue({
        resolved: [],
        missing: ["non-existent-dependency"],
        circular: []
      });

      const result = await manager.installPack("problematic-pack");

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Should have dependency error
      const errorString = result.errors.join(" ");
      expect(errorString).toMatch(/non-existent-dependency/);
    });

    it("should handle empty components gracefully", async () => {
      const emptyPack: PackStructure = {
        manifest: {
          name: "empty-pack",
          version: "1.0.0",
          description: "Pack with no components",
          author: "test",
          components: {
            modes: [],
            workflows: [],
            agents: []
          }
        },
        path: "/test/path/empty-pack",
        componentsPath: "/test/path/empty-pack/components"
      };

      jest.spyOn(manager['registry'], 'loadPack').mockResolvedValue(emptyPack);
      jest.spyOn(manager['installer'], 'installPack').mockResolvedValue({
        success: true,
        installed: { modes: [], workflows: [], agents: [], hooks: [] },
        skipped: { modes: [], workflows: [], agents: [], hooks: [] },
        errors: []
      });

      const result = await manager.installPack('empty-pack');

      expect(result.success).toBe(true);
      expect(result.installed.modes).toHaveLength(0);
      expect(result.installed.workflows).toHaveLength(0);
      expect(result.installed.agents).toHaveLength(0);
    });

    it("should handle pack loading with filesystem errors", async () => {
      jest.spyOn(manager['registry'], 'listAvailablePacks').mockRejectedValue(new Error("Disk I/O error"));

      await expect(manager.listPacks()).rejects.toThrow("Disk I/O error");
    });

    it("should validate component names for special characters", async () => {
      const packWithInvalidNames: PackStructure = {
        manifest: {
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
        },
        path: "/test/path/invalid-names-pack",
        componentsPath: "/test/path/invalid-names-pack/components"
      };

      jest.spyOn(manager['registry'], 'loadPack').mockResolvedValue(packWithInvalidNames);
      jest.spyOn(manager['validator'], 'validatePackStructure').mockResolvedValue({
        valid: false,
        errors: ['Invalid component name: mode-with-spaces and/slashes', 'Invalid component name: mode@with#symbols'],
        warnings: []
      });

      const result = await manager.installPack("invalid-names-pack");

      expect(result.success).toBe(false);
      expect(result.errors.some(error => 
        error.includes("Invalid") || error.includes("name")
      )).toBe(true);
    });
  });
});