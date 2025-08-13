import { CommandGenerator } from "../commandGenerator";
import * as fs from "fs/promises";
import * as path from "path";
import { existsSync } from "fs";

// Mock the fs module
jest.mock("fs/promises");
jest.mock("fs");

const mockFs = fs as jest.Mocked<typeof fs>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;

describe("CommandGenerator", () => {
  let tempDir: string;
  let commandGenerator: CommandGenerator;

  beforeEach(() => {
    tempDir = "/tmp/test-project";
    commandGenerator = new CommandGenerator(tempDir);
    
    // Mock filesystem operations
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockExistsSync.mockReturnValue(true); // Assume all dependencies exist by default
    
    jest.clearAllMocks();
  });

  describe("initialize", () => {
    it("should validate dependencies before generating commands", async () => {
      // All dependencies exist
      mockExistsSync.mockReturnValue(true);
      
      await commandGenerator.initialize();
      
      // Should have checked for required script files
      expect(mockExistsSync).toHaveBeenCalledWith(
        path.join(tempDir, ".memento/scripts/ticket-context.sh")
      );
      expect(mockExistsSync).toHaveBeenCalledWith(
        path.join(tempDir, ".memento/scripts/mode-switch.sh")
      );
    });

    it("should throw error if required scripts are missing", async () => {
      // Mock missing scripts
      mockExistsSync.mockImplementation((filepath) => {
        return !filepath.toString().includes("ticket-context.sh");
      });

      await expect(commandGenerator.initialize()).rejects.toThrow(
        "Missing required scripts for custom commands"
      );
    });

    it("should generate ticket command with correct allowed-tools pattern", async () => {
      mockExistsSync.mockReturnValue(true);
      
      await commandGenerator.initialize();
      
      // Find the call that wrote the ticket.md file
      const ticketWriteCall = mockFs.writeFile.mock.calls.find(call => 
        call[0].toString().includes("ticket.md")
      );
      
      expect(ticketWriteCall).toBeDefined();
      const content = ticketWriteCall![1] as string;
      
      // Should use the correct pattern without colon prefix
      expect(content).toContain("allowed-tools: Bash(sh .memento/scripts/ticket-context.sh)");
      expect(content).not.toContain("sh:.memento/scripts/ticket-context.sh");
    });

    it("should generate mode command with correct allowed-tools pattern", async () => {
      mockExistsSync.mockReturnValue(true);
      
      await commandGenerator.initialize();
      
      // Find the call that wrote the mode.md file
      const modeWriteCall = mockFs.writeFile.mock.calls.find(call => 
        call[0].toString().includes("mode.md")
      );
      
      expect(modeWriteCall).toBeDefined();
      const content = modeWriteCall![1] as string;
      
      // Should use the correct pattern without colon prefix
      expect(content).toContain("allowed-tools: Bash(sh .memento/scripts/mode-switch.sh)");
      expect(content).not.toContain("sh:.memento/scripts/mode-switch.sh");
    });
  });

  describe("validateDependencies", () => {
    it("should pass validation when all scripts exist", async () => {
      mockExistsSync.mockReturnValue(true);
      
      // This should not throw
      await expect(commandGenerator.initialize()).resolves.not.toThrow();
    });

    it("should fail validation when ticket script is missing", async () => {
      mockExistsSync.mockImplementation((filepath) => {
        return !filepath.toString().includes("ticket-context.sh");
      });

      await expect(commandGenerator.initialize()).rejects.toThrow(
        "Missing required scripts for custom commands"
      );
    });

    it("should fail validation when mode script is missing", async () => {
      mockExistsSync.mockImplementation((filepath) => {
        return !filepath.toString().includes("mode-switch.sh");
      });

      await expect(commandGenerator.initialize()).rejects.toThrow(
        "Missing required scripts for custom commands"
      );
    });

    it("should provide helpful error message with missing files", async () => {
      mockExistsSync.mockReturnValue(false);

      try {
        await commandGenerator.initialize();
        fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).toContain(".memento/scripts/ticket-context.sh");
        expect(error.message).toContain(".memento/scripts/mode-switch.sh");
        expect(error.message).toContain("memento init --force");
      }
    });
  });
});