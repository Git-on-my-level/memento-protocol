import * as fs from "fs/promises";
import * as path from "path";

jest.mock("fs/promises");
jest.mock("../logger", () => ({
  logger: {
    success: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock("../configManager", () => ({
  ConfigManager: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
  })),
}));

import { ClaudeMdGenerator } from "../claudeMdGenerator";

describe("ClaudeMdGenerator", () => {
  const mockProjectRoot = "/test/project";
  const mockClaudeMdPath = path.join(mockProjectRoot, "CLAUDE.md");
  let generator: ClaudeMdGenerator;

  beforeEach(() => {
    jest.clearAllMocks();
    // Provide default template content for loadTemplate() in all tests
    const templateContent = `# CLAUDE.md - Memento Protocol Router\n\n### Activate a Mode\n<list_modes>\n### Execute a Workflow\nexecute [workflow]\n<default_mode>`;
    jest.mocked(fs.readFile).mockResolvedValue(templateContent as any);
    jest.mocked(fs.readdir).mockRejectedValue(new Error("ENOENT")); // Default: no modes found
    generator = new ClaudeMdGenerator(mockProjectRoot);
  });

  describe("generate", () => {
    it("should generate minimal router content when no existing content", async () => {
      const mockWriteFile = jest.mocked(fs.writeFile);

      // Ensure template content is available for this specific test
      jest
        .mocked(fs.readFile)
        .mockResolvedValueOnce(
          `# CLAUDE.md - Memento Protocol Router\n<list_modes>\nexecute [workflow]` as any
        );

      await generator.generate();

      expect(mockWriteFile).toHaveBeenCalledWith(
        mockClaudeMdPath,
        expect.stringContaining("# CLAUDE.md - Memento Protocol Router"),
        "utf-8"
      );
      // Since no modes are found, <list_modes> should be removed
      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      expect(writtenContent).not.toContain("<list_modes>");
      expect(mockWriteFile).toHaveBeenCalledWith(
        mockClaudeMdPath,
        expect.stringContaining("execute [workflow]"),
        "utf-8"
      );
    });

    it("should merge with existing content", async () => {
      const mockWriteFile = jest.mocked(fs.writeFile);
      const existingContent = "## My Project\n\nSome existing instructions.";

      // template content
      jest
        .mocked(fs.readFile)
        .mockResolvedValueOnce(`# CLAUDE.md - Memento Protocol Router` as any);

      await generator.generate(existingContent);

      expect(mockWriteFile).toHaveBeenCalledWith(
        mockClaudeMdPath,
        expect.stringContaining("## My Project"),
        "utf-8"
      );
    });

    it("should preserve project-specific content after marker", async () => {
      const mockWriteFile = jest.mocked(fs.writeFile);
      const existingContent = `# CLAUDE.md - Memento Protocol Router
 Some old router content
 <!-- Project-specific content below this line -->
 ## My Custom Section
 Custom project instructions`;

      jest
        .mocked(fs.readFile)
        .mockResolvedValueOnce(
          `# CLAUDE.md - Memento Protocol Router\n<list_modes>` as any
        );

      await generator.generate(existingContent);

      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      expect(writtenContent).toContain("## My Custom Section");
      expect(writtenContent).toContain("Custom project instructions");
    });

    it("should replace list_modes tag with discovered modes", async () => {
      const mockWriteFile = jest.mocked(fs.writeFile);
      
      // Mock template with list_modes tag
      jest.mocked(fs.readFile).mockImplementation((filePath: any) => {
        if (filePath.includes("claude_router_template.md")) {
          return Promise.resolve(`# CLAUDE.md\n<list_modes>\nEnd` as any);
        }
        return Promise.reject(new Error("File not found"));
      });
      
      // Mock mode discovery
      jest.mocked(fs.readdir).mockImplementation((dirPath: any) => {
        if (dirPath.includes("templates/modes")) {
          return Promise.resolve(["architect.md", "engineer.md"] as any);
        } else if (dirPath.includes(".memento/modes")) {
          return Promise.resolve(["custom-mode.md"] as any);
        }
        return Promise.reject(new Error("Directory not found"));
      });

      await generator.generate();

      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      expect(writtenContent).toContain("- `architect`");
      expect(writtenContent).toContain("- `engineer`");
      expect(writtenContent).toContain("- `custom-mode`");
      expect(writtenContent).not.toContain("<list_modes>");
    });

    it("should replace default_mode tag when default mode is set", async () => {
      const mockWriteFile = jest.mocked(fs.writeFile);
      
      // Mock template with default_mode tag
      jest.mocked(fs.readFile).mockResolvedValueOnce(
        `# CLAUDE.md\n<default_mode>\nEnd` as any
      );
      
      // Mock config manager to return a default mode
      const ConfigManager = require("../configManager").ConfigManager;
      ConfigManager.mockImplementation(() => ({
        get: jest.fn().mockResolvedValue("autonomous-project-manager"),
      }));
      
      // Create a new generator instance with the mocked ConfigManager
      const generatorWithDefaultMode = new ClaudeMdGenerator(mockProjectRoot);

      await generatorWithDefaultMode.generate();

      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      expect(writtenContent).toContain('0. **Default Mode**: IF NO MODE IS SPECIFIED OR IMPLIED: Load and activate "autonomous-project-manager" mode automatically at session start');
      expect(writtenContent).not.toContain("<default_mode>");
    });
  });

  describe("exists", () => {
    it("should return true when CLAUDE.md exists", async () => {
      jest.mocked(fs.access).mockResolvedValueOnce(undefined);

      const exists = await generator.exists();

      expect(exists).toBe(true);
      expect(fs.access).toHaveBeenCalledWith(mockClaudeMdPath);
    });

    it("should return false when CLAUDE.md does not exist", async () => {
      jest.mocked(fs.access).mockRejectedValueOnce(new Error("ENOENT"));

      const exists = await generator.exists();

      expect(exists).toBe(false);
    });
  });

  describe("readExisting", () => {
    it("should return content when file exists", async () => {
      const mockContent = "# Existing CLAUDE.md";
      jest.mocked(fs.readFile).mockResolvedValueOnce(mockContent);

      const content = await generator.readExisting();

      expect(content).toBe(mockContent);
      expect(fs.readFile).toHaveBeenCalledWith(mockClaudeMdPath, "utf-8");
    });

    it("should return null when file does not exist", async () => {
      jest.mocked(fs.readFile).mockRejectedValueOnce(new Error("ENOENT"));

      const content = await generator.readExisting();

      expect(content).toBeNull();
    });
  });
});
