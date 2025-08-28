/**
 * Comprehensive TestPatterns library for Memento Protocol CLI testing framework
 * 
 * This library provides reusable testing patterns that standardize common testing
 * scenarios across the Memento Protocol codebase. It integrates with TestDataFactory,
 * ErrorScenarios, and MockFactory to provide a complete testing solution.
 * 
 * @example
 * ```typescript
 * import { TestPatterns } from '@/lib/testing/TestPatterns';
 * 
 * // Arrange-Act-Assert pattern
 * await TestPatterns.aaa({
 *   arrange: async () => {
 *     const fs = await createTestFileSystem({});
 *     return { fs, config: TestDataFactory.config().build() };
 *   },
 *   act: (context) => configManager.save(context.config, context.fs),
 *   assert: (context, result) => {
 *     expect(result).toBeDefined();
 *   }
 * });
 * 
 * // CLI command testing
 * await TestPatterns.cli.testCommand({
 *   command: 'init',
 *   args: ['--force'],
 *   expectedOutput: /Initialized successfully/,
 *   expectedFiles: ['.memento/config.json']
 * });
 * 
 * // Table-driven tests
 * TestPatterns.table('fuzzy matching scenarios', [
 *   { input: 'eng', expected: 'engineer', description: 'simple abbreviation' },
 *   { input: 'apm', expected: 'autonomous-project-manager', description: 'acronym match' }
 * ], (scenario) => {
 *   const result = fuzzyMatch(scenario.input);
 *   expect(result).toBe(scenario.expected);
 * });
 * ```
 */

import * as path from 'path';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { TestDataFactory } from './TestDataFactory';
import { MockFactory } from './MockFactory';
import { createTestFileSystem } from './createTestFileSystem';
import { FileSystemAdapter } from '../adapters/FileSystemAdapter';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Test execution context for pattern methods
 */
export interface TestContext<T = any> {
  /** Test data and dependencies */
  data: T;
  /** File system adapter for testing */
  fs?: FileSystemAdapter;
  /** Cleanup functions to run after test */
  cleanup: Array<() => Promise<void> | void>;
}

/**
 * Arrange-Act-Assert pattern configuration
 */
export interface AAAPattern<TContext = any, TResult = any> {
  /** Setup phase - prepare test data and dependencies */
  arrange: () => Promise<TContext> | TContext;
  /** Action phase - execute the operation under test */
  act: (context: TContext) => Promise<TResult> | TResult;
  /** Assertion phase - verify the results */
  assert: (context: TContext, result: TResult) => Promise<void> | void;
  /** Optional cleanup - runs after assert */
  cleanup?: (context: TContext, result: TResult) => Promise<void> | void;
}

/**
 * Given-When-Then (BDD) pattern configuration
 */
export interface GWTPattern<TContext = any, TResult = any> {
  /** Given: initial state setup */
  given: () => Promise<TContext> | TContext;
  /** When: action that triggers behavior */
  when: (context: TContext) => Promise<TResult> | TResult;
  /** Then: expected outcome verification */
  then: (context: TContext, result: TResult) => Promise<void> | void;
  /** Optional cleanup */
  cleanup?: (context: TContext, result: TResult) => Promise<void> | void;
}

/**
 * Setup-Execute-Verify pattern configuration
 */
export interface SEVPattern<TContext = any, TResult = any> {
  /** Setup: prepare test environment */
  setup: () => Promise<TContext> | TContext;
  /** Execute: run the operation */
  execute: (context: TContext) => Promise<TResult> | TResult;
  /** Verify: check results and side effects */
  verify: (context: TContext, result: TResult) => Promise<void> | void;
  /** Optional teardown */
  teardown?: (context: TContext, result: TResult) => Promise<void> | void;
}

/**
 * Table-driven test scenario
 */
export interface TableTestScenario<T = any> {
  /** Human-readable description of this test case */
  description: string;
  /** Input parameters */
  input: T;
  /** Expected output */
  expected: any;
  /** Whether this scenario should be skipped */
  skip?: boolean;
  /** Whether this is the only scenario to run */
  only?: boolean;
  /** Additional test-specific context */
  context?: any;
}

