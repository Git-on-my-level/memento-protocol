import { Command } from 'commander';
import { ConfigManager } from '../lib/configManager';
import { ZccCore } from '../lib/ZccCore';
import { logger } from '../lib/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Diagnostic result interface
 */
interface DiagnosticResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  suggestion?: string;
  details?: string[];
}

/**
 * Doctor command for comprehensive ZCC diagnostics
 * Similar to npm doctor or brew doctor
 */
const doctorCommand = new Command('doctor')
  .description('Run diagnostic checks for ZCC installation and configuration')
  .option('--fix', 'Attempt to automatically fix detected issues')
  .action(async (options: { fix?: boolean }) => {
    try {
      await runDiagnostics(options.fix || false);
    } catch (error) {
      logger.error(`Doctor check failed: ${error}`);
      process.exitCode = 1;
    }
  });

/**
 * Run all diagnostic checks
 */
async function runDiagnostics(autoFix: boolean): Promise<void> {
  logger.info('Running ZCC diagnostic checks...');
  logger.newline();
  
  const results: DiagnosticResult[] = [];
  
  // Run all diagnostic checks
  results.push(await checkZccInstallation());
  results.push(await checkNodejsVersion());
  results.push(await checkOperatingSystem());
  results.push(await checkGlobalConfig());
  results.push(await checkProjectConfig());
  results.push(await checkFilePermissions());
  results.push(await checkClaudeCodeIntegration());
  results.push(await checkHooksStatus());
  results.push(await checkComponentAvailability());
  
  // Display results
  displayDiagnosticResults(results);
  
  // Attempt fixes if requested
  if (autoFix) {
    await attemptFixes(results);
  }
  
  // Determine exit code
  const hasFailures = results.some(r => r.status === 'fail');
  const hasWarnings = results.some(r => r.status === 'warn');
  
  logger.newline();
  if (hasFailures) {
    logger.error('Some diagnostic checks failed. ZCC may not work correctly.');
    process.exitCode = 1;
  } else if (hasWarnings) {
    logger.warn('Some diagnostic checks have warnings. ZCC should work but may have limited functionality.');
    logger.info('Run with --fix to attempt automatic fixes.');
  } else {
    logger.success('All diagnostic checks passed! ZCC is healthy.');
  }
}

/**
 * Check ZCC installation and version
 */
async function checkZccInstallation(): Promise<DiagnosticResult> {
  try {
    const packagePath = path.resolve(__dirname, '../../package.json');
    if (!fs.existsSync(packagePath)) {
      return {
        name: 'ZCC Installation',
        status: 'fail',
        message: 'Cannot find package.json',
        suggestion: 'Reinstall ZCC using npm install -g z-claude-code'
      };
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const version = packageJson.version;
    
    return {
      name: 'ZCC Installation',
      status: 'pass',
      message: `ZCC v${version} is installed correctly`,
      details: [`Package: ${packageJson.name}`, `Location: ${packagePath}`]
    };
  } catch (error: any) {
    return {
      name: 'ZCC Installation',
      status: 'fail',
      message: 'Failed to verify ZCC installation',
      suggestion: 'Reinstall ZCC using npm install -g z-claude-code',
      details: [error.message]
    };
  }
}

/**
 * Check Node.js version compatibility
 */
async function checkNodejsVersion(): Promise<DiagnosticResult> {
  try {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion >= 16) {
      return {
        name: 'Node.js Version',
        status: 'pass',
        message: `Node.js ${nodeVersion} is compatible`,
        details: [`Minimum required: Node.js 16.0.0`]
      };
    } else {
      return {
        name: 'Node.js Version',
        status: 'fail',
        message: `Node.js ${nodeVersion} is too old`,
        suggestion: 'Update to Node.js 16.0.0 or later',
        details: [`Current: ${nodeVersion}`, `Required: >= 16.0.0`]
      };
    }
  } catch (error: any) {
    return {
      name: 'Node.js Version',
      status: 'fail',
      message: 'Failed to check Node.js version',
      details: [error.message]
    };
  }
}

