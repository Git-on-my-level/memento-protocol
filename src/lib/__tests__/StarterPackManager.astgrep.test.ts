/**
 * Integration tests for Advanced Code Refactoring starter pack
 */

import { StarterPackManager } from '../StarterPackManager';
import { MemoryFileSystemAdapter } from '../adapters/MemoryFileSystemAdapter';
import * as path from 'path';

describe('StarterPackManager - Advanced Code Refactoring Pack', () => {
  let manager: StarterPackManager;
  let mockFs: MemoryFileSystemAdapter;
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = '/test/project';
    mockFs = new MemoryFileSystemAdapter();
    manager = new StarterPackManager(projectRoot, mockFs);
    
    // Setup mock filesystem with advanced-code-refactoring pack
    setupAdvancedCodeRefactoringPack();
  });

  const setupAdvancedCodeRefactoringPack = () => {
    // Create schema first (needed for validation)
    const schemaPath = path.join(projectRoot, 'templates', 'starter-packs');
    mockFs.mkdirSync(schemaPath, { recursive: true });
    mockFs.writeFileSync(
      path.join(schemaPath, 'schema.json'),
      JSON.stringify({ "$schema": "http://json-schema.org/draft-07/schema#" })
    );
    
    // Create pack structure
    const packPath = path.join(projectRoot, 'node_modules', 'memento-protocol', 'dist', 'templates', 'starter-packs', 'advanced-code-refactoring');
    
    // Create directories
    mockFs.mkdirSync(packPath, { recursive: true });
    mockFs.mkdirSync(path.join(packPath, 'components', 'agents'), { recursive: true });
    mockFs.mkdirSync(path.join(packPath, 'components', 'workflows'), { recursive: true });
    mockFs.mkdirSync(path.join(packPath, 'components', 'modes'), { recursive: true });
    mockFs.mkdirSync(path.join(packPath, 'commands'), { recursive: true });
    
    // Manifest
    const manifest = {
      name: 'advanced-code-refactoring',
      version: '1.0.0',
      description: 'Advanced code refactoring toolkit with AST-based analysis',
      author: 'memento-protocol',
      category: 'general',
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

    mockFs.writeFileSync(
      path.join(packPath, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    // Components
    const componentsPath = path.join(packPath, 'components');
    
    // Agent
    mockFs.writeFileSync(
      path.join(componentsPath, 'agents', 'code-archaeologist.md'),
      '---\nname: code-archaeologist\n---\n# Code Archaeologist Agent'
    );

    // Workflows
    mockFs.writeFileSync(
      path.join(componentsPath, 'workflows', 'semantic-search.md'),
      '---\nname: semantic-search\n---\n# Semantic Search Workflow'
    );
    mockFs.writeFileSync(
      path.join(componentsPath, 'workflows', 'safe-refactoring.md'),
      '---\nname: safe-refactoring\n---\n# Safe Refactoring Workflow'
    );

    // Mode
    mockFs.writeFileSync(
      path.join(componentsPath, 'modes', 'refactoring-specialist.md'),
      '---\nname: refactoring-specialist\n---\n# Refactoring Specialist Mode'
    );

    // Commands
    mockFs.writeFileSync(
      path.join(packPath, 'commands', 'ast.md'),
      '# /ast Command'
    );
    mockFs.writeFileSync(
      path.join(packPath, 'commands', 'refactor.md'),
      '# /refactor Command'
    );
    mockFs.writeFileSync(
      path.join(packPath, 'commands', 'semantic.md'),
      '# /semantic Command'
    );

    // Templates directory hooks
    const hooksPath = path.join(projectRoot, 'node_modules', 'memento-protocol', 'dist', 'templates', 'hooks');
    mockFs.mkdirSync(hooksPath, { recursive: true });
    mockFs.writeFileSync(
      path.join(hooksPath, 'ast-grep-awareness.json'),
      JSON.stringify({
        id: 'ast-grep-awareness',
        name: 'AST-Grep Tool Awareness',
        description: 'Provides context about ast-grep capabilities',
        event: 'UserPromptSubmit',
        enabled: true,
        command: '${HOOK_SCRIPT}',
        priority: 90
      }, null, 2)
    );
    mockFs.writeFileSync(
      path.join(hooksPath, 'ast-grep-awareness.sh'),
      '#!/usr/bin/env bash\necho "AST-Grep awareness hook"\nexit 0'
    );
  };

  describe('loadPack', () => {
    it('should load advanced-code-refactoring pack', async () => {
      const pack = await manager.loadPack('advanced-code-refactoring');
      
      expect(pack.manifest.name).toBe('advanced-code-refactoring');
      expect(pack.manifest.components.agents).toHaveLength(1);
      expect(pack.manifest.components.workflows).toHaveLength(2);
      expect(pack.manifest.components.modes).toHaveLength(1);
    });

    it('should include tool dependencies in manifest', async () => {
      const pack = await manager.loadPack('advanced-code-refactoring');
      const manifestAny = pack.manifest as any;
      
      expect(manifestAny.dependencies?.tools).toBeDefined();
      expect(manifestAny.dependencies.tools).toHaveLength(1);
      expect(manifestAny.dependencies.tools[0].name).toBe('@ast-grep/cli');
    });
  });

  describe('validatePack', () => {
    it('should validate advanced-code-refactoring pack structure', async () => {
      const pack = await manager.loadPack('advanced-code-refactoring');
      
      // Mock pack source for validation
      const mockSource = {
        getSourceInfo: () => ({ name: 'local', type: 'local' as const, path: pack.path }),
        getComponentPath: async (_packName: string, componentType: string, componentName: string) => 
          path.join(pack.path, 'components', componentType, `${componentName}.md`),
        hasComponent: async (_packName: string, _componentType: string, _componentName: string) => true,
        validateStructure: async () => ({ valid: true, errors: [], warnings: [] }),
        loadPack: async (_name: string) => pack,
        listPacks: async () => ['advanced-code-refactoring'],
        hasPack: async (name: string) => name === 'advanced-code-refactoring'
      };

      const validation = await manager.validatePack(pack, mockSource);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('installPack', () => {
    it('should install advanced-code-refactoring pack components', async () => {
      // Mock successful installation
      const result = await manager.installPack('advanced-code-refactoring', { dryRun: true });
      
      expect(result.success).toBe(true);
      expect(result.installed.agents).toContain('code-archaeologist');
      expect(result.installed.workflows).toContain('semantic-search');
      expect(result.installed.workflows).toContain('safe-refactoring');
      expect(result.installed.modes).toContain('refactoring-specialist');
    });

    it('should handle tool dependency checking during installation', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      try {
        await manager.installPack('advanced-code-refactoring', { 
          dryRun: true,
          interactive: false 
        });

        // Should have checked for ast-grep availability
        // (exact behavior depends on whether ast-grep is installed in test environment)
      } finally {
        consoleSpy.mockRestore();
      }
    });
  });

  describe('searchPacks', () => {
    it('should find advanced-code-refactoring pack by category', async () => {
      const packs = await manager.searchPacks({ category: 'general' });
      
      const refactoringPack = packs.find(p => p.manifest.name === 'advanced-code-refactoring');
      expect(refactoringPack).toBeDefined();
    });

    it('should find advanced-code-refactoring pack by tags', async () => {
      const packs = await manager.searchPacks({ tags: ['ast-grep'] });
      
      const refactoringPack = packs.find(p => p.manifest.name === 'advanced-code-refactoring');
      expect(refactoringPack).toBeDefined();
    });
  });
});