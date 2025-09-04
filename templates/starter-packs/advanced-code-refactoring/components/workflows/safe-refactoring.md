---
name: safe-refactoring
description: Step-by-step procedure for performing safe, AST-aware code refactoring with proper validation
author: memento-protocol
version: 1.0.0
tags: [refactoring, ast-grep, safety, validation, testing]
---

# Safe Refactoring Workflow

This workflow provides a systematic, safety-first approach to code refactoring using AST-based tools. It emphasizes validation at every step to ensure functionality is preserved while improving code quality.

## Core Safety Principles

### 🛡️ Safety First
- Always work on version-controlled code with clean working tree
- Make incremental changes rather than large batch operations
- Validate after each significant transformation
- Maintain rollback capability throughout the process

### 🎯 Semantic Awareness
- Use AST-based tools for structural changes
- Preserve code semantics and behavior
- Understand the impact of each transformation
- Consider type safety and compile-time validation

### 🔍 Continuous Validation
- Run tests after each major change
- Perform type checking and linting
- Validate in development/staging environments
- Monitor for performance regressions

## Workflow Steps

### Step 1: Pre-Refactoring Preparation

#### Environment Validation
```bash
# Ensure clean git state
git status --porcelain | wc -l  # Should be 0
git diff --staged --quiet && echo "No staged changes" || echo "WARNING: Staged changes exist"

# Verify test suite passes
npm test  # or appropriate test command
npm run typecheck  # or tsc --noEmit

# Check tool availability
command -v ast-grep >/dev/null && echo "✅ ast-grep available" || echo "⚠️  ast-grep not found"
command -v rg >/dev/null && echo "✅ ripgrep available" || echo "⚠️  ripgrep not found"
```

#### Scope Definition
```markdown
**Define refactoring scope clearly:**
- Which files/directories will be affected?
- What specific patterns are being transformed?
- What is the expected outcome?
- Are there any off-limits areas or dependencies?

**Risk Assessment:**
- High Risk: Core business logic, shared utilities, public APIs
- Medium Risk: Component internals, helper functions, configuration
- Low Risk: Styling, documentation, test files, development tooling
```

#### Backup Strategy
```bash
# Create feature branch for refactoring
git checkout -b refactor/[description]

# Tag current state for easy rollback
git tag pre-refactor-$(date +%Y%m%d-%H%M%S)

# Document current state
git log --oneline -5 > refactoring-context.txt
```

### Step 2: Analysis and Planning

#### Pattern Identification
```bash
# Use semantic-search workflow to identify target patterns
# Example: Find functions without return types
ast-grep --pattern 'function $NAME($ARGS) { $$$ }' --lang typescript --include 'src/**' > functions-to-refactor.txt

# Count occurrences for scope validation
wc -l functions-to-refactor.txt

# Analyze pattern variations
ast-grep --pattern 'function $NAME($ARGS) { $$$ }' --lang typescript -A 1 -B 1 | head -20
```

#### Impact Analysis
```bash
# Find dependencies on patterns being changed
# Example: For function renaming, find all call sites
ast-grep --pattern '$NAME($ARGS)' --lang typescript --include 'src/**' | grep "targetFunction"

# Check for external API usage
rg "import.*targetFunction" src/
rg "export.*targetFunction" src/

# Analyze test coverage for affected code
rg "describe\|it\|test" src/ -A 2 -B 2 | grep "targetFunction"
```

#### Transformation Planning
```markdown
**Create transformation plan:**
1. **Phase 1**: Low-risk files (tests, utilities)
2. **Phase 2**: Medium-risk files (components, features)  
3. **Phase 3**: High-risk files (core logic, APIs)

**For each phase:**
- List specific files to be changed
- Define ast-grep patterns for transformation
- Identify validation steps required
- Plan rollback procedures if needed
```

### Step 3: Incremental Transformation

#### Phase-by-Phase Execution
```bash
# Start with safest changes first
# Example: Add return types to utility functions

# Phase 1: Utility functions (low risk)
ast-grep --pattern 'function $NAME($ARGS) { $$$ }' --rewrite 'function $NAME($ARGS): void { $$$ }' --lang typescript --include 'src/utils/**'

# Validate Phase 1
npm run typecheck
npm test -- --testPathPattern=utils

# Commit Phase 1
git add src/utils/
git commit -m "refactor: Add return types to utility functions"
```

#### Validation After Each Phase
```bash
# Comprehensive validation checklist
echo "🔍 Running validation suite..."

# 1. Syntax validation
npm run typecheck && echo "✅ Types valid" || echo "❌ Type errors"

# 2. Test validation  
npm test && echo "✅ Tests pass" || echo "❌ Test failures"

# 3. Linting validation
npm run lint && echo "✅ Linting clean" || echo "❌ Lint errors"

# 4. Build validation
npm run build && echo "✅ Build successful" || echo "❌ Build failed"

# 5. Performance check (if applicable)
npm run benchmark && echo "✅ Performance maintained" || echo "⚠️  Performance impact"
```

#### Error Recovery Procedures
```bash
# If validation fails, rollback current phase
git reset --hard HEAD~1  # Rollback last commit
git clean -fd            # Clean untracked files

# Or rollback to specific tag
git reset --hard pre-refactor-[timestamp]

# Analyze what went wrong
git diff HEAD~1 > failed-changes.patch
# Review and fix issues before retrying
```

### Step 4: Complex Transformations

