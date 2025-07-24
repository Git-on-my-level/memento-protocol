import { HookGenerator } from "../hookGenerator";
import * as fs from "fs/promises";
import * as path from "path";

jest.mock("fs/promises");
jest.mock("../logger", () => ({
  logger: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("HookGenerator", () => {
  let hookGenerator: HookGenerator;
  const mockProjectRoot = "/test/project";
  
  beforeEach(() => {
    jest.clearAllMocks();
    hookGenerator = new HookGenerator(mockProjectRoot);
  });

  describe("generate", () => {
    beforeEach(() => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockRejectedValue(new Error("File not found"));
    });

    it("should create required directories", async () => {
      await hookGenerator.generate();

      expect(fs.mkdir).toHaveBeenCalledWith(
        path.join(mockProjectRoot, ".claude"),
        { recursive: true }
      );
      expect(fs.mkdir).toHaveBeenCalledWith(
        path.join(mockProjectRoot, ".memento/hooks"),
        { recursive: true }
      );
    });

    it("should generate routing script with correct content", async () => {
      await hookGenerator.generate();

      const scriptPath = path.join(mockProjectRoot, ".memento/hooks/routing.sh");
      const writeCall = (fs.writeFile as jest.Mock).mock.calls.find(
        (call) => call[0] === scriptPath
      );

      expect(writeCall).toBeDefined();
      
      const scriptContent = writeCall[1];
      
      // Check for mode, workflow, and ticket extraction
      expect(scriptContent).toContain("MODE_REQUEST=");
      expect(scriptContent).toContain("WORKFLOW_REQUEST=");
      expect(scriptContent).toContain("TICKET_REQUEST=");
      
      // Check for path-based detection
      expect(scriptContent).toContain("MEMENTO_MODE_PATH=");
      expect(scriptContent).toContain("MEMENTO_WORKFLOW_PATH=");
      expect(scriptContent).toContain("MEMENTO_TICKET_PATH=");
      
      // Check for ticket processing logic
      expect(scriptContent).toContain("find_ticket()");
      expect(scriptContent).toContain("## Ticket:");
      
      // Check injection order (mode, workflow, ticket, then user prompt)
      const modeIndex = scriptContent.indexOf("Process mode request");
      const workflowIndex = scriptContent.indexOf("Process workflow request");
      const ticketIndex = scriptContent.indexOf("Process ticket request");
      const promptIndex = scriptContent.indexOf("# Output the original prompt");
      
      expect(modeIndex).toBeLessThan(workflowIndex);
      expect(workflowIndex).toBeLessThan(ticketIndex);
      expect(ticketIndex).toBeLessThan(promptIndex);
      
      // Check file permissions
      expect(writeCall[2]).toEqual({ mode: 0o755 });
    });

    it("should handle ticket: prefix extraction correctly", async () => {
      await hookGenerator.generate();

      const scriptContent = (fs.writeFile as jest.Mock).mock.calls.find(
        (call) => call[0].includes("routing.sh")
      )[1];

      // Check regex patterns for ticket extraction
      expect(scriptContent).toMatch(/\[Tt\]icket:\[.*\]\*\[A-Za-z0-9_\/-\]\*/);
    });

    it("should handle .memento path extraction correctly", async () => {
      await hookGenerator.generate();

      const scriptContent = (fs.writeFile as jest.Mock).mock.calls.find(
        (call) => call[0].includes("routing.sh")
      )[1];

      // Check path extraction patterns
      expect(scriptContent).toContain("\\.memento/modes/");
      expect(scriptContent).toContain("\\.memento/workflows/");
      expect(scriptContent).toContain("\\.memento/tickets/");
    });

    it("should create settings.toml with hook configuration", async () => {
      await hookGenerator.generate();

      const settingsPath = path.join(mockProjectRoot, ".claude/settings.toml");
      const writeCall = (fs.writeFile as jest.Mock).mock.calls.find(
        (call) => call[0] === settingsPath
      );

      expect(writeCall).toBeDefined();
      
      const settingsContent = writeCall[1];
      expect(settingsContent).toContain("[[hooks]]");
      expect(settingsContent).toContain('event = "UserPromptSubmit"');
      expect(settingsContent).toContain('command = "./.memento/hooks/routing.sh"');
    });

    it("should not duplicate hook in existing settings.toml", async () => {
      const existingSettings = `
[[hooks]]
event = "UserPromptSubmit"
command = "./.memento/hooks/routing.sh"
`;
      (fs.readFile as jest.Mock).mockResolvedValueOnce(existingSettings);

      await hookGenerator.generate();

      expect(fs.writeFile).not.toHaveBeenCalledWith(
        expect.stringContaining("settings.toml"),
        expect.any(String)
      );
    });

    it("should append hook to existing settings.toml", async () => {
      const existingSettings = `
[some_other_config]
value = "test"
`;
      (fs.readFile as jest.Mock).mockResolvedValueOnce(existingSettings);

      await hookGenerator.generate();

      const settingsPath = path.join(mockProjectRoot, ".claude/settings.toml");
      const writeCall = (fs.writeFile as jest.Mock).mock.calls.find(
        (call) => call[0] === settingsPath
      );

      expect(writeCall).toBeDefined();
      
      const settingsContent = writeCall[1];
      expect(settingsContent).toContain(existingSettings.trim());
      expect(settingsContent).toContain("[[hooks]]");
      expect(settingsContent).toContain('command = "./.memento/hooks/routing.sh"');
    });
  });

  describe("routing script ticket functionality", () => {
    let scriptContent: string;

    beforeEach(async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockRejectedValue(new Error("File not found"));
      
      await hookGenerator.generate();
      
      scriptContent = (fs.writeFile as jest.Mock).mock.calls.find(
        (call) => call[0].includes("routing.sh")
      )[1];
    });

    it("should handle ticket paths with status prefix", () => {
      // Check that the script handles paths like "done/ticket-name"
      expect(scriptContent).toContain('echo "$ticket" | grep -q "^$status/"');
    });

    it("should search across all ticket status directories", () => {
      expect(scriptContent).toContain('statuses=("next" "in-progress" "done")');
    });

    it("should output ticket metadata and content files", () => {
      expect(scriptContent).toContain("metadata.json");
      expect(scriptContent).toContain("progress.md");
      expect(scriptContent).toContain("decisions.md");
    });

    it("should include ticket command instructions", () => {
      expect(scriptContent).toContain("Ticket Commands Available");
      expect(scriptContent).toContain("npx memento ticket update");
      expect(scriptContent).toContain("npx memento ticket move");
      expect(scriptContent).toContain("npx memento ticket create");
      expect(scriptContent).toContain("npx memento ticket list");
    });

    it("should include workspace guidance", () => {
      expect(scriptContent).toContain("Using Tickets as a Workspace");
      expect(scriptContent).toContain("Planning");
      expect(scriptContent).toContain("Progress Tracking");
      expect(scriptContent).toContain("Decision Records");
      expect(scriptContent).toContain("Delegation");
      expect(scriptContent).toContain("Context Sharing");
    });

    it("should list available tickets when not found", () => {
      expect(scriptContent).toContain("Available tickets:");
      expect(scriptContent).toContain('for status in next in-progress done');
    });
  });
});