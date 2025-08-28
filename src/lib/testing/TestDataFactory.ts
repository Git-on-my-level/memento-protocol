/**
 * Comprehensive TestDataFactory for Memento Protocol CLI testing framework
 * 
 * This factory provides fluent builder patterns for creating test data consistently
 * across the test suite. Uses the builder pattern with TypeScript for type safety.
 * 
 * @example
 * ```typescript
 * import { TestDataFactory } from './TestDataFactory';
 * 
 * // Create a mode with custom properties
 * const mode = TestDataFactory.mode()
 *   .withName('test-engineer')
 *   .withDescription('Test engineer mode')
 *   .withTags(['engineering', 'test'])
 *   .build();
 * 
 * // Create an invalid pack for error testing
 * const invalidPack = TestDataFactory.pack()
 *   .withInvalidManifest()
 *   .build();
 * 
 * // Create CLI options
 * const options = TestDataFactory.cliOptions()
 *   .withForce(true)
 *   .withNonInteractive(true)
 *   .build();
 * ```
 */

import { PackManifest, PackStructure, PackComponent, PackInstallOptions, PackValidationResult, PackInstallationResult, PackDependencyResult, PackCategory, ProjectType } from '../types/packs';
import { HookConfig, HookEvent, HookMatcher, HookRequirements, HookDefinition } from '../hooks/types';
import { MementoConfig } from '../configSchema';
import { TicketInfo, TicketStatus } from '../ticketManager';

/**
 * Mutable versions of readonly interfaces for building test data
 */
type MutablePackComponent = {
  -readonly [K in keyof PackComponent]: PackComponent[K];
};

type MutablePackManifest = {
  -readonly [K in keyof PackManifest]: K extends 'components' 
    ? {
        -readonly [C in keyof PackManifest[K]]: PackManifest[K][C] extends readonly any[]
          ? MutablePackComponent[]
          : PackManifest[K][C];
      }
    : PackManifest[K];
};

type MutablePackValidationResult = {
  -readonly [K in keyof PackValidationResult]: PackValidationResult[K];
};

type MutablePackInstallationResult = {
  -readonly [K in keyof PackInstallationResult]: K extends 'installed' | 'skipped'
    ? {
        -readonly [I in keyof PackInstallationResult[K]]: PackInstallationResult[K][I];
      }
    : PackInstallationResult[K];
};

type MutablePackDependencyResult = {
  -readonly [K in keyof PackDependencyResult]: PackDependencyResult[K];
};

/**
 * Generic interface for all builders
 */
interface Builder<T> {
  build(): T;
  reset(): this;
}

/**
 * Component data structure for modes, workflows, agents
 */
export interface ComponentData {
  name: string;
  description?: string;
  author?: string;
  version?: string;
  tags?: string[];
  content?: string;
  frontmatter?: Record<string, unknown>;
}

/**
 * CLI Options interface covering common command options
 */
export interface CliOptions {
  force?: boolean;
  nonInteractive?: boolean;
  verbose?: boolean;
  config?: string;
  modes?: string[];
  workflows?: string[];
  agents?: string[];
  hooks?: string[];
  defaultMode?: string;
  addToGitignore?: boolean;
  skipOptional?: boolean;
  dryRun?: boolean;
  interactive?: boolean;
  [key: string]: unknown;
}

/**
 * Builder for creating component test data (modes, workflows, agents)
 */
export class ComponentBuilder implements Builder<ComponentData> {
  private data: ComponentData;

  constructor() {
    this.data = {} as ComponentData;
    this.reset();
  }

  reset(): this {
    this.data = {
      name: 'test-component',
      description: 'Test component description',
      author: 'memento-protocol',
      version: '1.0.0',
      tags: ['test'],
      content: '# Test Component\n\nThis is a test component for unit testing.'
    };
    return this;
  }

  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  withDescription(description: string): this {
    this.data.description = description;
    return this;
  }

  withAuthor(author: string): this {
    this.data.author = author;
    return this;
  }

  withVersion(version: string): this {
    this.data.version = version;
    return this;
  }

  withTags(tags: string[]): this {
    this.data.tags = [...tags];
    return this;
  }

  withContent(content: string): this {
    this.data.content = content;
    return this;
  }

