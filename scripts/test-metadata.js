#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the global metadata file
const metadataPath = path.join(__dirname, '..', 'templates', 'metadata.json');
const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

console.log('=== Memento Protocol Metadata ===');
console.log(`Version: ${metadata.version}`);
console.log('');

// Display CLAUDE router metadata
console.log('=== CLAUDE Router Template ===');
const claudeRouter = metadata.templates.claude_router;
console.log(`Name: ${claudeRouter.name}`);
console.log(`Description: ${claudeRouter.description}`);
console.log(`Tags: ${claudeRouter.tags.join(', ')}`);
console.log(`Dependencies: ${claudeRouter.dependencies.length ? claudeRouter.dependencies.join(', ') : 'None'}`);
console.log('');

// Display modes summary
console.log('=== Available Modes ===');
metadata.templates.modes.forEach(mode => {
  console.log(`- ${mode.name}: ${mode.description}`);
});
console.log('');

// Display workflows summary
console.log('=== Available Workflows ===');
metadata.templates.workflows.forEach(workflow => {
  console.log(`- ${workflow.name}: ${workflow.description}`);
  if (workflow.dependencies.length > 0) {
    console.log(`  Dependencies: ${workflow.dependencies.join(', ')}`);
  }
});