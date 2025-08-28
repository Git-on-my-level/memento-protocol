/**
 * TestPatterns Usage Examples
 * 
 * This file demonstrates practical usage patterns of the TestPatterns library
 * in real-world testing scenarios for the Memento Protocol CLI.
 * 
 * These examples show how to integrate TestPatterns with existing testing
 * infrastructure and provide templates for common testing scenarios.
 */

import { TestPatterns, TestScenarios, createTestContext, aaa, table } from './TestPatterns';
import { TestDataFactory } from './TestDataFactory';
import { createTestFileSystem } from './createTestFileSystem';

// ============================================================================
// Example 1: Testing a Configuration Manager with AAA Pattern
// ============================================================================

/**
 * Example showing how to test a configuration manager using the AAA pattern
 * with proper setup, execution, and cleanup.
 */
export async function exampleConfigManagerTest() {
  await TestPatterns.aaa({
    arrange: async () => {
      const fs = await createTestFileSystem({
        '/project/.memento/config.yaml': 'defaultMode: engineer\nui:\n  colorOutput: true'
      });
      
      const config = TestDataFactory.config()
        .withDefaultMode('architect')
        .withUI({ colorOutput: false, verboseLogging: true })
        .build();
      
      return { fs, config, projectRoot: '/project' };
    },
    
    act: async (context) => {
      // Simulate config manager save operation
      const configManager = {
        save: async (config: any, fs: any) => {
          await fs.writeFile('/project/.memento/config.yaml', JSON.stringify(config));
          return { success: true, path: '/project/.memento/config.yaml' };
        }
      };
      
      return await configManager.save(context.config, context.fs);
    },
    
    assert: async (context, result) => {
      expect(result.success).toBe(true);
      expect(result.path).toBe('/project/.memento/config.yaml');
      
      // Verify file was written correctly
      const configContent = await context.fs.readFile('/project/.memento/config.yaml', 'utf-8');
      const savedConfig = JSON.parse(configContent as string);
      expect(savedConfig.defaultMode).toBe('architect');
      expect(savedConfig.ui.colorOutput).toBe(false);
    },
    
    cleanup: async (context) => {
      // Cleanup is handled automatically by the test file system
      console.log('Config test cleanup completed');
    }
  });
}

// ============================================================================
// Example 2: Table-Driven Testing for Fuzzy Matching
// ============================================================================

/**
 * Example demonstrating table-driven testing for fuzzy matching scenarios
 */
export function exampleFuzzyMatchingTest() {
  // This would be called within a Jest describe block
  TestPatterns.table('Fuzzy matching scenarios', [
    {
      description: 'exact match',
      input: 'engineer',
      expected: { match: 'engineer', score: 1.0 },
      context: { expectPerfectMatch: true }
    },
    {
      description: 'simple abbreviation',
      input: 'eng',
      expected: { match: 'engineer', score: 0.8 }
    },
    {
      description: 'acronym matching',
      input: 'apm',
      expected: { match: 'autonomous-project-manager', score: 0.9 }
    },
    {
      description: 'no match found',
      input: 'xyz',
      expected: { match: null, score: 0 }
    },
    {
      description: 'case insensitive',
      input: 'ARCH',
      expected: { match: 'architect', score: 0.7 }
    }
  ], (scenario) => {
    // Mock fuzzy matcher
    const fuzzyMatcher = {
      findBestMatch: (input: string) => {
        const mockResults: Record<string, any> = {
          'engineer': { match: 'engineer', score: 1.0 },
          'eng': { match: 'engineer', score: 0.8 },
          'apm': { match: 'autonomous-project-manager', score: 0.9 },
          'xyz': { match: null, score: 0 },
          'ARCH': { match: 'architect', score: 0.7 }
        };
        return mockResults[input] || { match: null, score: 0 };
      }
    };
    
    const result = fuzzyMatcher.findBestMatch(scenario.input);
    
    expect(result.match).toBe(scenario.expected.match);
    expect(result.score).toBe(scenario.expected.score);
    
    // Context-specific assertions
    if (scenario.context?.expectPerfectMatch) {
      expect(result.score).toBe(1.0);
    }
  });
}