  withFrontmatter(frontmatter: Record<string, unknown>): this {
    this.data.frontmatter = { ...frontmatter };
    return this;
  }

  withInvalidName(): this {
    this.data.name = 'invalid name with spaces!@#';
    return this;
  }

  withMissingRequiredFields(): this {
    this.data = { ...this.data };
    delete (this.data as any).name;
    delete (this.data as any).version;
    return this;
  }

  asMode(): this {
    this.data.name = 'test-mode';
    this.data.description = 'Test mode for development';
    this.data.tags = ['mode', 'development'];
    this.data.content = '# Test Mode\n\nYou are a test engineer focused on quality assurance.';
    return this;
  }

  asWorkflow(): this {
    this.data.name = 'test-workflow';
    this.data.description = 'Test workflow for development processes';
    this.data.tags = ['workflow', 'process'];
    this.data.content = '# Test Workflow\n\n1. Analyze requirements\n2. Write tests\n3. Implement solution';
    return this;
  }

  asAgent(): this {
    this.data.name = 'test-agent';
    this.data.description = 'Test agent for specialized tasks';
    this.data.tags = ['agent', 'specialized'];
    this.data.content = '# Test Agent\n\nSpecialized agent for testing scenarios.';
    return this;
  }

  build(): ComponentData {
    return JSON.parse(JSON.stringify(this.data));
  }
}

/**
 * Builder for creating pack component references
 */
export class PackComponentBuilder implements Builder<PackComponent> {
  private data: MutablePackComponent;

  constructor() {
    this.data = {} as MutablePackComponent;
    this.reset();
  }

  reset(): this {
    this.data = {
      name: 'test-component',
      required: true
    };
    return this;
  }

  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  withRequired(required: boolean): this {
    this.data.required = required;
    return this;
  }

  withDescription(description: string): this {
    this.data.description = description;
    return this;
  }

  withCustomConfig(config: Record<string, unknown>): this {
    this.data.customConfig = { ...config };
    return this;
  }

  asOptional(): this {
    this.data.required = false;
    return this;
  }

  build(): PackComponent {
    return JSON.parse(JSON.stringify(this.data));
  }
}

/**
 * Builder for creating starter pack structures
 */
export class PackBuilder implements Builder<PackStructure> {
  private manifest: MutablePackManifest;
  private path: string;
  private componentsPath: string;

  constructor() {
    this.manifest = {} as MutablePackManifest;
    this.path = '';
    this.componentsPath = '';
    this.reset();
  }

  reset(): this {
    this.manifest = {
      name: 'test-pack',
      version: '1.0.0',
      description: 'Test starter pack for unit testing',
      author: 'memento-protocol',
      tags: ['test', 'starter'],
      category: 'general',
      components: {
        modes: [{ name: 'engineer', required: true }],
        workflows: [{ name: 'review', required: true }],
        agents: [{ name: 'claude-code-research', required: false }]
      }
    };
    this.path = '/test/templates/starter-packs/test-pack';
    this.componentsPath = '/test/templates/starter-packs/test-pack/components';
    return this;
  }

  withName(name: string): this {
    this.manifest.name = name;
    this.path = `/test/templates/starter-packs/${name}`;
    this.componentsPath = `/test/templates/starter-packs/${name}/components`;
    return this;
  }

  withVersion(version: string): this {
    this.manifest.version = version;
    return this;
  }

  withDescription(description: string): this {
    this.manifest.description = description;
    return this;
  }

  withAuthor(author: string): this {
    this.manifest.author = author;
    return this;
  }

  withTags(tags: string[]): this {
    this.manifest.tags = [...tags];
    return this;
  }

  withCategory(category: PackCategory): this {
    this.manifest.category = category;
    return this;
  }

  withMementoProtocolVersion(version: string): this {
    this.manifest.mementoProtocolVersion = version;
    return this;
  }

  withModes(modes: PackComponent[]): this {
    this.manifest.components.modes = [...modes] as MutablePackComponent[];
    return this;
  }

  withWorkflows(workflows: PackComponent[]): this {
    this.manifest.components.workflows = [...workflows] as MutablePackComponent[];
    return this;
  }

