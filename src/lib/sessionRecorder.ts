import * as fs from 'fs';
import * as path from 'path';
import { TicketManager } from './ticketManager';

export interface SessionEntry {
  timestamp: string;
  summary: string;
  context?: string;
  sessionId?: string;
}

export class SessionRecorder {
  private ticketManager: TicketManager;
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.ticketManager = new TicketManager(projectRoot);
  }

  /**
   * Generate a simple session ID based on current timestamp
   */
  private generateSessionId(): string {
    return `session-${Date.now()}`;
  }

  /**
   * Capture basic session context
   */
  private captureSessionContext(): string {
    const context = [];
    
    // Current working directory
    context.push(`Working Directory: ${this.projectRoot}`);
    
    // Git status if available
    try {
      const gitDir = path.join(this.projectRoot, '.git');
      if (fs.existsSync(gitDir)) {
        context.push('Git Repository: Yes');
        // Could add more git context here if needed
      }
    } catch (error) {
      // Ignore git errors
    }

    // Recent file modifications (simple approach)
    try {
      const recentFiles = this.getRecentlyModifiedFiles();
      if (recentFiles.length > 0) {
        context.push(`Recently Modified Files: ${recentFiles.slice(0, 5).join(', ')}`);
      }
    } catch (error) {
      // Ignore file system errors
    }

    return context.join('\n');
  }

  /**
   * Get recently modified files (within last hour)
   */
  private getRecentlyModifiedFiles(): string[] {
    const recentFiles: string[] = [];
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    const scanDirectory = (dir: string, depth = 0) => {
      if (depth > 2) return; // Limit depth to avoid performance issues

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          // Skip hidden directories and node_modules
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue;
          }

          if (entry.isFile()) {
            const stats = fs.statSync(fullPath);
            if (stats.mtime.getTime() > oneHourAgo) {
              recentFiles.push(path.relative(this.projectRoot, fullPath));
            }
          } else if (entry.isDirectory()) {
            scanDirectory(fullPath, depth + 1);
          }
        }
      } catch (error) {
        // Ignore directory scan errors
      }
    };

    scanDirectory(this.projectRoot);
    return recentFiles;
  }

  /**
   * Generate a session summary (simplified version - in real implementation could use AI)
   */
  private generateSessionSummary(ticketName?: string): string {
    const recentFiles = this.getRecentlyModifiedFiles();
    const timestamp = new Date().toLocaleString();
    
    let summary = `Session recorded at ${timestamp}`;
    
    if (ticketName) {
      summary += ` for ticket: ${ticketName}`;
    }

    if (recentFiles.length > 0) {
      summary += `\n\nRecent activity:`;
      summary += `\n- Modified ${recentFiles.length} file(s)`;
      summary += `\n- Key files: ${recentFiles.slice(0, 3).join(', ')}`;
    }

    // Add placeholder for AI-generated summary
    summary += `\n\n*Note: In a full implementation, this would include an AI-generated summary of the session using Haiku or similar model.*`;

    return summary;
  }

  /**
   * Find the most relevant ticket for current session
   */
  private async findRelevantTicket(): Promise<string | null> {
    const tickets = await this.ticketManager.list();
    
    // Simple heuristic: find tickets in 'in-progress' status first
    const inProgressTickets = tickets.filter(t => t.status === 'in-progress');
    if (inProgressTickets.length === 1) {
      return inProgressTickets[0].name;
    }

    // If multiple or no in-progress tickets, return null to create new one
    return null;
  }

  /**
   * Record current session to a ticket
   */
  async recordSession(ticketName?: string, summary?: string): Promise<string> {
    let targetTicket = ticketName;
    
    // If no ticket specified, try to find relevant one
    if (!targetTicket) {
      targetTicket = await this.findRelevantTicket();
    }

    // Generate session summary
    const sessionSummary = summary || this.generateSessionSummary(targetTicket);
    const sessionContext = this.captureSessionContext();
    const sessionId = this.generateSessionId();

    const sessionEntry: SessionEntry = {
      timestamp: new Date().toISOString(),
      summary: sessionSummary,
      context: sessionContext,
      sessionId
    };

    // If we have a target ticket, append to it
    if (targetTicket) {
      await this.appendToTicket(targetTicket, sessionEntry);
      return targetTicket;
    } else {
      // Create new ticket
      const newTicketName = `session-${Date.now()}`;
      await this.createTicketWithSession(newTicketName, sessionEntry);
      return newTicketName;
    }
  }

  /**
   * Append session entry to existing ticket
   */
  private async appendToTicket(ticketName: string, sessionEntry: SessionEntry): Promise<void> {
    const tickets = await this.ticketManager.list();
    const ticket = tickets.find(t => t.name === ticketName);
    
    if (!ticket) {
      throw new Error(`Ticket '${ticketName}' not found`);
    }

    // Read current ticket content
    const ticketPath = path.join(this.projectRoot, '.memento', 'tickets', ticket.status, `${ticketName}.md`);
    let content = '';
    
    if (fs.existsSync(ticketPath)) {
      content = fs.readFileSync(ticketPath, 'utf8');
    }

    // Append session entry
    const sessionSection = `

---

## Session Entry - ${new Date(sessionEntry.timestamp).toLocaleString()}
**Session ID:** ${sessionEntry.sessionId}

### Summary
${sessionEntry.summary}

### Context
\`\`\`
${sessionEntry.context}
\`\`\`
`;

    content += sessionSection;
    fs.writeFileSync(ticketPath, content);
  }

  /**
   * Create new ticket with session entry
   */
  private async createTicketWithSession(ticketName: string, sessionEntry: SessionEntry): Promise<void> {
    // Create basic ticket structure with session
    const content = `# ${ticketName}

## Description
Session-based ticket created automatically.

## Tasks
- [ ] Review session context
- [ ] Define specific tasks

## Session Entry - ${new Date(sessionEntry.timestamp).toLocaleString()}
**Session ID:** ${sessionEntry.sessionId}

### Summary
${sessionEntry.summary}

### Context
\`\`\`
${sessionEntry.context}
\`\`\`

---
Created: ${sessionEntry.timestamp}
`;

    const ticketPath = path.join(this.projectRoot, '.memento', 'tickets', 'next', `${ticketName}.md`);
    
    // Ensure directory exists
    const ticketDir = path.dirname(ticketPath);
    if (!fs.existsSync(ticketDir)) {
      fs.mkdirSync(ticketDir, { recursive: true });
    }
    
    fs.writeFileSync(ticketPath, content);
  }
}