/**
 * Check operating system compatibility
 */
async function checkOperatingSystem(): Promise<DiagnosticResult> {
  try {
    const platform = os.platform();
    const release = os.release();
    const arch = os.arch();
    
    const supportedPlatforms = ['darwin', 'linux', 'win32'];
    const isSupported = supportedPlatforms.includes(platform);
    
    return {
      name: 'Operating System',
      status: isSupported ? 'pass' : 'warn',
      message: isSupported 
        ? `${platform} ${release} is supported`
        : `${platform} ${release} may have limited support`,
      details: [`Platform: ${platform}`, `Release: ${release}`, `Architecture: ${arch}`]
    };
  } catch (error: any) {
    return {
      name: 'Operating System',
      status: 'warn',
      message: 'Failed to detect operating system',
      details: [error.message]
    };
  }
}

/**
 * Check global configuration
 */
async function checkGlobalConfig(): Promise<DiagnosticResult> {
  try {
    const configManager = new ConfigManager(process.cwd());
    const globalRoot = configManager.getGlobalRoot();
    
    // Check if global directory exists
    if (!fs.existsSync(globalRoot)) {
      return {
        name: 'Global Configuration',
        status: 'warn',
        message: 'Global ZCC directory does not exist',
        suggestion: 'Run "zcc init --global" to initialize global configuration',
        details: [`Expected location: ${globalRoot}`, `ZCC_HOME: ${process.env.ZCC_HOME || 'not set'}`]
      };
    }
    
    // Validate global config if it exists
    const result = await configManager.validateConfigFile(true);
    if (!result.valid) {
      return {
        name: 'Global Configuration',
        status: 'fail',
        message: 'Global configuration has validation errors',
        suggestion: 'Run "zcc config validate --global --fix" to fix issues',
        details: result.errors
      };
    }
    
    return {
      name: 'Global Configuration',
      status: 'pass',
      message: 'Global configuration is valid',
      details: [`Location: ${globalRoot}`, `ZCC_HOME: ${process.env.ZCC_HOME || 'default (~/.zcc)'}`]
    };
  } catch (error: any) {
    return {
      name: 'Global Configuration',
      status: 'warn',
      message: 'Cannot validate global configuration',
      suggestion: 'Run "zcc init --global" to initialize global configuration',
      details: [error.message]
    };
  }
}

/**
 * Check project configuration
 */
async function checkProjectConfig(): Promise<DiagnosticResult> {
  try {
    const configManager = new ConfigManager(process.cwd());
    const projectRoot = process.cwd();
    const projectZccPath = path.join(projectRoot, '.zcc');
    
    // Check if project directory exists
    if (!fs.existsSync(projectZccPath)) {
      return {
        name: 'Project Configuration',
        status: 'warn',
        message: 'Project is not initialized with ZCC',
        suggestion: 'Run "zcc init" to initialize ZCC in this project',
        details: [`Project root: ${projectRoot}`]
      };
    }
    
    // Validate project config if it exists
    const result = await configManager.validateConfigFile(false);
    if (!result.valid) {
      return {
        name: 'Project Configuration',
        status: 'fail',
        message: 'Project configuration has validation errors',
        suggestion: 'Run "zcc config validate --fix" to fix issues',
        details: result.errors
      };
    }
    
    return {
      name: 'Project Configuration',
      status: 'pass',
      message: 'Project configuration is valid',
      details: [`Location: ${projectZccPath}`]
    };
  } catch (error: any) {
    return {
      name: 'Project Configuration',
      status: 'warn',
      message: 'Cannot validate project configuration',
      suggestion: 'Run "zcc init" to initialize ZCC in this project',
      details: [error.message]
    };
  }
}

/**
 * Check file permissions
 */
