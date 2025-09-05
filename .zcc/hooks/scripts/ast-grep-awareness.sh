#!/usr/bin/env bash
# AST-Grep awareness hook for zcc
# Provides context about ast-grep capabilities and installation status

# Check if ast-grep is available
ast_grep_available=false
installation_method=""

# Check global installation first
if command -v ast-grep >/dev/null 2>&1; then
    ast_grep_available=true
    installation_method="global"
elif npx --no-install ast-grep --version >/dev/null 2>&1; then
    ast_grep_available=true
    installation_method="npx"
elif [ -f "node_modules/.bin/ast-grep" ]; then
    ast_grep_available=true
    installation_method="local"
fi

# Only output if not available or if we detect code-related patterns in the user input
user_input="$1"
show_context=false

# Check if user is asking about code search, refactoring, or AST operations
if echo "$user_input" | grep -qi -E "(search|find|grep|refactor|transform|ast|syntax|semantic|pattern|replace)" >/dev/null 2>&1; then
    show_context=true
fi

# Also show if ast-grep is available but user might not know about it
if [ "$ast_grep_available" = "true" ] && echo "$user_input" | grep -qi -E "(find.*function|search.*class|replace.*import|refactor)" >/dev/null 2>&1; then
    show_context=true
fi

if [ "$show_context" = "true" ]; then
    echo "## AST-Grep Tool Status"
    
    if [ "$ast_grep_available" = "true" ]; then
        echo "✅ **ast-grep available** ($installation_method)"
        echo ""
        echo "**When to use ast-grep over grep:**"
        echo "- Structural code search (find functions, classes, interfaces)"
        echo "- Semantic refactoring (rename variables, update patterns)"
        echo "- Multi-language AST operations (TypeScript, JavaScript, Python, Rust, Go)"
        echo "- Pattern-based transformations that preserve code structure"
        echo ""
        echo "**Examples:**"
        echo "- \`ast-grep --pattern 'function $NAME($ARGS) { $$$ }' --lang typescript\` - Find functions"
        echo "- \`ast-grep --pattern 'import { $ITEMS } from \"$MODULE\"' --rewrite 'import { $ITEMS } from \"./src/$MODULE\"'\` - Fix imports"
        echo "- \`ast-grep --pattern 'interface $NAME { $$$ }' --lang typescript\` - Find interfaces"
    else
        echo "⚠️  **ast-grep not available**"
        echo ""
        echo "**To install ast-grep:**"
        echo "- Global: \`npm install -g @ast-grep/cli\`"
        echo "- Project: \`npm install --save-dev @ast-grep/cli\`"
        echo "- Or use: \`npx @ast-grep/cli\`"
        echo ""
        echo "**Benefits over grep:**"
        echo "- 10x-100x faster for structural code search"
        echo "- Understands syntax (no broken regex matches)"
        echo "- Multi-language AST operations"
        echo "- Semantic-aware refactoring"
    fi
    echo ""
fi

# Exit successfully
exit 0