  withAgents(agents: PackComponent[]): this {
    this.manifest.components.agents = [...agents] as MutablePackComponent[];
    return this;
  }

  withHooks(hooks: PackComponent[]): this {
    this.manifest.components.hooks = [...hooks] as MutablePackComponent[];
    return this;
  }

  withDependencies(dependencies: string[]): this {
    this.manifest.dependencies = [...dependencies];
    return this;
  }

  withCompatibleWith(compatibleWith: ProjectType[]): this {
    this.manifest.compatibleWith = [...compatibleWith];
    return this;
  }

  withConfiguration(config: any): this {
    this.manifest.configuration = { ...config };
    return this;
  }

  withPostInstallMessage(message: string): this {
    this.manifest.postInstall = { message };
    return this;
  }

  withPostInstallCommands(commands: string[]): this {
    if (!this.manifest.postInstall) {
      this.manifest.postInstall = {};
    }
    (this.manifest.postInstall as any).commands = [...commands];
    return this;
  }

  withPath(path: string): this {
    this.path = path;
    return this;
  }

  withComponentsPath(componentsPath: string): this {
    this.componentsPath = componentsPath;
    return this;
  }

  withInvalidManifest(): this {
    // Create various validation errors
    delete (this.manifest as any).name;
    (this.manifest as any).version = 'not-a-version';
    (this.manifest as any).description = 123;
    (this.manifest as any).components = 'invalid';
    return this;
  }

  withCircularDependency(dependentPack: string): this {
    this.manifest.dependencies = [dependentPack];
    return this;
  }

  withMissingRequiredComponents(): this {
    this.manifest.components.modes = [{ name: 'missing-mode', required: true }];
    this.manifest.components.workflows = [{ name: 'missing-workflow', required: true }];
    return this;
  }

  withEmptyComponents(): this {
    this.manifest.components = {
      modes: [],
      workflows: [],
      agents: []
    };
    return this;
  }

  withIncompatibleVersion(): this {
    this.manifest.mementoProtocolVersion = '>=999.0.0';
    return this;
  }

  asFrontendReactPack(): this {
    this.manifest.name = 'frontend-react';
    this.manifest.description = 'Frontend development pack with React focus';
    this.manifest.category = 'frontend';
    this.manifest.tags = ['frontend', 'react', 'web'];
    this.manifest.compatibleWith = ['react', 'typescript', 'javascript'];
    this.manifest.components = {
      modes: [
        { name: 'frontend-engineer', required: true },
        { name: 'ui-designer', required: false }
      ],
      workflows: [
        { name: 'component-review', required: true },
        { name: 'ui-testing', required: false }
      ],
      agents: [
        { name: 'react-specialist', required: false }
      ]
    };
    return this;
  }

  asBackendApiPack(): this {
    this.manifest.name = 'backend-api';
    this.manifest.description = 'Backend API development pack';
    this.manifest.category = 'backend';
    this.manifest.tags = ['backend', 'api', 'server'];
    this.manifest.compatibleWith = ['node', 'typescript', 'python'];
    this.manifest.components = {
      modes: [
        { name: 'backend-engineer', required: true },
        { name: 'api-architect', required: false }
      ],
      workflows: [
        { name: 'api-review', required: true },
        { name: 'performance-optimization', required: false }
      ]
    };
    return this;
  }

  asFullStackPack(): this {
    this.manifest.name = 'fullstack-web';
    this.manifest.description = 'Complete full-stack web development pack';
    this.manifest.category = 'fullstack';
    this.manifest.tags = ['fullstack', 'web', 'enterprise'];
    this.manifest.dependencies = ['frontend-react', 'backend-api'];
    this.manifest.components = {
      modes: [
        { name: 'fullstack-architect', required: true },
        { name: 'devops-engineer', required: false }
      ],
      workflows: [
        { name: 'end-to-end-review', required: true },
        { name: 'deployment-workflow', required: false }
      ]
    };
    this.manifest.configuration = {
      defaultMode: 'fullstack-architect',
      projectSettings: {
        enableMonitoring: true,
        logLevel: 'info'
      }
    };
    return this;
  }

