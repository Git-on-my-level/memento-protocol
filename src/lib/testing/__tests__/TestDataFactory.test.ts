import { TestDataFactory } from '../TestDataFactory';

describe('TestDataFactory', () => {
  describe('ComponentBuilder', () => {
    it('should create default component data', () => {
      const component = TestDataFactory.component().build();
      
      expect(component.name).toBe('test-component');
      expect(component.description).toBe('Test component description');
      expect(component.author).toBe('memento-protocol');
      expect(component.version).toBe('1.0.0');
      expect(component.tags).toEqual(['test']);
      expect(component.content).toContain('# Test Component');
    });

    it('should support fluent API for building components', () => {
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

    it('should create mode-specific component data', () => {
      const mode = TestDataFactory.mode().build();
      
      expect(mode.name).toBe('test-mode');
      expect(mode.description).toBe('Test mode for development');
      expect(mode.tags).toEqual(['mode', 'development']);
      expect(mode.content).toContain('You are a test engineer');
    });

    it('should create workflow-specific component data', () => {
      const workflow = TestDataFactory.workflow().build();
      
      expect(workflow.name).toBe('test-workflow');
      expect(workflow.description).toBe('Test workflow for development processes');
      expect(workflow.tags).toEqual(['workflow', 'process']);
      expect(workflow.content).toContain('1. Analyze requirements');
    });

    it('should create agent-specific component data', () => {
      const agent = TestDataFactory.agent().build();
      
      expect(agent.name).toBe('test-agent');
      expect(agent.description).toBe('Test agent for specialized tasks');
      expect(agent.tags).toEqual(['agent', 'specialized']);
      expect(agent.content).toContain('Specialized agent');
    });

    it('should support invalid component creation for error testing', () => {
      const invalidComponent = TestDataFactory.component()
        .withInvalidName()
        .build();

      expect(invalidComponent.name).toBe('invalid name with spaces!@#');
    });

    it('should support missing required fields for error testing', () => {
      const componentWithMissingFields = TestDataFactory.component()
        .withMissingRequiredFields()
        .build();

      expect(componentWithMissingFields.name).toBeUndefined();
      expect(componentWithMissingFields.version).toBeUndefined();
    });

    it('should reset to defaults when reset is called', () => {
      const builder = TestDataFactory.component()
        .withName('custom-name')
        .withVersion('2.0.0');

      const first = builder.build();
      expect(first.name).toBe('custom-name');

      builder.reset();
      const second = builder.build();
      expect(second.name).toBe('test-component');
      expect(second.version).toBe('1.0.0');
    });
  });

  describe('PackComponentBuilder', () => {
    it('should create default pack component', () => {
      const packComponent = TestDataFactory.packComponent().build();
      
      expect(packComponent.name).toBe('test-component');
      expect(packComponent.required).toBe(true);
    });

    it('should support fluent API for pack components', () => {
      const packComponent = TestDataFactory.packComponent()
        .withName('engineer')
        .withRequired(true)
        .withDescription('Engineering mode')
        .withCustomConfig({ priority: 'high' })
        .build();

      expect(packComponent.name).toBe('engineer');
      expect(packComponent.required).toBe(true);
      expect(packComponent.description).toBe('Engineering mode');
      expect(packComponent.customConfig).toEqual({ priority: 'high' });
    });

    it('should create optional components', () => {
      const optional = TestDataFactory.packComponent()
        .withName('optional-component')
        .asOptional()
        .build();

      expect(optional.required).toBe(false);
    });
  });

  describe('PackBuilder', () => {
    it('should create default pack structure', () => {
      const pack = TestDataFactory.pack().build();
      
      expect(pack.manifest.name).toBe('test-pack');
      expect(pack.manifest.version).toBe('1.0.0');
      expect(pack.manifest.description).toBe('Test starter pack for unit testing');
      expect(pack.manifest.author).toBe('memento-protocol');
      expect(pack.manifest.category).toBe('general');
      expect(pack.manifest.components.modes).toHaveLength(1);
      expect(pack.manifest.components.workflows).toHaveLength(1);
      expect(pack.manifest.components.agents).toHaveLength(1);
      expect(pack.path).toBe('/test/templates/starter-packs/test-pack');
    });

    it('should support fluent API for packs', () => {
      const pack = TestDataFactory.pack()
        .withName('custom-pack')
        .withVersion('2.1.0')
        .withDescription('Custom pack description')
        .withAuthor('custom-author')
        .withCategory('frontend')
        .withTags(['custom', 'frontend'])
        .withMementoProtocolVersion('>=1.5.0')
        .build();

      expect(pack.manifest.name).toBe('custom-pack');
      expect(pack.manifest.version).toBe('2.1.0');
      expect(pack.manifest.category).toBe('frontend');
      expect(pack.manifest.tags).toEqual(['custom', 'frontend']);
      expect(pack.manifest.mementoProtocolVersion).toBe('>=1.5.0');
      expect(pack.path).toBe('/test/templates/starter-packs/custom-pack');
    });

    it('should create frontend React pack preset', () => {
      const pack = TestDataFactory.pack().asFrontendReactPack().build();
      
      expect(pack.manifest.name).toBe('frontend-react');
      expect(pack.manifest.category).toBe('frontend');
      expect(pack.manifest.tags).toContain('react');
      expect(pack.manifest.compatibleWith).toContain('react');
      expect(pack.manifest.components.modes?.some(m => m.name === 'frontend-engineer')).toBe(true);
    });

    it('should create backend API pack preset', () => {
      const pack = TestDataFactory.pack().asBackendApiPack().build();
      
      expect(pack.manifest.name).toBe('backend-api');
      expect(pack.manifest.category).toBe('backend');
      expect(pack.manifest.tags).toContain('api');
      expect(pack.manifest.compatibleWith).toContain('node');
    });

    it('should create full-stack pack preset', () => {
      const pack = TestDataFactory.pack().asFullStackPack().build();
      
      expect(pack.manifest.name).toBe('fullstack-web');
      expect(pack.manifest.category).toBe('fullstack');
      expect(pack.manifest.dependencies).toEqual(['frontend-react', 'backend-api']);
      expect(pack.manifest.configuration?.defaultMode).toBe('fullstack-architect');
    });

    it('should create invalid pack for error testing', () => {
      const invalidPack = TestDataFactory.pack().withInvalidManifest().build();
      
      expect((invalidPack.manifest as any).name).toBeUndefined();
      expect((invalidPack.manifest as any).version).toBe('not-a-version');
      expect((invalidPack.manifest as any).description).toBe(123);
      expect((invalidPack.manifest as any).components).toBe('invalid');
    });

    it('should create pack with missing required components', () => {
      const pack = TestDataFactory.pack().withMissingRequiredComponents().build();
      
      expect(pack.manifest.components.modes?.[0].name).toBe('missing-mode');
      expect(pack.manifest.components.modes?.[0].required).toBe(true);
    });

    it('should create pack with empty components', () => {
      const pack = TestDataFactory.pack().withEmptyComponents().build();
      
      expect(pack.manifest.components.modes).toEqual([]);
      expect(pack.manifest.components.workflows).toEqual([]);
      expect(pack.manifest.components.agents).toEqual([]);
    });

    it('should support dependencies and circular dependency testing', () => {
      const pack = TestDataFactory.pack()
        .withDependencies(['base-pack', 'utils-pack'])
        .withCircularDependency('circular-pack')
        .build();

      expect(pack.manifest.dependencies).toContain('circular-pack');
    });

    it('should support post-install configuration', () => {
      const pack = TestDataFactory.pack()
        .withPostInstallMessage('Pack installed successfully!')
        .withPostInstallCommands(['npm install', 'npm run setup'])
        .build();

      expect(pack.manifest.postInstall?.message).toBe('Pack installed successfully!');
      expect(pack.manifest.postInstall?.commands).toEqual(['npm install', 'npm run setup']);
    });
  });

  describe('ConfigBuilder', () => {
    it('should create default configuration', () => {
      const config = TestDataFactory.config().build();
      
      expect(config.defaultMode).toBe('engineer');
      expect(config.preferredWorkflows).toEqual(['review']);
      expect(config.ui?.colorOutput).toBe(true);
      expect(config.ui?.verboseLogging).toBe(false);
    });

    it('should support fluent API for configuration', () => {
      const config = TestDataFactory.config()
        .withDefaultMode('architect')
        .withPreferredWorkflows(['review', 'refactor'])
        .withCustomTemplateSources(['custom-source'])
        .withIntegrations({ git: true, slack: false })
        .withColorOutput(false)
        .withVerboseLogging(true)
        .withComponents(['engineer', 'architect'], ['review'])
        .build();

      expect(config.defaultMode).toBe('architect');
      expect(config.preferredWorkflows).toEqual(['review', 'refactor']);
      expect(config.customTemplateSources).toEqual(['custom-source']);
      expect(config.integrations).toEqual({ git: true, slack: false });
      expect(config.ui?.colorOutput).toBe(false);
      expect(config.ui?.verboseLogging).toBe(true);
      expect(config.components?.modes).toEqual(['engineer', 'architect']);
    });

    it('should create invalid configuration for error testing', () => {
      const invalidConfig = TestDataFactory.config().withInvalidStructure().build();
      
      expect((invalidConfig as any).defaultMode).toBe(123);
      expect((invalidConfig as any).preferredWorkflows).toBe('not-an-array');
      expect((invalidConfig as any).ui).toBe('invalid-object');
    });
  });

  describe('TicketBuilder', () => {
    it('should create default ticket', () => {
      const ticket = TestDataFactory.ticket().build();
      
      expect(ticket.name).toBe('test-ticket');
      expect(ticket.status).toBe('next');
    });

    it('should support fluent API for tickets', () => {
      const ticket = TestDataFactory.ticket()
        .withName('implement-feature')
        .withStatus('in-progress')
        .build();

      expect(ticket.name).toBe('implement-feature');
      expect(ticket.status).toBe('in-progress');
    });

    it('should support status shortcuts', () => {
      const nextTicket = TestDataFactory.ticket().asNext().build();
      const inProgressTicket = TestDataFactory.ticket().asInProgress().build();
      const doneTicket = TestDataFactory.ticket().asDone().build();

      expect(nextTicket.status).toBe('next');
      expect(inProgressTicket.status).toBe('in-progress');
      expect(doneTicket.status).toBe('done');
    });

    it('should create invalid ticket for error testing', () => {
      const invalidTicket = TestDataFactory.ticket().withInvalidName().build();
      
      expect(invalidTicket.name).toBe('ticket with spaces!@#');
    });
  });

  describe('HookBuilder', () => {
    it('should create default hook configuration', () => {
      const hook = TestDataFactory.hook().build();
      
      expect(hook.id).toBe('test-hook');
      expect(hook.name).toBe('Test Hook');
      expect(hook.event).toBe('UserPromptSubmit');
      expect(hook.enabled).toBe(true);
      expect(hook.command).toBe('echo "test hook executed"');
    });

    it('should support fluent API for hooks', () => {
      const hook = TestDataFactory.hook()
        .withId('custom-hook')
        .withName('Custom Hook')
        .withDescription('Custom hook description')
        .withEvent('PreToolUse')
        .withEnabled(false)
        .withCommand('custom-command')
        .withArgs(['arg1', 'arg2'])
        .withEnv({ NODE_ENV: 'test' })
        .withTimeout(5000)
        .withPriority(10)
        .withContinueOnError(true)
        .build();

      expect(hook.id).toBe('custom-hook');
      expect(hook.name).toBe('Custom Hook');
      expect(hook.event).toBe('PreToolUse');
      expect(hook.enabled).toBe(false);
      expect(hook.args).toEqual(['arg1', 'arg2']);
      expect(hook.env).toEqual({ NODE_ENV: 'test' });
      expect(hook.timeout).toBe(5000);
      expect(hook.priority).toBe(10);
      expect(hook.continueOnError).toBe(true);
    });

    it('should support hook event shortcuts', () => {
      const userPromptHook = TestDataFactory.hook().asUserPromptSubmit().build();
      const preToolHook = TestDataFactory.hook().asPreToolUse().build();
      const postToolHook = TestDataFactory.hook().asPostToolUse().build();

      expect(userPromptHook.event).toBe('UserPromptSubmit');
      expect(preToolHook.event).toBe('PreToolUse');
      expect(postToolHook.event).toBe('PostToolUse');
    });

    it('should support matcher configuration', () => {
      const regexHook = TestDataFactory.hook()
        .withRegexMatcher('test.*pattern')
        .build();

      const fuzzyHook = TestDataFactory.hook()
        .withFuzzyMatcher('fuzzy search', 0.9)
        .build();

      expect(regexHook.matcher?.type).toBe('regex');
      expect(regexHook.matcher?.pattern).toBe('test.*pattern');
      expect(fuzzyHook.matcher?.type).toBe('fuzzy');
      expect(fuzzyHook.matcher?.confidence).toBe(0.9);
    });

    it('should create invalid hook for error testing', () => {
      const invalidHook = TestDataFactory.hook().withInvalidConfiguration().build();
      
      expect((invalidHook as any).id).toBeUndefined();
      expect((invalidHook as any).name).toBeUndefined();
      expect((invalidHook as any).event).toBe('InvalidEvent');
      expect((invalidHook as any).enabled).toBe('not-boolean');
    });
  });

  describe('CliOptionsBuilder', () => {
    it('should create empty options by default', () => {
      const options = TestDataFactory.cliOptions().build();
      
      expect(Object.keys(options)).toHaveLength(0);
    });

    it('should support fluent API for CLI options', () => {
      const options = TestDataFactory.cliOptions()
        .withForce(true)
        .withNonInteractive(true)
        .withVerbose(true)
        .withConfig('/path/to/config.json')
        .withModes(['engineer', 'architect'])
        .withWorkflows(['review'])
        .withDefaultMode('engineer')
        .withAddToGitignore(true)
        .build();

      expect(options.force).toBe(true);
      expect(options.nonInteractive).toBe(true);
      expect(options.verbose).toBe(true);
      expect(options.config).toBe('/path/to/config.json');
      expect(options.modes).toEqual(['engineer', 'architect']);
      expect(options.workflows).toEqual(['review']);
      expect(options.defaultMode).toBe('engineer');
      expect(options.addToGitignore).toBe(true);
    });

    it('should support pack install options', () => {
      const options = TestDataFactory.cliOptions()
        .withPackInstallOptions({
          force: true,
          skipOptional: true,
          dryRun: false,
          interactive: false
        })
        .build();

      expect(options.force).toBe(true);
      expect(options.skipOptional).toBe(true);
      expect(options.dryRun).toBe(false);
      expect(options.interactive).toBe(false);
    });

    it('should support command-specific presets', () => {
      const initOptions = TestDataFactory.cliOptions().asInitOptions().build();
      const addOptions = TestDataFactory.cliOptions().asAddOptions().build();

      expect(initOptions.force).toBe(true);
      expect(initOptions.nonInteractive).toBe(true);
      expect(initOptions.modes).toEqual(['engineer']);
      
      expect(addOptions.force).toBe(false);
      expect(addOptions.verbose).toBe(true);
    });

    it('should support custom options', () => {
      const options = TestDataFactory.cliOptions()
        .withCustomOption('customFlag', 'customValue')
        .withCustomOption('anotherFlag', true)
        .build();

      expect(options.customFlag).toBe('customValue');
      expect(options.anotherFlag).toBe(true);
    });
  });

  describe('Result Builders', () => {
    describe('PackValidationResultBuilder', () => {
      it('should create valid result by default', () => {
        const result = TestDataFactory.packValidationResult().build();
        
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.warnings).toEqual([]);
      });

      it('should support fluent API for validation results', () => {
        const result = TestDataFactory.packValidationResult()
          .withValid(false)
          .withErrors(['Error 1', 'Error 2'])
          .withWarnings(['Warning 1'])
          .build();

        expect(result.valid).toBe(false);
        expect(result.errors).toEqual(['Error 1', 'Error 2']);
        expect(result.warnings).toEqual(['Warning 1']);
      });

      it('should support adding individual errors and warnings', () => {
        const result = TestDataFactory.packValidationResult()
          .addError('Individual error')
          .addWarning('Individual warning')
          .build();

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Individual error');
        expect(result.warnings).toContain('Individual warning');
      });

      it('should create invalid result preset', () => {
        const result = TestDataFactory.packValidationResult().asInvalid().build();
        
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('Missing required field');
      });
    });

    describe('PackInstallationResultBuilder', () => {
      it('should create successful result by default', () => {
        const result = TestDataFactory.packInstallationResult().build();
        
        expect(result.success).toBe(true);
        expect(result.installed.modes).toEqual([]);
        expect(result.errors).toEqual([]);
      });

      it('should support fluent API for installation results', () => {
        const result = TestDataFactory.packInstallationResult()
          .withSuccess(true)
          .withInstalledModes(['engineer'])
          .withInstalledWorkflows(['review'])
          .withInstalledAgents(['claude-code-research'])
          .withSkippedModes(['optional-mode'])
          .withPostInstallMessage('Installation completed!')
          .build();

        expect(result.success).toBe(true);
        expect(result.installed.modes).toEqual(['engineer']);
        expect(result.installed.workflows).toEqual(['review']);
        expect(result.installed.agents).toEqual(['claude-code-research']);
        expect(result.skipped.modes).toEqual(['optional-mode']);
        expect(result.postInstallMessage).toBe('Installation completed!');
      });

      it('should support result presets', () => {
        const successfulResult = TestDataFactory.packInstallationResult().asSuccessful().build();
        const partialResult = TestDataFactory.packInstallationResult().asPartialSuccess().build();
        const failedResult = TestDataFactory.packInstallationResult().asFailed().build();

        expect(successfulResult.success).toBe(true);
        expect(successfulResult.installed.modes.length).toBeGreaterThan(0);

        expect(partialResult.success).toBe(true);
        expect(partialResult.skipped.modes.length).toBeGreaterThan(0);

        expect(failedResult.success).toBe(false);
        expect(failedResult.errors.length).toBeGreaterThan(0);
      });
    });

    describe('PackDependencyResultBuilder', () => {
      it('should create empty result by default', () => {
        const result = TestDataFactory.packDependencyResult().build();
        
        expect(result.resolved).toEqual([]);
        expect(result.missing).toEqual([]);
        expect(result.circular).toEqual([]);
      });

      it('should support dependency scenarios', () => {
        const resolvedResult = TestDataFactory.packDependencyResult().asResolved().build();
        const missingResult = TestDataFactory.packDependencyResult().withMissingDependencies().build();
        const circularResult = TestDataFactory.packDependencyResult().withCircularDependencies().build();

        expect(resolvedResult.resolved.length).toBeGreaterThan(0);
        expect(missingResult.missing.length).toBeGreaterThan(0);
        expect(circularResult.circular.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Utility Methods', () => {
    it('should create multiple instances with buildMany', () => {
      const components = TestDataFactory.buildMany(TestDataFactory.component(), 3);
      
      expect(components).toHaveLength(3);
      components.forEach(component => {
        expect(component.name).toBe('test-component');
      });
    });

    it('should create variations with buildVariations', () => {
      const variations = TestDataFactory.buildVariations(
        TestDataFactory.component(),
        [
          (builder) => (builder as any).withName('variation-1'),
          (builder) => (builder as any).withName('variation-2'),
          (builder) => (builder as any).withName('variation-3').withVersion('2.0.0')
        ]
      );

      expect(variations).toHaveLength(3);
      expect(variations[0].name).toBe('variation-1');
      expect(variations[1].name).toBe('variation-2');
      expect(variations[2].name).toBe('variation-3');
      expect(variations[2].version).toBe('2.0.0');
    });

    it('should create pack components collection', () => {
      const components = TestDataFactory.createPackComponents();
      
      expect(components.modes).toHaveLength(2);
      expect(components.workflows).toHaveLength(2);
      expect(components.agents).toHaveLength(1);
      expect(components.hooks).toHaveLength(1);
      
      expect(components.modes[0].name).toBe('engineer');
      expect(components.modes[0].required).toBe(true);
      expect(components.modes[1].required).toBe(false);
    });

    it('should create hook definition', () => {
      const hookDef = TestDataFactory.createHookDefinition();
      
      expect(hookDef.version).toBe('1.0.0');
      expect(hookDef.metadata?.author).toBe('memento-protocol');
      expect(hookDef.hooks).toHaveLength(3);
      expect(hookDef.hooks[0].event).toBe('UserPromptSubmit');
      expect(hookDef.hooks[1].event).toBe('PreToolUse');
      expect(hookDef.hooks[2].event).toBe('PostToolUse');
    });

    it('should create sample tickets', () => {
      const tickets = TestDataFactory.createSampleTickets();
      
      expect(tickets).toHaveLength(3);
      expect(tickets[0].status).toBe('next');
      expect(tickets[1].status).toBe('in-progress');
      expect(tickets[2].status).toBe('done');
    });
  });

  describe('Builder State Management', () => {
    it('should maintain independent state between builders', () => {
      const builder1 = TestDataFactory.component().withName('builder1');
      const builder2 = TestDataFactory.component().withName('builder2');

      const result1 = builder1.build();
      const result2 = builder2.build();

      expect(result1.name).toBe('builder1');
      expect(result2.name).toBe('builder2');
    });

    it('should properly deep clone data to prevent mutations', () => {
      const builder = TestDataFactory.config()
        .withIntegrations({ git: true });

      const result1 = builder.build();
      const result2 = builder.build();

      // Modify first result
      result1.integrations!.git = false;

      // Second result should be unaffected
      expect(result2.integrations!.git).toBe(true);
    });

    it('should reset builder state completely', () => {
      const builder = TestDataFactory.pack()
        .withName('custom-pack')
        .withVersion('2.0.0')
        .withDescription('Custom description')
        .withTags(['custom']);

      const customResult = builder.build();
      expect(customResult.manifest.name).toBe('custom-pack');

      builder.reset();
      const defaultResult = builder.build();
      expect(defaultResult.manifest.name).toBe('test-pack');
      expect(defaultResult.manifest.version).toBe('1.0.0');
      expect(defaultResult.manifest.tags).toEqual(['test', 'starter']);
    });
  });
});