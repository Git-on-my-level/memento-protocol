/**
 * Integration tests for Advanced Code Refactoring starter pack
 */

import { StarterPackManager } from '../StarterPackManager';
import { createTestZccProject } from '../testing';
import { MemoryFileSystemAdapter } from '../adapters/MemoryFileSystemAdapter';
import { PackagePaths } from '../packagePaths';
import * as path from 'path';

// Mock dependencies that don't need filesystem
jest.mock('../logger');
jest.mock('../directoryManager');
jest.mock('../componentInstaller');

describe('StarterPackManager - Advanced Code Refactoring Pack', () => {
  let manager: StarterPackManager;
  let fs: MemoryFileSystemAdapter;
  const projectRoot = '/test/project';

  // The actual Advanced Code Refactoring pack manifest content
  const advancedCodeRefactoringManifest = {
    name: 'advanced-code-refactoring',
    version: '1.0.0',
    description: 'Advanced code refactoring toolkit with AST-based analysis',
    author: 'zcc',
    category: 'general',
    tags: ['refactoring', 'ast', 'code-quality', 'semantic-search'],
    components: {
      agents: [{ name: 'code-archaeologist', required: true }],
      workflows: [
        { name: 'semantic-search', required: true },
        { name: 'safe-refactoring', required: true }
      ],
      modes: [{ name: 'refactoring-specialist', required: true }]
    },
    hooks: [{ name: 'ast-grep-awareness', enabled: true }],
    dependencies: {
      tools: [
        {
          name: '@ast-grep/cli',
          version: '>=0.12.0',
          required: false,
          installCommand: 'npm install -g @ast-grep/cli',
          description: 'AST-based code search and transformation tool'
        }
      ]
    }
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Reset PackagePaths cache to ensure test environment detection works
    PackagePaths.reset();
    
    // Create test filesystem with Advanced Code Refactoring pack structure
    fs = await createTestZccProject(projectRoot, {
      // Pack manifest
      '/test/templates/starter-packs/advanced-code-refactoring/manifest.json': JSON.stringify(advancedCodeRefactoringManifest),
      
      // Components
      '/test/templates/starter-packs/advanced-code-refactoring/components/agents/code-archaeologist.md': 
        '---\nname: code-archaeologist\n---\n# Code Archaeologist Agent\n\nSpecialized in AST-based code analysis',
      
      '/test/templates/starter-packs/advanced-code-refactoring/components/workflows/semantic-search.md': 
        '---\nname: semantic-search\n---\n# Semantic Search Workflow\n\nSearches code by semantic meaning',
      
      '/test/templates/starter-packs/advanced-code-refactoring/components/workflows/safe-refactoring.md': 
        '---\nname: safe-refactoring\n---\n# Safe Refactoring Workflow\n\nRefactors code with safety checks',
      
      '/test/templates/starter-packs/advanced-code-refactoring/components/modes/refactoring-specialist.md': 
        '---\nname: refactoring-specialist\n---\n# Refactoring Specialist Mode\n\nFocused on code refactoring tasks',
      
      // Commands
      '/test/templates/starter-packs/advanced-code-refactoring/commands/ast.md': '# /ast Command\n\nAST analysis command',
      '/test/templates/starter-packs/advanced-code-refactoring/commands/refactor.md': '# /refactor Command\n\nRefactoring command',
      '/test/templates/starter-packs/advanced-code-refactoring/commands/semantic.md': '# /semantic Command\n\nSemantic search command',
      
      // Hook templates
      '/test/templates/hooks/ast-grep-awareness.json': JSON.stringify({
        id: 'ast-grep-awareness',
        name: 'AST-Grep Tool Awareness',
        description: 'Provides context about ast-grep capabilities',
        event: 'UserPromptSubmit',
        enabled: true,
        command: '${HOOK_SCRIPT}',
        priority: 90
      }),
      '/test/templates/hooks/ast-grep-awareness.sh': '#!/usr/bin/env bash\necho "AST-Grep awareness hook"\nexit 0',
      
      // Schema file - using the full schema structure from the actual file
      '/test/templates/starter-packs/schema.json': JSON.stringify({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "name": { "type": "string", "pattern": "^[a-z0-9-]+$" },
          "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
          "description": { "type": "string", "minLength": 1, "maxLength": 500 },
          "author": { "type": "string", "minLength": 1 },
          "components": { 
            "type": "object",
            "properties": {
              "modes": { "type": "array" },
              "workflows": { "type": "array" },
              "agents": { "type": "array" },
              "hooks": { "type": "array" }
            }
          },
          "tags": { "type": "array" },
          "category": { "type": "string" },
          "dependencies": { "type": "object" },
          "hooks": { "type": "array" },
          "configuration": { "type": "object" },
          "postInstall": { "type": "object" }
        },
        "required": ["name", "version", "description", "author", "components"],
        "additionalProperties": true
      })
    });
    
    // Mock DirectoryManager to prevent actual filesystem operations
    const mockDirectoryManager = require("../directoryManager").DirectoryManager;
    mockDirectoryManager.prototype.initializeStructure = jest.fn().mockResolvedValue(undefined);
    mockDirectoryManager.prototype.ensureProjectRoot = jest.fn().mockReturnValue(undefined);
    
    // Mock ComponentInstaller
    const mockComponentInstaller = require("../componentInstaller").ComponentInstaller;
    mockComponentInstaller.prototype.installMode = jest.fn().mockResolvedValue({ success: true });
    mockComponentInstaller.prototype.installWorkflow = jest.fn().mockResolvedValue({ success: true });
    mockComponentInstaller.prototype.installAgent = jest.fn().mockResolvedValue({ success: true });
    
    manager = new StarterPackManager(projectRoot, fs);
  });

  describe('loadPack', () => {
    it('should load advanced-code-refactoring pack', async () => {
      const pack = await manager.loadPack('advanced-code-refactoring');
      
      expect(pack).toBeDefined();
      expect(pack.manifest.name).toBe('advanced-code-refactoring');
      expect(pack.manifest.description).toBe('Advanced code refactoring toolkit with AST-based analysis');
      expect(pack.manifest.components.agents).toHaveLength(1);
      expect(pack.manifest.components.workflows).toHaveLength(2);
      expect(pack.manifest.components.modes).toHaveLength(1);
    });

    it('should include tool dependencies in manifest', async () => {
      const pack = await manager.loadPack('advanced-code-refactoring');
      
      expect(pack.manifest).toHaveProperty('dependencies');
      const deps = (pack.manifest as any).dependencies;
      expect(deps.tools).toBeDefined();
      expect(deps.tools).toHaveLength(1);
      expect(deps.tools[0].name).toBe('@ast-grep/cli');
      expect(deps.tools[0].required).toBe(false);
    });
  });

  describe('validatePack', () => {
    it('should validate advanced-code-refactoring pack structure', async () => {
      const pack = await manager.loadPack('advanced-code-refactoring');
      
      // Create a minimal mock source that implements IPackSource
      const mockSource = {
        getSourceInfo: () => ({ 
          name: 'local', 
          type: 'local' as const, 
          path: pack.path 
        }),
        loadPack: async (_name: string) => pack,
        listPacks: async () => ['advanced-code-refactoring'],
        hasPack: async (name: string) => name === 'advanced-code-refactoring',
        getComponentPath: async (_packName: string, componentType: string, componentName: string) => 
          path.join(pack.path, 'components', componentType, `${componentName}.md`),
        hasComponent: async (_packName: string, _componentType: string, _componentName: string) => true,
        validateStructure: async () => ({ valid: true, errors: [], warnings: [] })
      };

      const validation = await manager.validatePack(pack, mockSource);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('installPack', () => {
    // Skip the actual installation test as it requires complex mocking
    // The installation logic is already tested in the main StarterPackManager.test.ts
    it.skip('should install advanced-code-refactoring pack components', async () => {
      // This test would require extensive mocking of internal components
      // The actual installation is tested in integration tests
      const result = await manager.installPack('advanced-code-refactoring', { force: true });
      
      expect(result.success).toBe(true);
      expect(result.installed.modes).toContain('refactoring-specialist');
      expect(result.installed.workflows).toContain('semantic-search');
      expect(result.installed.workflows).toContain('safe-refactoring');
      expect(result.installed.agents).toContain('code-archaeologist');
    });

    it('should handle tool dependency checking during installation', async () => {
      // Mock console methods to capture output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await manager.installPack('advanced-code-refactoring', { force: true, interactive: false });
      
      // Tool dependency checking should have been called but not block installation
      // The test passes as long as no error is thrown
      
      consoleSpy.mockRestore();
    });
  });

  describe('searchPacks', () => {
    it('should find advanced-code-refactoring pack by category', async () => {
      const results = await manager.searchPacks({ category: 'general' });
      
      const refactoringPack = results.find(p => p.manifest.name === 'advanced-code-refactoring');
      expect(refactoringPack).toBeDefined();
      expect(refactoringPack?.manifest.category).toBe('general');
    });

    it('should find advanced-code-refactoring pack by tags', async () => {
      const results = await manager.searchPacks({ tags: ['refactoring'] });
      
      const refactoringPack = results.find(p => p.manifest.name === 'advanced-code-refactoring');
      expect(refactoringPack).toBeDefined();
      expect(refactoringPack?.manifest.tags).toContain('refactoring');
      expect(refactoringPack?.manifest.tags).toContain('ast');
    });
  });

  describe('listPacks', () => {
    it('should list advanced-code-refactoring pack', async () => {
      const packs = await manager.listPacks();
      
      const refactoringPack = packs.find(p => p.manifest.name === 'advanced-code-refactoring');
      expect(refactoringPack).toBeDefined();
      expect(refactoringPack?.manifest.author).toBe('zcc');
    });
  });
});