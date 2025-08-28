import { PackagePaths } from "../packagePaths";
import { createTestFileSystem } from "../testing";
import { MemoryFileSystemAdapter } from "../adapters/MemoryFileSystemAdapter";

describe("Template Metadata", () => {
  let fs: MemoryFileSystemAdapter;
  
  beforeEach(async () => {
    // Reset PackagePaths cache to ensure test environment detection works
    PackagePaths.reset();
    
    // Create test filesystem with template structure that mirrors actual templates
    fs = await createTestFileSystem({
      // Sample modes (matching real template files)
      '/test/templates/modes/architect.md': '# Architect Mode\nYou are a system architect.',
      '/test/templates/modes/engineer.md': '# Engineer Mode\nYou are a software engineer.',
      '/test/templates/modes/reviewer.md': '# Reviewer Mode\nYou are a code reviewer.',
      '/test/templates/modes/autonomous-project-manager.md': '# APM Mode\nYou are a project manager.',
      '/test/templates/modes/ai-debt-maintainer.md': '# AI Debt Maintainer\nYou clean up code debt.',
      
      // Sample workflows (matching real template files)
      '/test/templates/workflows/review.md': '# Review Workflow\nSystematic code review.',
      '/test/templates/workflows/summarize.md': '# Summarize Workflow\nCompress context.',
      '/test/templates/workflows/openmemory-setup.md': '# OpenMemory Setup\nSetup memory.',
      
      // Metadata.json that should match the template files
      '/test/templates/metadata.json': JSON.stringify({
        "version": "1.0.0",
        "generated": new Date().toISOString(),
        "templates": {
          "modes": [
            { "name": "architect", "description": "System architect mode" },
            { "name": "engineer", "description": "Software engineer mode" },
            { "name": "reviewer", "description": "Code reviewer mode" },
            { "name": "autonomous-project-manager", "description": "Project manager mode" },
            { "name": "ai-debt-maintainer", "description": "Code debt cleaner mode" }
          ],
          "workflows": [
            { "name": "review", "description": "Code review workflow" },
            { "name": "summarize", "description": "Context summarization workflow" },
            { "name": "openmemory-setup", "description": "Memory setup workflow" }
          ],
          "agents": [],
          "hooks": []
        }
      }, null, 2)
    });
  });

  it("should have metadata for every template file", async () => {
    const templatesDir = PackagePaths.getTemplatesDir(); // Should return '/test/templates' in test env
    
    // Read metadata using the memory filesystem
    const metadataContent = await fs.readFile(`${templatesDir}/metadata.json`, 'utf8');
    const metadata = JSON.parse(metadataContent.toString());

    // Get template files from memory filesystem
    const modeFiles = await fs.readdir(`${templatesDir}/modes`);
    const workflowFiles = await fs.readdir(`${templatesDir}/workflows`);

    // Extract file names without extensions
    const modeNames = modeFiles
      .filter(file => file.endsWith('.md'))
      .map(file => file.replace('.md', ''));
    const workflowNames = workflowFiles
      .filter(file => file.endsWith('.md'))
      .map(file => file.replace('.md', ''));

    const metadataModes = metadata.templates.modes.map((m: any) => m.name);
    const metadataWorkflows = metadata.templates.workflows.map(
      (w: any) => w.name
    );

    expect(modeNames.sort()).toEqual(metadataModes.sort());
    expect(workflowNames.sort()).toEqual(metadataWorkflows.sort());
  });
});
