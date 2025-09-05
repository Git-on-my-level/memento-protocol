import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execa } from 'execa';
import { logger } from './logger';

export interface Script {
  name: string;
  path: string;
  metadata?: any;
}

export interface ScriptContext {
  source: 'global' | 'project' | 'builtin';
  scriptPath: string;
  workingDirectory: string;  // Always project root
  env: Record<string, string>;  // Environment variables
  stdin?: string;  // Optional stdin input
}

export interface ScriptResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  error?: string;
  duration: number; // in milliseconds
}

export interface ScriptExecutorOptions {
  timeout?: number; // in milliseconds, default 30000
  shell?: string; // shell to use, auto-detected if not provided
  maxBuffer?: number; // max buffer size for stdout/stderr
}

/**
 * Handles script execution across different scopes with proper context management.
 * Scripts can be defined in global (~/.zcc/scripts/) or project (.zcc/scripts/).
 * All scripts execute in the project root directory with appropriate environment variables.
 */
export class ScriptExecutor {
  private projectRoot: string;
  private globalRoot: string;
  private defaultTimeout: number;
  private defaultShell: string;

  constructor(projectRoot: string, options?: Partial<ScriptExecutorOptions>) {
    this.projectRoot = projectRoot;
    this.globalRoot = path.join(os.homedir(), '.zcc');
    this.defaultTimeout = options?.timeout || 30000; // 30 seconds default
    this.defaultShell = this.detectShell();
  }