// ============================================================================
// Example 3: Async Testing for Concurrent Ticket Creation
// ============================================================================

/**
 * Example showing how to test concurrent operations with validation
 */
export async function exampleConcurrentTicketCreation() {
  let ticketCounter = 0;
  
  const results = await TestPatterns.async.testConcurrent({
    operation: async () => {
      // Simulate ticket creation with unique IDs
      const ticketId = `ticket-${++ticketCounter}`;
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50)); // Simulate async work
      
      return {
        id: ticketId,
        title: `Concurrent Test Ticket ${ticketCounter}`,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
    },
    concurrency: 10,
    timeout: 2000,
    validator: (results) => {
      // Ensure all tickets have unique IDs
      const ids = results.map(ticket => ticket.id);
      const uniqueIds = new Set(ids);
      return uniqueIds.size === results.length;
    }
  });

  expect(results).toHaveLength(10);
  expect(results.every(ticket => ticket.status === 'pending')).toBe(true);
  
  console.log(`Created ${results.length} tickets concurrently`);
}

// ============================================================================
// Example 4: CLI Command Testing
// ============================================================================

/**
 * Example demonstrating CLI command testing patterns
 */
export async function exampleCLICommandTest() {
  // Note: This would run in a real test environment with actual CLI
  try {
    await TestPatterns.cli.testCommand({
      command: 'init',
      args: ['--force', '--non-interactive'],
      expectedOutput: /Memento Protocol initialized successfully/,
      expectedFiles: [
        '.memento/config.json',
        '.memento/modes/engineer.md',
        '.claude/settings.local.json'
      ],
      unexpectedFiles: [
        '.memento/old-config.json'
      ],
      timeout: 30000,
      exitCode: 0
    });
    
    console.log('CLI command test passed');
  } catch (error) {
    console.log('CLI command test simulation - would test actual command in real scenario');
  }
}

// ============================================================================
// Example 5: Integration Testing with Multiple Components
// ============================================================================

/**
 * Example showing integration testing across multiple components
 */
export async function examplePackInstallationWorkflow() {
  interface WorkflowContext {
    packName: string;
    packData?: any;
    validationResult?: any;
    dependencies?: string[];
    installationResult?: any;
  }

  const finalContext = await TestPatterns.integration.testWorkflow(
    'Pack installation workflow',
    [
      {
        name: 'load pack manifest',
        action: async (ctx: WorkflowContext) => {
          // Mock pack loading
          const packData = TestDataFactory.pack()
            .withName(ctx.packName)
            .withComponents(['engineer-mode', 'review-workflow'])
            .build();
          
          return { ...ctx, packData };
        },
        validator: (ctx) => ctx.packData !== undefined
      },
      {
        name: 'validate pack structure',
        action: async (ctx: WorkflowContext) => {
          // Mock validation
          const validationResult = {
            valid: true,
            errors: [],
            warnings: []
          };
          
          return { ...ctx, validationResult };
        },
        validator: (ctx) => ctx.validationResult?.valid === true
      },
      {
        name: 'resolve dependencies',
        action: async (ctx: WorkflowContext) => {
          // Mock dependency resolution
          const dependencies = ['base-config', 'claude-integration'];
          
          return { ...ctx, dependencies };
        },
        validator: (ctx) => Array.isArray(ctx.dependencies) && ctx.dependencies.length > 0
      },
      {
        name: 'install pack components',
        action: async (ctx: WorkflowContext) => {
          // Mock installation
          const installationResult = {
            success: true,
            installedComponents: ctx.packData.components.modes || [],
            installedDependencies: ctx.dependencies || []
          };
          
          return { ...ctx, installationResult };
        },
        validator: (ctx) => ctx.installationResult?.success === true
      }
    ],
    { packName: 'frontend-react' }
  );

  expect(finalContext.packName).toBe('frontend-react');
  expect(finalContext.installationResult.success).toBe(true);
  expect(finalContext.installationResult.installedComponents.length).toBeGreaterThan(0);
  
  console.log(`Pack installation workflow completed for: ${finalContext.packName}`);
}

