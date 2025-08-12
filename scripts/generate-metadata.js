#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

/**
 * Generate metadata.json from template files
 * This ensures metadata is always in sync with actual templates
 */

const TEMPLATES_DIR = path.join(__dirname, "..", "templates");
const OUTPUT_FILE = path.join(TEMPLATES_DIR, "metadata.json");

// Helper to extract frontmatter from markdown files
function extractFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;
  
  const frontmatter = {};
  const lines = match[1].split('\n');
  
  for (const line of lines) {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      const value = valueParts.join(':').trim();
      // Handle arrays (tools in agents)
      if (value.startsWith('[') && value.endsWith(']')) {
        frontmatter[key.trim()] = value.slice(1, -1).split(',').map(s => s.trim());
      } else {
        frontmatter[key.trim()] = value.replace(/^["']|["']$/g, '');
      }
    }
  }
  
  return frontmatter;
}

// Helper to extract first heading and paragraph from markdown
function extractDescriptionFromMarkdown(content) {
  // Remove frontmatter if present
  const contentWithoutFrontmatter = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
  
  // Extract first paragraph after first heading
  const lines = contentWithoutFrontmatter.split('\n');
  let description = '';
  let foundHeading = false;
  
  for (const line of lines) {
    if (line.startsWith('#') && !foundHeading) {
      foundHeading = true;
      continue;
    }
    if (foundHeading && line.trim() && !line.startsWith('#')) {
      description = line.trim();
      break;
    }
  }
  
  return description;
}

// Helper to extract metadata from JSON hook files
function extractHookMetadata(jsonContent) {
  try {
    const hook = JSON.parse(jsonContent);
    return {
      name: hook.id,
      description: hook.description || '',
      tags: hook.tags || [],
      dependencies: hook.dependencies || [],
      event: hook.event,
      priority: hook.priority || 0
    };
  } catch (e) {
    console.error('Error parsing hook JSON:', e);
    return null;
  }
}

// Process a directory of templates
function processTemplateDirectory(dir, type) {
  const templates = [];
  
  if (!fs.existsSync(dir)) {
    return templates;
  }
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isFile()) {
      let metadata = null;
      
      if (file.endsWith('.md')) {
        // Process markdown files (modes, workflows, agents)
        const name = path.basename(file, '.md');
        const content = fs.readFileSync(filePath, 'utf-8');
        const frontmatter = extractFrontmatter(content);
        const description = frontmatter?.description || extractDescriptionFromMarkdown(content);
        
        metadata = {
          name,
          description,
          tags: frontmatter?.tags || [],
          dependencies: frontmatter?.dependencies || []
        };
        
        // Add agent-specific fields
        if (type === 'agents' && frontmatter?.tools) {
          metadata.tools = frontmatter.tools;
        }
      } else if (file.endsWith('.json') && type === 'hooks') {
        // Process hook JSON files
        const content = fs.readFileSync(filePath, 'utf-8');
        metadata = extractHookMetadata(content);
      }
      
      if (metadata) {
        templates.push(metadata);
      }
    }
  }
  
  return templates.sort((a, b) => a.name.localeCompare(b.name));
}

// Main function
function generateMetadata() {
  console.log('Generating metadata from templates...');
  
  const metadata = {
    version: "1.0.0",
    generated: new Date().toISOString(),
    templates: {
      modes: processTemplateDirectory(path.join(TEMPLATES_DIR, 'modes'), 'modes'),
      workflows: processTemplateDirectory(path.join(TEMPLATES_DIR, 'workflows'), 'workflows'),
      agents: processTemplateDirectory(path.join(TEMPLATES_DIR, 'agents'), 'agents'),
      hooks: processTemplateDirectory(path.join(TEMPLATES_DIR, 'hooks'), 'hooks')
    }
  };
  
  // Add special templates (like claude_router) if they exist
  const claudeRouterPath = path.join(TEMPLATES_DIR, 'claude_router_template.md');
  if (fs.existsSync(claudeRouterPath)) {
    metadata.templates.claude_router = {
      name: "claude_router_template",
      description: "Minimal router for Claude Code, managing on-demand instruction loading",
      tags: ["router", "claude", "core"],
      dependencies: []
    };
  }
  
  // Write the metadata file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(metadata, null, 2) + '\n');
  
  // Summary
  const counts = {
    modes: metadata.templates.modes.length,
    workflows: metadata.templates.workflows.length,
    agents: metadata.templates.agents.length,
    hooks: metadata.templates.hooks.length
  };
  
  console.log(`Generated metadata.json with:`);
  console.log(`  - ${counts.modes} modes`);
  console.log(`  - ${counts.workflows} workflows`);
  console.log(`  - ${counts.agents} agents`);
  console.log(`  - ${counts.hooks} hooks`);
  console.log(`Output: ${OUTPUT_FILE}`);
}

// Run if called directly
if (require.main === module) {
  generateMetadata();
}

module.exports = { generateMetadata };