  build(): PackStructure {
    return JSON.parse(JSON.stringify({
      manifest: this.manifest,
      path: this.path,
      componentsPath: this.componentsPath
    }));
  }
}

/**
 * Builder for creating configuration objects
 */
export class ConfigBuilder implements Builder<MementoConfig> {
  private data: MementoConfig;

  constructor() {
    this.data = {} as MementoConfig;
    this.reset();
  }

  reset(): this {
    this.data = {
      defaultMode: 'engineer',
      preferredWorkflows: ['review'],
      ui: {
        colorOutput: true,
        verboseLogging: false
      }
    };
    return this;
  }

  withDefaultMode(mode: string): this {
    this.data.defaultMode = mode;
    return this;
  }

  withPreferredWorkflows(workflows: string[]): this {
    this.data.preferredWorkflows = [...workflows];
    return this;
  }

  withCustomTemplateSources(sources: string[]): this {
    this.data.customTemplateSources = [...sources];
    return this;
  }

  withIntegrations(integrations: Record<string, any>): this {
    this.data.integrations = { ...integrations };
    return this;
  }

  withColorOutput(enabled: boolean): this {
    if (!this.data.ui) this.data.ui = {};
    this.data.ui.colorOutput = enabled;
    return this;
  }

  withVerboseLogging(enabled: boolean): this {
    if (!this.data.ui) this.data.ui = {};
    this.data.ui.verboseLogging = enabled;
    return this;
  }

  withComponents(modes: string[], workflows: string[]): this {
    this.data.components = { modes: [...modes], workflows: [...workflows] };
    return this;
  }

  withInvalidStructure(): this {
    (this.data as any).defaultMode = 123;
    (this.data as any).preferredWorkflows = 'not-an-array';
    (this.data as any).ui = 'invalid-object';
    return this;
  }

  build(): MementoConfig {
    return JSON.parse(JSON.stringify(this.data));
  }
}

/**
 * Builder for creating ticket data
 */
export class TicketBuilder implements Builder<TicketInfo> {
  private data: TicketInfo;

  constructor() {
    this.data = {} as TicketInfo;
    this.reset();
  }

  reset(): this {
    this.data = {
      name: 'test-ticket',
      status: 'next'
    };
    return this;
  }

  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  withStatus(status: TicketStatus): this {
    this.data.status = status;
    return this;
  }

  asNext(): this {
    this.data.status = 'next';
    return this;
  }

  asInProgress(): this {
    this.data.status = 'in-progress';
    return this;
  }

  asDone(): this {
    this.data.status = 'done';
    return this;
  }

  withInvalidName(): this {
    this.data.name = 'ticket with spaces!@#';
    return this;
  }

  build(): TicketInfo {
    return JSON.parse(JSON.stringify(this.data));
  }
}

/**
 * Builder for creating hook configurations
 */
export class HookBuilder implements Builder<HookConfig> {
  private data: HookConfig;

  constructor() {
    this.data = {} as HookConfig;
    this.reset();
  }

  reset(): this {
    this.data = {
      id: 'test-hook',
      name: 'Test Hook',
      description: 'Test hook for unit testing',
      event: 'UserPromptSubmit',
      enabled: true,
      command: 'echo "test hook executed"'
    };
    return this;
  }

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  withDescription(description: string): this {
    this.data.description = description;
    return this;
  }

  withEvent(event: HookEvent): this {
    this.data.event = event;
    return this;
  }

  withEnabled(enabled: boolean): this {
    this.data.enabled = enabled;
    return this;
  }

  withCommand(command: string): this {
    this.data.command = command;
    return this;
  }

  withArgs(args: string[]): this {
    this.data.args = [...args];
    return this;
  }

  withMatcher(matcher: HookMatcher): this {
    this.data.matcher = { ...matcher };
    return this;
  }

  withEnv(env: Record<string, string>): this {
    this.data.env = { ...env };
    return this;
  }

  withTimeout(timeout: number): this {
    this.data.timeout = timeout;
    return this;
  }

  withPriority(priority: number): this {
    this.data.priority = priority;
    return this;
  }

  withRequirements(requirements: HookRequirements): this {
    this.data.requirements = { ...requirements };
    return this;
  }