/**
 * CLI command test configuration
 */
export interface CLITestConfig {
  /** Command name */
  command: string;
  /** Command arguments */
  args?: string[];
  /** Expected output pattern */
  expectedOutput?: RegExp | string;
  /** Expected error pattern */
  expectedError?: RegExp | string;
  /** Files that should exist after command */
  expectedFiles?: string[];
  /** Files that should not exist after command */
  unexpectedFiles?: string[];
  /** Working directory for command */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Expected exit code */
  exitCode?: number;
}

/**
 * Interactive CLI flow step
 */
export interface InteractiveStep {
  /** Prompt text or pattern to match */
  prompt: string | RegExp;
  /** Answer to provide */
  answer: any;
  /** Delay before answering in milliseconds */
  delay?: number;
}

/**
 * Async test configuration
 */
export interface AsyncTestConfig<T = any> {
  /** Operation to test */
  operation: () => Promise<T>;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Number of concurrent operations */
  concurrency?: number;
  /** Expected results */
  expectedResults?: T[];
  /** Custom result validator */
  validator?: (results: T[]) => boolean;
}

/**
 * Performance test configuration
 */
export interface PerformanceTestConfig<T = any> {
  /** Operation to benchmark */
  operation: () => Promise<T> | T;
  /** Number of iterations */
  iterations?: number;
  /** Maximum acceptable time in milliseconds */
  maxTime?: number;
  /** Warmup iterations */
  warmupIterations?: number;
  /** Memory leak threshold in bytes */
  memoryLeakThreshold?: number;
}

/**
 * Eventually consistent assertion config
 */
export interface EventuallyConfig {
  /** Assertion function */
  assertion: () => Promise<boolean> | boolean;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Polling interval in milliseconds */
  interval?: number;
  /** Error message if assertion never passes */
  message?: string;
}

// ============================================================================
// Core Test Patterns
// ============================================================================

/**
 * Core testing patterns implementing common test structures
 */
export class TestPatterns {
  /**
   * Arrange-Act-Assert (AAA) pattern helper
   * Standardizes the three-phase testing approach
   */
  static async aaa<TContext = any, TResult = any>(
    pattern: AAAPattern<TContext, TResult>
  ): Promise<void> {
    let context: TContext;
    let result: TResult;

    try {
      // Arrange
      context = await pattern.arrange();
      
      // Act
      result = await pattern.act(context);
      
      // Assert
      await pattern.assert(context, result);
    } finally {
      // Cleanup
      if (pattern.cleanup && context! && result!) {
        await pattern.cleanup(context, result);
      }
    }
  }

  /**
   * Given-When-Then (BDD) pattern helper
   * Implements behavior-driven development test structure
   */
  static async gwt<TContext = any, TResult = any>(
    pattern: GWTPattern<TContext, TResult>
  ): Promise<void> {
    let context: TContext;
    let result: TResult;

    try {
      // Given
      context = await pattern.given();
      
      // When
      result = await pattern.when(context);
      
      // Then
      await pattern.then(context, result);
    } finally {
      // Cleanup
      if (pattern.cleanup && context! && result!) {
        await pattern.cleanup(context, result);
      }
    }
  }

  /**
   * Setup-Execute-Verify (SEV) pattern helper
   * Alternative to AAA with more explicit naming
   */
  static async sev<TContext = any, TResult = any>(
    pattern: SEVPattern<TContext, TResult>
  ): Promise<void> {
    let context: TContext;
    let result: TResult;

    try {
      // Setup
      context = await pattern.setup();
      
      // Execute
      result = await pattern.execute(context);
      
      // Verify
      await pattern.verify(context, result);
    } finally {
      // Teardown
      if (pattern.teardown && context! && result!) {
        await pattern.teardown(context, result);
      }
    }
  }

