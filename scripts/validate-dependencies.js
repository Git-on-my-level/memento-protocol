#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Pre-build validation script to check for command dependencies
 * This prevents regressions where custom commands are generated but scripts don't exist
 */

const projectRoot = process.cwd();

// Define required dependencies for each command
const dependencies = {
  'ticket': [
    '.zcc/scripts/ticket-context.sh'
  ],
  'mode': [
    '.zcc/scripts/mode-switch.sh'
  ],
  'zcc': [
    // The zcc command doesn't depend on scripts, just CLI availability
  ]
};

function checkFileExists(filePath) {
  const fullPath = path.join(projectRoot, filePath);
  return fs.existsSync(fullPath);
}

function validateCommands() {
  const errors = [];
  const warnings = [];

  // Check if .zcc directory exists
  if (!checkFileExists('.zcc')) {
    warnings.push('⚠️  .zcc directory not found - this is expected in fresh checkouts');
    warnings.push('   Run "zcc init" to initialize the project structure');
    return { errors, warnings };
  }

  // Check command dependencies
  for (const [command, requiredFiles] of Object.entries(dependencies)) {
    for (const file of requiredFiles) {
      if (!checkFileExists(file)) {
        errors.push(`❌ Missing dependency for /${command} command: ${file}`);
      }
    }
  }

  // Check if Claude Code commands directory exists
  if (checkFileExists('.claude/commands')) {
    const commandFiles = ['ticket.md', 'mode.md', 'zcc.md'];
    for (const file of commandFiles) {
      if (checkFileExists(`.claude/commands/${file}`)) {
        // Validate allowed-tools patterns in command files
        const filePath = path.join(projectRoot, '.claude/commands', file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          
          // Check for old pattern with colon prefix
          if (content.includes('sh:.zcc/scripts/')) {
            errors.push(`❌ Invalid allowed-tools pattern in .claude/commands/${file}`);
            errors.push(`   Found: sh:.zcc/scripts/... (incorrect)`);
            errors.push(`   Should be: sh .zcc/scripts/... (without colon)`);
          }
        } catch (err) {
          warnings.push(`⚠️  Could not validate .claude/commands/${file}: ${err.message}`);
        }
      }
    }
  }

  return { errors, warnings };
}

function main() {
  console.log('🔍 Validating zcc dependencies...\n');

  const { errors, warnings } = validateCommands();

  // Print warnings
  if (warnings.length > 0) {
    warnings.forEach(warning => console.log(warning));
    console.log('');
  }

  // Print errors
  if (errors.length > 0) {
    console.error('❌ Validation failed!\n');
    errors.forEach(error => console.error(error));
    console.error('\n💡 To fix these issues:');
    console.error('   1. Run "zcc init --force" to regenerate missing files');
    console.error('   2. Or manually create the missing scripts from templates/scripts/');
    process.exit(1);
  }

  console.log('✅ All dependencies validated successfully!');
  console.log('   Custom commands should work properly with Claude Code.');
}

if (require.main === module) {
  main();
}

module.exports = { validateCommands };