async function checkFilePermissions(): Promise<DiagnosticResult> {
  try {
    const configManager = new ConfigManager(process.cwd());
    const globalRoot = configManager.getGlobalRoot();
    const projectRoot = path.join(process.cwd(), '.zcc');
    
    const issues: string[] = [];
    
    // Check global directory permissions
    if (fs.existsSync(globalRoot)) {
      try {
        fs.accessSync(globalRoot, fs.constants.R_OK | fs.constants.W_OK);
      } catch {
        issues.push(`Cannot read/write to global directory: ${globalRoot}`);
      }
    }
    
    // Check project directory permissions
    if (fs.existsSync(projectRoot)) {
      try {
        fs.accessSync(projectRoot, fs.constants.R_OK | fs.constants.W_OK);
      } catch {
        issues.push(`Cannot read/write to project directory: ${projectRoot}`);
      }
    }
    
    if (issues.length > 0) {
      return {
        name: 'File Permissions',
        status: 'fail',
        message: 'Permission issues detected',
        suggestion: 'Check file permissions and ownership',
        details: issues
      };
    }
    
    return {
      name: 'File Permissions',
      status: 'pass',
      message: 'File permissions are correct'
    };
  } catch (error: any) {
    return {
      name: 'File Permissions',
      status: 'warn',
      message: 'Cannot check file permissions',
      details: [error.message]
    };
  }
}

/**
 * Check Claude Code integration
 */
async function checkClaudeCodeIntegration(): Promise<DiagnosticResult> {
  try {
    const projectRoot = process.cwd();
    const claudeSettingsPath = path.join(projectRoot, '.claude', 'settings.local.json');
    const claudeCommandsPath = path.join(projectRoot, '.claude', 'commands');
    
    const details: string[] = [];
    const issues: string[] = [];
    
    // Check if .claude directory exists
    if (!fs.existsSync(path.join(projectRoot, '.claude'))) {
      issues.push('No .claude directory found');
      details.push('Claude Code integration not detected');
    } else {
      details.push('Claude Code directory found');
      
      // Check settings file
      if (fs.existsSync(claudeSettingsPath)) {
        details.push('Claude Code settings found');
      } else {
        issues.push('No Claude Code settings file found');
      }
      
      // Check commands directory
      if (fs.existsSync(claudeCommandsPath)) {
        const commands = fs.readdirSync(claudeCommandsPath).filter(f => f.endsWith('.md'));
        details.push(`${commands.length} custom commands found`);
      } else {
        issues.push('No custom commands directory found');
      }
    }
    
    if (issues.length > 0) {
      return {
        name: 'Claude Code Integration',
        status: 'warn',
        message: 'Claude Code integration incomplete',
        suggestion: 'Run "zcc init" to set up Claude Code integration',
        details: [...issues, ...details]
      };
    }
    
    return {
      name: 'Claude Code Integration',
      status: 'pass',
      message: 'Claude Code integration is set up',
      details
    };
  } catch (error: any) {
    return {
      name: 'Claude Code Integration',
      status: 'warn',
      message: 'Cannot check Claude Code integration',
      details: [error.message]
    };
  }
}

/**
 * Check hooks status
 */
async function checkHooksStatus(): Promise<DiagnosticResult> {
  try {
    const zccCore = new ZccCore(process.cwd());
    const status = await zccCore.getStatus();
    
    const details: string[] = [];
    const issues: string[] = [];
    
    // Check if hooks are available
    const hooks = await zccCore.getComponentsByType('hook');
    if (hooks.length === 0) {
      issues.push('No hooks installed');
    } else {
      details.push(`${hooks.length} hooks available`);
    }
    
    // Check builtin components
    if (!status.builtin.available) {
      issues.push('Built-in templates not available');
    } else {
      details.push(`${status.builtin.components} built-in components available`);
    }
    
    if (issues.length > 0) {
      return {
        name: 'Hooks Status',
        status: 'warn',
        message: 'Hook system has issues',
        suggestion: 'Run "zcc init" to install default hooks',
        details: [...issues, ...details]
      };
    }
    
    return {
      name: 'Hooks Status',
      status: 'pass',
      message: 'Hook system is working',
      details
    };
  } catch (error: any) {
    return {
      name: 'Hooks Status',
      status: 'warn',
      message: 'Cannot check hooks status',
      details: [error.message]
    };
  }
}