  withContinueOnError(continueOnError: boolean): this {
    this.data.continueOnError = continueOnError;
    return this;
  }

  asUserPromptSubmit(): this {
    this.data.event = 'UserPromptSubmit';
    this.data.name = 'User Prompt Submit Hook';
    this.data.command = 'echo "Processing user prompt"';
    return this;
  }

  asPreToolUse(): this {
    this.data.event = 'PreToolUse';
    this.data.name = 'Pre Tool Use Hook';
    this.data.command = 'echo "About to use tool"';
    return this;
  }

  asPostToolUse(): this {
    this.data.event = 'PostToolUse';
    this.data.name = 'Post Tool Use Hook';
    this.data.command = 'echo "Tool use completed"';
    return this;
  }

  withRegexMatcher(pattern: string): this {
    this.data.matcher = { type: 'regex', pattern };
    return this;
  }

  withFuzzyMatcher(pattern: string, confidence: number = 0.8): this {
    this.data.matcher = { type: 'fuzzy', pattern, confidence };
    return this;
  }

  withInvalidConfiguration(): this {
    delete (this.data as any).id;
    delete (this.data as any).name;
    (this.data as any).event = 'InvalidEvent';
    (this.data as any).enabled = 'not-boolean';
    return this;
  }

  build(): HookConfig {
    return JSON.parse(JSON.stringify(this.data));
  }
}

/**
 * Builder for creating CLI options
 */
export class CliOptionsBuilder implements Builder<CliOptions> {
  private data: CliOptions;

  constructor() {
    this.data = {} as CliOptions;
    this.reset();
  }

  reset(): this {
    this.data = {};
    return this;
  }

  withForce(force: boolean = true): this {
    this.data.force = force;
    return this;
  }

  withNonInteractive(nonInteractive: boolean = true): this {
    this.data.nonInteractive = nonInteractive;
    return this;
  }

  withVerbose(verbose: boolean = true): this {
    this.data.verbose = verbose;
    return this;
  }

  withConfig(configPath: string): this {
    this.data.config = configPath;
    return this;
  }

  withModes(modes: string[]): this {
    this.data.modes = [...modes];
    return this;
  }

  withWorkflows(workflows: string[]): this {
    this.data.workflows = [...workflows];
    return this;
  }

  withAgents(agents: string[]): this {
    this.data.agents = [...agents];
    return this;
  }

  withHooks(hooks: string[]): this {
    this.data.hooks = [...hooks];
    return this;
  }

  withDefaultMode(defaultMode: string): this {
    this.data.defaultMode = defaultMode;
    return this;
  }

  withAddToGitignore(addToGitignore: boolean = true): this {
    this.data.addToGitignore = addToGitignore;
    return this;
  }

  withPackInstallOptions(options: PackInstallOptions): this {
    this.data.skipOptional = options.skipOptional;
    this.data.dryRun = options.dryRun;
    this.data.interactive = options.interactive;
    this.data.force = options.force;
    return this;
  }

  withCustomOption(key: string, value: unknown): this {
    this.data[key] = value;
    return this;
  }

  asInitOptions(): this {
    this.data.force = true;
    this.data.nonInteractive = true;
    this.data.modes = ['engineer'];
    this.data.workflows = ['review'];
    this.data.addToGitignore = true;
    return this;
  }

  asAddOptions(): this {
    this.data.force = false;
    this.data.verbose = true;
    return this;
  }

  asTicketOptions(): this {
    this.data.verbose = true;
    return this;
  }

  build(): CliOptions {
    return JSON.parse(JSON.stringify(this.data));
  }
}

/**
 * Builder for creating pack validation results
 */
export class PackValidationResultBuilder implements Builder<PackValidationResult> {
  private data: MutablePackValidationResult;

  constructor() {
    this.data = {} as MutablePackValidationResult;
    this.reset();
  }

  reset(): this {
    this.data = {
      valid: true,
      errors: [],
      warnings: []
    };
    return this;
  }

  withValid(valid: boolean): this {
    this.data.valid = valid;
    return this;
  }

  withErrors(errors: string[]): this {
    this.data.errors = [...errors];
    return this;
  }

  withWarnings(warnings: string[]): this {
    this.data.warnings = [...warnings];
    return this;
  }

