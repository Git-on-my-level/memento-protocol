import { CommandGenerator } from "../commandGenerator";
import { createTestFileSystem } from "../testing";
import { MemoryFileSystemAdapter } from "../adapters/MemoryFileSystemAdapter";

describe("Custom Commands Integration", () => {
  let projectRoot: string;
  let commandGenerator: CommandGenerator;
  let fs: MemoryFileSystemAdapter;

  beforeEach(async () => {
    projectRoot = "/test/project";
    fs = await createTestFileSystem({});
    commandGenerator = new CommandGenerator(projectRoot, fs);
  });

  describe("Claude Code Permission Patterns", () => {
    beforeEach(async () => {
      // Create required dependencies
      await fs.mkdir(`${projectRoot}/.zcc/scripts`, { recursive: true });
      await fs.writeFile(`${projectRoot}/.zcc/scripts/ticket-context.sh`, "#!/bin/bash\necho 'test'");
      await fs.writeFile(`${projectRoot}/.zcc/scripts/mode-switch.sh`, "#!/bin/bash\necho 'test'");
    });

    it("should generate allowed-tools patterns that match command execution patterns", async () => {
      await commandGenerator.initialize();
      
      // Check ticket command
      const ticketContent = await fs.readFile(`${projectRoot}/.claude/commands/ticket.md`, 'utf8');
      
      // The allowed-tools pattern should allow execution with any arguments
      expect(ticketContent).toMatch(/allowed-tools:.*Bash\(sh \.zcc\/scripts\/ticket-context\.sh\):\*/);
      
      // The actual command uses backticks and $ARGUMENTS
      expect(ticketContent).toContain("!`sh .zcc/scripts/ticket-context.sh $ARGUMENTS`");
      
      // Check mode command
      const modeContent = await fs.readFile(`${projectRoot}/.claude/commands/mode.md`, 'utf8');
      
      // The allowed-tools pattern should allow execution with any arguments
      expect(modeContent).toMatch(/allowed-tools:.*Bash\(sh \.zcc\/scripts\/mode-switch\.sh\):\*/);
      
      // The actual command uses backticks and $ARGUMENTS
      expect(modeContent).toContain("!`sh .zcc/scripts/mode-switch.sh $ARGUMENTS`");
    });

    it("should generate patterns compatible with Claude Code's permission system", async () => {
      await commandGenerator.initialize();
      
      const commands = [
        { file: "ticket.md", script: "ticket-context.sh" },
        { file: "mode.md", script: "mode-switch.sh" }
      ];
      
      for (const { file, script } of commands) {
        const content = await fs.readFile(`${projectRoot}/.claude/commands/${file}`, 'utf8');
        const contentStr = typeof content === 'string' ? content : content.toString();
        const lines = contentStr.split('\n');
        
        // Find the allowed-tools line
        const allowedToolsLine = lines.find((line: string) => line.startsWith('allowed-tools:'));
        expect(allowedToolsLine).toBeDefined();
        
        // Pattern should end with :* to allow any arguments
        expect(allowedToolsLine).toContain(`:*`);
        
        // Pattern should reference the correct script
        expect(allowedToolsLine).toContain(script);
        
        // Pattern should use Bash() format
        expect(allowedToolsLine).toMatch(/Bash\([^)]+\)/);
      }
    });

    it("should ensure zcc command has correct permissions for all its operations", async () => {
      await commandGenerator.initialize();
      
      const content = await fs.readFile(`${projectRoot}/.claude/commands/zcc.md`, 'utf8');
      
      // Check that all required operations are allowed
      expect(content).toContain("allowed-tools:");
      expect(content).toContain("Bash(npx zcc ticket list)");
      expect(content).toContain("Bash(ls:.zcc/modes/)");
      expect(content).toContain("Bash(ls:.zcc/workflows/)");
      expect(content).toContain("Bash(head:CLAUDE.md)");
      
      // Check that the commands are actually used in the body
      expect(content).toContain("!`npx zcc ticket list");
      expect(content).toContain("!`ls -1 .zcc/modes/");
      expect(content).toContain("!`ls -1 .zcc/workflows/");
      expect(content).toContain("!`head -20 CLAUDE.md");
    });
  });

  describe("Regression Prevention", () => {
    it("should validate that custom command patterns are properly formatted", async () => {
      // Create required dependencies
      await fs.mkdir(`${projectRoot}/.zcc/scripts`, { recursive: true });
      await fs.writeFile(`${projectRoot}/.zcc/scripts/ticket-context.sh`, "#!/bin/bash\necho 'test'");
      await fs.writeFile(`${projectRoot}/.zcc/scripts/mode-switch.sh`, "#!/bin/bash\necho 'test'");
      
      await commandGenerator.initialize();
      
      // Read all generated commands
      const commands = ["ticket.md", "mode.md", "zcc.md"];
      
      for (const cmd of commands) {
        const content = await fs.readFile(`${projectRoot}/.claude/commands/${cmd}`, 'utf8');
        
        // Verify frontmatter structure
        expect(content).toMatch(/^---\n/);
        expect(content).toContain("allowed-tools:");
        expect(content).toContain("description:");
        expect(content).toMatch(/---\n/);
        
        // Verify no malformed patterns (e.g., missing :* suffix for dynamic commands)
        const contentStr = typeof content === 'string' ? content : content.toString();
        const lines = contentStr.split('\n');
        const allowedToolsLine = lines.find((line: string) => line.startsWith('allowed-tools:'));
        
        if (cmd === "ticket.md" || cmd === "mode.md") {
          // These commands accept arguments and need :* suffix
          expect(allowedToolsLine).toContain(":*");
        }
        
        // Ensure no old-style patterns remain
        expect(allowedToolsLine).not.toMatch(/Bash\(sh [^)]+\)(?!:)/); // No pattern without : suffix
      }
    });

    it("should fail initialization if required scripts are missing", async () => {
      // This ensures we can't generate commands that won't work
      
      // Missing both scripts
      await expect(commandGenerator.initialize()).rejects.toThrow(
        "Missing required scripts for custom commands"
      );
      
      // Create only one script
      await fs.mkdir(`${projectRoot}/.zcc/scripts`, { recursive: true });
      await fs.writeFile(`${projectRoot}/.zcc/scripts/mode-switch.sh`, "#!/bin/bash\necho 'test'");
      
      // Should still fail
      await expect(commandGenerator.initialize()).rejects.toThrow(
        "Missing required scripts for custom commands"
      );
      
      // Error message should be helpful
      try {
        await commandGenerator.initialize();
      } catch (error: any) {
        expect(error.message).toContain("ticket-context.sh");
        expect(error.message).toContain("zcc init --force");
      }
    });
  });
});