---
name: semantic-search
description: Systematic approach to finding code patterns using AST-based structural search
author: memento-protocol
version: 1.0.0
tags: [ast-grep, search, patterns, semantic-analysis]
---

# Semantic Code Search Workflow

This workflow provides a systematic approach to finding code patterns using Abstract Syntax Tree (AST) analysis rather than simple text matching. It's designed to help developers locate code structures, analyze patterns, and identify refactoring opportunities.

## When to Use This Workflow

### ✅ Perfect For
- Finding all functions, classes, or interfaces matching a pattern
- Locating specific API usage across a codebase
- Identifying code smells or architectural violations
- Preparing for refactoring by mapping code structure
- Analyzing dependency patterns and relationships
- Finding inconsistent code patterns that need standardization

### ⚠️ Use With Caution For
- Simple string searches (use grep instead)
- Searching non-code files (logs, documentation)
- Very large codebases without performance considerations
- Languages not well-supported by ast-grep

## Workflow Steps

### Step 1: Define Search Intent
```markdown
**Before starting, clarify:**
- What specific code structure are you looking for?
- What language(s) are you analyzing?
- What's the purpose of this search? (refactoring, analysis, documentation)
- How precise does the search need to be?

**Example intents:**
- "Find all React components that use deprecated props"
- "Locate functions that don't have return type annotations"
- "Identify API endpoints that lack error handling"
```

### Step 2: Choose Search Strategy

#### AST-Grep for Structural Patterns
**Use when searching for:**
- Function signatures: `function $NAME($ARGS) { $$$ }`
- Class definitions: `class $NAME extends $BASE { $$$ }`
- Import statements: `import { $ITEMS } from "$MODULE"`
- React components: `function $NAME($PROPS) { return $$$ }`
- Method calls: `$OBJ.$METHOD($ARGS)`

#### Ripgrep for Content Patterns
**Use when searching for:**
- String literals containing specific text
- Comments with TODO/FIXME markers
- Configuration values or constants
- Log messages and error strings

#### Combination Approach
**Use both tools when:**
- Initial ast-grep finds structures, ripgrep filters by content
- Need to validate structural matches with semantic context
- Searching across multiple file types (code + config)

### Step 3: Construct Search Patterns

#### Basic AST-Grep Pattern Syntax
```bash
# Variables: $NAME captures identifiers
ast-grep --pattern 'function $NAME() { $$$ }'

# Multiple statements: $$$ captures any statements
ast-grep --pattern 'if ($CONDITION) { $$$ }'

# Optional parts: Use multiple patterns for variations
ast-grep --pattern 'export function $NAME($ARGS) { $$$ }'
ast-grep --pattern 'function $NAME($ARGS) { $$$ }'

# Specific content: Mix variables with literals
ast-grep --pattern 'import { $ITEMS } from "react"'
```

#### Language-Specific Patterns

**TypeScript/JavaScript:**
```bash
# Functions with return types
ast-grep --pattern 'function $NAME($ARGS): $TYPE { $$$ }' --lang typescript

# React hooks usage
ast-grep --pattern 'const [$STATE, $SETTER] = useState($INITIAL)' --lang tsx

# Async functions
ast-grep --pattern 'async function $NAME($ARGS) { $$$ }' --lang javascript
```

**Python:**
```bash
# Class methods
ast-grep --pattern 'def $NAME(self, $ARGS): $$$' --lang python

# Decorators
ast-grep --pattern '@$DECORATOR\ndef $NAME($ARGS): $$$' --lang python

# Import patterns
ast-grep --pattern 'from $MODULE import $ITEMS' --lang python
```

### Step 4: Execute and Refine Search

#### Initial Search Execution
```bash
# Start broad, then narrow down
ast-grep --pattern 'function $NAME($ARGS) { $$$ }' --lang typescript

# Add context for better understanding
ast-grep --pattern 'function $NAME($ARGS) { $$$ }' --lang typescript -A 2 -B 1

# Limit scope to specific directories
ast-grep --pattern 'class $NAME { $$$ }' --lang typescript --include 'src/**'
```

#### Refinement Techniques
```bash
# Combine with file filtering
ast-grep --pattern 'interface $NAME { $$$ }' --lang typescript --include '*.types.ts'

# Exclude certain patterns
ast-grep --pattern 'function $NAME($ARGS) { $$$ }' --lang typescript --exclude '**/node_modules/**'

# Use JSON output for further processing
ast-grep --pattern 'import { $ITEMS } from "$MODULE"' --lang typescript --json | jq '.'
```

### Step 5: Analyze Results

