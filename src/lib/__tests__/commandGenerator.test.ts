import { CommandGenerator } from "../commandGenerator";
import { createTestFileSystem } from "../testing";
import { MemoryFileSystemAdapter } from "../adapters/MemoryFileSystemAdapter";

describe("CommandGenerator", () => {
  let projectRoot: string;
  let commandGenerator: CommandGenerator;
  let fs: MemoryFileSystemAdapter;

  beforeEach(async () => {
    projectRoot = "/test/project";
    fs = await createTestFileSystem({});
    commandGenerator = new CommandGenerator(projectRoot, fs);
  });

  describe("initialize", () => {
    it("should validate dependencies before generating commands", async () => {
      // Create required dependencies
      await fs.mkdir(`${projectRoot}/.zcc/scripts`, { recursive: true });
      await fs.writeFile(`${projectRoot}/.zcc/scripts/ticket-context.sh`, "#!/bin/bash\necho 'test'");
      await fs.writeFile(`${projectRoot}/.zcc/scripts/mode-switch.sh`, "#!/bin/bash\necho 'test'");
      
      await commandGenerator.initialize();
      
      // Should have generated command files
      const ticketExists = await fs.exists(`${projectRoot}/.claude/commands/ticket.md`);
      const modeExists = await fs.exists(`${projectRoot}/.claude/commands/mode.md`);
      const zccExists = await fs.exists(`${projectRoot}/.claude/commands/zcc.md`);
      
      expect(ticketExists).toBe(true);
      expect(modeExists).toBe(true);
      expect(zccExists).toBe(true);
    });

    it("should throw error if required scripts are missing", async () => {
      // Only create the mode script, leave ticket script missing
      await fs.mkdir(`${projectRoot}/.zcc/scripts`, { recursive: true });
      await fs.writeFile(`${projectRoot}/.zcc/scripts/mode-switch.sh`, "#!/bin/bash\necho 'test'");

      await expect(commandGenerator.initialize()).rejects.toThrow(
        "Missing required scripts for custom commands"
      );
    });

    it("should generate ticket command with correct allowed-tools pattern", async () => {
      // Create required dependencies
      await fs.mkdir(`${projectRoot}/.zcc/scripts`, { recursive: true });
      await fs.writeFile(`${projectRoot}/.zcc/scripts/ticket-context.sh`, "#!/bin/bash\necho 'test'");
      await fs.writeFile(`${projectRoot}/.zcc/scripts/mode-switch.sh`, "#!/bin/bash\necho 'test'");
      
      await commandGenerator.initialize();
      
      // Read the generated ticket.md file
      const content = await fs.readFile(`${projectRoot}/.claude/commands/ticket.md`, 'utf8');
      
      // Should use the correct pattern with wildcard suffix for arguments
      expect(content).toContain("allowed-tools: Bash(sh .zcc/scripts/ticket-context.sh):*");
      expect(content).not.toContain("sh:.zcc/scripts/ticket-context.sh");
    });

    it("should generate mode command with correct allowed-tools pattern", async () => {
      // Create required dependencies
      await fs.mkdir(`${projectRoot}/.zcc/scripts`, { recursive: true });
      await fs.writeFile(`${projectRoot}/.zcc/scripts/ticket-context.sh`, "#!/bin/bash\necho 'test'");
      await fs.writeFile(`${projectRoot}/.zcc/scripts/mode-switch.sh`, "#!/bin/bash\necho 'test'");
      
      await commandGenerator.initialize();
      
      // Read the generated mode.md file
      const content = await fs.readFile(`${projectRoot}/.claude/commands/mode.md`, 'utf8');
      
      // Should use the correct pattern with wildcard suffix for arguments
      expect(content).toContain("allowed-tools: Bash(sh .zcc/scripts/mode-switch.sh):*");
      expect(content).not.toContain("sh:.zcc/scripts/mode-switch.sh");
    });
  });

  describe("validateDependencies", () => {
    it("should pass validation when all scripts exist", async () => {
      // Create all required dependencies
      await fs.mkdir(`${projectRoot}/.zcc/scripts`, { recursive: true });
      await fs.writeFile(`${projectRoot}/.zcc/scripts/ticket-context.sh`, "#!/bin/bash\necho 'test'");
      await fs.writeFile(`${projectRoot}/.zcc/scripts/mode-switch.sh`, "#!/bin/bash\necho 'test'");
      
      // This should not throw
      await expect(commandGenerator.initialize()).resolves.not.toThrow();
    });

    it("should fail validation when ticket script is missing", async () => {
      // Only create the mode script
      await fs.mkdir(`${projectRoot}/.zcc/scripts`, { recursive: true });
      await fs.writeFile(`${projectRoot}/.zcc/scripts/mode-switch.sh`, "#!/bin/bash\necho 'test'");

      await expect(commandGenerator.initialize()).rejects.toThrow(
        "Missing required scripts for custom commands"
      );
    });

    it("should fail validation when mode script is missing", async () => {
      // Only create the ticket script
      await fs.mkdir(`${projectRoot}/.zcc/scripts`, { recursive: true });
      await fs.writeFile(`${projectRoot}/.zcc/scripts/ticket-context.sh`, "#!/bin/bash\necho 'test'");

      await expect(commandGenerator.initialize()).rejects.toThrow(
        "Missing required scripts for custom commands"
      );
    });

    it("should provide helpful error message with missing files", async () => {
      // Don't create any scripts

      try {
        await commandGenerator.initialize();
        fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toContain(".zcc/scripts/ticket-context.sh");
        expect(error.message).toContain(".zcc/scripts/mode-switch.sh");
        expect(error.message).toContain("zcc init --force");
      }
    });
  });

  describe("areCommandsInstalled", () => {
    it("should return true when all commands exist", async () => {
      // Create the command files
      await fs.mkdir(`${projectRoot}/.claude/commands`, { recursive: true });
      await fs.writeFile(`${projectRoot}/.claude/commands/ticket.md`, "ticket command");
      await fs.writeFile(`${projectRoot}/.claude/commands/mode.md`, "mode command");
      await fs.writeFile(`${projectRoot}/.claude/commands/zcc.md`, "zcc command");

      const result = await commandGenerator.areCommandsInstalled();
      expect(result).toBe(true);
    });

    it("should return false when some commands are missing", async () => {
      // Create only some command files
      await fs.mkdir(`${projectRoot}/.claude/commands`, { recursive: true });
      await fs.writeFile(`${projectRoot}/.claude/commands/ticket.md`, "ticket command");
      // Missing mode.md and zcc.md

      const result = await commandGenerator.areCommandsInstalled();
      expect(result).toBe(false);
    });

    it("should return false when no commands exist", async () => {
      const result = await commandGenerator.areCommandsInstalled();
      expect(result).toBe(false);
    });
  });

  describe("cleanup", () => {
    it("should remove commands directory", async () => {
      // Create the commands directory and some files
      await fs.mkdir(`${projectRoot}/.claude/commands`, { recursive: true });
      await fs.writeFile(`${projectRoot}/.claude/commands/ticket.md`, "ticket command");
      
      // Verify it exists
      expect(await fs.exists(`${projectRoot}/.claude/commands`)).toBe(true);
      
      // Clean up
      await commandGenerator.cleanup();
      
      // Verify it's gone
      expect(await fs.exists(`${projectRoot}/.claude/commands`)).toBe(false);
    });
  });
});