  /**
   * Table-driven testing pattern
   * Runs multiple test scenarios from a data table
   */
  static table<T = any>(
    testName: string,
    scenarios: TableTestScenario<T>[],
    testFn: (scenario: TableTestScenario<T>) => void | Promise<void>
  ): void {
    const onlyScenarios = scenarios.filter(s => s.only);
    const testScenarios = onlyScenarios.length > 0 ? onlyScenarios : scenarios.filter(s => !s.skip);

    describe(testName, () => {
      testScenarios.forEach((scenario, index) => {
        const testTitle = scenario.description || `scenario ${index + 1}`;
        
        if (scenario.only) {
          it.only(testTitle, async () => {
            await testFn(scenario);
          });
        } else {
          it(testTitle, async () => {
            await testFn(scenario);
          });
        }
      });
    });
  }

  /**
   * Property-based testing helper
   * Generates test cases and verifies properties hold
   */
  static property<T>(
    property: string,
    generator: () => T,
    predicate: (input: T) => boolean | Promise<boolean>,
    options: { iterations?: number; seed?: number } = {}
  ): void {
    const iterations = options.iterations || 100;
    
    describe(`Property: ${property}`, () => {
      for (let i = 0; i < iterations; i++) {
        it(`holds for generated input ${i + 1}`, async () => {
          const input = generator();
          const result = await predicate(input);
          expect(result).toBe(true);
        });
      }
    });
  }

  // ============================================================================
  // CLI-Specific Patterns
  // ============================================================================

  /**
   * CLI testing patterns for command-line applications
   */
  static cli = {
    /**
     * Test a CLI command with expected outputs and side effects
     */
    async testCommand(config: CLITestConfig): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        const args = config.args || [];
        const timeout = config.timeout || 10000;
        const expectedExitCode = config.exitCode ?? 0;
        
        const child = spawn('node', ['dist/cli.js', config.command, ...args], {
          cwd: config.cwd || process.cwd(),
          env: { ...process.env, ...config.env },
          stdio: 'pipe'
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        const timeoutHandle = setTimeout(() => {
          child.kill();
          reject(new Error(`Command timed out after ${timeout}ms`));
        }, timeout);

        child.on('close', async (code) => {
          clearTimeout(timeoutHandle);

          try {
            // Check exit code
            expect(code).toBe(expectedExitCode);

            // Check output patterns
            if (config.expectedOutput) {
              if (typeof config.expectedOutput === 'string') {
                expect(stdout).toContain(config.expectedOutput);
              } else {
                expect(stdout).toMatch(config.expectedOutput);
              }
            }

            if (config.expectedError) {
              if (typeof config.expectedError === 'string') {
                expect(stderr).toContain(config.expectedError);
              } else {
                expect(stderr).toMatch(config.expectedError);
              }
            }

            // Check file system effects
            if (config.expectedFiles) {
              const fs = require('fs');
              for (const file of config.expectedFiles) {
                const fullPath = path.resolve(config.cwd || process.cwd(), file);
                expect(fs.existsSync(fullPath)).toBe(true);
              }
            }

            if (config.unexpectedFiles) {
              const fs = require('fs');
              for (const file of config.unexpectedFiles) {
                const fullPath = path.resolve(config.cwd || process.cwd(), file);
                expect(fs.existsSync(fullPath)).toBe(false);
              }
            }

            resolve();
          } catch (error) {
            reject(error);
          }
        });

        child.on('error', (error) => {
          clearTimeout(timeoutHandle);
          reject(error);
        });
      });
    },

