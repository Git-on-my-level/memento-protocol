import { InputValidator } from '../InputValidator';
import { ValidationError } from '../../errors';

describe('InputValidator', () => {
  describe('validateComponentName', () => {
    test('should accept valid component names', () => {
      expect(InputValidator.validateComponentName('my-component')).toBe('my-component');
      expect(InputValidator.validateComponentName('test123')).toBe('test123');
      expect(InputValidator.validateComponentName('comp_name')).toBe('comp_name');
      expect(InputValidator.validateComponentName('comp.name')).toBe('comp.name');
    });

    test('should reject empty names', () => {
      expect(() => InputValidator.validateComponentName('')).toThrow(ValidationError);
      expect(() => InputValidator.validateComponentName('   ')).toThrow(ValidationError);
    });

    test('should reject names with dangerous patterns', () => {
      expect(() => InputValidator.validateComponentName('../hack')).toThrow(ValidationError);
      expect(() => InputValidator.validateComponentName('eval(')).toThrow(ValidationError);
      expect(() => InputValidator.validateComponentName('__proto__')).toThrow(ValidationError);
    });

    test('should reject reserved names', () => {
      expect(() => InputValidator.validateComponentName('con')).toThrow(ValidationError);
      expect(() => InputValidator.validateComponentName('aux')).toThrow(ValidationError);
      expect(() => InputValidator.validateComponentName('node_modules')).toThrow(ValidationError);
    });

    test('should provide helpful error messages', () => {
      try {
        InputValidator.validateComponentName('../hack');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('potentially dangerous content');
        expect((error as ValidationError).suggestion).toContain('safe characters');
      }
    });
  });

  describe('sanitizePath', () => {
    test('should accept valid relative paths', () => {
      expect(InputValidator.sanitizePath('src/components')).toBe('src/components');
      expect(InputValidator.sanitizePath('file.txt')).toBe('file.txt');
    });

    test('should reject directory traversal attempts', () => {
      expect(() => InputValidator.sanitizePath('../../../etc/passwd')).toThrow(ValidationError);
      expect(() => InputValidator.sanitizePath('dir/../../../hack')).toThrow(ValidationError);
    });

    test('should validate path boundaries when base directory is provided', () => {
      const baseDir = '/project/root';
      expect(() => 
        InputValidator.sanitizePath('../../../outside', baseDir)
      ).toThrow(ValidationError);
    });
  });

  describe('validateTicketName', () => {
    test('should accept valid ticket names', () => {
      expect(InputValidator.validateTicketName('bug-fix-123')).toBe('bug-fix-123');
      expect(InputValidator.validateTicketName('feature-request')).toBe('feature-request');
    });

    test('should allow tickets with hyphens', () => {
      expect(InputValidator.validateTicketName('bug-fix-123')).toBe('bug-fix-123');
      expect(InputValidator.validateTicketName('feature-request-auth')).toBe('feature-request-auth');
    });
  });

  describe('validateTemplateContent', () => {
    test('should accept normal template content', () => {
      const content = '# Template\n\nThis is a normal template with some content.';
      expect(InputValidator.validateTemplateContent(content)).toBe(content);
    });

    test('should reject content with dangerous patterns', () => {
      expect(() => 
        InputValidator.validateTemplateContent('require("child_process")')
      ).toThrow(ValidationError);
      
      expect(() => 
        InputValidator.validateTemplateContent('eval("malicious code")')
      ).toThrow(ValidationError);
    });

    test('should reject excessively large content', () => {
      const largeContent = 'x'.repeat(2000000); // 2MB content
      expect(() => 
        InputValidator.validateTemplateContent(largeContent)
      ).toThrow(ValidationError);
    });
  });

  describe('validateConfigValue', () => {
    test('should accept normal config values', () => {
      expect(InputValidator.validateConfigValue('theme', 'dark')).toBe('dark');
      expect(InputValidator.validateConfigValue('port', 3000)).toBe(3000);
      expect(InputValidator.validateConfigValue('enabled', true)).toBe(true);
    });

    test('should reject dangerous string values', () => {
      expect(() => 
        InputValidator.validateConfigValue('command', 'eval("hack")')
      ).toThrow(ValidationError);
      
      expect(() => 
        InputValidator.validateConfigValue('path', '../../../hack')
      ).toThrow(ValidationError);
    });

    test('should handle null and undefined values', () => {
      expect(InputValidator.validateConfigValue('optional', null)).toBe(null);
      expect(InputValidator.validateConfigValue('optional', undefined)).toBe(undefined);
    });
  });

  describe('validateStringArray', () => {
    test('should accept valid string arrays', () => {
      const result = InputValidator.validateStringArray(
        ['tag1', 'tag2', 'tag3'], 
        'tags'
      );
      expect(result).toEqual(['tag1', 'tag2', 'tag3']);
    });

    test('should reject arrays with too many items', () => {
      const largeArray = Array(100).fill('item');
      expect(() => 
        InputValidator.validateStringArray(largeArray, 'tags', 10)
      ).toThrow(ValidationError);
    });

    test('should reject non-string items', () => {
      expect(() => 
        InputValidator.validateStringArray(['valid', 123, 'also-valid'], 'mixed')
      ).toThrow(ValidationError);
    });

    test('should reject items with dangerous content', () => {
      expect(() => 
        InputValidator.validateStringArray(['normal', '../hack'], 'tags')
      ).toThrow(ValidationError);
    });
  });

  describe('error messages and suggestions', () => {
    test('should provide specific error messages for different validation types', () => {
      // Component name validation
      try {
        InputValidator.validateComponentName('');
      } catch (error) {
        expect((error as ValidationError).message).toContain('is required and must be a string');
        expect((error as ValidationError).suggestion).toContain('component name');
      }

      // Path validation
      try {
        InputValidator.sanitizePath('../hack');
      } catch (error) {
        expect((error as ValidationError).message).toContain('directory traversal');
        expect((error as ValidationError).suggestion).toContain('file path format');
      }
    });

    test('should provide appropriate suggestions', () => {
      try {
        InputValidator.validateComponentName('con');
      } catch (error) {
        expect((error as ValidationError).suggestion).toContain('Choose a different');
        expect((error as ValidationError).suggestion).toContain('my-con');
      }
    });
  });

  describe('edge cases', () => {
    test('should handle non-string inputs gracefully', () => {
      expect(() => InputValidator.validateComponentName(123 as any)).toThrow(ValidationError);
      expect(() => InputValidator.validateComponentName(null as any)).toThrow(ValidationError);
      expect(() => InputValidator.validateComponentName({} as any)).toThrow(ValidationError);
    });

    test('should handle Unicode characters safely', () => {
      // Should reject Unicode control characters
      expect(() => InputValidator.validateComponentName('test\x00hack')).toThrow(ValidationError);
      expect(() => InputValidator.validateComponentName('test\x1fcontrol')).toThrow(ValidationError);
    });

    test('should handle very long inputs', () => {
      const longName = 'x'.repeat(200);
      expect(() => InputValidator.validateComponentName(longName)).toThrow(ValidationError);
      
      const longPath = 'path/' + 'x'.repeat(2000);
      expect(() => InputValidator.sanitizePath(longPath)).toThrow(ValidationError);
    });
  });
});