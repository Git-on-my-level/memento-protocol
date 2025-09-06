import {
  ZccConfigValidator,
  HookConfigValidator,
  AcronymConfigValidator,
  ConfigSchemaRegistry
} from '../configSchema';

describe('ConfigSchema Validation', () => {
  describe('ZccConfigValidator', () => {
    const validator = new ZccConfigValidator();

    it('should validate valid configuration', () => {
      const config = {
        defaultMode: 'engineer',
        preferredWorkflows: ['review', 'summarize'],
        customTemplateSources: ['/path/to/templates'],
        integrations: {
          github: { token: 'abc123' }
        },
        ui: {
          colorOutput: true,
          verboseLogging: false
        },
        components: {
          modes: ['engineer', 'architect'],
          workflows: ['review']
        }
      };

      const result = validator.validate(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid defaultMode type', () => {
      const config = {
        defaultMode: 123 // Should be string
      };

      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Default mode must be a string');
    });

    it('should reject invalid preferredWorkflows type', () => {
      const config = {
        preferredWorkflows: 'review' // Should be array
      };

      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Preferred workflows must be an array of strings');
    });

    it('should reject invalid UI settings', () => {
      const config = {
        ui: {
          colorOutput: 'yes', // Should be boolean
          verboseLogging: 1 // Should be boolean
        }
      };

      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('UI.colorOutput must be a boolean');
      expect(result.errors).toContain('UI.verboseLogging must be a boolean');
    });

    it('should accept empty configuration', () => {
      const config = {};
      const result = validator.validate(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate partial configuration', () => {
      const config = {
        defaultMode: 'architect'
      };
      
      const result = validator.validatePartial(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('HookConfigValidator', () => {
    const validator = new HookConfigValidator();

    it('should validate valid hook configuration', () => {
      const hook = {
        id: 'my-hook',
        name: 'My Hook',
        description: 'A test hook',
        event: 'UserPromptSubmit',
        enabled: true,
        command: 'echo "hello"',
        args: ['arg1', 'arg2'],
        env: { NODE_ENV: 'test' },
        timeout: 5000,
        continueOnError: false,
        priority: 10,
        matcher: {
          type: 'regex',
          pattern: '.*test.*',
          confidence: 0.8
        },
        requirements: {
          commands: ['node'],
          env: ['NODE_ENV'],
          files: ['.env']
        }
      };

      const result = validator.validate(hook);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require mandatory fields', () => {
      const hook = {
        description: 'Missing required fields'
      };

      const result = validator.validate(hook);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Hook id is required and must be a string');
      expect(result.errors).toContain('Hook name is required and must be a string');
      expect(result.errors).toContain('Hook command is required and must be a string');
      expect(result.errors).toContain('Hook enabled is required and must be a boolean');
    });

    it('should validate hook event', () => {
      const hook = {
        id: 'test',
        name: 'Test',
        event: 'InvalidEvent', // Invalid
        enabled: true,
        command: 'echo test'
      };

      const result = validator.validate(hook);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid hook event'))).toBe(true);
    });

    it('should validate matcher configuration', () => {
      const hook = {
        id: 'test',
        name: 'Test',
        event: 'PreToolUse',
        enabled: true,
        command: 'echo test',
        matcher: {
          type: 'invalid', // Invalid type
          pattern: 'test'
        }
      };

      const result = validator.validate(hook);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid matcher type'))).toBe(true);
    });

    it('should validate confidence range', () => {
      const hook = {
        id: 'test',
        name: 'Test',
        event: 'PreToolUse',
        enabled: true,
        command: 'echo test',
        matcher: {
          type: 'fuzzy',
          pattern: 'test',
          confidence: 1.5 // Out of range
        }
      };

      const result = validator.validate(hook);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Matcher confidence must be between 0 and 1');
    });
  });

  describe('AcronymConfigValidator', () => {
    const validator = new AcronymConfigValidator();

    it('should validate valid acronym configuration', () => {
      const config = {
        version: '1.0.0',
        acronyms: {
          'zcc': 'zsh for Claude Code',
          'apm': 'autonomous-project-manager'
        },
        settings: {
          caseSensitive: false,
          wholeWordOnly: true
        }
      };

      const result = validator.validate(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require acronyms object', () => {
      const config = {
        settings: {
          caseSensitive: false,
          wholeWordOnly: true
        }
      };

      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Acronyms must be an object');
    });

    it('should validate acronym values are strings', () => {
      const config = {
        acronyms: {
          'test': 123 // Should be string
        },
        settings: {
          caseSensitive: false,
          wholeWordOnly: true
        }
      };

      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Acronym value for "test" must be a string');
    });

    it('should require settings object', () => {
      const config = {
        acronyms: {
          'zcc': 'zsh for Claude Code'
        }
      };

      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Acronym settings must be an object');
    });

    it('should validate settings booleans', () => {
      const config = {
        acronyms: {
          'zcc': 'zsh for Claude Code'
        },
        settings: {
          caseSensitive: 'false', // Should be boolean
          wholeWordOnly: 1 // Should be boolean
        }
      };

      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Settings.caseSensitive must be a boolean');
      expect(result.errors).toContain('Settings.wholeWordOnly must be a boolean');
    });
  });

  describe('ConfigSchemaRegistry', () => {
    const registry = ConfigSchemaRegistry.getInstance();

    it('should be a singleton', () => {
      const registry2 = ConfigSchemaRegistry.getInstance();
      expect(registry).toBe(registry2);
    });

    it('should provide access to validators', () => {
      expect(registry.getZccConfigValidator()).toBeInstanceOf(ZccConfigValidator);
      expect(registry.getHookConfigValidator()).toBeInstanceOf(HookConfigValidator);
      expect(registry.getAcronymConfigValidator()).toBeInstanceOf(AcronymConfigValidator);
    });

    it('should validateAndThrow for invalid config', () => {
      const invalidConfig = {
        defaultMode: 123 // Invalid type
      };

      expect(() => {
        registry.validateAndThrow(
          registry.getZccConfigValidator(),
          invalidConfig,
          'Test Config'
        );
      }).toThrow('Test Config validation failed: Default mode must be a string');
    });

    it('should not throw for valid config', () => {
      const validConfig = {
        defaultMode: 'engineer'
      };

      expect(() => {
        registry.validateAndThrow(
          registry.getZccConfigValidator(),
          validConfig,
          'Test Config'
        );
      }).not.toThrow();
    });
  });
});