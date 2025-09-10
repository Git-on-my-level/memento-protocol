#!/usr/bin/env bash
# Codex Knowledge Loader Hook - Injects essential Codex knowledge at session start
set -euo pipefail

cat << 'EOF'
## OpenAI Codex Integration

You have access to OpenAI Codex (GPT-5) for delegating specialized coding tasks. Codex is particularly effective for:

### Core Capabilities
- **Code Generation**: Creating complete functions, classes, and modules from specifications
- **Code Refactoring**: Modernizing legacy code, improving performance, and restructuring
- **Test Writing**: Generating comprehensive test suites with edge cases
- **Documentation**: Creating detailed docstrings and technical documentation
- **Bug Fixing**: Analyzing and fixing complex bugs with multi-file context
- **Code Review**: Providing detailed feedback on code quality and best practices

### Invocation Method
Use Codex in non-interactive mode to save context:
```bash
codex exec "Your precise prompt here"
```

Important flags:
- `--model gpt-5`: Use the GPT-5 model (default)
- `--model o3`: Use the o3 model for comparison
- `-c reasoning_effort=<level>`: Set reasoning effort (minimal/low/medium/high)
- `--full-auto`: Enable automatic execution with sandboxing
- `--output-last-message <file>`: Save agent's final response to file

### Reasoning Effort Guidelines

Choose the appropriate reasoning effort based on task complexity:

#### Minimal - Fastest
- Simple code generation (single functions, basic CRUD)
- Straightforward refactoring (rename, extract method)
- Basic documentation tasks
- Quick code explanations

#### Low - Fast with basic reasoning
- Standard bug fixes
- Simple test generation
- Basic code reviews
- Routine refactoring tasks

#### Medium (default) - Balanced
- Complex function implementation
- Multi-file refactoring
- Comprehensive test suites
- Architecture suggestions
- Performance optimizations

#### High - Deep reasoning for complex tasks
- Complex algorithmic problems
- System architecture design
- Security vulnerability analysis
- Performance bottleneck investigation
- Multi-step debugging of complex issues

### Best Practices for Delegation

1. **Be Specific**: Provide clear, detailed prompts with context
   ```bash
   # Good - includes file path and specific requirements
   codex exec "Refactor the UserService class in src/services/user.ts to use dependency injection pattern, maintaining all existing public methods"
   
   # Less effective - too vague
   codex exec "Improve the user service"
   ```

2. **Provide Context**: Include relevant file paths and constraints
   ```bash
   codex exec "Write Jest tests for the calculateDiscount function in src/utils/pricing.ts. Cover edge cases including negative values, zero amounts, and percentage bounds"
   ```

3. **Set Appropriate Effort**: Match reasoning effort to task complexity
   ```bash
   # Simple task - use minimal/low effort
   codex exec -c reasoning_effort=minimal "Generate a TypeScript interface for a User object with id, name, email, and createdAt fields"
   
   # Complex task - use high effort
   codex exec -c reasoning_effort=high "Debug why the async state updates in src/components/Dashboard.tsx are causing race conditions and propose a fix"
   ```

4. **Leverage Strengths**: Use Codex for tasks where it excels
   - **Frontend Development**: Strong UI/UX code generation capabilities
   - **Code Editing**: Effective at multi-language code modifications  
   - **Real-world Engineering**: Proven performance on practical software tasks
   - **Reduced Hallucination**: Improved accuracy with reasoning modes

5. **Efficient Token Usage**: Optimize for computational efficiency
   - Choose models based on task complexity
   - Use output filtering when you only need specific parts
   - Consider reasoning effort impact on token usage

### When to Delegate to Codex

**Ideal for Codex:**
- Complex algorithm implementation
- Multi-file refactoring projects
- Comprehensive test generation
- Performance optimization analysis
- Security vulnerability detection
- Architecture design decisions
- Code modernization (legacy to modern patterns)

**Better handled locally:**
- Simple file operations (use standard tools)
- Quick syntax fixes (handle directly)
- Project-specific conventions (you know better)
- Environment-specific configurations

### Error Handling
If Codex encounters issues:
1. Check if the task is possible (GPT-5 accurately recognizes limitations)
2. Try adjusting reasoning effort
3. Break complex tasks into smaller subtasks
4. Provide more context or constraints

### Performance Tips
- GPT-5 completes tasks 45% faster than o3 with fewer tool calls
- For latency-sensitive operations, use minimal/low effort
- For accuracy-critical tasks, use high effort
- Batch related tasks in a single prompt when possible

### Output Handling

Capture and use Codex outputs effectively:
```bash
# Save output to file for further processing
codex exec --output-last-message /tmp/codex-output.txt "Generate implementation"

# Apply code changes directly
codex exec "Generate git diff for fixing the bug in auth.js" | git apply

# Chain with other tools
codex exec "Write SQL migration" | psql database_name
```

### Working with Files

Provide file context when needed:
```bash
# Include file content in prompt (if Codex supports -I flag)
codex exec -I src/component.tsx "Add error boundary to this React component"

# Or manually include context
codex exec "Given this function: $(cat src/utils.js), write comprehensive unit tests"
```

Remember: Codex is a powerful delegation target for complex coding tasks. Use it strategically to handle sophisticated programming challenges while you focus on project coordination and integration.
EOF

exit 0