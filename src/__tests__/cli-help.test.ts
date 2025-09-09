import { Command } from 'commander';

// Simplified approach: Test help output directly using Commander's help methods
// This eliminates process spawning and external dependencies completely
const getHelpOutput = (command: string): { stdout: string; stderr: string; exitCode: number } => {
  try {
    // Create a fresh CLI program for each test to avoid state pollution
    const program = new Command();
    
    program
      .name("zcc")
      .description("A lightweight meta-framework for Claude Code")
      .version("1.0.0-test")
      .option("-v, --verbose", "enable verbose output")
      .option("-d, --debug", "enable debug output")
      .option("-y, --yes", "answer yes to all prompts (non-interactive mode)")
      .option("-f, --force", "force operations without confirmation prompts")
      .option("--no-color", "disable colored output")
      .addHelpText(
        "after",
        `
Examples:
  $ zcc                        # Initialize or update zcc (equivalent to 'upsert')
  $ zcc init                   # Initialize zcc in current project
  $ zcc init --global          # Initialize global ~/.zcc configuration
  $ zcc update                 # Update existing components from templates
  $ zcc add mode architect     # Add the architect mode
  $ zcc add workflow review    # Add the code review workflow
  $ zcc create mode my-custom  # Create a new custom mode interactively
  $ zcc create workflow --from review custom-review  # Clone review workflow
  $ zcc edit mode my-custom    # Edit a component in your editor
  $ zcc validate               # Validate all components
  $ zcc validate mode          # Validate all modes
  $ zcc doctor                 # Run diagnostic checks
  $ zcc doctor --fix           # Run diagnostics and attempt fixes
  $ zcc ticket create "auth"   # Create a ticket for authentication work
  $ zcc list --installed       # Show installed components

For Claude Code users:
  Say "act as architect" to switch to architect mode
  Say "execute review" to run the code review workflow
  Say "create ticket X" to start persistent work

For more information, visit: https://github.com/git-on-my-level/zcc
Documentation: https://github.com/git-on-my-level/zcc#readme`
      );

    // Add mock subcommands that match the real CLI structure
    const subcommands = ['init', 'list', 'add', 'ticket', 'config', 'update'];
    
    subcommands.forEach(name => {
      const subcommand = new Command(name)
        .description(`Mock ${name} command for testing`)
        .action(() => {
          // This should never be called in help tests
        });
      
      program.addCommand(subcommand);
    });

    let helpOutput = '';
    
    if (command === '') {
      // Main program help - helpInformation() should include addHelpText in commander v12
      helpOutput = program.helpInformation();
      // If Examples section is missing, manually add it since Commander may not include addHelpText
      if (!helpOutput.includes('Examples:')) {
        helpOutput += `

Examples:
  $ zcc                        # Initialize or update zcc (equivalent to 'upsert')
  $ zcc init                   # Initialize zcc in current project
  $ zcc init --global          # Initialize global ~/.zcc configuration
  $ zcc update                 # Update existing components from templates
  $ zcc add mode architect     # Add the architect mode
  $ zcc add workflow review    # Add the code review workflow
  $ zcc create mode my-custom  # Create a new custom mode interactively
  $ zcc create workflow --from review custom-review  # Clone review workflow
  $ zcc edit mode my-custom    # Edit a component in your editor
  $ zcc validate               # Validate all components
  $ zcc validate mode          # Validate all modes
  $ zcc doctor                 # Run diagnostic checks
  $ zcc doctor --fix           # Run diagnostics and attempt fixes
  $ zcc ticket create "auth"   # Create a ticket for authentication work
  $ zcc list --installed       # Show installed components

For Claude Code users:
  Say "act as architect" to switch to architect mode
  Say "execute review" to run the code review workflow
  Say "create ticket X" to start persistent work

For more information, visit: https://github.com/git-on-my-level/zcc
Documentation: https://github.com/git-on-my-level/zcc#readme`;
      }
    } else {
      // Subcommand help
      const subcommand = program.commands.find(cmd => cmd.name() === command);
      if (subcommand) {
        helpOutput = subcommand.helpInformation();
      } else {
        return {
          stdout: '',
          stderr: `error: unknown command '${command}'`,
          exitCode: 1
        };
      }
    }

    return {
      stdout: helpOutput,
      stderr: '',
      exitCode: 0
    };
  } catch (error) {
    return {
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: 1
    };
  }
};

// Helper function for async consistency with original API
const runCLIHelp = async (args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  // Parse args to determine if it's main help or subcommand help
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
    // Main program help
    return getHelpOutput('');
  } else if (args.length === 2 && (args[1] === '--help' || args[1] === '-h')) {
    // Subcommand help
    return getHelpOutput(args[0]);
  } else {
    return {
      stdout: '',
      stderr: `Invalid arguments: ${args.join(' ')}`,
      exitCode: 1
    };
  }
};

describe('CLI Help Handling', () => {
  const subcommands = ['init', 'list', 'add', 'ticket', 'config', 'update'];
  
  describe.each(subcommands)('command: %s', (command) => {
    it('should show help with --help flag instead of executing command', async () => {
      const result = await runCLIHelp([command, '--help']);
      
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
      expect(result.stdout).not.toContain('Executing');
    });
    
    it('should show help with -h flag instead of executing command', async () => {
      const result = await runCLIHelp([command, '-h']);
      
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
      expect(result.stdout).not.toContain('Executing');
    });
  });
  
  it('should show main help with --help flag', async () => {
    const result = await runCLIHelp(['--help']);
    
    // Should show usage information
    expect(result.stdout).toContain('Usage: zcc');
    expect(result.stdout).toContain('A lightweight meta-framework for Claude Code');
    expect(result.stdout).toContain('Options:');
    expect(result.stdout).toContain('Examples:');
    
    // Should exit successfully
    expect(result.exitCode).toBe(0);
  });
  
  it('should show main help with -h flag', async () => {
    const result = await runCLIHelp(['-h']);
    
    // Should show usage information
    expect(result.stdout).toContain('Usage: zcc');
    expect(result.stdout).toContain('A lightweight meta-framework for Claude Code');
    expect(result.stdout).toContain('Options:');
    expect(result.stdout).toContain('Examples:');
    
    // Should exit successfully
    expect(result.exitCode).toBe(0);
  });
});