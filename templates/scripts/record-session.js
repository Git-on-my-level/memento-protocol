#!/usr/bin/env node

/**
 * Standalone session recording script for use by the session-summarizer agent
 * This creates a ticket with placeholders for the agent to fill in
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SimpleSessionRecorder {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.ticketsDir = path.join(projectRoot, '.memento', 'tickets');
  }

  sanitizeTicketName(name) {
    return name
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }

  getRecentlyModifiedFiles() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentFiles = [];
    const maxFiles = 50;
    const maxDepth = 2;
    
    const scanDirectory = (dir, depth = 0) => {
      if (depth > maxDepth || recentFiles.length >= maxFiles) return;
      
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (recentFiles.length >= maxFiles) break;
          
          const fullPath = path.join(dir, entry.name);
          
          // Skip hidden directories and node_modules
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue;
          }
          
          if (entry.isFile()) {
            try {
              const stats = fs.statSync(fullPath);
              if (stats.mtime.getTime() > oneHourAgo) {
                recentFiles.push(path.relative(this.projectRoot, fullPath));
              }
            } catch (e) {
              // Skip files we can't stat
            }
          } else if (entry.isDirectory()) {
            scanDirectory(fullPath, depth + 1);
          }
        }
      } catch (e) {
        // Skip directories we can't read
      }
    };
    
    scanDirectory(this.projectRoot);
    return recentFiles;
  }

  findExistingTicket(ticketName) {
    if (!ticketName) return null;
    
    const statuses = ['next', 'in-progress', 'done'];
    for (const status of statuses) {
      const ticketPath = path.join(this.ticketsDir, status, `${ticketName}.md`);
      if (fs.existsSync(ticketPath)) {
        return { path: ticketPath, status };
      }
    }
    return null;
  }

  createOrUpdateTicket(ticketName) {
    const timestamp = new Date().toISOString();
    const localTime = new Date().toLocaleString();
    const recentFiles = this.getRecentlyModifiedFiles();
    
    // Generate context
    let context = '';
    if (recentFiles.length > 0) {
      context = `Recently Modified Files: ${recentFiles.slice(0, 5).join(', ')}`;
    } else {
      context = 'No recently modified files';
    }
    
    // Check if ticket exists
    const existing = this.findExistingTicket(ticketName);
    
    if (existing) {
      // Append to existing ticket
      let content = fs.readFileSync(existing.path, 'utf8');
      
      const sessionSection = `

---

## Session Entry - ${localTime}

### Summary
<!-- AI_SUMMARY_START -->
[AI will generate a comprehensive summary here based on recent work, changes made, and next steps]
<!-- AI_SUMMARY_END -->

### Context
\`\`\`
${context}
\`\`\`
`;
      
      content += sessionSection;
      fs.writeFileSync(existing.path, content);
      
      return { ticketName, path: existing.path, isNew: false };
    } else {
      // Create new ticket
      const finalName = ticketName || this.sanitizeTicketName(`session-${timestamp.split('T')[0]}-${crypto.randomBytes(3).toString('hex')}`);
      
      const content = `# ${finalName}

## Description
Session-based ticket created for AI summarization.

## Tasks
- [ ] Review session context
- [ ] Define specific tasks based on work completed

## Session Entry - ${localTime}

### Summary
<!-- AI_SUMMARY_START -->
[AI will generate a comprehensive summary here based on recent work, changes made, and next steps]
<!-- AI_SUMMARY_END -->

### Context
\`\`\`
${context}
\`\`\`

---
Created: ${timestamp}
`;
      
      const ticketPath = path.join(this.ticketsDir, 'next', `${finalName}.md`);
      
      // Ensure directory exists
      const ticketDir = path.dirname(ticketPath);
      if (!fs.existsSync(ticketDir)) {
        fs.mkdirSync(ticketDir, { recursive: true });
      }
      
      fs.writeFileSync(ticketPath, content);
      
      return { ticketName: finalName, path: ticketPath, isNew: true };
    }
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const ticketName = args[0] || null;
  
  try {
    const recorder = new SimpleSessionRecorder();
    const result = recorder.createOrUpdateTicket(ticketName);
    
    // Output JSON for the agent to parse
    console.log(JSON.stringify({
      success: true,
      ticketName: result.ticketName,
      ticketPath: result.path,
      isNew: result.isNew,
      message: result.isNew 
        ? `Created new ticket: ${result.ticketName}` 
        : `Updated existing ticket: ${result.ticketName}`
    }, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: error.message
    }, null, 2));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}