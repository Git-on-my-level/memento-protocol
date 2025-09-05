import { validateComponent, formatValidationIssues, ValidationIssue } from '../componentValidator';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

jest.mock('fs');
jest.mock('js-yaml');

describe('ComponentValidator', () => {
  let mockFs: jest.Mocked<typeof fs>;
  let mockYaml: jest.Mocked<typeof yaml>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs = fs as jest.Mocked<typeof fs>;
    mockYaml = yaml as jest.Mocked<typeof yaml>;
  });

  describe('validateComponent', () => {
    it('should validate a valid component', () => {
      const validContent = `---
name: test-mode
description: A test mode for validation
author: testuser
version: 1.0.0
---

# Test Mode

This is a comprehensive test mode with adequate content for validation.

## Behavioral Guidelines

- Follow these guidelines
- Be systematic
`;

      mockFs.readFileSync.mockReturnValue(validContent);
      mockYaml.load.mockReturnValue({
        name: 'test-mode',
        description: 'A test mode for validation',
        author: 'testuser',
        version: '1.0.0'
      });

      const result = validateComponent('/path/to/test-mode.md');

      expect(result.isValid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('should detect missing frontmatter', () => {
      const invalidContent = `# Test Mode

This mode is missing frontmatter completely.
`;

      mockFs.readFileSync.mockReturnValue(invalidContent);

      const result = validateComponent('/path/to/invalid-mode.md');

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toEqual({
        type: 'error',
        message: 'Missing YAML frontmatter at the beginning of the file',
        line: 1
      });
    });

    it('should detect malformed frontmatter', () => {
      const malformedContent = `---
name: test-mode
description: [unclosed array
---

# Test Mode
`;

      mockFs.readFileSync.mockReturnValue(malformedContent);
      mockYaml.load.mockImplementation(() => {
        throw new Error('Invalid YAML syntax');
      });

      const result = validateComponent('/path/to/malformed-mode.md');

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toEqual({
        type: 'error',
        message: 'Invalid YAML frontmatter: Invalid YAML syntax',
        line: 2
      });
    });

    it('should detect missing required fields', () => {
      const incompleteContent = `---
name: test-mode
description: A test mode
---

# Test Mode

Content here.
`;

      mockFs.readFileSync.mockReturnValue(incompleteContent);
      mockYaml.load.mockReturnValue({
        name: 'test-mode',
        description: 'A test mode'
        // missing author and version
      });

      const result = validateComponent('/path/to/incomplete-mode.md');

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(3); // 2 errors + 1 warning for short content
      expect(result.issues).toContainEqual({
        type: 'error',
        message: 'Missing required field: author'
      });
      expect(result.issues).toContainEqual({
        type: 'error',
        message: 'Missing required field: version'
      });
      expect(result.issues).toContainEqual({
        type: 'warning',
        message: 'Component content seems very short - consider adding more details'
      });
    });

    it('should detect invalid name format', () => {
      const invalidNameContent = `---
name: Invalid-Name-With-CAPS
description: A test mode
author: testuser
version: 1.0.0
---

# Test Mode

Content here.
`;

      mockFs.readFileSync.mockReturnValue(invalidNameContent);
      mockYaml.load.mockReturnValue({
        name: 'Invalid-Name-With-CAPS',
        description: 'A test mode',
        author: 'testuser',
        version: '1.0.0'
      });

      const result = validateComponent('/path/to/invalid-name-mode.md');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContainEqual({
        type: 'error',
        message: 'Field "name" must contain only lowercase letters, numbers, hyphens, and underscores'
      });
    });

    it('should warn about short description', () => {
      const shortDescContent = `---
name: test-mode
description: Short
author: testuser
version: 1.0.0
---

# Test Mode

This is adequate content for the component body that should not trigger warnings.
`;

      mockFs.readFileSync.mockReturnValue(shortDescContent);
      mockYaml.load.mockReturnValue({
        name: 'test-mode',
        description: 'Short',
        author: 'testuser',
        version: '1.0.0'
      });

      const result = validateComponent('/path/to/short-desc-mode.md');

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toEqual({
        type: 'warning',
        message: 'Description should be more descriptive (at least 10 characters)'
      });
    });

    it('should warn about short content', () => {
      const shortContent = `---
name: test-mode
description: A proper description
author: testuser
version: 1.0.0
---

# Short
`;

      mockFs.readFileSync.mockReturnValue(shortContent);
      mockYaml.load.mockReturnValue({
        name: 'test-mode',
        description: 'A proper description',
        author: 'testuser',
        version: '1.0.0'
      });

      const result = validateComponent('/path/to/short-content-mode.md');

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toEqual({
        type: 'warning',
        message: 'Component content seems very short - consider adding more details'
      });
    });

    it('should handle file read errors', () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = validateComponent('/path/to/unreadable-mode.md');

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toEqual({
        type: 'error',
        message: 'Failed to read or parse file: Permission denied'
      });
    });

    it('should handle missing closing frontmatter', () => {
      const unclosedContent = `---
name: test-mode
description: A test mode
author: testuser
version: 1.0.0

# Test Mode

This frontmatter is not properly closed.
`;

      mockFs.readFileSync.mockReturnValue(unclosedContent);

      const result = validateComponent('/path/to/unclosed-mode.md');

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toEqual({
        type: 'error',
        message: 'Malformed YAML frontmatter - missing closing "---"',
        line: 2
      });
    });
  });

  describe('formatValidationIssues', () => {
    it('should format errors with ✗ prefix', () => {
      const issues: ValidationIssue[] = [
        { type: 'error', message: 'Missing field', line: 5 }
      ];

      const formatted = formatValidationIssues(issues);

      expect(formatted).toEqual(['✗ Missing field (line 5)']);
    });

    it('should format warnings with ⚠ prefix', () => {
      const issues: ValidationIssue[] = [
        { type: 'warning', message: 'Short content' }
      ];

      const formatted = formatValidationIssues(issues);

      expect(formatted).toEqual(['⚠ Short content']);
    });

    it('should handle mixed issues', () => {
      const issues: ValidationIssue[] = [
        { type: 'error', message: 'Missing field', line: 5 },
        { type: 'warning', message: 'Short content' },
        { type: 'error', message: 'Invalid format' }
      ];

      const formatted = formatValidationIssues(issues);

      expect(formatted).toEqual([
        '✗ Missing field (line 5)',
        '⚠ Short content',
        '✗ Invalid format'
      ]);
    });

    it('should handle empty issues array', () => {
      const formatted = formatValidationIssues([]);

      expect(formatted).toEqual([]);
    });
  });
});