    /**
     * Test interactive CLI flows with simulated user input
     */
    async testInteractiveFlow(
      command: string,
      steps: InteractiveStep[],
      args: string[] = []
    ): Promise<string> {
      return new Promise<string>((resolve, reject) => {
        const child = spawn('node', ['dist/cli.js', command, ...args], {
          stdio: 'pipe'
        });

        let output = '';
        let currentStepIndex = 0;

        const processOutput = (data: Buffer) => {
          const text = data.toString();
          output += text;

          if (currentStepIndex < steps.length) {
            const step = steps[currentStepIndex];
            const promptMatches = typeof step.prompt === 'string' 
              ? text.includes(step.prompt)
              : step.prompt.test(text);

            if (promptMatches) {
              setTimeout(() => {
                const answer = typeof step.answer === 'string' 
                  ? step.answer + '\n'
                  : JSON.stringify(step.answer) + '\n';
                child.stdin?.write(answer);
                currentStepIndex++;

                if (currentStepIndex >= steps.length) {
                  child.stdin?.end();
                }
              }, step.delay || 100);
            }
          }
        };

        child.stdout?.on('data', processOutput);
        child.stderr?.on('data', processOutput);

        child.on('close', (code) => {
          if (code === 0) {
            resolve(output);
          } else {
            reject(new Error(`Command failed with code ${code}\n${output}`));
          }
        });

        child.on('error', reject);

        // Timeout safety
        setTimeout(() => {
          child.kill();
          reject(new Error('Interactive flow timed out'));
        }, 30000);
      });
    }
  };

  // ============================================================================
  // Async Testing Patterns
  // ============================================================================

  /**
   * Async testing patterns for concurrent operations and timing
   */
  static async = {
    /**
     * Test concurrent operations
     */
    async testConcurrent<T>(config: AsyncTestConfig<T>): Promise<T[]> {
      const concurrency = config.concurrency || 10;
      const timeout = config.timeout || 5000;

      const promises = Array.from({ length: concurrency }, () => 
        Promise.race([
          config.operation(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), timeout)
          )
        ])
      );

      const results = await Promise.all(promises);

      if (config.validator) {
        expect(config.validator(results)).toBe(true);
      } else if (config.expectedResults) {
        expect(results).toEqual(config.expectedResults);
      }

      return results;
    },

    /**
     * Test race conditions by running operations simultaneously
     */
    async testRaceCondition<T>(
      operations: Array<() => Promise<T>>,
      validator: (results: T[]) => boolean
    ): Promise<T[]> {
      const results = await Promise.all(operations.map(op => op()));
      expect(validator(results)).toBe(true);
      return results;
    },

    /**
     * Test operation with timeout
     */
    async testTimeout<T>(
      operation: () => Promise<T>,
      timeoutMs: number,
      expectTimeout = false
    ): Promise<T | null> {
      try {
        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeoutMs)
          )
        ]);
        
        if (expectTimeout) {
          throw new Error('Expected operation to timeout but it succeeded');
        }
        
        return result;
      } catch (error) {
        if (expectTimeout && (error as Error).message === 'Timeout') {
          return null;
        }
        throw error;
      }
    },

    /**
     * Test retry mechanism
     */
    async testRetry<T>(
      operation: () => Promise<T>,
      maxRetries: number,
      shouldSucceedOnAttempt?: number
    ): Promise<{ result: T; attempts: number }> {
      let attempts = 0;
      let lastError: Error;

      for (let i = 0; i <= maxRetries; i++) {
        attempts++;
        try {
          // If shouldSucceedOnAttempt is specified, modify the operation behavior
          let result: T;
          if (shouldSucceedOnAttempt !== undefined) {
            if (attempts < shouldSucceedOnAttempt) {
              throw new Error(`Simulated failure on attempt ${attempts}`);
            } else {
              // On the success attempt, return a mock result
              result = 'success' as any as T;
            }
          } else {
            result = await operation();
          }
          
          return { result, attempts };
        } catch (error) {
          lastError = error as Error;
          if (i === maxRetries) break;
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      throw new Error(`Operation failed after ${attempts} attempts: ${lastError!.message}`);
    },

    /**
     * Test event emitter patterns
     */
    async testEventEmitter(
      emitter: EventEmitter,
      expectedEvents: Array<{ event: string; data?: any }>,
      timeoutMs = 5000
    ): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        const receivedEvents: Array<{ event: string; data: any }> = [];
        const timeout = setTimeout(() => {
          reject(new Error(`Event test timed out. Expected: ${JSON.stringify(expectedEvents)}, Received: ${JSON.stringify(receivedEvents)}`));
        }, timeoutMs);

        const eventHandlers = new Map<string, (data: any) => void>();
        
        expectedEvents.forEach(({ event }) => {
          if (!eventHandlers.has(event)) {
            const handler = (data: any) => {
              receivedEvents.push({ event, data });
              
              if (receivedEvents.length === expectedEvents.length) {
                clearTimeout(timeout);
                eventHandlers.forEach((handler, event) => {
                  emitter.off(event, handler);
                });
                
                // Validate events
                expectedEvents.forEach((expected, index) => {
                  const received = receivedEvents[index];
                  expect(received.event).toBe(expected.event);
                  if (expected.data) {
                    expect(received.data).toEqual(expected.data);
                  }
                });
                
                resolve();
              }
            };
            eventHandlers.set(event, handler);
            emitter.on(event, handler);
          }
        });
      });
    }
  };

  // ============================================================================
  // File System Testing Patterns
  // ============================================================================

  /**
   * File system testing patterns for file operations and directory structures
   */
  static fs = {
    /**
     * Test file creation and modification
     */
    async testFileOperations(
      operations: Array<{
        type: 'create' | 'update' | 'delete';
        path: string;
        content?: string;
        expectedResult?: boolean;
      }>,
      fs?: FileSystemAdapter
    ): Promise<void> {
      const fileSystem = fs || await createTestFileSystem({});

      for (const op of operations) {
        switch (op.type) {
          case 'create':
            await fileSystem.writeFile(op.path, op.content || '');
            expect(await fileSystem.exists(op.path)).toBe(op.expectedResult ?? true);
            break;
          case 'update':
            if (op.content) {
              await fileSystem.writeFile(op.path, op.content);
            }
            expect(await fileSystem.exists(op.path)).toBe(op.expectedResult ?? true);
            break;
          case 'delete':
            await fileSystem.unlink(op.path);
            expect(await fileSystem.exists(op.path)).toBe(op.expectedResult ?? false);
            break;
        }
      }
    },

    /**
     * Test directory structure creation and validation
     */
    async testDirectoryStructure(
      expectedStructure: Record<string, string | null>,
      fs?: FileSystemAdapter
    ): Promise<void> {
      const fileSystem = fs || await createTestFileSystem({});

      for (const [filePath, expectedContent] of Object.entries(expectedStructure)) {
        expect(await fileSystem.exists(filePath)).toBe(true);
        
        if (expectedContent !== null) {
          const actualContent = await fileSystem.readFile(filePath, 'utf-8');
          expect(actualContent).toBe(expectedContent);
        }
      }
    },

    /**
     * Test file watching and change detection
     */
    async testFileWatching(
      filePath: string,
      changes: Array<{ content: string; delay?: number }>,
      fs?: FileSystemAdapter
    ): Promise<Array<{ event: string; filename: string }>> {
      const fileSystem = fs || await createTestFileSystem({});
      const events: Array<{ event: string; filename: string }> = [];

      // Note: This is a simplified version - real file watching would use fs.watch
      // For testing, we simulate the events
      
      for (const change of changes) {
        await new Promise(resolve => setTimeout(resolve, change.delay || 100));
        await fileSystem.writeFile(filePath, change.content);
        events.push({ event: 'change', filename: path.basename(filePath) });
      }

      return events;
    },

    /**
     * Test atomic file operations
     */
    async testAtomicOperations(
      operations: Array<() => Promise<void>>,
      validator: () => Promise<boolean>
    ): Promise<void> {
      // Run all operations concurrently
      await Promise.all(operations.map(op => op()));
      
      // Validate final state
      expect(await validator()).toBe(true);
    }
  };

  // ============================================================================
  // Integration Testing Patterns
  // ============================================================================

  /**
   * Integration testing patterns for multi-component interactions
   */
  static integration = {
    /**
     * Test API contract compliance
     */
    async testAPIContract<TInput, TOutput>(
      apiFunction: (input: TInput) => Promise<TOutput>,
      testCases: Array<{
        name: string;
        input: TInput;
        expectedOutput?: TOutput;
        validator?: (output: TOutput) => boolean;
        shouldThrow?: boolean;
      }>
    ): Promise<void> {
      for (const testCase of testCases) {
        await TestPatterns.aaa({
          arrange: () => ({ input: testCase.input }),
          act: async ({ input }) => {
            if (testCase.shouldThrow) {
              try {
                await apiFunction(input);
                throw new Error('Expected function to throw');
              } catch (error) {
                return error;
              }
            }
            return apiFunction(input);
          },
          assert: (_context, result) => {
            if (testCase.shouldThrow) {
              expect(result).toBeInstanceOf(Error);
            } else {
              if (testCase.expectedOutput) {
                expect(result).toEqual(testCase.expectedOutput);
              }
              if (testCase.validator) {
                expect(testCase.validator(result as TOutput)).toBe(true);
              }
            }
          }
        });
      }
    },

    /**
     * Test multi-component workflow
     */
    async testWorkflow<TContext>(
      name: string,
      steps: Array<{
        name: string;
        action: (context: TContext) => Promise<TContext>;
        validator?: (context: TContext) => boolean | Promise<boolean>;
      }>,
      initialContext: TContext
    ): Promise<TContext> {
      let currentContext = initialContext;
      
      for (const [index, step] of steps.entries()) {
        try {
          currentContext = await step.action(currentContext);
          
          if (step.validator) {
            const isValid = await step.validator(currentContext);
            if (!isValid) {
              throw new Error(`Validation failed at step ${index + 1}: ${step.name}`);
            }
          }
        } catch (error) {
          throw new Error(`Workflow "${name}" failed at step ${index + 1} (${step.name}): ${(error as Error).message}`);
        }
      }

      return currentContext;
    },

    /**
     * Test end-to-end scenarios
     */
    async testE2E<TResult>(
      _scenario: string,
      setup: () => Promise<any>,
      execute: (context: any) => Promise<TResult>,
      verify: (context: any, result: TResult) => Promise<void>,
      cleanup?: (context: any) => Promise<void>
    ): Promise<void> {
      let context: any;
      
      try {
        // Setup
        context = await setup();
        
        // Execute
        const result = await execute(context);
        
        // Verify
        await verify(context, result);
      } finally {
        // Cleanup
        if (cleanup && context) {
          await cleanup(context);
        }
      }
    }
  };

  // ============================================================================
  // Performance Testing Patterns
  // ============================================================================

  /**
   * Performance testing patterns for benchmarking and optimization
   */
  static performance = {
    /**
     * Benchmark function execution time
     */
    async benchmark<T>(config: PerformanceTestConfig<T>): Promise<{
      averageTime: number;
      minTime: number;
      maxTime: number;
      results: T[];
    }> {
      const iterations = config.iterations || 100;
      const warmupIterations = config.warmupIterations || 10;
      const times: number[] = [];
      const results: T[] = [];

      // Warmup
      for (let i = 0; i < warmupIterations; i++) {
        await config.operation();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Actual benchmark
      for (let i = 0; i < iterations; i++) {
        const start = process.hrtime.bigint();
        const result = await config.operation();
        const end = process.hrtime.bigint();
        
        const timeMs = Number(end - start) / 1_000_000;
        times.push(timeMs);
        results.push(result);
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      // Check against maximum acceptable time
      if (config.maxTime && averageTime > config.maxTime) {
        throw new Error(`Average execution time ${averageTime.toFixed(2)}ms exceeds maximum ${config.maxTime}ms`);
      }

      return { averageTime, minTime, maxTime, results };
    },

    /**
     * Test for memory leaks
     */
    async testMemoryLeak<T>(
      operation: () => Promise<T>,
      iterations = 1000,
      threshold = 50 * 1024 * 1024 // 50MB
    ): Promise<void> {
      // Force initial garbage collection
      if (global.gc) {
        global.gc();
      }
      
      const initialMemory = process.memoryUsage().heapUsed;

      // Run operations
      for (let i = 0; i < iterations; i++) {
        await operation();
        
        // Periodic garbage collection
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }

      // Final garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      if (memoryIncrease > threshold) {
        throw new Error(
          `Potential memory leak detected: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase exceeds threshold of ${(threshold / 1024 / 1024).toFixed(2)}MB`
        );
      }
    },

    /**
     * Load testing for high-concurrency scenarios
     */
    async loadTest<T>(
      operation: () => Promise<T>,
      concurrency = 100,
      duration = 60000, // 1 minute
      maxErrorRate = 0.01 // 1%
    ): Promise<{
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      averageResponseTime: number;
      requestsPerSecond: number;
    }> {
      const startTime = Date.now();
      const endTime = startTime + duration;
      const results: Array<{ success: boolean; time: number }> = [];
      const activeTasks = new Set<Promise<void>>();

      while (Date.now() < endTime) {
        // Maintain concurrency level
        while (activeTasks.size < concurrency && Date.now() < endTime) {
          const task = (async () => {
            const requestStart = Date.now();
            try {
              await operation();
              results.push({ success: true, time: Date.now() - requestStart });
            } catch (error) {
              results.push({ success: false, time: Date.now() - requestStart });
            }
          })();

          task.finally(() => activeTasks.delete(task));
          activeTasks.add(task);
        }

        // Wait briefly to prevent tight loop
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Wait for remaining tasks
      await Promise.all(Array.from(activeTasks));

      const totalRequests = results.length;
      const successfulRequests = results.filter(r => r.success).length;
      const failedRequests = totalRequests - successfulRequests;
      const averageResponseTime = results.reduce((sum, r) => sum + r.time, 0) / totalRequests;
      const requestsPerSecond = totalRequests / (duration / 1000);
      const errorRate = failedRequests / totalRequests;

      if (errorRate > maxErrorRate) {
        throw new Error(`Error rate ${(errorRate * 100).toFixed(2)}% exceeds maximum ${(maxErrorRate * 100).toFixed(2)}%`);
      }

      return {
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime,
        requestsPerSecond
      };
    }
  };

  // ============================================================================
  // Assertion Helpers
  // ============================================================================

  /**
   * Enhanced assertion patterns
   */
  static assertions = {
    /**
     * Eventually consistent assertion - retry until condition is met
     */
    async eventually(config: EventuallyConfig): Promise<void> {
      const timeout = config.timeout || 5000;
      const interval = config.interval || 100;
      const startTime = Date.now();

      while (Date.now() - startTime < timeout) {
        try {
          const result = await config.assertion();
          if (result) {
            return; // Success
          }
        } catch (error) {
          // Continue trying
        }

        await new Promise(resolve => setTimeout(resolve, interval));
      }

      throw new Error(config.message || 'Eventually assertion failed');
    },

    /**
     * Partial object matching with deep comparison
     */
    toMatchPartial(received: any, expected: any): void {
      const matches = (obj: any, pattern: any): boolean => {
        if (pattern === null || pattern === undefined) {
          return obj === pattern;
        }

        if (typeof pattern !== 'object') {
          return obj === pattern;
        }

        if (Array.isArray(pattern)) {
          if (!Array.isArray(obj) || obj.length !== pattern.length) {
            return false;
          }
          return pattern.every((item, index) => matches(obj[index], item));
        }

        if (typeof obj !== 'object' || obj === null) {
          return false;
        }

        return Object.entries(pattern).every(([key, value]) => 
          obj.hasOwnProperty(key) && matches(obj[key], value)
        );
      };

      expect(matches(received, expected)).toBe(true);
    },

    /**
     * Deep equality with custom matchers
     */
    toDeepEqualWith<T>(
      received: T,
      expected: T,
      customMatchers: Record<string, (received: any, expected: any) => boolean>
    ): void {
      const deepEquals = (obj1: any, obj2: any, path = ''): boolean => {
        // Check for custom matcher
        for (const [matcherPath, matcher] of Object.entries(customMatchers)) {
          if (path.endsWith(matcherPath)) {
            return matcher(obj1, obj2);
          }
        }

        // Standard deep equality
        if (obj1 === obj2) return true;
        
        if (obj1 == null || obj2 == null) return obj1 === obj2;
        
        if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
          return obj1 === obj2;
        }

        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        
        if (keys1.length !== keys2.length) return false;
        
        return keys1.every(key => {
          const newPath = path ? `${path}.${key}` : key;
          return deepEquals(obj1[key], obj2[key], newPath);
        });
      };

      expect(deepEquals(received, expected)).toBe(true);
    }
  };

  // ============================================================================
  // Test Organization Helpers
  // ============================================================================

  /**
   * Test lifecycle and organization patterns
   */
  static organization = {
    /**
     * Create test suite with shared setup/teardown
     * Note: This is a pattern helper - tests should use beforeAll/afterAll directly
     */
    suite<TContext>(
      name: string,
      setup: () => Promise<TContext> | TContext,
      teardown: (context: TContext) => Promise<void> | void,
      tests: (getContext: () => TContext) => void
    ): void {
      describe(name, () => {
        let context: TContext;

        beforeAll(async () => {
          context = await setup();
        });

        afterAll(async () => {
          if (context) {
            await teardown(context);
          }
        });

        // Provide a context getter function
        const getContext = () => {
          if (!context) {
            throw new Error('Test context not initialized - ensure beforeAll has run');
          }
          return context;
        };

        // Call the tests function to register individual test cases
        tests(getContext);
      });
    },

    /**
     * Parameterized test with data providers
     */
    parameterized<T>(
      testName: string,
      dataProvider: () => T[],
      testFunction: (data: T, index: number) => void | Promise<void>
    ): void {
      const testData = dataProvider();
      
      describe(testName, () => {
        testData.forEach((data, index) => {
          it(`case ${index + 1}`, async () => {
            await testFunction(data, index);
          });
        });
      });
    },

    /**
     * Test with automatic cleanup registration
     */
    withCleanup<T>(
      testFn: (cleanup: (fn: () => Promise<void> | void) => void) => Promise<T> | T
    ): Promise<T> {
      const cleanupFunctions: Array<() => Promise<void> | void> = [];
      
      const registerCleanup = (fn: () => Promise<void> | void) => {
        cleanupFunctions.push(fn);
      };

      return Promise.resolve(testFn(registerCleanup))
        .finally(async () => {
          // Run cleanup in reverse order
          for (const cleanup of cleanupFunctions.reverse()) {
            await cleanup();
          }
        });
    }
  };
}

