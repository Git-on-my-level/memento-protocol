/**
 * Integration Test for Memento Protocol Testing Framework Core Utilities
 * 
 * This test validates the integration of key testing utilities and demonstrates
 * how to use them together in real-world scenarios. It serves as both validation
 * of the framework and documentation of usage patterns.
 */

import { 
  TestDataFactory,
  ErrorScenarios,
  MockFactory,
  createTestFileSystem,
  assertFileExists,
  assertJsonFileContains
} from '../index';
import { FileSystemAdapter } from '../../adapters/FileSystemAdapter';
import * as path from 'path';

describe('Memento Protocol Testing Framework Integration', () => {
  let testFs: FileSystemAdapter;
  let testProjectRoot: string;

  beforeEach(async () => {
    // Create a test filesystem for integration testing
    testFs = await createTestFileSystem({
      '/project/package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        type: 'module'
      }),
      '/project/.memento/config.json': JSON.stringify({
        defaultMode: 'engineer',
        preferredWorkflows: ['review']
      })
    });
    testProjectRoot = '/project';
  });

  describe('Core Framework Integration', () => {
    it('should integrate TestDataFactory with filesystem testing', async () => {
      // Create test data using TestDataFactory
      const config = TestDataFactory.config()
        .withDefaultMode('test-engineer')
        .withPreferredWorkflows(['testing-workflow'])
        .build();

      const mode = TestDataFactory.mode()
        .withName('test-engineer')
        .withDescription('Engineer focused on testing')
        .withTags(['testing', 'engineering'])
        .build();

      // Write test data to filesystem
      await testFs.writeFile(
        path.join(testProjectRoot, '.memento/config.json'),
        JSON.stringify(config, null, 2)
      );

      await testFs.writeFile(
        path.join(testProjectRoot, '.memento/modes/test-engineer.md'),
        mode.content || '# Test Engineer Mode'
      );

      // Verify using filesystem assertions
      await assertFileExists(testFs, path.join(testProjectRoot, '.memento/config.json'));
      await assertFileExists(testFs, path.join(testProjectRoot, '.memento/modes/test-engineer.md'));

      // Verify JSON content
      await assertJsonFileContains(
        testFs,
        path.join(testProjectRoot, '.memento/config.json'),
        { defaultMode: 'test-engineer' }
      );

      expect(config.defaultMode).toBe('test-engineer');
      expect(mode.name).toBe('test-engineer');
    });

    it('should create and validate pack data', async () => {
      const pack = TestDataFactory.pack()
        .withName('testing-pack')
        .withDescription('A testing pack for development')
        .withVersion('1.0.0')
        .withAuthor('test-author')
        .withCategory('general')
        .build();

      // Note: PackStructure has manifest property containing the metadata
      expect(pack.manifest.name).toBe('testing-pack');
      expect(pack.manifest.description).toBe('A testing pack for development');
      expect(pack.manifest.version).toBe('1.0.0');
      expect(pack.manifest.author).toBe('test-author');
      expect(pack.manifest.category).toBe('general');
    });

    it('should create ticket data with proper structure', async () => {
      const ticket = TestDataFactory.ticket()
        .withName('auth-task')
        .withStatus('in-progress')
        .build();

      expect(ticket.name).toBe('auth-task');
      expect(ticket.status).toBe('in-progress');
    });

    it('should create hook configurations', async () => {
      const hook = TestDataFactory.hook()
        .withName('git-context-loader')
        .withEvent('UserPromptSubmit')
        .withEnabled(true)
        .build();

      expect(hook.name).toBe('git-context-loader');
      expect(hook.event).toBe('UserPromptSubmit');
      expect(hook.enabled).toBe(true);
    });

    it('should create CLI options', async () => {
      const options = TestDataFactory.cliOptions()
        .withForce(true)
        .withNonInteractive(true)
        .withVerbose(false)
        .build();

      expect(options.force).toBe(true);
      expect(options.nonInteractive).toBe(true);
      expect(options.verbose).toBe(false);
    });
  });

  describe('Performance and Data Generation', () => {
    it('should handle large-scale test data generation efficiently', async () => {
      const startTime = Date.now();
      
      // Generate large amounts of test data
      const modes = Array.from({ length: 100 }, (_, i) => 
        TestDataFactory.mode()
          .withName(`test-mode-${i}`)
          .withTags([`tag-${i % 10}`, 'generated'])
          .build()
      );

      const workflows = Array.from({ length: 50 }, (_, i) =>
        TestDataFactory.workflow()
          .withName(`test-workflow-${i}`)
          .withTags(['workflow', `batch-${Math.floor(i / 10)}`])
          .build()
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Performance assertions
      expect(modes).toHaveLength(100);
      expect(workflows).toHaveLength(50);
      expect(duration).toBeLessThan(1000); // Should generate quickly
      
      // Verify data quality
      expect(modes[0].name).toBe('test-mode-0');
      expect(modes[99].name).toBe('test-mode-99');
      expect(workflows[0].name).toBe('test-workflow-0');
    });

    it('should support concurrent filesystem operations', async () => {
      // Test concurrent operations
      const concurrentTasks = Array.from({ length: 10 }, async (_, i) => {
        const config = TestDataFactory.config()
          .withDefaultMode('engineer')
          .build();

        const filePath = path.join(testProjectRoot, `.memento/concurrent-${i}.json`);
        await testFs.writeFile(filePath, JSON.stringify(config, null, 2));
        return filePath;
      });

      const results = await Promise.all(concurrentTasks);
      
      // Verify all files were created
      expect(results).toHaveLength(10);
      for (const filePath of results) {
        await assertFileExists(testFs, filePath);
      }
    });
  });

  describe('Framework Validation and Health Checks', () => {
    it('should validate all testing utilities are properly exported', () => {
      // Verify core utilities are available
      expect(TestDataFactory).toBeDefined();
      expect(ErrorScenarios).toBeDefined();
      expect(MockFactory).toBeDefined();
      
      // Verify factory methods
      expect(TestDataFactory.mode).toBeInstanceOf(Function);
      expect(TestDataFactory.workflow).toBeInstanceOf(Function);
      expect(TestDataFactory.config).toBeInstanceOf(Function);
      expect(TestDataFactory.pack).toBeInstanceOf(Function);
      expect(TestDataFactory.ticket).toBeInstanceOf(Function);
      expect(TestDataFactory.hook).toBeInstanceOf(Function);
      expect(TestDataFactory.cliOptions).toBeInstanceOf(Function);
    });

    it('should validate builders create consistent data', () => {
      // Test that builders produce consistent, different objects
      const mode1 = TestDataFactory.mode().withName('mode1').build();
      const mode2 = TestDataFactory.mode().withName('mode2').build();
      
      expect(mode1.name).toBe('mode1');
      expect(mode2.name).toBe('mode2');
      expect(mode1).not.toBe(mode2); // Different object instances
      expect(mode1.name).not.toBe(mode2.name); // Different data
    });

    it('should validate filesystem testing utilities work correctly', async () => {
      // Test file operations
      const testFile = path.join(testProjectRoot, 'test-file.txt');
      const testContent = 'Test file content';
      
      await testFs.writeFile(testFile, testContent);
      await assertFileExists(testFs, testFile);
      
      const readContent = await testFs.readFile(testFile, 'utf-8');
      expect(readContent).toBe(testContent);
      
      // Test JSON operations
      const testJsonFile = path.join(testProjectRoot, 'test.json');
      const testJsonData = { key: 'value', number: 42 };
      
      await testFs.writeFile(testJsonFile, JSON.stringify(testJsonData, null, 2));
      await assertJsonFileContains(testFs, testJsonFile, { key: 'value' });
      await assertJsonFileContains(testFs, testJsonFile, { number: 42 });
    });
  });

  describe('Documentation Examples Validation', () => {
    it('should validate basic framework usage examples', async () => {
      // Example 1: Basic TestDataFactory usage
      const mode = TestDataFactory.mode()
        .withName('test-engineer')
        .withTags(['testing'])
        .build();
      
      expect(mode.name).toBe('test-engineer');
      expect(mode.tags).toContain('testing');

      // Example 2: Configuration creation
      const config = TestDataFactory.config()
        .withDefaultMode('engineer')
        .withPreferredWorkflows(['review', 'test'])
        .build();
        
      expect(config.defaultMode).toBe('engineer');
      expect(config.preferredWorkflows).toContain('review');
      expect(config.preferredWorkflows).toContain('test');

      // Example 3: File system testing
      await testFs.writeFile(
        path.join(testProjectRoot, 'example.md'),
        '# Example Documentation'
      );
      
      await assertFileExists(testFs, path.join(testProjectRoot, 'example.md'));
    });

    it('should demonstrate builder pattern consistency', () => {
      // Test that builders can be chained and produce expected results
      const component = TestDataFactory.component()
        .withName('custom-component')
        .withDescription('Custom description')
        .withAuthor('test-author')
        .withVersion('2.1.0')
        .withTags(['custom', 'test'])
        .build();

      expect(component.name).toBe('custom-component');
      expect(component.description).toBe('Custom description');
      expect(component.author).toBe('test-author');
      expect(component.version).toBe('2.1.0');
      expect(component.tags).toEqual(['custom', 'test']);
    });
  });
});