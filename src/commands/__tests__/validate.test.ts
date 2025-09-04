import { validateCommand } from '../validate';
import { ZccCore } from '../../lib/ZccCore';
import { logger } from '../../lib/logger';
import inquirer from 'inquirer';
import { createTestFileSystem } from '../../lib/testing';
import * as fs from 'fs';

jest.mock('../../lib/ZccCore');
jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }
}));
jest.mock('inquirer', () => ({
  prompt: jest.fn()
}));
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
}));

describe('Validate Command', () => {
  let mockCore: jest.Mocked<ZccCore>;
  let originalExit: any;
  let mockInquirer: jest.Mocked<typeof inquirer>;
  let mockFs: jest.Mocked<typeof fs>;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Setup fs mocks
    mockFs = fs as jest.Mocked<typeof fs>;
    mockFs.existsSync.mockReturnValue(true);
    
    // Create test filesystem
    await createTestFileSystem({
      '/project/.zcc/config.json': JSON.stringify({ version: '1.0.0' }, null, 2),
      '/project/.zcc/modes/valid-mode.md': `---
name: valid-mode
description: A valid mode for testing
author: testuser
version: 1.0.0
tags: []
dependencies: []
---

# Valid Mode

This is a valid mode with proper structure.

## Behavioral Guidelines

- Follow these guidelines
- Be systematic

## Example Process

### Phase 1: Analysis
- Do analysis

### Phase 2: Implementation  
- Implement solution
`,
      '/project/.zcc/modes/invalid-mode.md': `# Invalid Mode

This mode is missing frontmatter completely.
`,
      '/project/.zcc/workflows/valid-workflow.md': `---
name: valid-workflow
description: A valid workflow
author: testuser
version: 1.0.0
---

# Valid Workflow

This workflow is properly structured.

## Workflow Steps

### 1. Preparation
- Prepare

### 2. Execution  
- Execute
`
    });

    // Setup mocks
    mockCore = new ZccCore('') as jest.Mocked<ZccCore>;
    mockInquirer = inquirer as jest.Mocked<typeof inquirer>;
    
    // Mock exit to prevent test termination
    originalExit = process.exit;
    process.exit = jest.fn() as any;

    // Reset console spies
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    process.exit = originalExit;
    jest.restoreAllMocks();
  });

  describe('validate specific component', () => {
    it('should validate a valid mode successfully', async () => {
      const validContent = `---
name: valid-mode
description: A valid mode for testing
author: testuser
version: 1.0.0
tags: []
dependencies: []
---

# Valid Mode

This is a valid mode with proper structure.

## Behavioral Guidelines

- Follow these guidelines
- Be systematic

## Example Process

### Phase 1: Analysis
- Do analysis
`;

      const mockComponent = {
        name: 'valid-mode',
        component: {
          name: 'valid-mode',
          type: 'mode' as const,
          path: '/project/.zcc/modes/valid-mode.md',
          metadata: { description: 'A valid mode' }
        },
        source: 'project' as const,
        score: 100,
        matchType: 'exact' as const
      };

      mockCore.findComponents.mockResolvedValueOnce([mockComponent]);
      mockFs.readFileSync.mockReturnValue(validContent);

      await validateCommand.parseAsync(['mode', 'valid-mode'], { from: 'user' });

      expect(logger.success).toHaveBeenCalledWith("Mode 'valid-mode' is valid!");
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should report errors for invalid component', async () => {
      const invalidContent = `# Invalid Mode

This mode is missing frontmatter completely.
`;

      const mockComponent = {
        name: 'invalid-mode',
        component: {
          name: 'invalid-mode',
          type: 'mode' as const,
          path: '/project/.zcc/modes/invalid-mode.md',
          metadata: {}
        },
        source: 'project' as const,
        score: 100,
        matchType: 'exact' as const
      };

      mockCore.findComponents.mockResolvedValueOnce([mockComponent]);
      mockFs.readFileSync.mockReturnValue(invalidContent);

      await validateCommand.parseAsync(['mode', 'invalid-mode'], { from: 'user' });

      expect(logger.error).toHaveBeenCalledWith('Errors found:');
      expect(logger.error).toHaveBeenCalledWith('  • Missing YAML frontmatter at the beginning of the file');
      expect(logger.error).toHaveBeenCalledWith("Mode 'invalid-mode' has validation errors.");
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should report warnings for components with issues', async () => {
      const contentWithWarnings = `---
name: mode-with-warnings
description: Short
author: testuser
version: 1.0.0
---

# Mode With Warnings

Very short content.
`;

      const mockComponent = {
        name: 'mode-with-warnings',
        component: {
          name: 'mode-with-warnings',
          type: 'mode' as const,
          path: '/project/.zcc/modes/mode-with-warnings.md',
          metadata: {}
        },
        source: 'project' as const,
        score: 100,
        matchType: 'exact' as const
      };

      mockCore.findComponents.mockResolvedValueOnce([mockComponent]);
      mockFs.readFileSync.mockReturnValue(contentWithWarnings);

      await validateCommand.parseAsync(['mode', 'mode-with-warnings'], { from: 'user' });

      expect(logger.warn).toHaveBeenCalledWith('Warnings:');
      expect(logger.warn).toHaveBeenCalledWith('  • Description should be more descriptive (at least 10 characters)');
      expect(logger.warn).toHaveBeenCalledWith('  • Component content seems very short - consider adding more details');
      expect(logger.success).toHaveBeenCalledWith("Mode 'mode-with-warnings' is valid!");
    });

    it('should suppress warnings in quiet mode', async () => {
      const contentWithWarnings = `---
name: mode-with-warnings
description: Short
author: testuser
version: 1.0.0
---

# Mode With Warnings

Very short content.
`;

      const mockComponent = {
        name: 'mode-with-warnings',
        component: {
          name: 'mode-with-warnings',
          type: 'mode' as const,
          path: '/project/.zcc/modes/mode-with-warnings.md',
          metadata: {}
        },
        source: 'project' as const,
        score: 100,
        matchType: 'exact' as const
      };

      mockCore.findComponents.mockResolvedValueOnce([mockComponent]);
      mockFs.readFileSync.mockReturnValue(contentWithWarnings);

      await validateCommand.parseAsync(['mode', 'mode-with-warnings', '--quiet'], { from: 'user' });

      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.success).toHaveBeenCalledWith("Mode 'mode-with-warnings' is valid!");
    });

    it('should handle component not found', async () => {
      mockCore.findComponents.mockResolvedValueOnce([]);

      await validateCommand.parseAsync(['mode', 'nonexistent'], { from: 'user' });

      expect(logger.error).toHaveBeenCalledWith("Mode 'nonexistent' not found.");
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle multiple matches', async () => {
      const matches = [
        {
          name: 'mode-v1',
          component: {
            name: 'mode-v1',
            type: 'mode' as const,
            path: '/project/.zcc/modes/mode-v1.md',
            metadata: {}
          },
          source: 'project' as const,
          score: 100,
          matchType: 'substring' as const
        },
        {
          name: 'mode-v2',
          component: {
            name: 'mode-v2',
            type: 'mode' as const,
            path: '/project/.zcc/modes/mode-v2.md',
            metadata: {}
          },
          source: 'project' as const,
          score: 90,
          matchType: 'substring' as const
        }
      ];

      mockCore.findComponents.mockResolvedValueOnce(matches);
      mockInquirer.prompt.mockResolvedValueOnce({ selected: matches[0] });

      const validContent = `---
name: mode-v1
description: A valid mode
author: testuser
version: 1.0.0
---

# Mode V1

Valid content here.
`;

      mockFs.readFileSync.mockReturnValue(validContent);

      await validateCommand.parseAsync(['mode', 'mode'], { from: 'user' });

      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'list',
          name: 'selected',
          message: 'Which component would you like to validate?'
        })
      ]);
      expect(logger.success).toHaveBeenCalledWith("Mode 'mode-v1' is valid!");
    });
  });

  describe('validate by type', () => {
    it('should validate all components of a type', async () => {
      const mockComponents = [
        {
          component: {
            name: 'valid-mode',
            type: 'mode' as const,
            path: '/project/.zcc/modes/valid-mode.md',
            metadata: {}
          },
          source: 'project' as const
        },
        {
          component: {
            name: 'invalid-mode',
            type: 'mode' as const,
            path: '/project/.zcc/modes/invalid-mode.md',
            metadata: {}
          },
          source: 'project' as const
        }
      ];

      mockCore.getComponentsByTypeWithSource.mockResolvedValueOnce(mockComponents);
      
      mockFs.readFileSync
        .mockReturnValueOnce(`---
name: valid-mode
description: Valid mode
author: test
version: 1.0.0
---

# Valid Mode

Content here.
`)
        .mockReturnValueOnce('# Invalid Mode\n\nNo frontmatter');

      await validateCommand.parseAsync(['mode'], { from: 'user' });

      expect(logger.info).toHaveBeenCalledWith('Validating 2 mode(s)...');
      expect(logger.error).toHaveBeenCalledWith('  • Missing YAML frontmatter at the beginning of the file');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle no components of type found', async () => {
      mockCore.getComponentsByTypeWithSource.mockResolvedValueOnce([]);

      await validateCommand.parseAsync(['agent'], { from: 'user' });

      expect(logger.info).toHaveBeenCalledWith('No agents found to validate.');
      expect(process.exit).not.toHaveBeenCalled();
    });
  });

  describe('validate all components', () => {
    it('should validate all component types', async () => {
      // Mock components for different types
      mockCore.getComponentsByTypeWithSource
        .mockResolvedValueOnce([ // modes
          {
            component: {
              name: 'valid-mode',
              type: 'mode' as const,
              path: '/project/.zcc/modes/valid-mode.md',
              metadata: {}
            },
            source: 'project' as const
          }
        ])
        .mockResolvedValueOnce([ // workflows
          {
            component: {
              name: 'valid-workflow',
              type: 'workflow' as const,
              path: '/project/.zcc/workflows/valid-workflow.md',
              metadata: {}
            },
            source: 'project' as const
          }
        ])
        .mockResolvedValueOnce([]); // agents (empty)

      mockFs.readFileSync
        .mockReturnValueOnce(`---
name: valid-mode
description: Valid mode
author: test
version: 1.0.0
---

# Valid Mode

## Behavioral Guidelines

Content here.
`)
        .mockReturnValueOnce(`---
name: valid-workflow
description: Valid workflow
author: test
version: 1.0.0
---

# Valid Workflow

## Workflow Steps

Content here.
`);

      await validateCommand.parseAsync(['all'], { from: 'user' });

      expect(logger.info).toHaveBeenCalledWith('Validating all components...');
      expect(logger.info).toHaveBeenCalledWith('Modes:');
      expect(logger.info).toHaveBeenCalledWith('Workflows:');
      expect(logger.info).toHaveBeenCalledWith('Validation Summary:');
      expect(logger.info).toHaveBeenCalledWith('  Components validated: 2');
      expect(process.exit).not.toHaveBeenCalled();
    });
  });

  describe('strict validation', () => {
    it('should perform additional checks in strict mode', async () => {
      const contentWithStrictIssues = `---
name: strict-mode
description: A mode for strict validation
author: testuser
version: 1.0.0
---

# Strict Mode

This line is extremely long and should trigger a warning in strict mode because it exceeds the 120 character limit that is enforced.

Content with {{PLACEHOLDER}} text.

## Single Section

Not much structure here.
`;

      const mockComponent = {
        name: 'strict-mode',
        component: {
          name: 'strict-mode',
          type: 'mode' as const,
          path: '/project/.zcc/modes/strict-mode.md',
          metadata: {}
        },
        source: 'project' as const,
        score: 100,
        matchType: 'exact' as const
      };

      mockCore.findComponents.mockResolvedValueOnce([mockComponent]);
      mockFs.readFileSync.mockReturnValue(contentWithStrictIssues);

      await validateCommand.parseAsync(['mode', 'strict-mode', '--strict'], { from: 'user' });

      expect(logger.warn).toHaveBeenCalledWith('  • Line is very long - consider breaking it up for readability');
      expect(logger.warn).toHaveBeenCalledWith('  • Contains placeholder text: {{');
      expect(logger.warn).toHaveBeenCalledWith('  • Component should have multiple sections for comprehensive guidance');
    });
  });

  describe('validation errors', () => {
    it('should handle malformed YAML frontmatter', async () => {
      const malformedContent = `---
name: malformed
description: [unclosed array
---

# Content
`;

      const mockComponent = {
        name: 'malformed',
        component: {
          name: 'malformed',
          type: 'mode' as const,
          path: '/project/.zcc/modes/malformed.md',
          metadata: {}
        },
        source: 'project' as const,
        score: 100,
        matchType: 'exact' as const
      };

      mockCore.findComponents.mockResolvedValueOnce([mockComponent]);
      mockFs.readFileSync.mockReturnValue(malformedContent);

      await validateCommand.parseAsync(['mode', 'malformed'], { from: 'user' });

      expect(logger.error).toHaveBeenCalledWith('Errors found:');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid YAML frontmatter'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle file read errors', async () => {
      const mockComponent = {
        name: 'unreadable',
        component: {
          name: 'unreadable',
          type: 'mode' as const,
          path: '/project/.zcc/modes/unreadable.md',
          metadata: {}
        },
        source: 'project' as const,
        score: 100,
        matchType: 'exact' as const
      };

      mockCore.findComponents.mockResolvedValueOnce([mockComponent]);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await validateCommand.parseAsync(['mode', 'unreadable'], { from: 'user' });

      expect(logger.error).toHaveBeenCalledWith('  • Failed to read or parse file: Permission denied');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('validation', () => {
    it('should reject invalid component type', async () => {
      await validateCommand.parseAsync(['invalid', 'name'], { from: 'user' });

      expect(logger.error).toHaveBeenCalledWith('Invalid component type: invalid');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('type-specific validation', () => {
    it('should check workflow-specific sections', async () => {
      const workflowContent = `---
name: test-workflow
description: Test workflow
author: test
version: 1.0.0
---

# Test Workflow

Just basic content without proper workflow structure.
`;

      const mockComponent = {
        name: 'test-workflow',
        component: {
          name: 'test-workflow',
          type: 'workflow' as const,
          path: '/project/.zcc/workflows/test-workflow.md',
          metadata: {}
        },
        source: 'project' as const,
        score: 100,
        matchType: 'exact' as const
      };

      mockCore.findComponents.mockResolvedValueOnce([mockComponent]);
      mockFs.readFileSync.mockReturnValue(workflowContent);

      await validateCommand.parseAsync(['workflow', 'test-workflow'], { from: 'user' });

      expect(logger.warn).toHaveBeenCalledWith('  • Workflow should specify prerequisites or inputs');
      expect(logger.warn).toHaveBeenCalledWith('  • Workflow should include workflow steps section');
      expect(logger.warn).toHaveBeenCalledWith('  • Workflow should specify expected outputs');
    });

    it('should check agent-specific sections', async () => {
      const agentContent = `---
name: test-agent
description: Test agent
author: test
version: 1.0.0
---

# Test Agent

Basic agent without proper structure.
`;

      const mockComponent = {
        name: 'test-agent',
        component: {
          name: 'test-agent',
          type: 'agent' as const,
          path: '/project/.zcc/agents/test-agent.md',
          metadata: {}
        },
        source: 'project' as const,
        score: 100,
        matchType: 'exact' as const
      };

      mockCore.findComponents.mockResolvedValueOnce([mockComponent]);
      mockFs.readFileSync.mockReturnValue(agentContent);

      await validateCommand.parseAsync(['agent', 'test-agent'], { from: 'user' });

      expect(logger.warn).toHaveBeenCalledWith('  • Agent should specify required tools in frontmatter');
      expect(logger.warn).toHaveBeenCalledWith('  • Agent should include "## Core Responsibilities" section');
      expect(logger.warn).toHaveBeenCalledWith('  • Agent should include process guidelines or response guidelines');
    });
  });
});