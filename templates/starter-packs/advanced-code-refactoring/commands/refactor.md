# /refactor - Safe Refactoring Workflow

Execute safe, systematic refactoring using the safe-refactoring workflow.

## Usage
- `/refactor [type]` - Execute specific refactoring workflow
- `/refactor variable-rename` - Safe variable renaming procedure
- `/refactor function-extract` - Extract function refactoring
- `/refactor import-cleanup` - Clean up import statements

## Description

This command executes the safe-refactoring workflow which provides systematic, AST-aware refactoring with proper validation and safety checks. The workflow emphasizes incremental changes with continuous testing.

## Refactoring Types

### Variable/Function Renaming
```
/refactor variable-rename
```
- Uses AST-based search to find all references
- Validates scope and usage patterns
- Applies transformations with safety checks

### Code Extraction
```
/refactor function-extract
```
- Identifies code suitable for extraction
- Analyzes dependencies and side effects
- Creates new functions with proper signatures

### Import Organization
```
/refactor import-cleanup
```
- Finds and removes unused imports
- Organizes import statements
- Updates import paths after file moves

### API Migration
```
/refactor api-migration
```
- Updates deprecated API usage
- Handles parameter changes
- Validates breaking changes

The workflow includes backup procedures, testing validation, and rollback strategies to ensure safe transformations.