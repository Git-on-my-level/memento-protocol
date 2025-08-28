/**
 * TestCategories - Comprehensive test organization and categorization system for Memento Protocol
 * 
 * This system provides TypeScript decorators, filters, and utilities for organizing tests by:
 * - Type (unit, integration, e2e, performance, regression, smoke)
 * - Speed (fast, normal, slow, very-slow)
 * - Dependencies (isolated, database, filesystem, network, external)
 * - Environment (ci, local, dev, prod)
 * - Priority (critical, high, medium, low)
 * 
 * @example
 * ```typescript
 * import { TestCategories } from './TestCategories';
 * 
 * // Categorize test suites with decorators
 * @TestCategories.unit()
 * @TestCategories.fast()
 * @TestCategories.isolated()
 * describe('ComponentBuilder', () => {
 *   it('should build components correctly', () => {
 *     // Fast, isolated unit test
 *   });
 * });
 * 
 * @TestCategories.integration()
 * @TestCategories.slow()
 * @TestCategories.filesystem()
 * describe('FileManager Integration', () => {
 *   TestCategories.skipIfSlow(() => {
 *     it('should handle large files', () => {
 *       // Slow integration test - skipped in fast mode
 *     });
 *   });
 * });
 * 
 * // Run specific categories
 * TestCategories.runByCategory(['unit', 'fast']);
 * TestCategories.skipByEnvironment('ci', ['performance']);
 * ```
 */

interface TestMetadata {
  categories: TestCategory[];
  speed: TestSpeed;
  dependencies: TestDependency[];
  environment?: TestEnvironment[];
  priority?: TestPriority;
  timeout?: number;
  retries?: number;
  tags?: string[];
  description?: string;
  lastExecutionTime?: number;
  flaky?: boolean;
  skip?: boolean;
  skipReason?: string;
}

type TestCategory = 'unit' | 'integration' | 'e2e' | 'performance' | 'regression' | 'smoke';
type TestSpeed = 'fast' | 'normal' | 'slow' | 'very-slow';
type TestDependency = 'isolated' | 'filesystem' | 'database' | 'network' | 'external' | 'docker' | 'gpu';
type TestEnvironment = 'ci' | 'local' | 'dev' | 'staging' | 'prod' | 'test';
type TestPriority = 'critical' | 'high' | 'medium' | 'low';

interface TestFilter {
  categories?: TestCategory[];
  speeds?: TestSpeed[];
  dependencies?: TestDependency[];
  environments?: TestEnvironment[];
  priorities?: TestPriority[];
  maxExecutionTime?: number;
  includeFlaky?: boolean;
  tags?: string[];
}

interface TestSuiteInfo {
  name: string;
  file: string;
  metadata: TestMetadata;
  tests: TestInfo[];
}

interface TestInfo {
  name: string;
  suite: string;
  metadata: TestMetadata;
  executionHistory: TestExecution[];
}

interface TestExecution {
  timestamp: number;
  duration: number;
  status: 'passed' | 'failed' | 'skipped';
  error?: string;
  memory?: {
    heapUsed: number;
    heapTotal: number;
  };
}

/**
 * Speed thresholds in milliseconds
 */
const SPEED_THRESHOLDS = {
  fast: 100,      // <100ms
  normal: 1000,   // 100ms-1s
  slow: 5000,     // 1s-5s
  'very-slow': Infinity  // >5s
} as const;

/**
 * Global test registry to store metadata
 */
class TestRegistry {
  private static instance: TestRegistry;
  private suites = new Map<string, TestSuiteInfo>();
  private tests = new Map<string, TestInfo>();
  private executionHistory = new Map<string, TestExecution[]>();

  static getInstance(): TestRegistry {
    if (!TestRegistry.instance) {
      TestRegistry.instance = new TestRegistry();
    }
    return TestRegistry.instance;
  }

  registerSuite(name: string, metadata: TestMetadata, file?: string): void {
    this.suites.set(name, {
      name,
      file: file || 'unknown',
      metadata,
      tests: []
    });
  }

  registerTest(testName: string, suiteName: string, metadata: TestMetadata): void {
    const testKey = `${suiteName}::${testName}`;
    this.tests.set(testKey, {
      name: testName,
      suite: suiteName,
      metadata,
      executionHistory: []
    });

    // Add to suite
    const suite = this.suites.get(suiteName);
    if (suite) {
      suite.tests.push(this.tests.get(testKey)!);
    }
  }

