import { MementoCore } from '../MementoCore';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock os.homedir() to be controllable in tests
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  homedir: jest.fn()
}));

describe('ScriptExecutor Integration Tests', () => {
  let tempDir: string;
  let projectRoot: string;
  let globalRoot: string;
  let core: MementoCore;

  beforeEach(async () => {
    // Create actual temp directories for integration tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memento-integration-'));
    const projectDir = path.join(tempDir, 'project');
    
    // For integration tests, we need to mock the global root to a test location
    const testGlobalRoot = path.join(tempDir, 'global');
    globalRoot = path.join(testGlobalRoot, '.memento');

    // Set up directory structure
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, '.memento', 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(globalRoot, 'scripts'), { recursive: true });

    // Now get the real path to handle symlinks on macOS
    projectRoot = fs.realpathSync(projectDir);

    // Mock os.homedir() to return our test global root
    (os.homedir as jest.Mock).mockReturnValue(testGlobalRoot);

    core = new MementoCore(projectRoot);
  });

  afterEach(() => {
    // Restore mocks
    jest.restoreAllMocks();
    
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should execute project script with proper context', async () => {
    // Create a project script
    const projectScriptPath = path.join(projectRoot, '.memento', 'scripts', 'project-script.sh');
    const scriptContent = `#!/bin/bash
echo "Project: $MEMENTO_PROJECT_ROOT"
echo "Scope: $MEMENTO_SCRIPT_SCOPE"
echo "PWD: $PWD"
`;
    
    fs.writeFileSync(projectScriptPath, scriptContent, { mode: 0o755 });

    // Execute via MementoCore
    const result = await core.executeScript('project-script');

    expect(result.success).toBe(true);
    expect(result.stdout).toContain(`Project: ${projectRoot}`);
    expect(result.stdout).toContain('Scope: project');
    expect(result.stdout).toContain(`PWD: ${projectRoot}`);
  });

  it('should execute global script with proper context', async () => {
    // Create a global script
    const globalScriptPath = path.join(globalRoot, 'scripts', 'global-script.sh');
    const scriptContent = `#!/bin/bash
echo "Project: $MEMENTO_PROJECT_ROOT"
echo "Scope: $MEMENTO_SCRIPT_SCOPE"
echo "PWD: $PWD"
echo "Global Root: $MEMENTO_GLOBAL_ROOT"
`;
    
    fs.writeFileSync(globalScriptPath, scriptContent, { mode: 0o755 });

    // Execute via MementoCore (should find global since no project script exists)
    const result = await core.executeScript('global-script');

    expect(result.success).toBe(true);
    expect(result.stdout).toContain(`Project: ${projectRoot}`);
    expect(result.stdout).toContain('Scope: global');
    expect(result.stdout).toContain(`PWD: ${projectRoot}`); // Should still execute in project root
    expect(result.stdout).toContain(`Global Root: ${globalRoot}`);
  });

  it('should prefer project script over global script', async () => {
    // Create both project and global scripts with same name
    const projectScriptPath = path.join(projectRoot, '.memento', 'scripts', 'test-script.sh');
    const globalScriptPath = path.join(globalRoot, 'scripts', 'test-script.sh');

    fs.writeFileSync(projectScriptPath, '#!/bin/bash\necho "PROJECT SCRIPT"', { mode: 0o755 });
    fs.writeFileSync(globalScriptPath, '#!/bin/bash\necho "GLOBAL SCRIPT"', { mode: 0o755 });

    const result = await core.executeScript('test-script');

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('PROJECT SCRIPT');
    expect(result.stdout).not.toContain('GLOBAL SCRIPT');
  });

  it('should list scripts from both scopes', async () => {
    // Create scripts in both scopes
    fs.writeFileSync(
      path.join(projectRoot, '.memento', 'scripts', 'project-only.sh'), 
      '#!/bin/bash\necho "project"', 
      { mode: 0o755 }
    );
    
    fs.writeFileSync(
      path.join(globalRoot, 'scripts', 'global-only.sh'), 
      '#!/bin/bash\necho "global"', 
      { mode: 0o755 }
    );
    
    fs.writeFileSync(
      path.join(projectRoot, '.memento', 'scripts', 'shared-name.sh'), 
      '#!/bin/bash\necho "project version"', 
      { mode: 0o755 }
    );
    
    fs.writeFileSync(
      path.join(globalRoot, 'scripts', 'shared-name.sh'), 
      '#!/bin/bash\necho "global version"', 
      { mode: 0o755 }
    );

    const scripts = await core.listScripts();

    expect(scripts.project).toHaveLength(2); // project-only, shared-name
    expect(scripts.global).toHaveLength(2);  // global-only, shared-name
    expect(scripts.all).toHaveLength(3);     // project-only, global-only, shared-name (project takes precedence)

    // Check that project script takes precedence in combined list
    const sharedScript = scripts.all.find(s => s.name === 'shared-name');
    expect(sharedScript).toBeDefined();
    expect(sharedScript!.metadata.scope).toBe('project');
  });

  it('should handle script arguments via environment variables', async () => {
    const scriptPath = path.join(projectRoot, '.memento', 'scripts', 'args-test.sh');
    const scriptContent = `#!/bin/bash
echo "Args: $SCRIPT_ARGS"
echo "Arg 0: $SCRIPT_ARG_0"
echo "Arg 1: $SCRIPT_ARG_1"
`;
    
    fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

    const result = await core.executeScript('args-test', ['hello', 'world']);

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Args: hello world');
    expect(result.stdout).toContain('Arg 0: hello');
    expect(result.stdout).toContain('Arg 1: world');
  });

  it('should handle different script types', async () => {
    // JavaScript script
    const jsScriptPath = path.join(projectRoot, '.memento', 'scripts', 'test-js.js');
    fs.writeFileSync(jsScriptPath, 'console.log("JavaScript:", process.env.MEMENTO_SCRIPT_SCOPE);', { mode: 0o755 });

    // Python script (if available)
    const pyScriptPath = path.join(projectRoot, '.memento', 'scripts', 'test-py.py');
    fs.writeFileSync(pyScriptPath, 'import os; print("Python:", os.environ.get("MEMENTO_SCRIPT_SCOPE"))', { mode: 0o755 });

    // Test JavaScript
    const jsResult = await core.executeScript('test-js');
    expect(jsResult.success).toBe(true);
    expect(jsResult.stdout).toContain('JavaScript: project');

    // Test Python (skip if not available)
    try {
      const pyResult = await core.executeScript('test-py');
      if (pyResult.success) {
        expect(pyResult.stdout).toContain('Python: project');
      }
    } catch (error) {
      // Python might not be available, skip this test
      console.log('Python not available, skipping Python script test');
    }
  });

  it('should handle script execution failure gracefully', async () => {
    const scriptPath = path.join(projectRoot, '.memento', 'scripts', 'failing-script.sh');
    const scriptContent = `#!/bin/bash
echo "This will fail"
exit 1
`;
    
    fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

    const result = await core.executeScript('failing-script');

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('This will fail');
    expect(result.error).toContain('Script exited with code 1');
  });

  it('should validate script context properly', async () => {
    const executor = core.getScriptExecutor();
    
    // Valid context
    const validContext = {
      source: 'project' as const,
      scriptPath: path.join(projectRoot, '.memento', 'scripts', 'test.sh'),
      workingDirectory: projectRoot,
      env: {}
    };

    // Create the script file
    fs.writeFileSync(validContext.scriptPath, '#!/bin/bash\necho "test"', { mode: 0o755 });

    const validResult = executor.validateContext(validContext);
    expect(validResult.valid).toBe(true);
    expect(validResult.errors).toHaveLength(0);

    // Invalid context
    const invalidContext = {
      source: 'invalid' as any,
      scriptPath: '/nonexistent/script.sh',
      workingDirectory: '/nonexistent',
      env: {}
    };

    const invalidResult = executor.validateContext(invalidContext);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors.length).toBeGreaterThan(0);
  });
});