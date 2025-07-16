# NPX Setup Bug - RESOLVED

## Issue
Currently trying to set up using npx fails with the following error:
```
✖ Failed to initialize Memento Protocol:
  Router template not found. Expected templates/claude_router_template.md to exist.
```

## Root Cause
The `claudeMdGenerator.ts` was looking for the template file relative to the user's project directory instead of the installed package directory. When running via `npx`, the template needs to be found in the npm package installation location.

## Solution
Fixed the `loadTemplate()` method in `src/lib/claudeMdGenerator.ts:195-211` to resolve the template path relative to the package installation directory using `__dirname`.

### Code Change
```typescript
// Before: Looking in user's project directory
const templatePath = path.join(
  path.dirname(this.claudeMdPath),
  "templates",
  "claude_router_template.md"
);

// After: Looking in package installation directory
const packageRoot = path.resolve(__dirname, "..", "..");
const templatePath = path.join(
  packageRoot,
  "templates",
  "claude_router_template.md"
);
```

## Status
- ✅ Issue identified
- ✅ Fix implemented
- ✅ Package built successfully
- ⏳ Awaiting npm publish for users to get the fix

## Original Error Log
```
➜  sonic-solidity-contracts git:(dz/claude-audit) ✗ npx memento-protocol init
Need to install the following packages:
memento-protocol@0.2.0
Ok to proceed? (y) y

ℹ Initializing Memento Protocol...
ℹ Detecting project type...
ℹ Existing CLAUDE.md detected - will preserve project-specific content
ℹ Project type: typescript

ℹ 🚀 Welcome to Memento Protocol Interactive Setup!

? Detected project type: typescript. Is this correct? Yes
? Select modes (behavioral patterns) to install: autonomous-project-manager - Agentic project management with autonomous delegation to sub-agents, ai-debt-maintainer - Identify and clean up AI-generated code smells and technical debt, architect - System design, technical decisions, and 
architectural patterns, engineer - Implementation, coding, and debugging, reviewer - Code review, quality assurance, and feedback
? Select workflows (procedures) to install: summarize - Summarize code, directories, or concepts to compress context, review - Comprehensive code review and quality assessment
? Select the default mode to activate: autonomous-project-manager
? Add .memento/ to .gitignore? No

ℹ 📋 Setup Summary:

ℹ Project Type: typescript

ℹ Modes: autonomous-project-manager, ai-debt-maintainer, architect, engineer, reviewer
ℹ Workflows: summarize, review
ℹ Default Mode: autonomous-project-manager
ℹ Add to .gitignore: No

? Proceed with this configuration? Yes

ℹ Installing selected components...
✓ Installed mode 'autonomous-project-manager'
✓ Installed mode 'ai-debt-maintainer'
✓ Installed mode 'architect'
✓ Installed mode 'engineer'
✓ Installed mode 'reviewer'
✓ Installed workflow 'summarize'
✓ Installed workflow 'review'
✓ Configuration saved to /Users/dazheng/workspace/dtrinity/sonic-solidity-contracts/.memento/config.json

ℹ Generating CLAUDE.md router...
✖ Failed to initialize Memento Protocol:
  Router template not found. Expected templates/claude_router_template.md to exist.
```