  getSuite(name: string): TestSuiteInfo | undefined {
    return this.suites.get(name);
  }

  getTest(testName: string, suiteName: string): TestInfo | undefined {
    return this.tests.get(`${suiteName}::${testName}`);
  }

  getAllSuites(): TestSuiteInfo[] {
    return Array.from(this.suites.values());
  }

  getAllTests(): TestInfo[] {
    return Array.from(this.tests.values());
  }

  recordExecution(testName: string, suiteName: string, execution: TestExecution): void {
    const testKey = `${suiteName}::${testName}`;
    const history = this.executionHistory.get(testKey) || [];
    history.push(execution);
    
    // Keep only last 10 executions
    if (history.length > 10) {
      history.shift();
    }
    
    this.executionHistory.set(testKey, history);

    // Update test info
    const test = this.tests.get(testKey);
    if (test) {
      test.executionHistory = history;
      test.metadata.lastExecutionTime = execution.duration;
    }
  }

  filterTests(filter: TestFilter): TestInfo[] {
    return this.getAllTests().filter(test => this.matchesFilter(test, filter));
  }

  filterSuites(filter: TestFilter): TestSuiteInfo[] {
    return this.getAllSuites().filter(suite => this.matchesFilter({ metadata: suite.metadata } as TestInfo, filter));
  }

  private matchesFilter(test: TestInfo, filter: TestFilter): boolean {
    // Category filter
    if (filter.categories && filter.categories.length > 0) {
      if (!filter.categories.some(cat => test.metadata.categories.includes(cat))) {
        return false;
      }
    }

    // Speed filter
    if (filter.speeds && filter.speeds.length > 0) {
      if (!filter.speeds.includes(test.metadata.speed)) {
        return false;
      }
    }

    // Dependency filter
    if (filter.dependencies && filter.dependencies.length > 0) {
      if (!filter.dependencies.some(dep => test.metadata.dependencies.includes(dep))) {
        return false;
      }
    }

    // Environment filter
    if (filter.environments && filter.environments.length > 0 && test.metadata.environment) {
      if (!filter.environments.some(env => test.metadata.environment!.includes(env))) {
        return false;
      }
    }

    // Priority filter
    if (filter.priorities && filter.priorities.length > 0 && test.metadata.priority) {
      if (!filter.priorities.includes(test.metadata.priority)) {
        return false;
      }
    }

    // Execution time filter
    if (filter.maxExecutionTime && test.metadata.lastExecutionTime) {
      if (test.metadata.lastExecutionTime > filter.maxExecutionTime) {
        return false;
      }
    }

    // Flaky filter
    if (filter.includeFlaky === false && test.metadata.flaky) {
      return false;
    }

    // Tag filter
    if (filter.tags && filter.tags.length > 0 && test.metadata.tags) {
      if (!filter.tags.some(tag => test.metadata.tags!.includes(tag))) {
        return false;
      }
    }

    return true;
  }

  getStatistics(): {
    totalSuites: number;
    totalTests: number;
    byCategory: Record<TestCategory, number>;
    bySpeed: Record<TestSpeed, number>;
    byDependency: Record<TestDependency, number>;
    flakyCount: number;
    averageExecutionTime: number;
  } {
    const tests = this.getAllTests();
    const byCategory: Record<TestCategory, number> = {
      unit: 0, integration: 0, e2e: 0, performance: 0, regression: 0, smoke: 0
    };
    const bySpeed: Record<TestSpeed, number> = {
      fast: 0, normal: 0, slow: 0, 'very-slow': 0
    };
    const byDependency: Record<TestDependency, number> = {
      isolated: 0, filesystem: 0, database: 0, network: 0, external: 0, docker: 0, gpu: 0
    };

    let totalExecutionTime = 0;
    let executionCount = 0;
    let flakyCount = 0;

    tests.forEach(test => {
      // Count categories
      test.metadata.categories.forEach(cat => byCategory[cat]++);
      
      // Count speed
      bySpeed[test.metadata.speed]++;
      
      // Count dependencies
      test.metadata.dependencies.forEach(dep => byDependency[dep]++);
      
      // Count flaky tests
      if (test.metadata.flaky) flakyCount++;
      
      // Average execution time
      if (test.metadata.lastExecutionTime) {
        totalExecutionTime += test.metadata.lastExecutionTime;
        executionCount++;
      }
    });

    return {
      totalSuites: this.suites.size,
      totalTests: tests.length,
      byCategory,
      bySpeed,
      byDependency,
      flakyCount,
      averageExecutionTime: executionCount > 0 ? totalExecutionTime / executionCount : 0
    };
  }