  /**
   * Execute a script with the given context
   */
  async execute(script: Script, context: ScriptContext, options?: ScriptExecutorOptions): Promise<ScriptResult> {
    const startTime = Date.now();
    const timeout = options?.timeout || this.defaultTimeout;
    const shell = options?.shell || this.defaultShell;
    const maxBuffer = options?.maxBuffer || 1024 * 1024; // 1MB default

    logger.debug(`Executing script: ${script.name} from ${context.source} scope`);
    logger.debug(`Working directory: ${context.workingDirectory}`);
    logger.debug(`Script path: ${context.scriptPath}`);

    // Validate script exists
    if (!fs.existsSync(context.scriptPath)) {
      return {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: '',
        error: `Script not found: ${context.scriptPath}`,
        duration: Date.now() - startTime
      };
    }

    // Prepare environment
    const env = this.prepareEnvironment(context);
    
    // Make script executable (Unix systems)
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(context.scriptPath, 0o755);
      } catch (error: any) {
        logger.debug(`Could not make script executable: ${error.message}`);
      }
    }

    try {
      // Determine command and arguments based on platform and file type
      const { command, args } = this.prepareCommand(context.scriptPath, shell);

      logger.debug(`Executing command: ${command} with args: [${args.join(', ')}]`);

      const result = await execa(command, args, {
        cwd: context.workingDirectory,
        env,
        timeout,
        maxBuffer,
        stripFinalNewline: false,
        windowsHide: true,
        preferLocal: true,
        input: context.stdin,
      });

      const duration = Date.now() - startTime;
      logger.debug(`Script completed: ${script.name} (exit code: 0, duration: ${duration}ms)`);

      return {
        success: true,
        exitCode: 0,
        stdout: result.stdout.trim(),
        stderr: result.stderr.trim(),
        duration
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      if (error.timedOut) {
        logger.warn(`Script execution timeout after ${timeout}ms: ${script.name}`);
        return {
          success: false,
          exitCode: -2,
          stdout: error.stdout?.trim() || '',
          stderr: error.stderr?.trim() || '',
          error: `Script execution timeout after ${timeout}ms`,
          duration
        };
      }

      const exitCode = error.exitCode || -1;
      logger.debug(`Script completed: ${script.name} (exit code: ${exitCode}, duration: ${duration}ms)`);

      return {
        success: false,
        exitCode,
        stdout: error.stdout?.trim() || '',
        stderr: error.stderr?.trim() || '',
        error: error.message || `Script exited with code ${exitCode}`,
        duration
      };
    }
  }

  /**
   * Prepare environment variables for script execution
   */
  prepareEnvironment(context: ScriptContext): Record<string, string> {
    // Start with current environment and ensure all values are strings
    const env: Record<string, string> = {};
    
    // Copy process.env but ensure all values are strings
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        env[key] = value;
      }
    }

    // Add ZCC-specific environment variables
    env.ZCC_SCRIPT_SOURCE = context.scriptPath;
    env.ZCC_SCRIPT_SCOPE = context.source;
    env.ZCC_PROJECT_ROOT = context.workingDirectory; // Always project root
    env.ZCC_GLOBAL_ROOT = this.globalRoot;
    env.ZCC_SCRIPT_NAME = path.parse(context.scriptPath).name;

    // Add additional context from the context.env
    Object.assign(env, context.env);

    // Ensure PATH includes common script locations
    const additionalPaths = [
      path.join(this.projectRoot, '.zcc', 'scripts'),
      path.join(this.globalRoot, 'scripts'),
      path.join(this.projectRoot, 'node_modules', '.bin')
    ];

    const currentPath = env.PATH || env.Path || '';
    const separator = process.platform === 'win32' ? ';' : ':';
    const newPaths = additionalPaths.filter(p => fs.existsSync(p));
    
    if (newPaths.length > 0) {
      env.PATH = [currentPath, ...newPaths].filter(Boolean).join(separator);
    }

    return env;
  }

  /**
   * Resolve the full path to a script by name and scope
   */
  resolveScriptPath(name: string, scope: 'global' | 'project'): string {
    const baseDir = scope === 'global' ? this.globalRoot : path.join(this.projectRoot, '.zcc');
    const scriptsDir = path.join(baseDir, 'scripts');
    
    // Try different extensions
    const extensions = ['.sh', '.js', '.py', '.ts', '.bat', '.cmd', ''];
    
    for (const ext of extensions) {
      const scriptPath = path.join(scriptsDir, name + ext);
      if (fs.existsSync(scriptPath)) {
        return scriptPath;
      }
    }

    // Default to .sh extension if not found
    return path.join(scriptsDir, name + '.sh');
  }

  /**
   * Find a script by name, checking project scope first, then global scope
   */
  async findScript(name: string): Promise<{ script: Script; context: ScriptContext } | null> {
    // Check project scope first
    const projectPath = this.resolveScriptPath(name, 'project');
    if (fs.existsSync(projectPath)) {
      return {
        script: {
          name,
          path: projectPath,
          metadata: await this.extractScriptMetadata(projectPath)
        },
        context: {
          source: 'project',
          scriptPath: projectPath,
          workingDirectory: this.projectRoot,
          env: {}
        }
      };
    }

    // Check global scope
    const globalPath = this.resolveScriptPath(name, 'global');
    if (fs.existsSync(globalPath)) {
      return {
        script: {
          name,
          path: globalPath,
          metadata: await this.extractScriptMetadata(globalPath)
        },
        context: {
          source: 'global',
          scriptPath: globalPath,
          workingDirectory: this.projectRoot, // Always project root
          env: {}
        }
      };
    }

    return null;
  }

  /**
   * Execute a script by name, with automatic discovery
   */
  async executeByName(name: string, args?: string[], options?: ScriptExecutorOptions): Promise<ScriptResult> {
    const found = await this.findScript(name);
    if (!found) {
      return {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: '',
        error: `Script not found: ${name}`,
        duration: 0
      };
    }

    // Add arguments to environment if provided
    if (args && args.length > 0) {
      found.context.env.SCRIPT_ARGS = args.join(' ');
      // Also add individual args as SCRIPT_ARG_0, SCRIPT_ARG_1, etc.
      args.forEach((arg, index) => {
        found.context.env[`SCRIPT_ARG_${index}`] = arg;
      });
    }

    return this.execute(found.script, found.context, options);
  }

  /**
   * List all available scripts from both scopes
   */
  async listScripts(): Promise<{ 
    project: Script[]; 
    global: Script[]; 
    all: Script[];
  }> {
    const projectScripts = await this.listScriptsInScope('project');
    const globalScripts = await this.listScriptsInScope('global');
    
    // Combine with project scripts taking precedence
    const scriptMap = new Map<string, Script>();
    
    // Add global scripts first
    for (const script of globalScripts) {
      scriptMap.set(script.name, { ...script, metadata: { ...script.metadata, scope: 'global' } });
    }
    
    // Add project scripts (overrides global with same name)
    for (const script of projectScripts) {
      scriptMap.set(script.name, { ...script, metadata: { ...script.metadata, scope: 'project' } });
    }

    return {
      project: projectScripts,
      global: globalScripts,
      all: Array.from(scriptMap.values()).sort((a, b) => a.name.localeCompare(b.name))
    };
  }

  /**
   * List scripts in a specific scope
   */
  private async listScriptsInScope(scope: 'global' | 'project'): Promise<Script[]> {
    const baseDir = scope === 'global' ? this.globalRoot : path.join(this.projectRoot, '.zcc');
    const scriptsDir = path.join(baseDir, 'scripts');
    
    if (!fs.existsSync(scriptsDir)) {
      return [];
    }

    const scripts: Script[] = [];
    
    try {
      const files = fs.readdirSync(scriptsDir);
      
      for (const file of files) {
        const filePath = path.join(scriptsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
          const name = path.parse(file).name;
          const metadata = await this.extractScriptMetadata(filePath);
          
          scripts.push({
            name,
            path: filePath,
            metadata
          });
        }
      }
    } catch (error: any) {
      logger.debug(`Failed to list scripts in ${scope} scope: ${error.message}`);
    }

    return scripts.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Extract metadata from script files
   */
  private async extractScriptMetadata(scriptPath: string): Promise<any> {
    try {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      const stats = fs.statSync(scriptPath);
      const ext = path.extname(scriptPath).toLowerCase();
      
      const metadata: any = {
        size: stats.size,
        modified: stats.mtime,
        extension: ext,
        executable: stats.mode & parseInt('111', 8) ? true : false
      };

      // Try to extract description from comments
      const lines = content.split('\n').slice(0, 20); // First 20 lines
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Look for description patterns
        if (trimmed.match(/^#\s*@description\s+(.+)$/)) {
          metadata.description = RegExp.$1;
          break;
        } else if (trimmed.match(/^#\s*Description:\s*(.+)$/)) {
          metadata.description = RegExp.$1;
          break;
        } else if (trimmed.match(/^#\s*(.{10,})$/) && !metadata.description) {
          // Use first substantial comment as description
          metadata.description = RegExp.$1;
        }
      }

      return metadata;
    } catch (error: any) {
      logger.debug(`Failed to extract script metadata from ${scriptPath}: ${error.message}`);
      return {};
    }
  }

  /**
   * Prepare command and arguments for script execution based on platform and file type
   */
  private prepareCommand(scriptPath: string, shell: string): { command: string; args: string[] } {
    const ext = path.extname(scriptPath).toLowerCase();
    const isWindows = process.platform === 'win32';

    // Resolve absolute path for security
    const absoluteScriptPath = path.resolve(scriptPath);

    // Handle different script types
    switch (ext) {
      case '.js':
        return { command: 'node', args: [absoluteScriptPath] };
      
      case '.py':
        return { command: 'python', args: [absoluteScriptPath] };
      
      case '.ts':
        return { command: 'npx', args: ['tsx', absoluteScriptPath] };
      
      case '.bat':
      case '.cmd':
        if (isWindows) {
          return { command: absoluteScriptPath, args: [] };
        }
        // Fallback to shell for non-Windows
        break;
      
      case '.sh':
      case '':
        // Shell scripts
        break;
    }

    // Default to shell execution
    // execa handles path escaping internally, so we don't need shell-escape here
    if (isWindows) {
      return { command: 'cmd', args: ['/c', absoluteScriptPath] };
    } else {
      return { command: shell, args: [absoluteScriptPath] };
    }
  }

  /**
   * Detect the appropriate shell for the current platform
   */
  private detectShell(): string {
    if (process.platform === 'win32') {
      return 'cmd';
    }
    
    // Check for available shells on Unix-like systems
    const shells = ['/bin/bash', '/bin/sh', '/bin/zsh'];
    
    for (const shell of shells) {
      if (fs.existsSync(shell)) {
        return shell;
      }
    }
    
    // Fallback
    return '/bin/sh';
  }

  /**
   * Validate that a script context is properly configured
   */
  validateContext(context: ScriptContext): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!context.scriptPath) {
      errors.push('Script path is required');
    } else if (!fs.existsSync(context.scriptPath)) {
      errors.push(`Script file does not exist: ${context.scriptPath}`);
    }

    if (!context.workingDirectory) {
      errors.push('Working directory is required');
    } else if (!fs.existsSync(context.workingDirectory)) {
      errors.push(`Working directory does not exist: ${context.workingDirectory}`);
    }

    if (!['global', 'project', 'builtin'].includes(context.source)) {
      errors.push(`Invalid source: ${context.source}. Must be 'global', 'project', or 'builtin'`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}