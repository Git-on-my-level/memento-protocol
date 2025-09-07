import { spawn } from 'child_process';

// Helper function to run CLI commands and capture output
const runCLI = (args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number | null }> => {
  return new Promise((resolve) => {
    const child = spawn('npm', ['run', 'dev', '--', ...args], {
      stdio: 'pipe',
      cwd: process.cwd()
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code });
    });
  });
};

describe('CLI Help Handling', () => {
  const subcommands = ['init', 'list', 'add', 'ticket', 'config', 'update'];
  
  describe.each(subcommands)('command: %s', (command) => {
    it('should show help with --help flag instead of executing command', async () => {
      const result = await runCLI([command, '--help']);
      
      // Should show usage information
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain(`zcc ${command}`);
      expect(result.stdout).toContain('Options:');
      expect(result.stdout).toContain('-h, --help');
      
      // Should exit successfully
      expect(result.exitCode).toBe(0);
      
      // Should NOT contain command execution output (like "zcc is already initialized")
      expect(result.stdout).not.toContain('zcc is already initialized');
      expect(result.stdout).not.toContain('zcc Status:');
      expect(result.stdout).not.toContain('Built-in:');
    }, 10000); // 10 second timeout for each test
    
    it('should show help with -h flag instead of executing command', async () => {
      const result = await runCLI([command, '-h']);
      
      // Should show usage information
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain(`zcc ${command}`);
      expect(result.stdout).toContain('Options:');
      expect(result.stdout).toContain('-h, --help');
      
      // Should exit successfully
      expect(result.exitCode).toBe(0);
      
      // Should NOT contain command execution output
      expect(result.stdout).not.toContain('zcc is already initialized');
      expect(result.stdout).not.toContain('zcc Status:');
      expect(result.stdout).not.toContain('Built-in:');
    }, 10000); // 10 second timeout for each test
  });
  
  it('should show main help with --help flag', async () => {
    const result = await runCLI(['--help']);
    
    // Should show usage information
    expect(result.stdout).toContain('Usage: zcc');
    expect(result.stdout).toContain('A lightweight meta-framework for Claude Code');
    expect(result.stdout).toContain('Options:');
    expect(result.stdout).toContain('Examples:');
    
    // Should exit successfully
    expect(result.exitCode).toBe(0);
  }, 10000);
  
  it('should show main help with -h flag', async () => {
    const result = await runCLI(['-h']);
    
    // Should show usage information
    expect(result.stdout).toContain('Usage: zcc');
    expect(result.stdout).toContain('A lightweight meta-framework for Claude Code');
    expect(result.stdout).toContain('Options:');
    expect(result.stdout).toContain('Examples:');
    
    // Should exit successfully
    expect(result.exitCode).toBe(0);
  }, 10000);
});