/**
 * Check component availability
 */
async function checkComponentAvailability(): Promise<DiagnosticResult> {
  try {
    const zccCore = new ZccCore(process.cwd());
    const status = await zccCore.getStatus();
    
    const details = [
      `Built-in components: ${status.builtin.components}`,
      `Global components: ${status.global.components}`,
      `Project components: ${status.project.components}`,
      `Total unique components: ${status.uniqueComponents}`
    ];
    
    if (status.uniqueComponents === 0) {
      return {
        name: 'Component Availability',
        status: 'fail',
        message: 'No components available',
        suggestion: 'Run "zcc init" to install default components',
        details
      };
    }
    
    if (status.uniqueComponents < 5) {
      return {
        name: 'Component Availability',
        status: 'warn',
        message: 'Limited components available',
        suggestion: 'Run "zcc init --pack [pack-name]" to install more components',
        details
      };
    }
    
    return {
      name: 'Component Availability',
      status: 'pass',
      message: `${status.uniqueComponents} components available`,
      details
    };
  } catch (error: any) {
    return {
      name: 'Component Availability',
      status: 'warn',
      message: 'Cannot check component availability',
      details: [error.message]
    };
  }
}

/**
 * Display diagnostic results in a formatted way
 */
function displayDiagnosticResults(results: DiagnosticResult[]): void {
  for (const result of results) {
    // Status icon and color
    let statusIcon: string;
    switch (result.status) {
      case 'pass':
        statusIcon = '✅';
        break;
      case 'warn':
        statusIcon = '⚠️';
        break;
      case 'fail':
        statusIcon = '❌';
        break;
    }
    
    // Main result line
    console.log(`${statusIcon} ${result.name}: ${result.message}`);
    
    // Show suggestion if there is one
    if (result.suggestion) {
      logger.info(`   💡 ${result.suggestion}`);
    }
    
    // Show details in verbose mode or for failures
    if (result.details && result.details.length > 0 && (result.status === 'fail' || process.env.ZCC_VERBOSE)) {
      for (const detail of result.details) {
        logger.verbose(`   • ${detail}`);
      }
    }
    
    logger.newline();
  }
}

/**
 * Attempt automatic fixes for detected issues
 */
async function attemptFixes(results: DiagnosticResult[]): Promise<void> {
  logger.newline();
  logger.info('Attempting automatic fixes...');
  
  for (const result of results) {
    if (result.status === 'fail') {
      logger.info(`Attempting to fix: ${result.name}`);
      
      try {
        await attemptSpecificFix(result);
        logger.success(`Fixed: ${result.name}`);
      } catch (error) {
        logger.warn(`Could not automatically fix: ${result.name}`);
        logger.debug(`Fix error: ${error}`);
      }
    }
  }
}

/**
 * Attempt to fix a specific diagnostic issue
 */
async function attemptSpecificFix(result: DiagnosticResult): Promise<void> {
  const configManager = new ConfigManager(process.cwd());
  
  switch (result.name) {
    case 'Global Configuration':
      if (result.message.includes('does not exist')) {
        // Create global directory
        const globalRoot = configManager.getGlobalRoot();
        fs.mkdirSync(globalRoot, { recursive: true });
      } else if (result.message.includes('validation errors')) {
        // Fix validation errors
        await configManager.fixConfigFile(true);
      }
      break;
      
    case 'Project Configuration':
      if (result.message.includes('not initialized')) {
        // Initialize project
        const { UpsertManager } = await import('../lib/upsertManager');
        const upsertManager = new UpsertManager(process.cwd());
        await upsertManager.upsert();
      } else if (result.message.includes('validation errors')) {
        // Fix validation errors
        await configManager.fixConfigFile(false);
      }
      break;
      
    default:
      throw new Error(`No automatic fix available for ${result.name}`);
  }
}

export { doctorCommand };