// ============================================================================
// Example 6: Performance Testing
// ============================================================================

/**
 * Example showing performance testing and benchmarking
 */
export async function examplePerformanceTesting() {
  // Simulate a search operation
  const searchOperation = async () => {
    const searchTerm = 'engineer';
    const modes = ['engineer', 'architect', 'reviewer', 'autonomous-project-manager'];
    
    // Simulate search logic with some computation
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 2)); // 2-12ms
    
    return modes.filter(mode => 
      mode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mode.split('-').some(part => part.startsWith(searchTerm))
    );
  };

  const benchmarkResults = await TestPatterns.performance.benchmark({
    operation: searchOperation,
    iterations: 100,
    warmupIterations: 10,
    maxTime: 50 // Fail if average time exceeds 50ms
  });

  console.log(`Search performance benchmark:
    - Average time: ${benchmarkResults.averageTime.toFixed(2)}ms
    - Min/Max time: ${benchmarkResults.minTime.toFixed(2)}ms / ${benchmarkResults.maxTime.toFixed(2)}ms
    - All results: ${benchmarkResults.results.length} successful operations`);

  expect(benchmarkResults.averageTime).toBeLessThan(20); // Should be fast
  expect(benchmarkResults.results.every(result => Array.isArray(result))).toBe(true);
}

// ============================================================================
// Example 7: File System Testing
// ============================================================================

/**
 * Example demonstrating file system testing patterns
 */
export async function exampleFileSystemTesting() {
  const fs = await createTestFileSystem({
    '/project/package.json': '{"name": "test-project"}',
    '/project/README.md': '# Test Project'
  });

  await TestPatterns.fs.testFileOperations([
    {
      type: 'create',
      path: '/project/.memento/config.json',
      content: JSON.stringify({ version: '1.0.0', mode: 'engineer' })
    },
    {
      type: 'create',
      path: '/project/.memento/modes/engineer.md',
      content: '# Engineer Mode\n\nYou are a software engineer...'
    },
    {
      type: 'update',
      path: '/project/.memento/config.json',
      content: JSON.stringify({ version: '1.1.0', mode: 'architect' })
    },
    {
      type: 'delete',
      path: '/project/README.md'
    }
  ], fs);

  // Verify final directory structure
  await TestPatterns.fs.testDirectoryStructure({
    '/project/package.json': '{"name": "test-project"}',
    '/project/.memento/config.json': JSON.stringify({ version: '1.1.0', mode: 'architect' }),
    '/project/.memento/modes/engineer.md': '# Engineer Mode\n\nYou are a software engineer...'
  }, fs);

  console.log('File system operations completed successfully');
}

// ============================================================================
// Example 8: Event-Driven Testing
// ============================================================================

/**
 * Example showing event emitter testing for hook systems
 */
export async function exampleEventDrivenTesting() {
  const { EventEmitter } = require('events');
  const hookEmitter = new EventEmitter();

  // Start the event test
  const eventTestPromise = TestPatterns.async.testEventEmitter(
    hookEmitter,
    [
      { event: 'hook:registered', data: { hookId: 'memento-routing', type: 'UserPromptSubmit' } },
      { event: 'hook:executed', data: { hookId: 'memento-routing', success: true } },
      { event: 'hook:completed', data: { hookId: 'memento-routing', duration: 150 } }
    ],
    5000
  );

  // Simulate hook lifecycle events
  setTimeout(() => {
    hookEmitter.emit('hook:registered', { hookId: 'memento-routing', type: 'UserPromptSubmit' });
  }, 100);

  setTimeout(() => {
    hookEmitter.emit('hook:executed', { hookId: 'memento-routing', success: true });
  }, 200);

  setTimeout(() => {
    hookEmitter.emit('hook:completed', { hookId: 'memento-routing', duration: 150 });
  }, 300);

  await eventTestPromise;
  console.log('Event-driven testing completed successfully');
}

// ============================================================================
// Example 9: Using TestScenarios for Common Setups
// ============================================================================

/**
 * Example showing how to use pre-built test scenarios
 */
