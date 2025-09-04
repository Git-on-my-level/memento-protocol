import { ComponentTypeRegistry } from '../ComponentTypeRegistry';

describe('ComponentTypeRegistry', () => {
  let registry: ComponentTypeRegistry;

  beforeEach(() => {
    registry = new ComponentTypeRegistry();
  });

  afterEach(() => {
    // Reset singleton for test isolation
    (ComponentTypeRegistry as any).instance = undefined;
  });

  describe('Default Types', () => {
    it('should register default component types', () => {
      expect(registry.has('mode')).toBe(true);
      expect(registry.has('workflow')).toBe(true);
      expect(registry.has('agent')).toBe(true);
      expect(registry.has('script')).toBe(true);
      expect(registry.has('hook')).toBe(true);
      expect(registry.has('command')).toBe(true);
      expect(registry.has('template')).toBe(true);
    });

    it('should have correct definitions for default types', () => {
      const modeDef = registry.get('mode');
      expect(modeDef).toEqual({
        directory: 'modes',
        fileExtension: '.md',
        displayName: 'Mode',
        supportsDependencies: false,
        supportsGlobalInstall: true,
      });

      const workflowDef = registry.get('workflow');
      expect(workflowDef).toEqual({
        directory: 'workflows',
        fileExtension: '.md',
        displayName: 'Workflow',
        supportsDependencies: true,
        supportsGlobalInstall: true,
      });
    });
  });

  describe('Custom Type Registration', () => {
    it('should allow registering custom component types', () => {
      registry.register('snippet', {
        directory: 'snippets',
        fileExtension: '.json',
        displayName: 'Code Snippet',
        supportsDependencies: false,
        supportsGlobalInstall: true,
      });

      expect(registry.has('snippet')).toBe(true);
      expect(registry.getDirectory('snippet')).toBe('snippets');
      expect(registry.getFileExtension('snippet')).toBe('.json');
    });

    it('should override existing types when re-registering', () => {
      registry.register('mode', {
        directory: 'custom-modes',
        fileExtension: '.yaml',
        displayName: 'Custom Mode',
      });

      const modeDef = registry.get('mode');
      expect(modeDef?.directory).toBe('custom-modes');
      expect(modeDef?.fileExtension).toBe('.yaml');
    });
  });

  describe('Component Path Generation', () => {
    it('should generate correct component paths', () => {
      const path = registry.getComponentPath('/project', 'mode', 'architect');
      expect(path).toBe('/project/modes/architect.md');
    });

    it('should return undefined for unknown types', () => {
      const path = registry.getComponentPath('/project', 'unknown', 'test');
      expect(path).toBeUndefined();
    });

    it('should handle custom types', () => {
      registry.register('theme', {
        directory: 'themes',
        fileExtension: '.css',
        displayName: 'Theme',
      });

      const path = registry.getComponentPath('/project', 'theme', 'dark');
      expect(path).toBe('/project/themes/dark.css');
    });
  });

  describe('Type Validation', () => {
    it('should validate known types', () => {
      expect(registry.validateType('mode')).toBe(true);
      expect(registry.validateType('workflow')).toBe(true);
      expect(registry.validateType('agent')).toBe(true);
    });

    it('should reject unknown types', () => {
      expect(registry.validateType('unknown')).toBe(false);
      expect(registry.validateType('')).toBe(false);
    });

    it('should provide valid types for error messages', () => {
      const validTypes = registry.getValidTypes();
      expect(validTypes).toContain('mode');
      expect(validTypes).toContain('workflow');
      expect(validTypes).toContain('agent');
      expect(validTypes.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('Type Properties', () => {
    it('should check dependency support', () => {
      expect(registry.supportsDependencies('workflow')).toBe(true);
      expect(registry.supportsDependencies('mode')).toBe(false);
      expect(registry.supportsDependencies('unknown')).toBe(false);
    });

    it('should check global install support', () => {
      expect(registry.supportsGlobalInstall('mode')).toBe(true);
      expect(registry.supportsGlobalInstall('script')).toBe(false);
      expect(registry.supportsGlobalInstall('unknown')).toBe(false);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ComponentTypeRegistry.getInstance();
      const instance2 = ComponentTypeRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should preserve registered types across instances', () => {
      const instance1 = ComponentTypeRegistry.getInstance();
      instance1.register('custom', {
        directory: 'custom',
        fileExtension: '.txt',
        displayName: 'Custom',
      });

      const instance2 = ComponentTypeRegistry.getInstance();
      expect(instance2.has('custom')).toBe(true);
    });
  });

  describe('Registry Reset', () => {
    it('should reset to default types', () => {
      registry.register('custom', {
        directory: 'custom',
        fileExtension: '.txt',
        displayName: 'Custom',
      });

      expect(registry.has('custom')).toBe(true);

      registry.reset();

      expect(registry.has('custom')).toBe(false);
      expect(registry.has('mode')).toBe(true);
      expect(registry.has('workflow')).toBe(true);
    });
  });
});