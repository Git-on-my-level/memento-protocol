import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from './logger';

export class ClaudeMdGenerator {
  private claudeMdPath: string;

  constructor(projectRoot: string) {
    this.claudeMdPath = path.join(projectRoot, 'CLAUDE.md');
  }

  /**
   * Generate minimal CLAUDE.md router
   */
  async generate(existingContent?: string): Promise<void> {
    const routerContent = this.generateRouterContent();
    const finalContent = existingContent
      ? this.mergeWithExisting(routerContent, existingContent)
      : routerContent;

    await fs.writeFile(this.claudeMdPath, finalContent, 'utf-8');
    logger.success('Generated CLAUDE.md router');
  }

  /**
   * Check if CLAUDE.md already exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.claudeMdPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read existing CLAUDE.md content
   */
  async readExisting(): Promise<string | null> {
    try {
      return await fs.readFile(this.claudeMdPath, 'utf-8');
    } catch {
      return null;
    }
  }

  /**
   * Generate the minimal router content
   * Keep it under 50 lines as per Design.md
   */
  private generateRouterContent(): string {
    return `# CLAUDE.md - Memento Protocol Router

This file serves as a minimal router for Claude Code. Instructions are loaded on-demand from the .memento directory.

## Available Commands

### Activate a Mode
To switch behavioral patterns, use: **"act as [mode]"**
- \`act as project-manager\` - Planning and coordination
- \`act as architect\` - System design and technical decisions
- \`act as engineer\` - Implementation and debugging
- \`act as reviewer\` - Code review and quality checks

### Execute a Workflow
To run step-by-step procedures, use: **"execute [workflow]"**
- \`execute summarize\` - Compress context and analyze directories
- \`execute review\` - Perform code review and quality checks

### Work with Tickets
To manage stateful work, use: **"continue ticket [id]"**
- Tickets persist work across sessions in \`.memento/tickets/\`

## Component Location
All components are in the \`.memento/\` directory:
- **Modes**: \`.memento/modes/[mode-name].md\`
- **Workflows**: \`.memento/workflows/[workflow-name].md\`
- **Language overrides**: \`.memento/languages/[lang]/[workflow].md\`
- **Tickets**: \`.memento/tickets/[ticket-id]/\`

## Project-Specific Instructions
<!-- Project-specific content below this line -->
`;
  }

  /**
   * Merge router content with existing CLAUDE.md
   */
  private mergeWithExisting(routerContent: string, existingContent: string): string {
    // Check if existing content already has Memento Protocol section
    if (existingContent.includes('Memento Protocol Router')) {
      // Update the router section while preserving project-specific content
      const projectSpecificMarker = '<!-- Project-specific content below this line -->';
      const markerIndex = existingContent.indexOf(projectSpecificMarker);
      
      if (markerIndex !== -1) {
        // Preserve everything after the marker
        const projectContent = existingContent.substring(markerIndex + projectSpecificMarker.length);
        return routerContent + projectContent;
      }
    }

    // If no Memento section exists, append router to existing content
    return routerContent + '\n\n' + existingContent;
  }
}