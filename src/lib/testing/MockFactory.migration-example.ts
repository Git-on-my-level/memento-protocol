/**
 * Example: Migrating existing tests to use MockFactory
 * 
 * This file shows a before/after comparison of migrating a real test file
 * from the Memento Protocol codebase to use the new MockFactory.
 */

// ============================================================================
// BEFORE: Traditional Jest mocking approach
// ============================================================================

/*
import { addCommand } from '../add';
import { MementoCore } from '../../lib/MementoCore';
import { logger } from '../../lib/logger';
import inquirer from 'inquirer';
import { createTestFileSystem } from '../../lib/testing';
import * as fs from 'fs';

jest.mock('../../lib/MementoCore');
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
jest.mock('../../lib/utils/filesystem', () => ({
  ensureDirectorySync: jest.fn(),
}));

describe('Add Command', () => {
  let mockCore: jest.Mocked<MementoCore>;
  let originalExit: any;
  let mockInquirer: jest.Mocked<typeof inquirer>;
  let testFs: any;
  let mockFs: jest.Mocked<typeof fs>;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Setup fs mocks - lots of boilerplate
    mockFs = fs as jest.Mocked<typeof fs>;
    mockFs.readFileSync.mockReturnValue('# Mock Component Content\n\nThis is a mock component.');
    mockFs.writeFileSync.mockReturnValue();
    mockFs.existsSync.mockReturnValue(true);
    
    // Create test filesystem
    testFs = await createTestFileSystem({
      '/project/.memento/config.json': JSON.stringify({ version: '1.0.0' }, null, 2),
      '/project/.memento/modes/architect.md': '# Architect Mode\n\nSystem design mode',
      '/project/.memento/workflows/review.md': '# Review Workflow\n\nCode review workflow'
    });

    // More boilerplate for MementoCore mock
    mockCore = {
      findComponents: jest.fn(),
      getComponentsByTypeWithSource: jest.fn(),
      getComponentConflicts: jest.fn(),
      getScopes: jest.fn(),
      clearCache: jest.fn(),
      generateSuggestions: jest.fn()
    } as any;

    mockInquirer = inquirer as jest.Mocked<typeof inquirer>;
    (MementoCore as jest.MockedClass<typeof MementoCore>).mockImplementation(() => mockCore);
    
    originalExit = process.exit;
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  describe('add mode', () => {
    it('should install a specific mode when exact match found', async () => {
      // Setup specific test data
      mockInquirer.prompt.mockResolvedValue({ confirm: true });
      
      const mockComponent = {
        component: {
          name: 'architect',
          type: 'mode' as const,
          path: '/templates/modes/architect.md',
          metadata: { description: 'System design mode' }
        },
        source: 'builtin' as const
      };
      
      mockCore.findComponents.mockResolvedValue([mockComponent]);
      
      // Test the functionality
      await addCommand(['mode', 'architect']);
      
      expect(mockCore.findComponents).toHaveBeenCalledWith({ 
        name: 'architect', 
        type: 'mode' 
      });
    });
  });
});
*/

// ============================================================================
// AFTER: Using MockFactory - Clean and declarative
// ============================================================================

import { addCommand } from '../add';
import { MementoCore } from '../../lib/MementoCore';
import { MockFactory, MockPresets, setupMockFactory } from '../../lib/testing';

// Simple jest mocks for modules that don't use MockFactory yet
jest.mock('../../lib/MementoCore');
jest.mock('../../lib/utils/filesystem', () => ({
  ensureDirectorySync: jest.fn(),
}));

// Automatic setup and cleanup
setupMockFactory();

