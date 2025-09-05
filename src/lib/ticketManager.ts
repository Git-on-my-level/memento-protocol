import { FileSystemAdapter } from './adapters/FileSystemAdapter';
import { NodeFileSystemAdapter } from './adapters/NodeFileSystemAdapter';

export type TicketStatus = 'next' | 'in-progress' | 'done';
export type TicketType = 'feature' | 'bug' | 'task' | 'refactor';

export interface TicketInfo {
  name: string;
  status: TicketStatus;
  type?: TicketType;
}

export interface TicketCreationOptions {
  type?: TicketType;
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  tags?: string[];
}

export class TicketManager {
  private zccDir: string;
  private ticketsDir: string;
  private fs: FileSystemAdapter;

  constructor(projectRoot: string, fs?: FileSystemAdapter) {
    this.fs = fs || new NodeFileSystemAdapter();
    this.zccDir = this.fs.join(projectRoot, '.zcc');
    this.ticketsDir = this.fs.join(this.zccDir, 'tickets');
    this.ensureStatusDirectories();
  }

  /**
   * Ensure status directories exist
   */
  private ensureStatusDirectories(): void {
    const statusDirs = ['next', 'in-progress', 'done'];
    statusDirs.forEach(status => {
      const statusDir = this.fs.join(this.ticketsDir, status);
      if (!this.fs.existsSync(statusDir)) {
        this.fs.mkdirSync(statusDir, { recursive: true });
      }
    });
  }

  /**
   * Find a ticket by name across all status directories
   */
  private findTicket(name: string): { path: string; status: TicketStatus } | null {
    const statusDirs: TicketStatus[] = ['next', 'in-progress', 'done'];
    
    for (const status of statusDirs) {
      // Check with .md extension
      const pathWithMd = this.fs.join(this.ticketsDir, status, `${name}.md`);
      if (this.fs.existsSync(pathWithMd)) {
        return { path: pathWithMd, status };
      }
      
      // Check without extension (for backwards compatibility)
      const pathWithoutMd = this.fs.join(this.ticketsDir, status, name);
      if (this.fs.existsSync(pathWithoutMd) && this.fs.statSync(pathWithoutMd).isFile()) {
        return { path: pathWithoutMd, status };
      }
    }
    
    return null;
  }

  /**
   * Get template content based on ticket type
   */
  private getTicketTemplate(type: TicketType, name: string, options: TicketCreationOptions): string {
    const timestamp = new Date().toISOString();
    const title = options.title || name;
    const description = options.description || '';
    const priority = options.priority || 'medium';
    const assignee = options.assignee || '';
    const tags = options.tags?.join(', ') || '';

    const templates = {
      feature: `# ${title}

**Type:** Feature  
**Priority:** ${priority}  
**Assignee:** ${assignee}  
**Tags:** ${tags}  

## Problem Statement
${description || 'What problem does this feature solve? Who is the target user?'}

## Proposed Solution
<!-- Describe your proposed approach to solving this problem -->

## Acceptance Criteria
- [ ] Feature requirement 1
- [ ] Feature requirement 2  
- [ ] Feature requirement 3
- [ ] Documentation updated
- [ ] Tests written and passing

## Technical Notes
<!-- Any technical considerations, architecture decisions, or implementation details -->

## Dependencies
<!-- List any dependencies on other tickets, features, or external resources -->

## Testing Plan
<!-- How will this feature be tested? What test cases are needed? -->

---
Created: ${timestamp}
Type: feature`,

      bug: `# ${title}

**Type:** Bug Fix  
**Priority:** ${priority}  
**Assignee:** ${assignee}  
**Tags:** ${tags}  

## Bug Description
${description || 'What is the current broken behavior?'}

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
<!-- What should happen instead? -->

## Actual Behavior
<!-- What actually happens? -->

## Environment
<!-- Browser, OS, version, etc. -->

## Root Cause Analysis
<!-- Once identified, document the root cause -->

## Solution Tasks
- [ ] Identify root cause
- [ ] Implement fix
- [ ] Add regression tests
- [ ] Verify fix works
- [ ] Update documentation if needed

## Testing
<!-- How to verify the fix works -->

---
Created: ${timestamp}
Type: bug`,

      task: `# ${title}

**Type:** Task  
**Priority:** ${priority}  
**Assignee:** ${assignee}  
**Tags:** ${tags}  

## Task Description
${description || 'What needs to be done and why?'}

## Success Criteria
<!-- How will we know this task is complete? -->

## Action Items
- [ ] Task item 1
- [ ] Task item 2
- [ ] Task item 3

## Resources Needed
<!-- Any tools, access, or information required -->

## Dependencies
<!-- What needs to happen before this task can be completed? -->

## Timeline
<!-- Expected completion timeframe -->

## Notes
<!-- Additional context, considerations, or references -->

---
Created: ${timestamp}
Type: task`,

      refactor: `# ${title}

**Type:** Refactor  
**Priority:** ${priority}  
**Assignee:** ${assignee}  
**Tags:** ${tags}  

## Refactoring Goal
${description || 'What code needs to be refactored and why?'}

## Current State
<!-- Describe the current implementation and its problems -->

## Target State  
<!-- Describe the desired end state after refactoring -->

## Benefits
<!-- Why is this refactoring valuable? -->
- Improved code maintainability
- Better performance
- Enhanced readability
- Reduced technical debt

## Refactoring Tasks
- [ ] Analyze current implementation
- [ ] Design new structure
- [ ] Write tests to preserve behavior
- [ ] Implement refactoring incrementally
- [ ] Verify all tests pass
- [ ] Update documentation

## Risk Assessment
<!-- What could go wrong? How to mitigate risks? -->

## Testing Strategy
<!-- How to ensure the refactoring doesn't break existing functionality -->

---
Created: ${timestamp}
Type: refactor`
    };

    return templates[type];
  }

