# /semantic - Semantic Code Analysis

Perform semantic code search and analysis using the semantic-search workflow.

## Usage
- `/semantic [query]` - Execute semantic search workflow for specific query
- `/semantic find-unused-imports` - Find unused import statements
- `/semantic analyze-dependencies` - Analyze code dependencies
- `/semantic find-code-smells` - Identify code smell patterns

## Description

This command executes the semantic-search workflow which provides systematic AST-based code analysis. It goes beyond simple text search to understand code structure, relationships, and patterns.

## Analysis Types

### Unused Code Detection
```
/semantic find-unused-imports
/semantic find-unused-functions
/semantic find-dead-code
```

### Dependency Analysis
```
/semantic analyze-dependencies
/semantic find-circular-deps
/semantic map-api-usage
```

### Pattern Analysis
```
/semantic find-code-smells
/semantic analyze-complexity
/semantic find-violations
```

### Architecture Analysis
```
/semantic map-components
/semantic analyze-coupling
/semantic find-hotspots
```

The workflow provides structured analysis reports with actionable insights for code improvement and refactoring opportunities.