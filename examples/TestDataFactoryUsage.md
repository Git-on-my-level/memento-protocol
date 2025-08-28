# TestDataFactory Usage Examples

This document demonstrates how to use the TestDataFactory to create consistent test data in Memento Protocol tests.

## Basic Usage

### Before (Manual Test Data Creation)

```typescript
// Old way - manually creating test data
const mockPack = {
  manifest: {
    name: 'test-pack',
    version: '1.0.0',
    description: 'Test starter pack',
    author: 'test-author',
    components: {
      modes: [{ name: 'engineer', required: true }],
      workflows: [{ name: 'review', required: true }],
      agents: [{ name: 'claude-code-research', required: false }]
    },
    tags: ['test'],
    category: 'general'
  },
  path: '/test/path',
  componentsPath: '/test/path/components'
};
```

### After (Using TestDataFactory)

```typescript
import { TestDataFactory } from '../lib/testing';

// New way - using TestDataFactory
const mockPack = TestDataFactory.pack()
  .withName('test-pack')
  .withDescription('Test starter pack')
  .withAuthor('test-author')
  .build();
```

## Advanced Usage Examples

### Creating Test Variations

```typescript
// Create multiple pack variations for testing different scenarios
const packs = TestDataFactory.buildVariations(
  TestDataFactory.pack(),
  [
    // Valid pack
    (builder) => builder.withName('valid-pack'),
    
    // Pack with missing components
    (builder) => builder.withName('missing-pack').withMissingRequiredComponents(),
    
    // Pack with invalid manifest
    (builder) => builder.withName('invalid-pack').withInvalidManifest(),
    
    // Frontend-specific pack
    (builder) => builder.asFrontendReactPack()
  ]
);

// Use in tests
describe('Pack validation', () => {
  test.each(packs)('should handle pack: %s', (pack) => {
    // Test logic here
  });
});
```

### Creating Component Collections

```typescript
// Create a complete set of components for testing
const components = TestDataFactory.createPackComponents();

expect(components.modes).toHaveLength(2);  // engineer, architect
expect(components.workflows).toHaveLength(2);  // review, refactor
expect(components.agents).toHaveLength(1);  // claude-code-research
```

### Testing CLI Options

```typescript
// Create CLI options for different commands
const initOptions = TestDataFactory.cliOptions()
  .asInitOptions()
  .withForce(true)
  .withNonInteractive(true)
  .build();

const addOptions = TestDataFactory.cliOptions()
  .asAddOptions()
  .withModes(['engineer', 'architect'])
  .withVerbose(true)
  .build();

// Use in command tests
await initCommand(initOptions);
await addCommand(addOptions);
```

### Testing Error Scenarios

```typescript
// Create validation results for error testing
const validationError = TestDataFactory.packValidationResult()
  .asInvalid()
  .addError('Missing required field: name')
  .addError('Invalid version format')
  .addWarning('Deprecated configuration option')
  .build();

const installationError = TestDataFactory.packInstallationResult()
  .asFailed()
  .withErrors(['Component not found', 'Permission denied'])
  .build();
```

### Testing Configuration Scenarios

```typescript
// Create different configuration states
const defaultConfig = TestDataFactory.config().build();

const customConfig = TestDataFactory.config()
  .withDefaultMode('architect')
  .withPreferredWorkflows(['review', 'refactor'])
  .withColorOutput(false)
  .withVerboseLogging(true)
  .build();

const invalidConfig = TestDataFactory.config()
  .withInvalidStructure()
  .build();
```

### Testing Hook Configurations

```typescript
// Create different hook types
const hooks = [
  TestDataFactory.hook().asUserPromptSubmit().build(),
  TestDataFactory.hook().asPreToolUse().withRegexMatcher('git.*').build(),
  TestDataFactory.hook().asPostToolUse().withTimeout(5000).build()
];

const hookDefinition = TestDataFactory.createHookDefinition();
```

### Bulk Data Creation

```typescript
// Create multiple instances for stress testing
const manyTickets = TestDataFactory.buildMany(
  TestDataFactory.ticket(), 
  100
);

const ticketsByStatus = [
  ...TestDataFactory.buildMany(TestDataFactory.ticket().asNext(), 20),
  ...TestDataFactory.buildMany(TestDataFactory.ticket().asInProgress(), 5),
  ...TestDataFactory.buildMany(TestDataFactory.ticket().asDone(), 50)
];
```

## Integration with Existing Test Utilities

### Combined with FileSystem Testing

```typescript
import { TestDataFactory, createTestMementoProject } from '../lib/testing';

// Create filesystem with generated test data
const mode = TestDataFactory.mode().withName('test-engineer').build();
const pack = TestDataFactory.pack().asFrontendReactPack().build();

const fs = await createTestMementoProject('/test/project', {
  [`/test/project/.memento/modes/${mode.name}.md`]: mode.content,
  '/test/project/.memento/config.json': JSON.stringify(
    TestDataFactory.config().withDefaultMode(mode.name).build()
  )
});
```

### With Mocked Services

```typescript
// Mock StarterPackManager with test data
const mockPacks = [
  TestDataFactory.pack().asFrontendReactPack().build(),
  TestDataFactory.pack().asBackendApiPack().build(),
  TestDataFactory.pack().asFullStackPack().build()
];

jest.spyOn(StarterPackManager.prototype, 'listPacks')
  .mockResolvedValue(mockPacks);

jest.spyOn(StarterPackManager.prototype, 'installPack')
  .mockResolvedValue(
    TestDataFactory.packInstallationResult().asSuccessful().build()
  );
```

## Best Practices

### 1. Use Descriptive Names
```typescript
// Good - descriptive and purposeful
const validEngineerMode = TestDataFactory.mode()
  .withName('engineer')
  .withTags(['engineering', 'development'])
  .build();

// Avoid - generic and unclear
const mode1 = TestDataFactory.mode().build();
```

### 2. Create Test-Specific Builders
```typescript
// Create domain-specific builders for common patterns
class TestPackFactory {
  static validReactPack() {
    return TestDataFactory.pack()
      .asFrontendReactPack()
      .withModes([
        TestDataFactory.packComponent().withName('frontend-engineer').build(),
        TestDataFactory.packComponent().withName('ui-designer').build()
      ]);
  }

  static packWithMissingDependencies() {
    return TestDataFactory.pack()
      .withDependencies(['non-existent-pack'])
      .withName('dependent-pack');
  }
}
```

### 3. Reset Builders Between Tests
```typescript
describe('Pack installation', () => {
  let packBuilder: PackBuilder;

  beforeEach(() => {
    packBuilder = TestDataFactory.pack();
  });

  it('should install valid pack', () => {
    const pack = packBuilder.withName('valid-pack').build();
    // test logic
  });

  it('should handle invalid pack', () => {
    // Builder is automatically reset between tests
    const pack = packBuilder.withInvalidManifest().build();
    // test logic
  });
});
```

### 4. Leverage Type Safety
```typescript
// TypeScript will catch errors at compile time
const invalidUsage = TestDataFactory.config()
  .withDefaultMode(123)  // ❌ Type error - expects string
  .build();

const validUsage = TestDataFactory.config()
  .withDefaultMode('engineer')  // ✅ Correct type
  .build();
```

This TestDataFactory provides a consistent, type-safe, and maintainable way to create test data across the entire Memento Protocol test suite.