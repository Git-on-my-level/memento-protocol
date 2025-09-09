# /ast - AST-Based Code Search

Perform structural code search using AST patterns with the code-archaeologist agent.

## Usage
- `/ast [pattern]` - Search for AST pattern in codebase
- `/ast function $NAME($ARGS) { $$$ }` - Find all functions
- `/ast import { $ITEMS } from "$MODULE"` - Find import statements

## Description

This command uses the specialized code-archaeologist agent to perform AST-based structural code search using ast-grep. Unlike text-based search, this understands code syntax and structure.

## Examples

### Find Functions
```
/ast function $NAME($ARGS) { $$$ }
```

### Find React Components
```
/ast function $NAME($PROPS) { return $$$ }
```

### Find Import Statements
```
/ast import { $ITEMS } from "$MODULE"
```

### Find Class Methods
```
/ast $MODIFIER $NAME($ARGS) { $$$ }
```

The command will delegate to the code-archaeologist agent which has extensive knowledge of ast-grep patterns and best practices for semantic code analysis.