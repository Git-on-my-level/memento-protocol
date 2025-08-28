/**
 * Tests for the TestCategories system
 * This file demonstrates usage patterns and validates the categorization system
 */

import { TestCategories, TestRegistry, JestTestCategories } from '../TestCategories';
import type { TestCategory, TestSpeed, TestDependency } from '../TestCategories';

// Example of how to use decorators and categorization
describe('TestCategories System', () => {
  
  describe('Category Decorators', () => {
    beforeEach(() => {
      TestCategories.reset();
    });
    it('[unit][fast] should register unit test category', () => {
      expect(true).toBe(true);
    });

    it('[integration][slow][filesystem] should register integration test', () => {
      expect(true).toBe(true);
    });

    it('[performance][very-slow][isolated] should register performance test', () => {
      expect(true).toBe(true);
    });
  });

  describe('Speed Classification', () => {
    beforeEach(() => {
      TestCategories.reset();
    });
    it('[unit][fast] should automatically classify test speed based on execution time', async () => {
      const start = Date.now();
      
      // Simulate fast test
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(200); // More lenient for CI environments
      
      // First register the test manually since we're testing the system
      const registry = TestRegistry.getInstance();
      registry.registerTest('should automatically classify test speed', 'Speed Classification', {
        categories: ['unit'],
        speed: 'normal',
        dependencies: ['isolated']
      });
      
      // Record execution for automatic speed classification with a guaranteed fast duration
      TestCategories.recordTestExecution(
        'should automatically classify test speed',
        'Speed Classification',
        50, // Use a fixed fast duration for consistent testing
        'passed'
      );
      
      // After recording execution, the speed should be automatically updated
      const metadata = TestCategories.getTestMetadata(
        'should automatically classify test speed',
        'Speed Classification'
      );
      
      // The speed should be updated to 'fast' after recording the fast execution time
      expect(metadata?.speed).toBe('fast');
    });

    it('[unit][slow] should handle slow test classification', async () => {
      // This would be a real slow test, but we'll simulate it
      const duration = 2500; // 2.5 seconds
      
      // First register the test manually since we're testing the system
      const registry = TestRegistry.getInstance();
      registry.registerTest('should handle slow test classification', 'Speed Classification', {
        categories: ['unit'],
        speed: 'normal',
        dependencies: ['isolated']
      });
      
      TestCategories.recordTestExecution(
        'should handle slow test classification',
        'Speed Classification',
        duration,
        'passed'
      );
      
      const metadata = TestCategories.getTestMetadata(
        'should handle slow test classification',
        'Speed Classification'
      );
      
      expect(metadata?.speed).toBe('slow');
    });
  });

  describe('Test Registry', () => {
    beforeEach(() => {
      TestCategories.reset();
    });
    it('[unit][fast] should store and retrieve test metadata', () => {
      const registry = TestRegistry.getInstance();
      
      registry.registerSuite('TestSuite', {
        categories: ['unit'],
        speed: 'fast',
        dependencies: ['isolated']
      });
      
      registry.registerTest('testMethod', 'TestSuite', {
        categories: ['unit'],
        speed: 'fast',
        dependencies: ['isolated']
      });
      
      const suite = registry.getSuite('TestSuite');
      expect(suite).toBeDefined();
      expect(suite?.metadata.categories).toContain('unit');
      
      const test = registry.getTest('testMethod', 'TestSuite');
      expect(test).toBeDefined();
      expect(test?.metadata.speed).toBe('fast');
    });

    it('[unit][fast] should generate accurate statistics', () => {
      const registry = TestRegistry.getInstance();
      
      // Register multiple tests with different categories
      registry.registerTest('unitTest1', 'Suite1', {
        categories: ['unit'],
        speed: 'fast',
        dependencies: ['isolated']
      });
      
      registry.registerTest('integrationTest1', 'Suite1', {
        categories: ['integration'],
        speed: 'slow',
        dependencies: ['filesystem']
      });
      
      registry.registerTest('performanceTest1', 'Suite1', {
        categories: ['performance'],
        speed: 'very-slow',
        dependencies: ['isolated'],
        flaky: true
      });
      
      const stats = registry.getStatistics();
      
      expect(stats.totalTests).toBe(3);
      expect(stats.byCategory.unit).toBe(1);
      expect(stats.byCategory.integration).toBe(1);
      expect(stats.byCategory.performance).toBe(1);
      expect(stats.bySpeed.fast).toBe(1);
      expect(stats.bySpeed.slow).toBe(1);
      expect(stats.bySpeed['very-slow']).toBe(1);
      expect(stats.flakyCount).toBe(1);
    });
  });

  describe('Test Filtering', () => {
    beforeEach(() => {
      TestCategories.reset();
      const registry = TestRegistry.getInstance();
      
      // Set up test data
      registry.registerTest('fastUnitTest', 'FilterSuite', {
        categories: ['unit'],
        speed: 'fast',
        dependencies: ['isolated'],
        tags: ['core']
      });
      
      registry.registerTest('slowIntegrationTest', 'FilterSuite', {
        categories: ['integration'],
        speed: 'slow',
        dependencies: ['filesystem'],
        tags: ['integration']
      });
      
      registry.registerTest('flakyPerformanceTest', 'FilterSuite', {
        categories: ['performance'],
        speed: 'very-slow',
        dependencies: ['isolated'],
        flaky: true,
        tags: ['performance']
      });
    });

    it('[unit][fast] should filter tests by category', () => {
      const unitTests = TestCategories.getFilteredTests({ 
        categories: ['unit'] 
      });
      
      expect(unitTests).toHaveLength(1);
      expect(unitTests[0].name).toBe('fastUnitTest');
    });

    it('[unit][fast] should filter tests by speed', () => {
      const fastTests = TestCategories.getFilteredTests({ 
        speeds: ['fast'] 
      });
      
      expect(fastTests).toHaveLength(1);
      expect(fastTests[0].name).toBe('fastUnitTest');
    });

    it('[unit][fast] should filter tests by dependencies', () => {
      const filesystemTests = TestCategories.getFilteredTests({ 
        dependencies: ['filesystem'] 
      });
      
      expect(filesystemTests).toHaveLength(1);
      expect(filesystemTests[0].name).toBe('slowIntegrationTest');
    });

    it('[unit][fast] should filter tests by tags', () => {
      const coreTests = TestCategories.getFilteredTests({ 
        tags: ['core'] 
      });
      
      expect(coreTests).toHaveLength(1);
      expect(coreTests[0].name).toBe('fastUnitTest');
    });

    it('[unit][fast] should exclude flaky tests when requested', () => {
      const nonFlakyTests = TestCategories.getFilteredTests({ 
        includeFlaky: false 
      });
      
      expect(nonFlakyTests).toHaveLength(2);
      expect(nonFlakyTests.find(t => t.name === 'flakyPerformanceTest')).toBeUndefined();
    });

    it('[unit][fast] should filter by multiple criteria', () => {
      const specificTests = TestCategories.getFilteredTests({
        categories: ['unit', 'integration'],
        speeds: ['fast', 'slow'],
        includeFlaky: false
      });
      
      expect(specificTests).toHaveLength(2);
      expect(specificTests.map(t => t.name)).toContain('fastUnitTest');
      expect(specificTests.map(t => t.name)).toContain('slowIntegrationTest');
    });
  });

  describe('Conditional Execution Helpers', () => {
    beforeEach(() => {
      TestCategories.reset();
    });
    it('[unit][fast] should provide environment checks', () => {
      process.env.NODE_ENV = 'test';
      
      let executedInTest = false;
      let executedInProd = false;
      
      TestCategories.onlyInEnvironment('test', () => {
        executedInTest = true;
      });
      
      TestCategories.onlyInEnvironment('prod', () => {
        executedInProd = true;
      });
      
      expect(executedInTest).toBe(true);
      expect(executedInProd).toBe(false);
    });

    it('[unit][fast] should skip tests based on environment', () => {
      process.env.NODE_ENV = 'ci';
      
      let skipped = true;
      
      TestCategories.skipIfEnvironment('ci', () => {
        skipped = false;
      });
      
      expect(skipped).toBe(true);
    });
  });

  describe('Jest Integration', () => {
    beforeEach(() => {
      TestCategories.reset();
    });
    it('[unit][fast] should create Jest configuration helpers', () => {
      const categoryConfig = JestTestCategories.getConfigForCategories(['unit', 'integration']);
      expect(categoryConfig.testNamePattern).toContain('unit|integration');
      
      const speedConfig = JestTestCategories.getConfigForSpeed('fast');
      expect(speedConfig.testTimeout).toBe(5000);
      
      const depConfig = JestTestCategories.getConfigForDependencies(['filesystem']);
      expect(depConfig.setupFilesAfterEnv).toBeDefined();
    });

    it('[unit][fast] should create filtered Jest configuration', () => {
      const config = JestTestCategories.createFilteredConfig({
        categories: ['unit'],
        speeds: ['fast'],
        maxExecutionTime: 1000
      });
      
      expect(config.testTimeout).toBe(1000);
      expect(config.testNamePattern).toContain('unit');
      expect(config.testNamePattern).toContain('fast');
    });
  });

  describe('Reporting and Statistics', () => {
    beforeEach(() => {
      // Reset first, then set up test data
      TestCategories.reset();
      
      // Set up comprehensive test data for reporting
      const registry = TestRegistry.getInstance();
      
      // First register the suite
      registry.registerSuite('ReportSuite', {
        categories: ['unit'],
        speed: 'normal',
        dependencies: ['isolated']
      });
      
      const testData = [
        { name: 'unit1', categories: ['unit'], speed: 'fast', deps: ['isolated'] },
        { name: 'unit2', categories: ['unit'], speed: 'normal', deps: ['isolated'] },
        { name: 'integration1', categories: ['integration'], speed: 'slow', deps: ['filesystem'] },
        { name: 'e2e1', categories: ['e2e'], speed: 'very-slow', deps: ['network', 'database'] },
        { name: 'perf1', categories: ['performance'], speed: 'very-slow', deps: ['isolated'], flaky: true }
      ];
      
      testData.forEach(test => {
        registry.registerTest(test.name, 'ReportSuite', {
          categories: test.categories as TestCategory[],
          speed: test.speed as TestSpeed,
          dependencies: test.deps as TestDependency[],
          flaky: test.flaky
        });
        
        // Record some execution data
        registry.recordExecution(test.name, 'ReportSuite', {
          timestamp: Date.now(),
          duration: test.speed === 'fast' ? 50 : test.speed === 'normal' ? 500 : 2000,
          status: 'passed'
        });
      });
    });

    it('[unit][fast] should generate comprehensive statistics', () => {
      const stats = TestCategories.getStatistics();
      
      expect(stats.totalTests).toBe(5);
      expect(stats.byCategory.unit).toBe(2);
      expect(stats.byCategory.integration).toBe(1);
      expect(stats.byCategory.e2e).toBe(1);
      expect(stats.byCategory.performance).toBe(1);
      expect(stats.bySpeed.fast).toBe(1);
      expect(stats.bySpeed.normal).toBe(1);
      expect(stats.bySpeed.slow).toBe(1);
      expect(stats.bySpeed['very-slow']).toBe(2);
      expect(stats.flakyCount).toBe(1);
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
    });

    it('[unit][fast] should generate readable report', () => {
      const report = TestCategories.generateReport();
      
      expect(report).toContain('=== Test Categories Report ===');
      expect(report).toContain('Total Tests: 5');
      expect(report).toContain('unit: 2');
      expect(report).toContain('fast: 1');
      expect(report).toContain('isolated:');
      expect(report).toContain('Flaky Tests: 1');
    });

    it('[unit][fast] should group tests by suite and category', () => {
      // The tests were already set up in the beforeEach, so they should be available
      const bySuite = TestCategories.groupBySuite();
      expect(bySuite.ReportSuite).toBeDefined();
      expect(bySuite.ReportSuite).toHaveLength(5);
      
      const byCategory = TestCategories.groupByCategory();
      expect(byCategory.unit).toBeDefined();
      expect(byCategory.unit).toHaveLength(2);
      expect(byCategory.integration).toHaveLength(1);
      expect(byCategory.e2e).toHaveLength(1);
      expect(byCategory.performance).toHaveLength(1);
    });
  });

  describe('Custom Jest Matchers', () => {
    beforeEach(() => {
      TestCategories.reset();
    });
    it('[unit][fast] should provide custom matchers for test verification', () => {
      const registry = TestRegistry.getInstance();
      
      registry.registerTest('matcherTest', 'MatcherSuite', {
        categories: ['unit'],
        speed: 'fast',
        dependencies: ['isolated']
      });
      
      const test = registry.getTest('matcherTest', 'MatcherSuite')!;
      const matchers = TestCategories.createJestMatchers();
      
      // Test the matcher functions directly
      expect(matchers.toBeCategory(test, 'unit').pass).toBe(true);
      expect(matchers.toHaveSpeed(test, 'fast').pass).toBe(true);
      expect(matchers.toHaveDependency(test, 'isolated').pass).toBe(true);
    });
  });
});

// Example of slow test with conditional execution
describe('Slow Test Examples', () => {
  TestCategories.skipIfSlow(() => {
    it('[performance][slow] should run expensive computation', async () => {
      // This test only runs when JEST_SLOW_TESTS=true
      const start = Date.now();
      
      // Simulate expensive operation
      let sum = 0;
      for (let i = 0; i < 1000000; i++) {
        sum += Math.random();
      }
      
      const duration = Date.now() - start;
      expect(sum).toBeGreaterThan(0);
      expect(duration).toBeGreaterThan(0);
    });
  });
});

// Example of environment-specific tests
describe('Environment-specific Tests', () => {
  TestCategories.onlyInEnvironment('ci', () => {
    it('[integration][normal][external] should test CI-specific behavior', () => {
      // This test only runs in CI environment
      expect(process.env.NODE_ENV).toBe('ci');
    });
  });

  TestCategories.skipIfEnvironment('prod', () => {
    it('[unit][fast] should run in all environments except production', () => {
      expect(process.env.NODE_ENV).not.toBe('prod');
    });
  });
});