  addError(error: string): this {
    this.data.errors = [...this.data.errors, error];
    this.data.valid = false;
    return this;
  }

  addWarning(warning: string): this {
    this.data.warnings = [...this.data.warnings, warning];
    return this;
  }

  asInvalid(): this {
    this.data.valid = false;
    this.data.errors = [
      'Missing required field: name',
      'Invalid version format',
      'Components must be an object'
    ];
    return this;
  }

  build(): PackValidationResult {
    return JSON.parse(JSON.stringify(this.data));
  }
}

/**
 * Builder for creating pack installation results
 */
export class PackInstallationResultBuilder implements Builder<PackInstallationResult> {
  private data: MutablePackInstallationResult;

  constructor() {
    this.data = {} as MutablePackInstallationResult;
    this.reset();
  }

  reset(): this {
    this.data = {
      success: true,
      installed: {
        modes: [],
        workflows: [],
        agents: [],
        hooks: []
      },
      skipped: {
        modes: [],
        workflows: [],
        agents: [],
        hooks: []
      },
      errors: []
    };
    return this;
  }

  withSuccess(success: boolean): this {
    this.data.success = success;
    return this;
  }

  withInstalledModes(modes: string[]): this {
    this.data.installed.modes = [...modes];
    return this;
  }

  withInstalledWorkflows(workflows: string[]): this {
    this.data.installed.workflows = [...workflows];
    return this;
  }

  withInstalledAgents(agents: string[]): this {
    this.data.installed.agents = [...agents];
    return this;
  }

  withInstalledHooks(hooks: string[]): this {
    this.data.installed.hooks = [...hooks];
    return this;
  }

  withSkippedModes(modes: string[]): this {
    this.data.skipped.modes = [...modes];
    return this;
  }

  withSkippedWorkflows(workflows: string[]): this {
    this.data.skipped.workflows = [...workflows];
    return this;
  }

  withSkippedAgents(agents: string[]): this {
    this.data.skipped.agents = [...agents];
    return this;
  }

  withErrors(errors: string[]): this {
    this.data.errors = [...errors];
    if (errors.length > 0) {
      this.data.success = false;
    }
    return this;
  }

  withPostInstallMessage(message: string): this {
    this.data.postInstallMessage = message;
    return this;
  }

  asSuccessful(): this {
    this.data.success = true;
    this.data.installed.modes = ['engineer', 'architect'];
    this.data.installed.workflows = ['review', 'refactor'];
    this.data.installed.agents = ['claude-code-research'];
    return this;
  }

  asPartialSuccess(): this {
    this.data.success = true;
    this.data.installed.modes = ['engineer'];
    this.data.installed.workflows = ['review'];
    this.data.skipped.modes = ['missing-mode'];
    this.data.skipped.agents = ['missing-agent'];
    return this;
  }

  asFailed(): this {
    this.data.success = false;
    this.data.errors = [
      'Required component not found',
      'Validation failed',
      'Installation aborted'
    ];
    return this;
  }

  build(): PackInstallationResult {
    return JSON.parse(JSON.stringify(this.data));
  }
}

/**
 * Builder for creating pack dependency results
 */
export class PackDependencyResultBuilder implements Builder<PackDependencyResult> {
  private data: MutablePackDependencyResult;

  constructor() {
    this.data = {} as MutablePackDependencyResult;
    this.reset();
  }

  reset(): this {
    this.data = {
      resolved: [],
      missing: [],
      circular: []
    };
    return this;
  }

  withResolved(resolved: string[]): this {
    this.data.resolved = [...resolved];
    return this;
  }

  withMissing(missing: string[]): this {
    this.data.missing = [...missing];
    return this;
  }

  withCircular(circular: string[]): this {
    this.data.circular = [...circular];
    return this;
  }

  asResolved(): this {
    this.data.resolved = ['base-pack', 'utils-pack'];
    return this;
  }

  withMissingDependencies(): this {
    this.data.missing = ['non-existent-pack', 'another-missing-pack'];
    return this;
  }

  withCircularDependencies(): this {
    this.data.circular = ['pack-a', 'pack-b', 'pack-c'];
    return this;
  }