#### Using AST-Grep for Structural Changes
```bash
# Example: Convert class components to functional components
# Step 1: Identify class components
ast-grep --pattern 'class $NAME extends React.Component { $$$ }' --lang tsx > class-components.txt

# Step 2: Manual analysis (some transformations need human review)
# - State usage patterns
# - Lifecycle method dependencies  
# - Complex logic that may need refactoring

# Step 3: Simple cases first (stateless components)
ast-grep --pattern 'class $NAME extends React.Component {
  render() {
    return $JSX;
  }
}' --rewrite 'function $NAME() {
  return $JSX;
}' --lang tsx
```

#### Multi-Step Transformations
```bash
# Example: Modernize React patterns
# Step 1: Convert PropTypes to TypeScript interfaces
ast-grep --pattern '$COMPONENT.propTypes = {
  $PROPS
}' --lang tsx > proptypes-usage.txt

# Step 2: Extract prop definitions
# (Complex transformation requiring code-archaeologist agent)

# Step 3: Apply interface definitions
# (Manual step with validation)

# Step 4: Remove PropTypes import/usage
ast-grep --pattern 'import PropTypes from "prop-types"' --rewrite '' --lang tsx
```

### Step 5: Final Validation and Cleanup

#### Comprehensive Testing
```bash
# Full test suite
npm test -- --coverage --verbose

# Integration testing
npm run test:integration

# End-to-end testing
npm run test:e2e

# Manual smoke testing
npm start  # Verify app starts correctly
# Test key user flows manually
```

#### Code Quality Validation
```bash
# Static analysis
npm run lint -- --fix  # Fix auto-fixable issues
npm run typecheck       # Ensure type safety

# Dependency analysis
npm audit               # Security vulnerabilities
npm outdated           # Dependency updates needed

# Bundle analysis (if applicable)
npm run analyze        # Check bundle size impact
```

#### Documentation Updates
```markdown
**Update documentation for:**
- API changes (if public interfaces changed)
- Development guides (if patterns changed)
- Migration guides (for other developers)
- Changelog entries (for version tracking)

**Example documentation:**
- Before: `function processData(data) { ... }`
- After: `function processData(data: InputData): ProcessedData { ... }`
- Impact: All callers now get type safety and IDE support
```

### Step 6: Review and Merge

#### Pre-Merge Checklist
```markdown
- [ ] All tests pass consistently
- [ ] No type errors or linting issues
- [ ] Performance benchmarks acceptable
- [ ] Documentation updated appropriately
- [ ] Breaking changes documented
- [ ] Migration guide provided (if needed)
- [ ] Code review completed
```

#### Merge Strategy
```bash
# Prepare for merge
git rebase main  # Ensure linear history
git push origin refactor/[description]

# Create pull request with comprehensive description
# Include:
# - What was refactored and why
# - Validation steps performed
# - Potential risks and mitigations
# - Before/after examples
```

## Common Refactoring Patterns

### Variable/Function Renaming
```bash
# Find all usages first
ast-grep --pattern '$OLD_NAME' --lang typescript

# Rename with validation
ast-grep --pattern '$OLD_NAME' --rewrite '$NEW_NAME' --lang typescript --include 'src/**'

# Validate no broken references
npm run typecheck
```

### API Migration
```bash
# Find old API usage
ast-grep --pattern '$OBJ.oldMethod($ARGS)' --lang typescript

# Replace with new API
ast-grep --pattern '$OBJ.oldMethod($ARGS)' --rewrite '$OBJ.newMethod($ARGS)' --lang typescript

# Handle parameter changes
ast-grep --pattern '$OBJ.oldMethod($ARG1, $ARG2)' --rewrite '$OBJ.newMethod({arg1: $ARG1, arg2: $ARG2})' --lang typescript
```

### Import Path Updates
```bash
# Update import paths after file moves
ast-grep --pattern 'import { $ITEMS } from "./old/path"' --rewrite 'import { $ITEMS } from "./new/path"' --lang typescript

# Batch update multiple paths
for old_path in $(cat old-paths.txt); do
  new_path=$(echo $old_path | sed 's/old/new/g')
  ast-grep --pattern "import { \$ITEMS } from \"$old_path\"" --rewrite "import { \$ITEMS } from \"$new_path\"" --lang typescript
done
```

## Emergency Procedures

### Rollback During Refactoring
```bash
# Quick rollback to last stable state
git reset --hard $(git tag -l "pre-refactor-*" | tail -1)

# Partial rollback of specific files
git checkout HEAD~1 -- src/problematic-file.ts

# Create hotfix branch from main
git checkout main
git checkout -b hotfix/urgent-fix
```

### Production Issues After Merge
```bash
# Immediate revert of merge commit
git revert -m 1 [merge-commit-hash]

# Cherry-pick specific fixes
git cherry-pick [fix-commit-hash]

# Deploy rollback
# Follow your deployment rollback procedures
```

## Tool Integration

### With Code-Archaeologist Agent
```bash
# Delegate complex analysis to specialized agent
# Use for: dependency analysis, pattern recognition, impact assessment
```

### With Semantic-Search Workflow
```bash
# Use semantic search to prepare refactoring scope
# Find patterns, analyze variations, plan transformations
```

### With Testing Frameworks
```bash
# Integrate validation into CI/CD pipelines
# Ensure refactoring doesn't break deployment processes
```

This workflow emphasizes that refactoring should be systematic, safe, and validatable. The key is to make small, incremental changes while maintaining functionality and improving code quality progressively.