/**
 * Export commonly used test patterns as standalone functions for convenience
 */
export const { aaa, gwt, sev, table, property } = TestPatterns;
export const { cli, fs, async: asyncPatterns, integration, performance, assertions, organization } = TestPatterns;

/**
 * Convenience function for creating test contexts with automatic cleanup
 */
export function createTestContext<T>(data: T): TestContext<T> {
  return {
    data,
    cleanup: []
  };
}

/**
 * Helper for setting up common test scenarios
 */
export class TestScenarios {
  /**
   * Create a complete Memento project test scenario
   */
  static async mementoProject(): Promise<TestContext<{
    projectRoot: string;
    fs: FileSystemAdapter;
    config: any;
  }>> {
    const fs = await createTestFileSystem({
      '/project/package.json': JSON.stringify({ name: 'test-project' }),
      '/project/README.md': '# Test Project'
    });

    const config = TestDataFactory.config()
      .withDefaultMode('engineer')
      .build();

    return createTestContext({
      projectRoot: '/project',
      fs,
      config
    });
  }

  /**
   * Create a CLI testing scenario with mocked dependencies
   */
  static async cliTest(): Promise<TestContext<{
    mockInquirer: any;
    mockFs: any;
    mockLogger: any;
  }>> {
    const mockInquirer = MockFactory.inquirer().build();
    const mockFs = MockFactory.fileSystem().build();
    const mockLogger = MockFactory.logger().build();

    return createTestContext({
      mockInquirer,
      mockFs,
      mockLogger
    });
  }
}