  build(): PackDependencyResult {
    return JSON.parse(JSON.stringify(this.data));
  }
}

/**
 * Main TestDataFactory class providing static access to all builders
 */
export class TestDataFactory {
  /**
   * Create a new component builder
   */
  static component(): ComponentBuilder {
    return new ComponentBuilder();
  }

  /**
   * Create a new mode component
   */
  static mode(): ComponentBuilder {
    return new ComponentBuilder().asMode();
  }

  /**
   * Create a new workflow component
   */
  static workflow(): ComponentBuilder {
    return new ComponentBuilder().asWorkflow();
  }

  /**
   * Create a new agent component
   */
  static agent(): ComponentBuilder {
    return new ComponentBuilder().asAgent();
  }

  /**
   * Create a new pack component builder
   */
  static packComponent(): PackComponentBuilder {
    return new PackComponentBuilder();
  }

  /**
   * Create a new pack builder
   */
  static pack(): PackBuilder {
    return new PackBuilder();
  }

  /**
   * Create a new configuration builder
   */
  static config(): ConfigBuilder {
    return new ConfigBuilder();
  }

  /**
   * Create a new ticket builder
   */
  static ticket(): TicketBuilder {
    return new TicketBuilder();
  }

  /**
   * Create a new hook builder
   */
  static hook(): HookBuilder {
    return new HookBuilder();
  }

  /**
   * Create a new CLI options builder
   */
  static cliOptions(): CliOptionsBuilder {
    return new CliOptionsBuilder();
  }

  /**
   * Create a new pack validation result builder
   */
  static packValidationResult(): PackValidationResultBuilder {
    return new PackValidationResultBuilder();
  }

  /**
   * Create a new pack installation result builder
   */
  static packInstallationResult(): PackInstallationResultBuilder {
    return new PackInstallationResultBuilder();
  }

  /**
   * Create a new pack dependency result builder
   */
  static packDependencyResult(): PackDependencyResultBuilder {
    return new PackDependencyResultBuilder();
  }

  /**
   * Build multiple instances of the same type
   */
  static buildMany<T>(builder: Builder<T>, count: number): T[] {
    return Array.from({ length: count }, () => {
      const item = builder.build();
      builder.reset();
      return item;
    });
  }

  /**
   * Create variations of test data
   */
  static buildVariations<T>(
    builder: Builder<T>,
    variations: Array<(builder: Builder<T>) => Builder<T>>
  ): T[] {
    return variations.map(variation => {
      builder.reset();
      return variation(builder).build();
    });
  }

  /**
   * Create a collection of components for pack testing
   */
  static createPackComponents(): {
    modes: PackComponent[];
    workflows: PackComponent[];
    agents: PackComponent[];
    hooks: PackComponent[];
  } {
    return {
      modes: [
        TestDataFactory.packComponent().withName('engineer').withRequired(true).build(),
        TestDataFactory.packComponent().withName('architect').withRequired(false).build()
      ],
      workflows: [
        TestDataFactory.packComponent().withName('review').withRequired(true).build(),
        TestDataFactory.packComponent().withName('refactor').withRequired(false).build()
      ],
      agents: [
        TestDataFactory.packComponent().withName('claude-code-research').withRequired(false).build()
      ],
      hooks: [
        TestDataFactory.packComponent().withName('git-context-loader').withRequired(false).build()
      ]
    };
  }

  /**
   * Create a hook definition with multiple hooks
   */
  static createHookDefinition(): HookDefinition {
    return {
      version: '1.0.0',
      metadata: {
        author: 'memento-protocol',
        created: new Date().toISOString(),
        tags: ['test', 'hooks']
      },
      hooks: [
        TestDataFactory.hook().asUserPromptSubmit().build(),
        TestDataFactory.hook().asPreToolUse().build(),
        TestDataFactory.hook().asPostToolUse().build()
      ]
    };
  }

  /**
   * Create sample tickets for different statuses
   */
  static createSampleTickets(): TicketInfo[] {
    return [
      TestDataFactory.ticket().withName('implement-feature').asNext().build(),
      TestDataFactory.ticket().withName('fix-bug').asInProgress().build(),
      TestDataFactory.ticket().withName('write-tests').asDone().build()
    ];
  }
}