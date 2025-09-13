import { StarterPackManager } from "../StarterPackManager";
import { PackStructure } from "../types/packs";
import { createTestZccProject } from "../testing";
import { MemoryFileSystemAdapter } from "../adapters/MemoryFileSystemAdapter";
import { PackagePaths } from "../packagePaths";

// Mock dependencies that don't need filesystem
jest.mock("../logger");
jest.mock("../directoryManager");

describe("StarterPackManager", () => {
  let manager: StarterPackManager;
  let fs: MemoryFileSystemAdapter;
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
    path: "/test/path"
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Reset PackagePaths cache to ensure test environment detection works
    PackagePaths.reset();
    
    // Create test filesystem with project structure
    fs = await createTestZccProject(mockProjectRoot, {
      // Add sample pack templates (PackagePaths.getTemplatesDir() returns '/test/templates' in test env)
      '/test/templates/test-pack/manifest.json': JSON.stringify(mockValidPack.manifest),
      '/test/templates/test-pack/modes/engineer.md': '# Engineer Mode\n\nYou are a software engineer.',
      '/test/templates/test-pack/workflows/review.md': '# Code Review Workflow\n\nReview code systematically.',
      '/test/templates/test-pack/agents/claude-code-research.md': '# Research Agent\n\nSpecialized in research tasks.',
      '/test/templates/schema.json': JSON.stringify({ 
        type: 'object',
        properties: {
          name: { type: 'string', pattern: '^[a-z0-9-]+$' },
          version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
          description: { type: 'string', minLength: 1, maxLength: 500 },
          author: { type: 'string', minLength: 1 },
          components: { 
            type: 'object',
            properties: {
              modes: { type: 'array' },
              workflows: { type: 'array' },
              agents: { type: 'array' },
              hooks: { type: 'array' }
            }
          },
          tags: { type: 'array' },
          category: { type: 'string' },
          dependencies: { type: 'array' },
          configuration: { type: 'object' },
          postInstall: { type: 'object' }
        },
        required: ['name', 'version', 'description', 'author', 'components'],
        additionalProperties: true
      })
    });
    
    // Mock DirectoryManager to prevent actual filesystem operations
    const mockDirectoryManager = require("../directoryManager").DirectoryManager;
    mockDirectoryManager.prototype.initializeStructure = jest.fn().mockResolvedValue(undefined);
    mockDirectoryManager.prototype.ensureProjectRoot = jest.fn().mockReturnValue(undefined);

    manager = new StarterPackManager(mockProjectRoot, fs);
  });

  describe("constructor", () => {
    it("should initialize with correct paths", () => {
      expect(manager).toBeInstanceOf(StarterPackManager);
    });
  });

  describe("listPacks", () => {
    it("should return list of valid starter packs from filesystem", async () => {
      const result = await manager.listPacks();

      expect(result).toHaveLength(1);
      expect(result[0].manifest.name).toBe("test-pack");
      expect(result[0].manifest.version).toBe("1.0.0");
    });

    it("should return empty array when no packs available", async () => {
      // Create manager with filesystem that has no packs
      const emptyFs = await createTestZccProject(mockProjectRoot, {
        '/test/templates/schema.json': JSON.stringify({ 
          type: 'object',
          properties: {
            name: { type: 'string', pattern: '^[a-z0-9-]+$' },
            version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
            description: { type: 'string', minLength: 1, maxLength: 500 },
            author: { type: 'string', minLength: 1 },
            components: { type: 'object' }
          },
          required: ['name', 'version', 'description', 'author', 'components'],
          additionalProperties: true
        })
      });
      const emptyManager = new StarterPackManager(mockProjectRoot, emptyFs);

      const result = await emptyManager.listPacks();

      expect(result).toEqual([]);
    });
  });

  describe("loadPack", () => {
    it("should load a valid starter pack from filesystem", async () => {
      const result = await manager.loadPack("test-pack");

      expect(result.manifest.name).toBe("test-pack");
      expect(result.manifest.version).toBe("1.0.0");
      expect(result.manifest.description).toBe("Test starter pack");
      expect(result.manifest.components.modes).toHaveLength(1);
      expect(result.manifest.components.modes?.[0].name).toBe("engineer");
    });

    it("should throw error for non-existent pack", async () => {
      await expect(manager.loadPack("non-existent")).rejects.toThrow(
        "Pack 'non-existent' not found"
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

    it("should install dependencies in correct order with queue-based approach", async () => {
      const dependentPack: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
          name: "dependent-pack",
          dependencies: ["base-pack"]
        }
      };

      const basePack: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
          name: "base-pack"
        }
      };

      // Mock registry methods
      jest.spyOn(manager['registry'], 'loadPack').mockImplementation(async (name: string) => {
        if (name === 'dependent-pack') return dependentPack;
        if (name === 'base-pack') return basePack;
        return mockValidPack;
      });

      jest.spyOn(manager['registry'], 'resolveDependencies').mockImplementation(async (name: string) => {
        if (name === 'dependent-pack') {
          return { resolved: ["base-pack"], missing: [], circular: [] };
        }
        return { resolved: [], missing: [], circular: [] };
      });

      // Mock installer to track installation order
      const installationOrder: string[] = [];
      jest.spyOn(manager['installer'], 'installPack').mockImplementation(async (packStructure: PackStructure) => {
        installationOrder.push(packStructure.manifest.name);
        return {
          success: true,
          installed: { modes: [packStructure.manifest.name + '-mode'], workflows: [], agents: [], hooks: [] },
          skipped: { modes: [], workflows: [], agents: [], hooks: [] },
          errors: []
        };
      });

      const result = await manager.installPack("dependent-pack");

      expect(result.success).toBe(true);
      // Dependencies should be installed before the main pack
      expect(installationOrder).toEqual(["base-pack", "dependent-pack"]);
    });

    it("should handle deep dependency chains without stack overflow", async () => {
      // Create a chain: pack-a -> pack-b -> pack-c -> pack-d -> pack-e
      const createChainPack = (name: string, dependency?: string): PackStructure => ({
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
          name,
          dependencies: dependency ? [dependency] : []
        }
      });

      const packA = createChainPack("pack-a", "pack-b");
      const packB = createChainPack("pack-b", "pack-c");
      const packC = createChainPack("pack-c", "pack-d");
      const packD = createChainPack("pack-d", "pack-e");
      const packE = createChainPack("pack-e");

      // Mock registry methods
      jest.spyOn(manager['registry'], 'loadPack').mockImplementation(async (name: string) => {
        switch (name) {
          case 'pack-a': return packA;
          case 'pack-b': return packB;
          case 'pack-c': return packC;
          case 'pack-d': return packD;
          case 'pack-e': return packE;
          default: return mockValidPack;
        }
      });

      jest.spyOn(manager['registry'], 'resolveDependencies').mockImplementation(async (name: string) => {
        switch (name) {
          case 'pack-a': return { resolved: ["pack-b"], missing: [], circular: [] };
          case 'pack-b': return { resolved: ["pack-c"], missing: [], circular: [] };
          case 'pack-c': return { resolved: ["pack-d"], missing: [], circular: [] };
          case 'pack-d': return { resolved: ["pack-e"], missing: [], circular: [] };
          case 'pack-e': return { resolved: [], missing: [], circular: [] };
          default: return { resolved: [], missing: [], circular: [] };
        }
      });

      // Mock installer to track installation order
      const installationOrder: string[] = [];
      jest.spyOn(manager['installer'], 'installPack').mockImplementation(async (packStructure: PackStructure) => {
        installationOrder.push(packStructure.manifest.name);
        return {
          success: true,
          installed: { modes: [packStructure.manifest.name + '-mode'], workflows: [], agents: [], hooks: [] },
          skipped: { modes: [], workflows: [], agents: [], hooks: [] },
          errors: []
        };
      });

      const result = await manager.installPack("pack-a");

      expect(result.success).toBe(true);
      // Should install in reverse dependency order
      expect(installationOrder).toEqual(["pack-e", "pack-d", "pack-c", "pack-b", "pack-a"]);
    });

    it("should handle retry logic when installation fails", async () => {
      const unstablePack: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
          name: "unstable-pack"
        }
      };

      jest.spyOn(manager['registry'], 'loadPack').mockResolvedValue(unstablePack);
      jest.spyOn(manager['registry'], 'resolveDependencies').mockResolvedValue({
        resolved: [],
        missing: [],
        circular: []
      });

      // Mock installer to fail first 2 attempts, succeed on 3rd
      let attemptCount = 0;
      jest.spyOn(manager['installer'], 'installPack').mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          return {
            success: false,
            installed: { modes: [], workflows: [], agents: [], hooks: [] },
            skipped: { modes: [], workflows: [], agents: [], hooks: [] },
            errors: [`Installation attempt ${attemptCount} failed`]
          };
        }
        return {
          success: true,
          installed: { modes: ["unstable-mode"], workflows: [], agents: [], hooks: [] },
          skipped: { modes: [], workflows: [], agents: [], hooks: [] },
          errors: []
        };
      });

      const result = await manager.installPack("unstable-pack");

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3); // Should retry twice and succeed on third attempt
      expect(result.installed.modes).toContain("unstable-mode");
    });

    it("should fail after maximum retry attempts", async () => {
      const alwaysFailPack: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
          name: "always-fail-pack"
        }
      };

      jest.spyOn(manager['registry'], 'loadPack').mockResolvedValue(alwaysFailPack);
      jest.spyOn(manager['registry'], 'resolveDependencies').mockResolvedValue({
        resolved: [],
        missing: [],
        circular: []
      });

      // Mock installer to always fail
      let attemptCount = 0;
      jest.spyOn(manager['installer'], 'installPack').mockImplementation(async () => {
        attemptCount++;
        return {
          success: false,
          installed: { modes: [], workflows: [], agents: [], hooks: [] },
          skipped: { modes: [], workflows: [], agents: [], hooks: [] },
          errors: [`Installation attempt ${attemptCount} failed`]
        };
      });

      const result = await manager.installPack("always-fail-pack");

      expect(result.success).toBe(false);
      expect(attemptCount).toBe(4); // Should attempt 4 times (1 initial + 3 retries)
      expect(result.errors.some(error => error.includes("after 3 attempts"))).toBe(true);
    });

    it("should handle exception-based retry logic", async () => {
      const exceptionPack: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
          name: "exception-pack"
        }
      };

      jest.spyOn(manager['registry'], 'loadPack').mockResolvedValue(exceptionPack);
      jest.spyOn(manager['registry'], 'resolveDependencies').mockResolvedValue({
        resolved: [],
        missing: [],
        circular: []
      });

      // Mock installer to throw exceptions first 2 times, succeed on 3rd
      let attemptCount = 0;
      jest.spyOn(manager['installer'], 'installPack').mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`Installation exception on attempt ${attemptCount}`);
        }
        return {
          success: true,
          installed: { modes: ["exception-mode"], workflows: [], agents: [], hooks: [] },
          skipped: { modes: [], workflows: [], agents: [], hooks: [] },
          errors: []
        };
      });

      const result = await manager.installPack("exception-pack");

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
      expect(result.installed.modes).toContain("exception-mode");
    });

    it("should detect and handle circular dependencies properly", async () => {
      const packA: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
          name: "circular-pack-a",
          dependencies: ["circular-pack-b"]
        }
      };

      jest.spyOn(manager['registry'], 'loadPack').mockResolvedValue(packA);
      jest.spyOn(manager['registry'], 'resolveDependencies').mockResolvedValue({
        resolved: [],
        missing: [],
        circular: ["circular-pack-a", "circular-pack-b"]
      });

      const result = await manager.installPack("circular-pack-a");

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.includes("Circular dependency"))).toBe(true);
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

  describe("installPackDirect", () => {
    beforeEach(() => {
      // Mock the registry and validator for direct installation tests
      jest.spyOn(manager['registry'], 'loadPack').mockResolvedValue(mockValidPack);
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

    it("should install pack directly without processing dependencies", async () => {
      const result = await manager.installPackDirect("test-pack");

      expect(result.success).toBe(true);
      expect(result.installed.modes).toContain("engineer");
      
      // Verify that resolveDependencies was NOT called for direct installation
      expect(manager['registry'].resolveDependencies).not.toHaveBeenCalled();
      
      // Verify that the installer was called correctly
      expect(manager['installer'].installPack).toHaveBeenCalledWith(
        mockValidPack,
        expect.anything(), // source
        {}
      );
    });

    it("should handle validation errors in direct installation", async () => {
      jest.spyOn(manager['validator'], 'validatePackStructure').mockResolvedValue({
        valid: false,
        errors: ["Invalid pack structure"],
        warnings: []
      });

      const result = await manager.installPackDirect("invalid-pack");

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Invalid pack structure");
    });

    it("should handle installer errors in direct installation", async () => {
      jest.spyOn(manager['installer'], 'installPack').mockResolvedValue({
        success: false,
        installed: { modes: [], workflows: [], agents: [], hooks: [] },
        skipped: { modes: [], workflows: [], agents: [], hooks: [] },
        errors: ["Installer error"]
      });

      const result = await manager.installPackDirect("failing-pack");

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Installer error");
    });

    it("should handle exceptions in direct installation", async () => {
      jest.spyOn(manager['registry'], 'loadPack').mockRejectedValue(new Error("Load failed"));

      const result = await manager.installPackDirect("exception-pack");

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.includes("Direct installation failed"))).toBe(true);
    });
  });

  describe("edge cases and stress testing", () => {
    beforeEach(() => {
      // Mock validator initialization
      jest.spyOn(manager['validator'], 'initialize').mockResolvedValue();
      jest.spyOn(manager['validator'], 'validatePackStructure').mockResolvedValue({
        valid: true,
        errors: [],
        warnings: []
      });
    });

    it("should handle very large dependency graphs efficiently", async () => {
      // Create a graph with 50 packs to test performance
      const packNames = Array.from({ length: 50 }, (_, i) => `pack-${i}`);
      
      // Each pack depends on the next 3 packs in the list (if they exist)
      const createLargePack = (index: number): PackStructure => {
        const dependencies = [];
        for (let i = index + 1; i < Math.min(index + 4, packNames.length); i++) {
          dependencies.push(packNames[i]);
        }
        
        return {
          ...mockValidPack,
          manifest: {
            ...mockValidPack.manifest,
            name: packNames[index],
            dependencies
          }
        };
      };

      // Mock registry methods for all packs
      jest.spyOn(manager['registry'], 'loadPack').mockImplementation(async (name: string) => {
        const index = packNames.indexOf(name);
        return index >= 0 ? createLargePack(index) : mockValidPack;
      });

      jest.spyOn(manager['registry'], 'resolveDependencies').mockImplementation(async (name: string) => {
        const index = packNames.indexOf(name);
        if (index >= 0) {
          const dependencies = [];
          for (let i = index + 1; i < Math.min(index + 4, packNames.length); i++) {
            dependencies.push(packNames[i]);
          }
          return { resolved: dependencies, missing: [], circular: [] };
        }
        return { resolved: [], missing: [], circular: [] };
      });

      // Track installation order
      const installationOrder: string[] = [];
      jest.spyOn(manager['installer'], 'installPack').mockImplementation(async (packStructure: PackStructure) => {
        installationOrder.push(packStructure.manifest.name);
        return {
          success: true,
          installed: { modes: [packStructure.manifest.name + '-mode'], workflows: [], agents: [], hooks: [] },
          skipped: { modes: [], workflows: [], agents: [], hooks: [] },
          errors: []
        };
      });

      const startTime = Date.now();
      const result = await manager.installPack("pack-0");
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(installationOrder.length).toBe(packNames.length);
      expect(installationOrder).toContain("pack-0");
      
      // Should complete in reasonable time (less than 1 second for 50 packs)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it("should handle mixed success and failure scenarios", async () => {
      // Create packs where some succeed and some fail, but main pack can still install
      const successPack: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
          name: "success-pack"
        }
      };

      const dependentPack: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
          name: "dependent-pack",
          dependencies: ["success-pack"] // Only has successful dependencies
        }
      };

      jest.spyOn(manager['registry'], 'loadPack').mockImplementation(async (name: string) => {
        if (name === 'success-pack') return successPack;
        if (name === 'dependent-pack') return dependentPack;
        return mockValidPack;
      });

      jest.spyOn(manager['registry'], 'resolveDependencies').mockImplementation(async (name: string) => {
        if (name === 'dependent-pack') {
          return { resolved: ["success-pack"], missing: [], circular: [] };
        }
        return { resolved: [], missing: [], circular: [] };
      });

      // Mock installer to succeed for all packs
      const installationOrder: string[] = [];
      jest.spyOn(manager['installer'], 'installPack').mockImplementation(async (packStructure: PackStructure) => {
        installationOrder.push(packStructure.manifest.name);
        return {
          success: true,
          installed: { modes: [packStructure.manifest.name + "-mode"], workflows: [], agents: [], hooks: [] },
          skipped: { modes: [], workflows: [], agents: [], hooks: [] },
          errors: []
        };
      });

      const result = await manager.installPack("dependent-pack");

      expect(result.success).toBe(true);
      expect(installationOrder).toEqual(["success-pack", "dependent-pack"]);
      expect(result.installed.modes).toContain("dependent-pack-mode");
    });

    it("should prevent infinite loops in dependency resolution", async () => {
      const loopPack: PackStructure = {
        ...mockValidPack,
        manifest: {
          ...mockValidPack.manifest,
          name: "loop-pack",
          dependencies: ["loop-pack"] // Self-dependency
        }
      };

      jest.spyOn(manager['registry'], 'loadPack').mockResolvedValue(loopPack);
      jest.spyOn(manager['registry'], 'resolveDependencies').mockResolvedValue({
        resolved: [],
        missing: [],
        circular: ["loop-pack"] // Should detect self-circular dependency
      });

      const result = await manager.installPack("loop-pack");

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.includes("Circular dependency"))).toBe(true);
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
              gitignoreEntries: [".zcc/cache", "*.tmp"]
            }
          },
          postInstall: {
            message: "Full-stack pack installed! Start with 'mode: architect' for system design."
          },
          mementoProtocolVersion: ">=1.0.0"
        },
        path: "/test/path/full-stack-pack"
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
        path: "/test/path/partial-pack"
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
        path: "/test/path/problematic-pack"
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
        path: "/test/path/empty-pack"
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
        path: "/test/path/invalid-names-pack"
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