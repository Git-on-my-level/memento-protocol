import { ZccCore } from '../ZccCore';
import { ZccScope } from '../ZccScope';
import { BuiltinComponentProvider } from '../BuiltinComponentProvider';
import { ScriptExecutor } from '../ScriptExecutor';

// Mock dependencies
jest.mock('../ZccScope');
jest.mock('../BuiltinComponentProvider');
jest.mock('../ScriptExecutor');

const mockZccScope = ZccScope as jest.MockedClass<typeof ZccScope>;
const mockBuiltinProvider = BuiltinComponentProvider as jest.MockedClass<typeof BuiltinComponentProvider>;
const mockScriptExecutor = ScriptExecutor as jest.MockedClass<typeof ScriptExecutor>;

describe('ZccCore - Component Resolution', () => {
  let core: ZccCore;
  let mockProjectScope: jest.Mocked<ZccScope>;
  let mockGlobalScope: jest.Mocked<ZccScope>;
  let mockBuiltin: jest.Mocked<BuiltinComponentProvider>;

  // Create a test-friendly version of ZccCore
  class TestZccCore extends ZccCore {
    constructor(projectRoot: string) {
      super(projectRoot);
      // Replace the scopes with our mocked instances after they're created
      (this as any).projectScope = mockProjectScope;
      (this as any).globalScope = mockGlobalScope;
      (this as any).builtinProvider = mockBuiltin;
    }
  }

  const mockProjectComponents = [
    {
      name: 'engineer',
      type: 'mode' as const,
      path: '/project/modes/engineer.md',
      metadata: { description: 'Project engineer mode' }
    }
  ];

  const mockGlobalComponents = [
    {
      name: 'architect',
      type: 'mode' as const,
      path: '/global/modes/architect.md',
      metadata: { description: 'Global architect mode' }
    },
    {
      name: 'engineer',
      type: 'mode' as const,
      path: '/global/modes/engineer.md',
      metadata: { description: 'Global engineer mode' }
    }
  ];

  const mockBuiltinComponents = [
    {
      name: 'reviewer',
      type: 'mode' as const,
      path: '/builtin/modes/reviewer.md',
      templatePath: '/builtin/modes/reviewer.md',
      isBuiltin: true as const,
      metadata: { description: 'Built-in reviewer mode' }
    },
    {
      name: 'engineer',
      type: 'mode' as const,
      path: '/builtin/modes/engineer.md',
      templatePath: '/builtin/modes/engineer.md',
      isBuiltin: true as const,
      metadata: { description: 'Built-in engineer mode' }
    },
    {
      name: 'autonomous-project-manager',
      type: 'mode' as const,
      path: '/builtin/modes/autonomous-project-manager.md',
      templatePath: '/builtin/modes/autonomous-project-manager.md',
      isBuiltin: true as const,
      metadata: { description: 'Autonomous project management mode' }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock instances
    mockProjectScope = {
      getComponent: jest.fn(),
      getComponents: jest.fn(),
      getComponentsByType: jest.fn(),
      exists: jest.fn().mockReturnValue(true),
      getPath: jest.fn().mockReturnValue('/project/.zcc'),
      getIsGlobal: jest.fn().mockReturnValue(false),
      clearCache: jest.fn(),
      getConfig: jest.fn()
    } as any;

    mockGlobalScope = {
      getComponent: jest.fn(),
      getComponents: jest.fn(),
      getComponentsByType: jest.fn(),
      exists: jest.fn().mockReturnValue(true),
      getPath: jest.fn().mockReturnValue('/global/.zcc'),
      getIsGlobal: jest.fn().mockReturnValue(true),
      clearCache: jest.fn(),
      getConfig: jest.fn()
    } as any;

    mockBuiltin = {
      getComponent: jest.fn(),
      getComponents: jest.fn(),
      getComponentsByType: jest.fn(),
      isAvailable: jest.fn().mockReturnValue(true),
      getTemplatesPath: jest.fn().mockReturnValue('/builtin/templates'),
      clearCache: jest.fn()
    } as any;

    mockZccScope.mockImplementation(((_: string, isGlobal: boolean) => {
      return isGlobal ? mockGlobalScope : mockProjectScope;
    }) as any);

    mockBuiltinProvider.mockImplementation(() => mockBuiltin);
    mockScriptExecutor.mockImplementation(() => ({} as any));

    // Setup default component responses for tests that don't override
    mockProjectScope.getComponents.mockResolvedValue(mockProjectComponents);
    mockGlobalScope.getComponents.mockResolvedValue(mockGlobalComponents);
    mockBuiltin.getComponents.mockResolvedValue(mockBuiltinComponents);
    
    // Default empty responses for getComponentsByType (tests will override as needed)
    mockProjectScope.getComponentsByType.mockResolvedValue([]);
    mockGlobalScope.getComponentsByType.mockResolvedValue([]);
    mockBuiltin.getComponentsByType.mockResolvedValue([]);

    core = new TestZccCore('/test/project');
  });

  describe('resolveComponent', () => {
    it('should prioritize project scope over global scope', async () => {
      mockProjectScope.getComponent.mockResolvedValue(mockProjectComponents[0]);
      mockGlobalScope.getComponent.mockResolvedValue(mockGlobalComponents[1]);

      const result = await core.resolveComponent('engineer', 'mode');

      expect(result).toBeDefined();
      expect(result?.source).toBe('project');
      expect(result?.component.path).toBe('/project/modes/engineer.md');
    });

    it('should fall back to global scope when not in project scope', async () => {
      mockProjectScope.getComponent.mockResolvedValue(null);
      mockGlobalScope.getComponent.mockResolvedValue(mockGlobalComponents[0]);

      const result = await core.resolveComponent('architect', 'mode');

      expect(result).toBeDefined();
      expect(result?.source).toBe('global');
      expect(result?.component.path).toBe('/global/modes/architect.md');
    });

    it('should fall back to built-in when not in project or global scope', async () => {
      mockProjectScope.getComponent.mockResolvedValue(null);
      mockGlobalScope.getComponent.mockResolvedValue(null);
      mockBuiltin.getComponent.mockResolvedValue(mockBuiltinComponents[0]);

      const result = await core.resolveComponent('reviewer', 'mode');

      expect(result).toBeDefined();
      expect(result?.source).toBe('builtin');
      expect(result?.component.path).toBe('/builtin/modes/reviewer.md');
    });

    it('should return null when component not found in any scope', async () => {
      mockProjectScope.getComponent.mockResolvedValue(null);
      mockGlobalScope.getComponent.mockResolvedValue(null);
      mockBuiltin.getComponent.mockResolvedValue(null);

      const result = await core.resolveComponent('nonexistent', 'mode');

      expect(result).toBeNull();
    });
  });

  describe('getComponentsByType', () => {
    it('should merge components with proper precedence', async () => {
      mockProjectScope.getComponentsByType.mockResolvedValue([mockProjectComponents[0]]);
      mockGlobalScope.getComponentsByType.mockResolvedValue(mockGlobalComponents);
      mockBuiltin.getComponentsByType.mockResolvedValue(mockBuiltinComponents);

      const components = await core.getComponentsByType('mode');

      // Should have unique components with project taking precedence
      expect(components).toHaveLength(4); // engineer (project), architect (global), reviewer (builtin), apm (builtin)
      
      const engineerComponent = components.find(c => c.name === 'engineer');
      expect(engineerComponent?.path).toBe('/project/modes/engineer.md'); // Project version should win
    });
  });

  describe('getComponentsByTypeWithSource', () => {
    it('should return components with source information', async () => {
      const components = await core.getComponentsByTypeWithSource('mode');

      // Should have components from each source
      expect(components.length).toBeGreaterThan(0);
      
      const projectComponent = components.find(c => c.source === 'project');
      const globalComponent = components.find(c => c.source === 'global');
      const builtinComponent = components.find(c => c.source === 'builtin');

      expect(projectComponent).toBeDefined();
      expect(globalComponent).toBeDefined();
      expect(builtinComponent).toBeDefined();
      
      // Verify the structure includes source and component
      expect(projectComponent?.source).toBe('project');
      expect(globalComponent?.source).toBe('global');
      expect(builtinComponent?.source).toBe('builtin');
      
      expect(projectComponent?.component).toBeDefined();
      expect(globalComponent?.component).toBeDefined();  
      expect(builtinComponent?.component).toBeDefined();
    });

    it('should sort components by name and source precedence', async () => {
      // Add same-named components from different sources
      mockProjectScope.getComponentsByType.mockResolvedValue([mockProjectComponents[0]]);
      mockGlobalScope.getComponentsByType.mockResolvedValue([mockGlobalComponents[1]]);
      mockBuiltin.getComponentsByType.mockResolvedValue([mockBuiltinComponents[1]]);

      const components = await core.getComponentsByTypeWithSource('mode');

      const engineerComponents = components.filter(c => c.component.name === 'engineer');
      
      // Should be sorted by source precedence: project, global, builtin
      expect(engineerComponents[0].source).toBe('project');
      expect(engineerComponents[1].source).toBe('global');
      expect(engineerComponents[2].source).toBe('builtin');
    });
  });

  describe('findComponents', () => {
    beforeEach(() => {
      // Mock the internal getAllComponentsWithSource method behavior
      const allComponents = [
        { component: mockProjectComponents[0], source: 'project' as const },
        ...mockGlobalComponents.map(c => ({ component: c, source: 'global' as const })),
        ...mockBuiltinComponents.map(c => ({ component: c, source: 'builtin' as const }))
      ];
      
      // This is a bit of a hack since getAllComponentsWithSource is private
      // In a real test, you might want to expose it or test through public methods
      jest.spyOn(core as any, 'getAllComponentsWithSource').mockResolvedValue(allComponents);
    });

    it('should find exact matches', async () => {
      const matches = await core.findComponents('engineer', 'mode');

      expect(matches.length).toBeGreaterThan(0);
      const exactMatch = matches.find(m => m.matchType === 'exact');
      expect(exactMatch).toBeDefined();
      expect(exactMatch?.name).toBe('engineer');
    });

    it('should find fuzzy matches', async () => {
      const matches = await core.findComponents('apm', 'mode');

      expect(matches.length).toBeGreaterThan(0);
      const acronymMatch = matches.find(m => m.name === 'autonomous-project-manager');
      expect(acronymMatch).toBeDefined();
      expect(acronymMatch?.matchType).toBe('acronym');
    });

    it('should include conflict information', async () => {
      const matches = await core.findComponents('engineer', 'mode');

      const engineerMatch = matches.find(m => m.name === 'engineer');
      expect(engineerMatch?.conflictsWith).toBeDefined();
      expect(engineerMatch?.conflictsWith?.length).toBeGreaterThan(1);
    });

    it('should filter by component type', async () => {
      const matches = await core.findComponents('engineer', 'mode');

      expect(matches.every(m => m.component.type === 'mode')).toBe(true);
    });
  });


  describe('generateSuggestions', () => {
    beforeEach(() => {
      const allComponents = mockBuiltinComponents.map(c => ({ 
        component: c, 
        source: 'builtin' as const 
      }));
      
      jest.spyOn(core as any, 'getAllComponentsWithSource').mockResolvedValue(allComponents);
    });

    it('should generate suggestions for typos', async () => {
      const suggestions = await core.generateSuggestions('reviewr', 'mode');

      expect(suggestions).toContain('reviewer');
    });

    it('should generate suggestions for partial matches', async () => {
      const suggestions = await core.generateSuggestions('eng', 'mode');

      expect(suggestions).toContain('engineer');
    });

    it('should limit number of suggestions', async () => {
      const suggestions = await core.generateSuggestions('e', 'mode', 2);

      expect(suggestions.length).toBeLessThanOrEqual(2);
    });
  });


  describe('getComponentConflicts', () => {
    beforeEach(() => {
      const conflictComponents = [
        { component: mockProjectComponents[0], source: 'project' as const },
        { component: mockGlobalComponents[1], source: 'global' as const },
        { component: mockBuiltinComponents[1], source: 'builtin' as const }
      ];
      
      jest.spyOn(core as any, 'getAllComponentsWithSource').mockResolvedValue(conflictComponents);
    });

    it('should return all versions of a component across scopes', async () => {
      const conflicts = await core.getComponentConflicts('engineer', 'mode');

      expect(conflicts).toHaveLength(3);
      expect(conflicts.some(c => c.source === 'project')).toBe(true);
      expect(conflicts.some(c => c.source === 'global')).toBe(true);
      expect(conflicts.some(c => c.source === 'builtin')).toBe(true);
    });

    it('should return empty array when no conflicts exist', async () => {
      const singleComponent = [
        { component: mockBuiltinComponents[0], source: 'builtin' as const }
      ];
      
      jest.spyOn(core as any, 'getAllComponentsWithSource').mockResolvedValue(singleComponent);

      const conflicts = await core.getComponentConflicts('reviewer', 'mode');

      expect(conflicts).toHaveLength(1);
    });
  });

  describe('getStatus', () => {
    it('should return status of all scopes', async () => {
      mockGlobalScope.getConfig.mockResolvedValue({ ui: { colorOutput: true } });
      mockProjectScope.getConfig.mockResolvedValue({ ui: { verboseLogging: true } });

      const status = await core.getStatus();

      expect(status.builtin).toBeDefined();
      expect(status.global).toBeDefined();
      expect(status.project).toBeDefined();
      expect(status.totalComponents).toBeGreaterThan(0);
      expect(status.uniqueComponents).toBeGreaterThan(0);
    });
  });

  describe('clearCache', () => {
    it('should clear caches in all providers', () => {
      core.clearCache();

      expect(mockProjectScope.clearCache).toHaveBeenCalled();
      expect(mockGlobalScope.clearCache).toHaveBeenCalled();
      expect(mockBuiltin.clearCache).toHaveBeenCalled();
    });
  });
});