  clear(): void {
    this.suites.clear();
    this.tests.clear();
    this.executionHistory.clear();
  }
}

/**
 * Main TestCategories class with static methods and decorators
 */
export class TestCategories {
  private static registry = TestRegistry.getInstance();

  // Category Decorators
  static unit() {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
      return TestCategories.addCategory('unit')(target, propertyKey, descriptor);
    };
  }

  static integration() {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
      return TestCategories.addCategory('integration')(target, propertyKey, descriptor);
    };
  }

  static e2e() {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
      return TestCategories.addCategory('e2e')(target, propertyKey, descriptor);
    };
  }

  static performance() {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
      return TestCategories.addCategory('performance')(target, propertyKey, descriptor);
    };
  }

  static regression() {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
      return TestCategories.addCategory('regression')(target, propertyKey, descriptor);
    };
  }

  static smoke() {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
      return TestCategories.addCategory('smoke')(target, propertyKey, descriptor);
    };
  }

  // Speed Decorators
  static fast() {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
      return TestCategories.setSpeed('fast')(target, propertyKey, descriptor);
    };
  }

  static normal() {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
      return TestCategories.setSpeed('normal')(target, propertyKey, descriptor);
    };
  }

  static slow() {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
      return TestCategories.setSpeed('slow')(target, propertyKey, descriptor);
    };
  }

  static verySlow() {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
      return TestCategories.setSpeed('very-slow')(target, propertyKey, descriptor);
    };
  }

  // Dependency Decorators
  static isolated() {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
      return TestCategories.addDependency('isolated')(target, propertyKey, descriptor);
    };
  }

  static filesystem() {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
      return TestCategories.addDependency('filesystem')(target, propertyKey, descriptor);
    };
  }

  static database() {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
      return TestCategories.addDependency('database')(target, propertyKey, descriptor);
    };
  }

  static network() {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
      return TestCategories.addDependency('network')(target, propertyKey, descriptor);
    };
  }

  static external() {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
      return TestCategories.addDependency('external')(target, propertyKey, descriptor);
    };
  }

  static docker() {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
      return TestCategories.addDependency('docker')(target, propertyKey, descriptor);
    };
  }

  static gpu() {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
      return TestCategories.addDependency('gpu')(target, propertyKey, descriptor);
    };
  }

  // Environment and Priority Decorators
  static priority(level: TestPriority) {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
      return TestCategories.addMetadata({ priority: level })(target, propertyKey, descriptor);
    };
  }

  static environment(...envs: TestEnvironment[]) {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
      return TestCategories.addMetadata({ environment: envs })(target, propertyKey, descriptor);
    };
  }

  static timeout(ms: number) {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
      return TestCategories.addMetadata({ timeout: ms })(target, propertyKey, descriptor);
    };
  }

  static retries(count: number) {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
      return TestCategories.addMetadata({ retries: count })(target, propertyKey, descriptor);
    };
  }

  static flaky(reason?: string) {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
      return TestCategories.addMetadata({ 
        flaky: true, 
        skipReason: reason 
      })(target, propertyKey, descriptor);
    };
  }

  static tags(...tagList: string[]) {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
      return TestCategories.addMetadata({ tags: tagList })(target, propertyKey, descriptor);
    };
  }

  // Conditional Execution
  static skipIfSlow(fn: () => void): void {
    const isSlowMode = process.env.JEST_SLOW_TESTS !== 'true';
    if (isSlowMode) {
      // Skip slow tests unless explicitly enabled
      return;
    }
    fn();
  }

  static skipIfEnvironment(env: TestEnvironment, fn: () => void): void {
    const currentEnv = process.env.NODE_ENV as TestEnvironment || 'local';
    if (currentEnv === env) {
      return; // Skip in this environment
    }
    fn();
  }

  static onlyInEnvironment(env: TestEnvironment, fn: () => void): void {
    const currentEnv = process.env.NODE_ENV as TestEnvironment || 'local';
    if (currentEnv !== env) {
      return; // Skip unless in this environment
    }
    fn();
  }

  static timeLimit(ms: number, fn: () => void): void {
    const start = process.hrtime.bigint();
    try {
      fn();
    } finally {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // Convert to ms
      if (duration > ms) {
        console.warn(`Test exceeded time limit: ${duration.toFixed(2)}ms > ${ms}ms`);
      }
    }
  }

  // Test Organization
  static categorize(metadata: Partial<TestMetadata>) {
    return (target: any) => {
      const suiteName = target.name || 'Unknown Suite';
      const fullMetadata: TestMetadata = {
        categories: metadata.categories || ['unit'],
        speed: metadata.speed || 'normal',
        dependencies: metadata.dependencies || ['isolated'],
        environment: metadata.environment,
        priority: metadata.priority,
        timeout: metadata.timeout,
        retries: metadata.retries,
        tags: metadata.tags,
        flaky: metadata.flaky,
        ...metadata
      };
      
      TestCategories.registry.registerSuite(suiteName, fullMetadata);
      return target;
    };
  }

  // Test Filtering and Execution
  static runByCategory(categories: TestCategory[]): TestFilter {
    return { categories };
  }

  static runBySpeed(speeds: TestSpeed[]): TestFilter {
    return { speeds };
  }

  static runByDependency(dependencies: TestDependency[]): TestFilter {
    return { dependencies };
  }

  static skipByEnvironment(env: TestEnvironment, categories?: TestCategory[]): TestFilter {
    return { 
      environments: [env],
      categories 
    };
  }

  static groupBySuite(): Record<string, TestInfo[]> {
    const suites = TestCategories.registry.getAllSuites();
    const result: Record<string, TestInfo[]> = {};
    
    suites.forEach(suite => {
      result[suite.name] = suite.tests;
    });
    
    return result;
  }

  static groupByCategory(): Record<TestCategory, TestInfo[]> {
    const tests = TestCategories.registry.getAllTests();
    const result: Record<TestCategory, TestInfo[]> = {
      unit: [], integration: [], e2e: [], performance: [], regression: [], smoke: []
    };
    
    tests.forEach(test => {
      test.metadata.categories.forEach(category => {
        result[category].push(test);
      });
    });
    
    return result;
  }

  // Test Metadata Management
  static getTestMetadata(testName: string, suiteName: string): TestMetadata | undefined {
    const test = TestCategories.registry.getTest(testName, suiteName);
    return test?.metadata;
  }

  static updateTestMetadata(testName: string, suiteName: string, updates: Partial<TestMetadata>): void {
    const test = TestCategories.registry.getTest(testName, suiteName);
    if (test) {
      Object.assign(test.metadata, updates);
    }
  }

  static markAsFlaky(testName: string, suiteName: string, reason?: string): void {
    TestCategories.updateTestMetadata(testName, suiteName, { 
      flaky: true, 
      skipReason: reason 
    });
  }

  static recordTestExecution(
    testName: string, 
    suiteName: string, 
    duration: number, 
    status: 'passed' | 'failed' | 'skipped',
    error?: string
  ): void {
    const execution: TestExecution = {
      timestamp: Date.now(),
      duration,
      status,
      error,
      memory: process.memoryUsage()
    };
    
    TestCategories.registry.recordExecution(testName, suiteName, execution);
    
    // Auto-categorize by speed
    let speed: TestSpeed = 'normal';
    if (duration < SPEED_THRESHOLDS.fast) speed = 'fast';
    else if (duration < SPEED_THRESHOLDS.normal) speed = 'normal';
    else if (duration < SPEED_THRESHOLDS.slow) speed = 'slow';
    else speed = 'very-slow';
    
    TestCategories.updateTestMetadata(testName, suiteName, { speed });
  }

  // Statistics and Reporting
  static getStatistics() {
    return TestCategories.registry.getStatistics();
  }

  static getFilteredTests(filter: TestFilter): TestInfo[] {
    return TestCategories.registry.filterTests(filter);
  }

  static getFilteredSuites(filter: TestFilter): TestSuiteInfo[] {
    return TestCategories.registry.filterSuites(filter);
  }

  static generateReport(): string {
    const stats = TestCategories.getStatistics();
    const lines = [
      '=== Test Categories Report ===',
      `Total Suites: ${stats.totalSuites}`,
      `Total Tests: ${stats.totalTests}`,
      `Flaky Tests: ${stats.flakyCount}`,
      `Average Execution Time: ${stats.averageExecutionTime.toFixed(2)}ms`,
      '',
      'By Category:',
      ...Object.entries(stats.byCategory).map(([cat, count]) => `  ${cat}: ${count}`),
      '',
      'By Speed:',
      ...Object.entries(stats.bySpeed).map(([speed, count]) => `  ${speed}: ${count}`),
      '',
      'By Dependency:',
      ...Object.entries(stats.byDependency).map(([dep, count]) => `  ${dep}: ${count}`)
    ];
    
    return lines.join('\n');
  }

  // Jest Integration
  static createJestMatchers() {
    return {
      toBeCategory(received: TestInfo, category: TestCategory) {
        const pass = received.metadata.categories.includes(category);
        return {
          message: () => 
            `expected test ${received.name} ${pass ? 'not ' : ''}to be in category ${category}`,
          pass
        };
      },
      
      toHaveSpeed(received: TestInfo, speed: TestSpeed) {
        const pass = received.metadata.speed === speed;
        return {
          message: () => 
            `expected test ${received.name} to have speed ${speed}, got ${received.metadata.speed}`,
          pass
        };
      },
      
      toHaveDependency(received: TestInfo, dependency: TestDependency) {
        const pass = received.metadata.dependencies.includes(dependency);
        return {
          message: () => 
            `expected test ${received.name} ${pass ? 'not ' : ''}to have dependency ${dependency}`,
          pass
        };
      }
    };
  }

  // Utility Methods
  static reset(): void {
    TestCategories.registry.clear();
  }

  // Private helper methods
  private static addCategory(category: TestCategory) {
    return TestCategories.addMetadata({ categories: [category] });
  }

  private static setSpeed(speed: TestSpeed) {
    return TestCategories.addMetadata({ speed });
  }

  private static addDependency(dependency: TestDependency) {
    return TestCategories.addMetadata({ dependencies: [dependency] });
  }

  private static addMetadata(metadata: Partial<TestMetadata>) {
    return (target: any, _propertyKey?: string, _descriptor?: PropertyDescriptor) => {
      if (!target._testMetadata) {
        target._testMetadata = {
          categories: ['unit'],
          speed: 'normal' as TestSpeed,
          dependencies: ['isolated'] as TestDependency[]
        };
      }
      
      // Merge metadata
      if (metadata.categories) {
        target._testMetadata.categories = [
          ...new Set([...target._testMetadata.categories, ...metadata.categories])
        ];
      }
      if (metadata.dependencies) {
        target._testMetadata.dependencies = [
          ...new Set([...target._testMetadata.dependencies, ...metadata.dependencies])
        ];
      }
      Object.assign(target._testMetadata, metadata);
      
      return target;
    };
  }
}