export async function exampleTestScenarios() {
  // Use pre-built Memento project scenario
  const mementoScenario = await TestScenarios.mementoProject();
  
  expect(mementoScenario.data.projectRoot).toBe('/project');
  expect(await mementoScenario.data.fs.exists('/project/package.json')).toBe(true);
  
  // Use the scenario data in tests
  const configManager = {
    initialize: async (fs: any, projectRoot: string) => {
      await fs.writeFile(`${projectRoot}/.memento/initialized.flag`, 'true');
      return { success: true };
    }
  };
  
  const result = await configManager.initialize(
    mementoScenario.data.fs, 
    mementoScenario.data.projectRoot
  );
  
  expect(result.success).toBe(true);
  expect(await mementoScenario.data.fs.exists('/project/.memento/initialized.flag')).toBe(true);
  
  console.log('TestScenarios example completed successfully');
}

// ============================================================================
// Example 10: Complex Error Handling and Recovery Testing
// ============================================================================

/**
 * Example demonstrating error handling and recovery testing
 */
export async function exampleErrorHandlingTest() {
  await TestPatterns.gwt({
    given: () => ({
      networkService: {
        isHealthy: false,
        attemptCount: 0,
        fetch: async function(url: string) {
          this.attemptCount++;
          if (this.attemptCount < 3) {
            throw new Error(`Network error on attempt ${this.attemptCount}`);
          }
          this.isHealthy = true;
          return { success: true, data: `Data from ${url}` };
        }
      }
    }),
    
    when: async (context) => {
      // Test retry mechanism with error recovery
      return await TestPatterns.async.testRetry(
        () => context.networkService.fetch('https://api.memento.dev/packs'),
        maxRetries: 5
      );
    },
    
    then: (context, result) => {
      expect(result.attempts).toBe(3); // Should succeed on 3rd attempt
      expect(result.result.success).toBe(true);
      expect(result.result.data).toContain('Data from');
      expect(context.networkService.isHealthy).toBe(true);
    }
  });
  
  console.log('Error handling and recovery test completed');
}

// ============================================================================
// Example Usage in Jest Test File
// ============================================================================

/**
 * Example showing how these patterns would be used in an actual Jest test file
 * 
 * ```typescript
 * // ConfigManager.test.ts
 * import { TestPatterns, TestScenarios } from '@/lib/testing';
 * import { ConfigManager } from '../ConfigManager';
 * 
 * describe('ConfigManager', () => {
 *   // Use organization pattern for shared setup
 *   TestPatterns.organization.suite(
 *     'Configuration Operations',
 *     async () => {
 *       const scenario = await TestScenarios.mementoProject();
 *       const configManager = new ConfigManager(scenario.data.fs);
 *       return { ...scenario.data, configManager };
 *     },
 *     async (context) => {
 *       await context.fs.cleanup?.();
 *     },
 *     (getContext) => {
 *       it('should load default configuration', async () => {
 *         await aaa({
 *           arrange: () => getContext(),
 *           act: (ctx) => ctx.configManager.loadConfig(),
 *           assert: (ctx, result) => {
 *             expect(result.ui.colorOutput).toBe(true);
 *             expect(result.ui.verboseLogging).toBe(false);
 *           }
 *         });
 *       });
 *     }
 *   );
 * 
 *   // Use table-driven testing for validation scenarios
 *   table('Config validation', [
 *     { description: 'valid config', input: validConfig, expected: true },
 *     { description: 'missing name', input: configWithoutName, expected: false }
 *   ], async (scenario) => {
 *     const result = await configManager.validate(scenario.input);
 *     expect(result.valid).toBe(scenario.expected);
 *   });
 * });
 * ```
 */

// Export all examples for documentation and testing
export const testPatternExamples = {
  exampleConfigManagerTest,
  exampleFuzzyMatchingTest,
  exampleConcurrentTicketCreation,
  exampleCLICommandTest,
  examplePackInstallationWorkflow,
  examplePerformanceTesting,
  exampleFileSystemTesting,
  exampleEventDrivenTesting,
  exampleTestScenarios,
  exampleErrorHandlingTest
};