describe('Add Command (Refactored)', () => {
  let mockCore: jest.Mocked<MementoCore>;
  let originalExit: any;

  beforeEach(async () => {
    // Clean mock setup with MockFactory
    const mockFs = MockFactory.fileSystem()
      .withFile('/component.md', '# Mock Component Content\n\nThis is a mock component.')
      .withFiles({
        '/project/.memento/config.json': JSON.stringify({ version: '1.0.0' }, null, 2),
        '/project/.memento/modes/architect.md': '# Architect Mode\n\nSystem design mode',
        '/project/.memento/workflows/review.md': '# Review Workflow\n\nCode review workflow'
      })
      .build();

    const mockInquirer = MockFactory.inquirer()
      .withConfirm(true)
      .build();

    const mockLogger = MockFactory.logger().build();

    // MementoCore mock (could be moved to MockFactory in the future)
    mockCore = {
      findComponents: jest.fn(),
      getComponentsByTypeWithSource: jest.fn(),
      getComponentConflicts: jest.fn(),
      getScopes: jest.fn(),
      clearCache: jest.fn(),
      generateSuggestions: jest.fn()
    } as any;

    (MementoCore as jest.MockedClass<typeof MementoCore>).mockImplementation(() => mockCore);
    
    originalExit = process.exit;
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  describe('add mode', () => {
    it('should install a specific mode when exact match found', async () => {
      // Test data setup
      const mockComponent = {
        component: {
          name: 'architect',
          type: 'mode' as const,
          path: '/templates/modes/architect.md',
          metadata: { description: 'System design mode' }
        },
        source: 'builtin' as const
      };
      
      mockCore.findComponents.mockResolvedValue([mockComponent]);
      
      // Test the functionality
      await addCommand(['mode', 'architect']);
      
      // Verify behavior
      expect(mockCore.findComponents).toHaveBeenCalledWith({ 
        name: 'architect', 
        type: 'mode' 
      });

      // Use MockFactory's verification helpers
      const history = MockFactory.getCallHistory();
      const loggerCalls = MockFactory.getCallHistory('logger.');
      const inquirerCalls = MockFactory.getCallHistory('inquirer.');
      
      // More detailed assertions possible with call history
      expect(loggerCalls.length).toBeGreaterThan(0);
      expect(inquirerCalls.length).toBeGreaterThan(0);
    });

    it('should handle interactive mode selection', async () => {
      // Use presets for common scenarios
      const mockFs = MockPresets.mementoFileSystem('/project').build();
      const mockInquirer = MockPresets.interactiveSetup().build();
      const mockLogger = MockPresets.silentLogger().build();

      // Setup multiple components for selection
      const mockComponents = [
        {
          component: {
            name: 'architect',
            type: 'mode' as const,
            path: '/templates/modes/architect.md',
            metadata: { description: 'System design mode' }
          },
          source: 'builtin' as const
        },
        {
          component: {
            name: 'engineer',
            type: 'mode' as const,
            path: '/templates/modes/engineer.md',
            metadata: { description: 'Engineering mode' }
          },
          source: 'builtin' as const
        }
      ];
      
      mockCore.findComponents.mockResolvedValue(mockComponents);
      
      // Test interactive selection
      await addCommand(['mode']);
      
      // Verify the interaction flow
      MockFactory.verifyMockCalls(mockCore.findComponents, [
        [{ type: 'mode' }]
      ]);
    });

    it('should handle file system errors gracefully', async () => {
      // Test error scenarios with MockFactory
      const mockFs = MockFactory.fileSystem()
        .withReadError('/templates/modes/architect.md', new Error('EACCES: permission denied'))
        .build();

      const mockLogger = MockFactory.logger().build();

      const mockComponent = {
        component: {
          name: 'architect',
          type: 'mode' as const,
          path: '/templates/modes/architect.md',
          metadata: { description: 'System design mode' }
        },
        source: 'builtin' as const
      };
      
      mockCore.findComponents.mockResolvedValue([mockComponent]);
      
      // Test error handling
      await addCommand(['mode', 'architect']);
      
      // Verify error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('permission denied')
      );
    });

    it('should track all mock interactions for debugging', async () => {
      // Setup mocks with tracking enabled
      const mockFs = MockFactory.fileSystem()
        .withFile('/component.md', 'content')
        .build();

      const mockInquirer = MockFactory.inquirer()
        .withConfirm(true)
        .build();

      const mockLogger = MockFactory.logger()
        .withTracking(true)
        .build();

      // Run test
      mockFs.readFileSync('/component.md');
      mockLogger.info('Test message');

      // Get comprehensive call history
      const allCalls = MockFactory.getCallHistory();
      const fsCalls = MockFactory.getCallHistory('fs.');
      const loggerCalls = MockFactory.getCallHistory('logger.');

      // Detailed verification
      expect(allCalls.length).toBe(2);
      expect(fsCalls.length).toBe(1);
      expect(loggerCalls.length).toBe(1);
      
      expect(fsCalls[0]).toMatchObject({
        method: 'fs.readFileSync',
        args: ['/component.md', undefined]
      });
      
      expect(loggerCalls[0]).toMatchObject({
        method: 'logger.info',
        args: ['Test message']
      });
    });
  });
});

// ============================================================================
// Key Benefits of the Migration:
// ============================================================================

/*
1. REDUCED BOILERPLATE
   - Before: 40+ lines of mock setup
   - After: 10-15 lines with clear, declarative intent

2. BETTER READABILITY  
   - Before: Manual jest.mock() setup scattered throughout
   - After: Fluent builder pattern that reads like documentation

3. CONSISTENT PATTERNS
   - Before: Each test file reinvents mock setup
   - After: Standardized patterns across all tests

4. ENHANCED DEBUGGING
   - Before: Limited visibility into mock calls
   - After: Comprehensive call history and verification helpers

5. ERROR SCENARIO TESTING
   - Before: Difficult to test error conditions
   - After: Easy configuration of error scenarios

6. PRESET CONFIGURATIONS
   - Before: Duplicate setup code for common scenarios
   - After: Reusable presets for Memento projects, interactive flows, etc.

7. AUTOMATIC CLEANUP
   - Before: Manual jest.clearAllMocks() in beforeEach
   - After: Automatic setup/cleanup with setupMockFactory()

8. BETTER MAINTENANCE
   - Before: Changes to mock APIs require updates in every test file
   - After: Centralized mock management, changes in one place

9. IMPROVED TEST ISOLATION
   - Before: Risk of state pollution between tests
   - After: Guaranteed clean state with automatic reset

10. ENHANCED VERIFICATION
    - Before: Basic expect() calls on mocks
    - After: Rich verification helpers and call tracking
*/

export {}; // Make this a module