#### Result Classification
```markdown
**Categorize findings by:**
- Frequency: How often does this pattern appear?
- Complexity: How complex are the matching code structures?
- Consistency: Are the patterns used consistently?
- Risk Level: Do any patterns indicate potential issues?

**Create summary reports:**
- Total occurrences found
- File distribution (which files have most matches)
- Pattern variations discovered
- Potential refactoring opportunities identified
```

#### Pattern Analysis Examples
```bash
# Count occurrences per file
ast-grep --pattern 'function $NAME($ARGS) { $$$ }' --lang typescript | cut -d: -f1 | sort | uniq -c

# Find files with most matches
ast-grep --pattern 'import { $ITEMS } from "$MODULE"' --lang typescript --count

# Analyze pattern variations
ast-grep --pattern 'useState($INITIAL)' --lang tsx -A 1 -B 1 | grep -E '(useState|const)'
```

### Step 6: Document Findings

#### Create Search Documentation
```markdown
**Search Report Template:**
- **Intent**: Why this search was performed
- **Pattern Used**: Exact ast-grep patterns and commands
- **Scope**: Files/directories searched
- **Results**: Summary of findings with counts
- **Analysis**: Key insights and patterns discovered
- **Next Steps**: Recommended actions based on findings
- **Reproducibility**: Commands to reproduce the search
```

#### Examples of Good Documentation
```markdown
**Search: Find React components without TypeScript props**
- Pattern: `function $NAME($PROPS) { return $$$ }` (no type annotation)
- Command: `ast-grep --pattern 'function $NAME($PROPS) { return $$$ }' --lang tsx --exclude '*.d.ts'`
- Results: 23 components in 12 files need type annotations
- Action: Create TypeScript interfaces for prop types

**Search: Locate deprecated API usage**
- Pattern: `$OBJ.oldMethod($ARGS)`
- Command: `ast-grep --pattern '$OBJ.oldMethod($ARGS)' --lang typescript`
- Results: 15 occurrences across 8 files
- Action: Replace with `newMethod` calls using refactoring workflow
```

## Advanced Techniques

### Combining Multiple Patterns
```bash
# Search for functions AND their calls
ast-grep --pattern 'function $NAME($ARGS) { $$$ }' --lang typescript > functions.txt
ast-grep --pattern '$NAME($CALL_ARGS)' --lang typescript > calls.txt

# Use pattern files for complex searches
echo 'function $NAME($ARGS) { $$$ }' > pattern.sg
ast-grep --pattern-file pattern.sg --lang typescript
```

### Integration with Other Tools
```bash
# Pipe to ripgrep for content filtering
ast-grep --pattern 'function $NAME($ARGS) { $$$ }' --lang typescript | rg "async|await"

# Use with jq for JSON processing
ast-grep --pattern 'import { $ITEMS } from "$MODULE"' --lang typescript --json | jq '.[] | select(.file | contains("components"))'

# Combine with git for analyzing changes
git diff --name-only | xargs ast-grep --pattern 'function $NAME($ARGS) { $$$ }' --lang typescript
```

### Performance Optimization
```bash
# Use parallel processing for large codebases
find src -name "*.ts" | parallel ast-grep --pattern 'function $NAME($ARGS) { $$$ }' --lang typescript {}

# Cache results for repeated analysis
ast-grep --pattern 'class $NAME { $$$ }' --lang typescript > class-analysis.txt

# Focus searches with smart file filtering
ast-grep --pattern 'interface $NAME { $$$ }' --lang typescript --include '**/*.types.ts' --include '**/*.interface.ts'
```

## Common Pitfalls and Solutions

### Pattern Too Broad
**Problem**: `ast-grep --pattern '$ANY'` matches everything
**Solution**: Add specific context: `ast-grep --pattern 'function $NAME() { $$$ }'`

### Missing Language Context
**Problem**: Patterns don't match expected structures
**Solution**: Specify language explicitly: `--lang typescript`

### Performance Issues
**Problem**: Search takes too long on large codebases
**Solution**: Use file filtering: `--include` and `--exclude` options

### Pattern Complexity
**Problem**: Trying to capture too much in one pattern
**Solution**: Break into multiple simpler patterns, then combine results

## Integration with Refactoring Workflows

This semantic search workflow feeds directly into:
- **safe-refactoring workflow**: Use search results to plan transformation steps
- **code-archaeologist agent**: Delegate complex analysis to specialized agent
- **refactoring-specialist mode**: Apply findings to systematic code improvement

The output from this workflow should include concrete next steps and recommendations for acting on the discovered patterns.