  /**
   * Create a new ticket
   */
  async create(name: string, options: TicketCreationOptions = {}): Promise<string> {
    // Check if ticket already exists
    if (this.findTicket(name)) {
      throw new Error(`Ticket '${name}' already exists`);
    }

    const ticketPath = this.fs.join(this.ticketsDir, 'next', `${name}.md`);
    const type = options.type || 'task';
    
    // Create content based on ticket type
    const content = this.getTicketTemplate(type, name, options);

    this.fs.writeFileSync(ticketPath, content);
    return ticketPath;
  }

  /**
   * List all tickets
   */
  async list(): Promise<TicketInfo[]> {
    const tickets: TicketInfo[] = [];
    const statusDirs: TicketStatus[] = ['next', 'in-progress', 'done'];
    
    for (const status of statusDirs) {
      const statusDir = this.fs.join(this.ticketsDir, status);
      if (this.fs.existsSync(statusDir)) {
        const files = this.fs.readdirSync(statusDir);
        files.forEach(file => {
          // Only include .md files or files without extension that are regular files
          if (file.endsWith('.md') || (!file.includes('.') && this.fs.statSync(this.fs.join(statusDir, file)).isFile())) {
            const name = file.endsWith('.md') ? file.slice(0, -3) : file;
            tickets.push({ name, status });
          }
        });
      }
    }
    
    return tickets;
  }

  /**
   * Move a ticket to a different status
   */
  async move(name: string, toStatus: TicketStatus): Promise<void> {
    const ticket = this.findTicket(name);
    if (!ticket) {
      throw new Error(`Ticket '${name}' not found`);
    }

    if (ticket.status === toStatus) {
      throw new Error(`Ticket '${name}' is already in ${toStatus}`);
    }

    const filename = this.fs.basename(ticket.path);
    const newPath = this.fs.join(this.ticketsDir, toStatus, filename);
    
    // Use read+write+unlink pattern since FileSystemAdapter doesn't have rename
    const content = await this.fs.readFile(ticket.path, 'utf8') as string;
    await this.fs.writeFile(newPath, content);
    await this.fs.unlink(ticket.path);
  }

  /**
   * Delete a ticket
   */
  async delete(name: string): Promise<void> {
    const ticket = this.findTicket(name);
    if (!ticket) {
      throw new Error(`Ticket '${name}' not found`);
    }

    await this.fs.unlink(ticket.path);
  }
}