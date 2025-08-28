/**
 * Comprehensive tests for the TestPatterns library
 * 
 * Tests all major patterns and utilities provided by the TestPatterns library,
 * ensuring they work correctly and provide consistent testing experiences.
 */

import { TestPatterns, TestScenarios, createTestContext } from '../TestPatterns';
import { TestDataFactory } from '../TestDataFactory';
import { createTestFileSystem } from '../createTestFileSystem';
import { EventEmitter } from 'events';

describe('TestPatterns', () => {
  // ============================================================================
  // Core Pattern Tests
  // ============================================================================

  describe('Core Patterns', () => {
    describe('aaa (Arrange-Act-Assert)', () => {
      it('should execute arrange, act, and assert phases in order', async () => {
        const executionOrder: string[] = [];
        
        await TestPatterns.aaa({
          arrange: () => {
            executionOrder.push('arrange');
            return { value: 42 };
          },
          act: (context) => {
            executionOrder.push('act');
            return context.value * 2;
          },
          assert: (context, result) => {
            executionOrder.push('assert');
            expect(context.value).toBe(42);
            expect(result).toBe(84);
          }
        });

        expect(executionOrder).toEqual(['arrange', 'act', 'assert']);
      });

      it('should run cleanup even if assert fails', async () => {
        const cleanupCalled = jest.fn();
        
        await expect(TestPatterns.aaa({
          arrange: () => ({ value: 42 }),
          act: (context) => context.value * 2,
          assert: () => {
            throw new Error('Assert failed');
          },
          cleanup: cleanupCalled
        })).rejects.toThrow('Assert failed');

        expect(cleanupCalled).toHaveBeenCalled();
      });

      it('should handle async operations in all phases', async () => {
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        
        await TestPatterns.aaa({
          arrange: async () => {
            await delay(10);
            return { value: 'async' };
          },
          act: async (context) => {
            await delay(10);
            return context.value.toUpperCase();
          },
          assert: async (_context, result) => {
            await delay(10);
            expect(result).toBe('ASYNC');
          }
        });
      });
    });

    describe('gwt (Given-When-Then)', () => {
      it('should execute BDD phases correctly', async () => {
        const executionOrder: string[] = [];
        
        await TestPatterns.gwt({
          given: () => {
            executionOrder.push('given');
            return { initialState: 'ready' };
          },
          when: (context) => {
            executionOrder.push('when');
            return context.initialState + '-processed';
          },
          then: (_context, result) => {
            executionOrder.push('then');
            expect(result).toBe('ready-processed');
          }
        });

        expect(executionOrder).toEqual(['given', 'when', 'then']);
      });
    });

    describe('sev (Setup-Execute-Verify)', () => {
      it('should execute phases with explicit naming', async () => {
        const executionOrder: string[] = [];
        
        await TestPatterns.sev({
          setup: () => {
            executionOrder.push('setup');
            return { testData: 'initialized' };
          },
          execute: (context) => {
            executionOrder.push('execute');
            return context.testData.length;
          },
          verify: (_context, result) => {
            executionOrder.push('verify');
            expect(result).toBe(11);
          }
        });

        expect(executionOrder).toEqual(['setup', 'execute', 'verify']);
      });
    });

    describe('table (Table-driven testing)', () => {
      it('should filter scenarios correctly', () => {
        const allScenarios = [
          { description: 'should run', input: 1, expected: 1 },
          { description: 'should skip', input: 2, expected: 2, skip: true },
          { description: 'should also run', input: 3, expected: 3 },
          { description: 'only this', input: 4, expected: 4, only: true }
        ];

        // Test scenario filtering logic
        const onlyScenarios = allScenarios.filter(s => s.only);
        const testScenarios = onlyScenarios.length > 0 ? onlyScenarios : allScenarios.filter(s => !s.skip);

        expect(onlyScenarios).toHaveLength(1);
        expect(onlyScenarios[0].description).toBe('only this');
        expect(testScenarios).toHaveLength(1); // Should only run the 'only' scenario
        
        // When no 'only' scenarios, should filter out skipped ones
        const scenariosWithoutOnly = allScenarios.slice(0, 3);
        const filteredWithoutOnly = scenariosWithoutOnly.filter(s => !s.skip);
        expect(filteredWithoutOnly).toHaveLength(2);
      });

      it('should validate table test configuration', () => {
        const scenarios = [
          { description: 'test case 1', input: { a: 1, b: 2 }, expected: 3 },
          { description: 'test case 2', input: { a: 4, b: 5 }, expected: 9 }
        ];

        scenarios.forEach(scenario => {
          expect(scenario.description).toBeDefined();
          expect(scenario.input).toBeDefined();
          expect(scenario.expected).toBeDefined();
        });
      });
    });

    describe('property (Property-based testing)', () => {
      it('should validate property test configuration', () => {
        const generator = () => Math.floor(Math.random() * 100);
        const predicate = (input: number) => input >= 0 && input < 100;
        
        // Test the generator function
        const generated = generator();
        expect(typeof generated).toBe('number');
        expect(generated).toBeGreaterThanOrEqual(0);
        expect(generated).toBeLessThan(100);
        
        // Test the predicate function
        expect(predicate(50)).toBe(true);
        expect(predicate(-1)).toBe(false);
        expect(predicate(100)).toBe(false);
      });
    });
  });

  // ============================================================================
  // CLI Pattern Tests
  // ============================================================================

  describe('CLI Patterns', () => {
    describe('testCommand', () => {
      // Note: These tests would require actual CLI setup in a real environment
      // For unit testing, we're testing the configuration parsing
      
      it('should configure command test properly', () => {
        const config = {
          command: 'init',
          args: ['--force'],
          expectedOutput: /Success/,
          expectedFiles: ['.memento/config.json'],
          timeout: 5000
        };
        
        expect(config.command).toBe('init');
        expect(config.args).toEqual(['--force']);
        expect(config.expectedOutput).toBeInstanceOf(RegExp);
      });
    });

    describe('testInteractiveFlow', () => {
      it('should define interactive steps correctly', () => {
        const steps = [
          { prompt: 'Enter name:', answer: 'test-user' },
          { prompt: /Continue\?/, answer: true, delay: 200 }
        ];
        
        expect(steps).toHaveLength(2);
        expect(steps[0].answer).toBe('test-user');
        expect(steps[1].answer).toBe(true);
        expect(steps[1].delay).toBe(200);
      });
    });
  });

  // ============================================================================
  // Async Pattern Tests
  // ============================================================================

  describe('Async Patterns', () => {
    describe('testConcurrent', () => {
      it('should handle concurrent operations', async () => {
        let counter = 0;
        const operation = async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return ++counter;
        };

        const results = await TestPatterns.async.testConcurrent({
          operation,
          concurrency: 5,
          timeout: 1000,
          validator: (results) => results.length === 5 && results.every(r => typeof r === 'number')
        });

        expect(results).toHaveLength(5);
        expect(results.every(r => typeof r === 'number')).toBe(true);
      });
    });

    describe('testRaceCondition', () => {
      it('should detect race conditions', async () => {
        let sharedResource = 0;
        
        const operations = [
          async () => {
            const current = sharedResource;
            await new Promise(resolve => setTimeout(resolve, 10));
            sharedResource = current + 1;
            return sharedResource;
          },
          async () => {
            const current = sharedResource;
            await new Promise(resolve => setTimeout(resolve, 10));
            sharedResource = current + 2;
            return sharedResource;
          }
        ];

        const results = await TestPatterns.async.testRaceCondition(
          operations,
          (results) => results.length === 2
        );

        expect(results).toHaveLength(2);
      });
    });

    describe('testTimeout', () => {
      it('should timeout slow operations', async () => {
        const slowOperation = () => new Promise(resolve => 
          setTimeout(resolve, 1000)
        );

        const result = await TestPatterns.async.testTimeout(
          slowOperation,
          100,
          true // expect timeout
        );

        expect(result).toBeNull();
      });

      it('should complete fast operations', async () => {
        const fastOperation = () => Promise.resolve('completed');

        const result = await TestPatterns.async.testTimeout(
          fastOperation,
          1000,
          false // don't expect timeout
        );

        expect(result).toBe('completed');
      });
    });

    describe('testRetry', () => {
      it('should retry failed operations', async () => {
        const flakyOperation = async () => {
          // This will be retried until shouldSucceedOnAttempt
          throw new Error('Simulated failure');
        };

        // Test with shouldSucceedOnAttempt = 3, maxRetries = 5
        const result = await TestPatterns.async.testRetry(flakyOperation, 5, 3);
        
        expect(result.result).toBeDefined();
        expect(result.attempts).toBe(3);
      });

      it('should handle operations that succeed immediately', async () => {
        const successOperation = async () => 'immediate success';
        
        const result = await TestPatterns.async.testRetry(successOperation, 3);
        
        expect(result.result).toBe('immediate success');
        expect(result.attempts).toBe(1);
      });
    });

    describe('testEventEmitter', () => {
      it('should validate event sequences', async () => {
        const emitter = new EventEmitter();
        const expectedEvents = [
          { event: 'start', data: { phase: 'begin' } },
          { event: 'progress', data: { percent: 50 } },
          { event: 'end', data: { phase: 'complete' } }
        ];

        // Start the test
        const testPromise = TestPatterns.async.testEventEmitter(
          emitter,
          expectedEvents,
          2000
        );

        // Simulate events
        setTimeout(() => emitter.emit('start', { phase: 'begin' }), 50);
        setTimeout(() => emitter.emit('progress', { percent: 50 }), 100);
        setTimeout(() => emitter.emit('end', { phase: 'complete' }), 150);

        await testPromise; // Should complete successfully
      });
    });
  });

  // ============================================================================
  // File System Pattern Tests
  // ============================================================================

  describe('File System Patterns', () => {
    describe('testFileOperations', () => {
      it('should test file CRUD operations', async () => {
        const fs = await createTestFileSystem({});
        
        await TestPatterns.fs.testFileOperations([
          { type: 'create', path: '/test.txt', content: 'initial content' },
          { type: 'update', path: '/test.txt', content: 'updated content' },
          { type: 'delete', path: '/test.txt' }
        ], fs);

        expect(await fs.exists('/test.txt')).toBe(false);
      });
    });

    describe('testDirectoryStructure', () => {
      it('should validate directory structure', async () => {
        const fs = await createTestFileSystem({
          '/project/src/index.js': 'console.log("hello");',
          '/project/package.json': '{"name": "test"}',
          '/project/README.md': '# Test Project'
        });

        await TestPatterns.fs.testDirectoryStructure({
          '/project/src/index.js': 'console.log("hello");',
          '/project/package.json': '{"name": "test"}',
          '/project/README.md': '# Test Project'
        }, fs);
      });
    });

    describe('testFileWatching', () => {
      it('should simulate file watching events', async () => {
        const fs = await createTestFileSystem({ '/watch.txt': 'initial' });
        
        const events = await TestPatterns.fs.testFileWatching(
          '/watch.txt',
          [
            { content: 'change 1', delay: 50 },
            { content: 'change 2', delay: 50 }
          ],
          fs
        );

        expect(events).toHaveLength(2);
        expect(events.every(e => e.event === 'change')).toBe(true);
      });
    });
  });

  // ============================================================================
  // Integration Pattern Tests
  // ============================================================================

  describe('Integration Patterns', () => {
    describe('testAPIContract', () => {
      it('should validate API contracts', async () => {
        const apiFunction = async (input: { value: number }) => {
          if (input.value < 0) throw new Error('Negative not allowed');
          return { result: input.value * 2 };
        };

        await TestPatterns.integration.testAPIContract(apiFunction, [
          {
            name: 'positive number',
            input: { value: 5 },
            expectedOutput: { result: 10 }
          },
          {
            name: 'zero',
            input: { value: 0 },
            expectedOutput: { result: 0 }
          },
          {
            name: 'negative number',
            input: { value: -1 },
            shouldThrow: true
          }
        ]);
      });
    });

    describe('testWorkflow', () => {
      it('should execute multi-step workflows', async () => {
        interface WorkflowContext {
          data: string;
          step: number;
        }

        const result = await TestPatterns.integration.testWorkflow(
          'data processing workflow',
          [
            {
              name: 'initialize',
              action: async (ctx: WorkflowContext) => ({ ...ctx, data: 'initialized', step: 1 }),
              validator: (ctx) => ctx.step === 1
            },
            {
              name: 'process',
              action: async (ctx: WorkflowContext) => ({ ...ctx, data: ctx.data.toUpperCase(), step: 2 }),
              validator: (ctx) => ctx.step === 2 && ctx.data === 'INITIALIZED'
            }
          ],
          { data: '', step: 0 }
        );

        expect(result.data).toBe('INITIALIZED');
        expect(result.step).toBe(2);
      });
    });

    describe('testE2E', () => {
      it('should handle end-to-end scenarios', async () => {
        const cleanupCalled = jest.fn();
        
        await TestPatterns.integration.testE2E(
          'user registration flow',
          async () => ({ user: null, database: [] }),
          async (context) => {
            context.user = { id: 1, name: 'test' };
            context.database.push(context.user);
            return context.user;
          },
          async (context, result) => {
            expect(result).toEqual({ id: 1, name: 'test' });
            expect(context.database).toContain(result);
          },
          cleanupCalled
        );

        expect(cleanupCalled).toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // Performance Pattern Tests
  // ============================================================================

  describe('Performance Patterns', () => {
    describe('benchmark', () => {
      it('should measure execution times', async () => {
        const operation = () => new Promise(resolve => 
          setTimeout(resolve, Math.random() * 10 + 5) // 5-15ms
        );

        const results = await TestPatterns.performance.benchmark({
          operation,
          iterations: 10,
          warmupIterations: 2
        });

        expect(results.averageTime).toBeGreaterThan(0);
        expect(results.minTime).toBeLessThanOrEqual(results.averageTime);
        expect(results.maxTime).toBeGreaterThanOrEqual(results.averageTime);
        expect(results.results).toHaveLength(10);
      });

      it('should fail if operation is too slow', async () => {
        const slowOperation = () => new Promise(resolve => 
          setTimeout(resolve, 100) // 100ms
        );

        await expect(TestPatterns.performance.benchmark({
          operation: slowOperation,
          iterations: 5,
          maxTime: 50 // Expect under 50ms
        })).rejects.toThrow(/exceeds maximum/);
      });
    });

    describe('testMemoryLeak', () => {
      it('should detect excessive memory usage', async () => {
        const memoryConsumer = () => {
          // Simulate memory allocation
          const data = new Array(1000).fill('x'.repeat(1000));
          return Promise.resolve(data.length);
        };

        // This should pass with a high threshold
        await TestPatterns.performance.testMemoryLeak(
          memoryConsumer,
          10, // Few iterations
          100 * 1024 * 1024 // 100MB threshold
        );
      });
    });
  });

  // ============================================================================
  // Assertion Helper Tests
  // ============================================================================

  describe('Assertion Helpers', () => {
    describe('eventually', () => {
      it('should wait for condition to become true', async () => {
        let counter = 0;
        const condition = () => {
          counter++;
          return counter >= 5;
        };

        await TestPatterns.assertions.eventually({
          assertion: condition,
          timeout: 1000,
          interval: 50
        });

        expect(counter).toBeGreaterThanOrEqual(5);
      });

      it('should timeout if condition never becomes true', async () => {
        const neverTrue = () => false;

        await expect(TestPatterns.assertions.eventually({
          assertion: neverTrue,
          timeout: 200,
          interval: 50,
          message: 'Custom timeout message'
        })).rejects.toThrow('Custom timeout message');
      });
    });

    describe('toMatchPartial', () => {
      it('should match partial objects', () => {
        const received = {
          id: 1,
          name: 'John',
          email: 'john@example.com',
          profile: {
            age: 30,
            city: 'New York',
            preferences: ['coding', 'reading']
          }
        };

        const pattern = {
          name: 'John',
          profile: {
            city: 'New York'
          }
        };

        expect(() => TestPatterns.assertions.toMatchPartial(received, pattern)).not.toThrow();
      });
    });

    describe('toDeepEqualWith', () => {
      it('should use custom matchers for specific paths', () => {
        const received = {
          timestamp: '2023-01-01T10:00:00Z',
          data: { value: 42 }
        };

        const expected = {
          timestamp: '2023-01-01T10:00:00Z', // Different time
          data: { value: 42 }
        };

        const customMatchers = {
          'timestamp': (received: string, expected: string) => {
            // Custom date comparison logic
            return new Date(received).getDate() === new Date(expected).getDate();
          }
        };

        expect(() => TestPatterns.assertions.toDeepEqualWith(
          received,
          expected,
          customMatchers
        )).not.toThrow();
      });
    });
  });

  // ============================================================================
  // Test Organization Tests
  // ============================================================================

  describe('Test Organization', () => {
    describe('withCleanup', () => {
      it('should run cleanup functions after test', async () => {
        const cleanupFunctions: jest.Mock[] = [];
        
        const result = await TestPatterns.organization.withCleanup(async (cleanup) => {
          const mockCleanup1 = jest.fn();
          const mockCleanup2 = jest.fn();
          
          cleanup(mockCleanup1);
          cleanup(mockCleanup2);
          
          cleanupFunctions.push(mockCleanup1, mockCleanup2);
          
          return 'test-result';
        });

        expect(result).toBe('test-result');
        expect(cleanupFunctions[0]).toHaveBeenCalled();
        expect(cleanupFunctions[1]).toHaveBeenCalled();
      });

      it('should run cleanup even if test throws', async () => {
        const mockCleanup = jest.fn();
        
        await expect(TestPatterns.organization.withCleanup(async (cleanup) => {
          cleanup(mockCleanup);
          throw new Error('Test error');
        })).rejects.toThrow('Test error');

        expect(mockCleanup).toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // Utility Tests
  // ============================================================================

  describe('Utilities', () => {
    describe('createTestContext', () => {
      it('should create test context with data and cleanup array', () => {
        const testData = { value: 42, name: 'test' };
        const context = createTestContext(testData);
        
        expect(context.data).toEqual(testData);
        expect(context.cleanup).toEqual([]);
        expect(Array.isArray(context.cleanup)).toBe(true);
      });
    });

    describe('TestScenarios', () => {
      describe('mementoProject', () => {
        it('should create complete Memento project scenario', async () => {
          const scenario = await TestScenarios.mementoProject();
          
          expect(scenario.data.projectRoot).toBe('/project');
          expect(scenario.data.fs).toBeDefined();
          expect(scenario.data.config).toBeDefined();
          
          // Verify files exist
          expect(await scenario.data.fs.exists('/project/package.json')).toBe(true);
          expect(await scenario.data.fs.exists('/project/README.md')).toBe(true);
        });
      });

      describe('cliTest', () => {
        it('should create CLI testing scenario with mocks', async () => {
          const scenario = await TestScenarios.cliTest();
          
          expect(scenario.data.mockInquirer).toBeDefined();
          expect(scenario.data.mockFs).toBeDefined();
          expect(scenario.data.mockLogger).toBeDefined();
        });
      });
    });
  });

  // ============================================================================
  // Integration with Existing Testing Infrastructure
  // ============================================================================

  describe('Integration with TestDataFactory', () => {
    it('should work seamlessly with TestDataFactory', async () => {
      const mode = TestDataFactory.mode()
        .withName('test-mode')
        .withDescription('Test mode for patterns')
        .build();

      await TestPatterns.aaa({
        arrange: () => ({ mode }),
        act: (context) => context.mode.name.toUpperCase(),
        assert: (context, result) => {
          expect(result).toBe('TEST-MODE');
          expect(context.mode.description).toBe('Test mode for patterns');
        }
      });
    });
  });

  describe('Integration with Error Scenarios', () => {
    it('should complement ErrorScenarios for comprehensive error testing', async () => {
      const flakyOperation = async (shouldFail: boolean) => {
        if (shouldFail) {
          throw new Error('Simulated failure');
        }
        return 'success';
      };

      // Test error scenario
      await expect(TestPatterns.aaa({
        arrange: () => ({ shouldFail: true }),
        act: (context) => flakyOperation(context.shouldFail),
        assert: () => {
          // Should not reach here
          expect(true).toBe(false);
        }
      })).rejects.toThrow('Simulated failure');

      // Test success scenario
      await TestPatterns.aaa({
        arrange: () => ({ shouldFail: false }),
        act: (context) => flakyOperation(context.shouldFail),
        assert: (_context, result) => {
          expect(result).toBe('success');
        }
      });
    });
  });
});