// Jest Configuration Helpers
export class JestTestCategories {
  static getConfigForCategories(categories: TestCategory[]): Partial<any> {
    return {
      testNamePattern: `\\[(${categories.join('|')})\\]`,
      setupFilesAfterEnv: [require.resolve('./jest-setup-categories')]
    };
  }

  static getConfigForSpeed(speed: TestSpeed): Partial<any> {
    const timeout = {
      fast: 5000,
      normal: 10000,
      slow: 30000,
      'very-slow': 120000
    }[speed];

    return {
      testTimeout: timeout,
      testNamePattern: `\\[${speed}\\]`
    };
  }

  static getConfigForDependencies(dependencies: TestDependency[]): Partial<any> {
    const setupFiles: string[] = [];
    
    if (dependencies.includes('filesystem')) {
      setupFiles.push(require.resolve('./jest-setup-filesystem'));
    }
    if (dependencies.includes('database')) {
      setupFiles.push(require.resolve('./jest-setup-database'));
    }
    
    return {
      setupFilesAfterEnv: setupFiles,
      testNamePattern: `\\[(${dependencies.join('|')})\\]`
    };
  }

  static createFilteredConfig(filter: TestFilter): Partial<any> {
    const patterns: string[] = [];
    
    if (filter.categories) {
      patterns.push(`\\[(${filter.categories.join('|')})\\]`);
    }
    if (filter.speeds) {
      patterns.push(`\\[(${filter.speeds.join('|')})\\]`);
    }
    if (filter.dependencies) {
      patterns.push(`\\[(${filter.dependencies.join('|')})\\]`);
    }
    
    return {
      testNamePattern: patterns.length > 0 ? patterns.join('.*') : undefined,
      testTimeout: filter.maxExecutionTime || 10000
    };
  }
}

// Export types for external use
export type {
  TestMetadata,
  TestCategory,
  TestSpeed,
  TestDependency,
  TestEnvironment,
  TestPriority,
  TestFilter,
  TestSuiteInfo,
  TestInfo,
  TestExecution
};

export { TestRegistry };