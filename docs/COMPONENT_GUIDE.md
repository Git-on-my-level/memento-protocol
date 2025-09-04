# Component Creation Guide

This guide helps LLMs and developers create effective components for Memento Protocol. Focus on what actually helps agents execute tasks successfully.

## Component Types

### 1. Modes (Agent Personalities)

Location: `.zcc/modes/<name>.md`

Modes define how agents think and behave. The most effective modes focus on **actionable behavioral guidelines** rather than abstract concepts.

#### Effective Mode Structure

```markdown
# [Mode Name] Mode

[One clear sentence describing the agent's identity and primary focus]

## Behavioral Guidelines

[2-4 specific, actionable behavioral instructions that shape how the agent makes decisions and communicates]

## Example Process

[Optional: A flexible framework showing typical phases of work, not rigid steps]

### Phase 1: [Name]
- [Key activities and mindset]

### Phase 2: [Name]  
- [Key activities and mindset]

[Additional sections as needed for the specific mode]
```

#### What Makes Modes Effective

**✅ Good Behavioral Guidelines:**
- "Be pragmatic, focus on clear, easy to understand code over elegant and over-engineered code"
- "Save your own context, delegate work to sub-agents whenever possible"
- "Prioritize critical issues (bugs, security vulnerabilities) over stylistic preferences"

**❌ Avoid These:**
- Vague personality descriptions ("be helpful and friendly")
- Mode switching triggers (agents can't switch themselves)
- Rigid step-by-step procedures (use Example Process for flexibility)
- Abstract principles without actionable guidance

#### Examples of Effective Patterns

- **Identity Statement**: "You are now operating in Engineer mode. Your focus is on crafting high-quality code."
- **Decision Framework**: "If requirements are clear, take a TDD approach; if not, implement then test"
- **Resource Management**: "Delegate to sub-agents, bias towards cost savings"
- **Quality Standards**: "Don't write brittle tests. Avoid asserting things likely to change"

### 2. Workflows (Reusable Procedures)

Location: `.zcc/workflows/<name>.md`

Workflows provide structured approaches to common tasks. The best workflows balance structure with flexibility.

#### Effective Workflow Structure

```markdown
# [Workflow Name]

[Brief description of what this accomplishes and when to use it]

## Prerequisites
- [What agents need before starting]
- [Required context or setup]

## Inputs
- **parameter**: Description of expected input
- **parameter**: Description with example formats

## Outputs
- [What this workflow produces]
- [Where results are stored]

## Example Commands

### Natural Language Invocations
- "[4-5 examples of how users naturally request this workflow]"
- "[Include parameter variations]"

## Workflow Steps

### 1. [Phase Name]
[Clear description of this phase's purpose]

1. **[Specific Action]**
   - [Concrete steps]
   - [Expected outcomes]

2. **[Specific Action]**
   - [Concrete steps]
   - [Expected outcomes]

### 2. [Phase Name]
[Continue pattern...]

## Best Practices
- [Workflow-specific guidance]
- [Common pitfalls to avoid]
```

#### What Makes Workflows Effective

**✅ Good Workflow Characteristics:**
- Clear inputs and outputs agents can work with
- Natural language invocation examples that actually work
- Flexible phases rather than rigid sequences
- Specific action items with expected outcomes
- Integration with modes and tools

**❌ Avoid These:**
- Theoretical procedures without concrete steps
- Overly rigid sequences that don't adapt to reality
- Vague action items without clear outcomes
- No connection to how agents actually work

### 3. Language Overrides

Location: `.zcc/languages/<language>/overrides.md`

Language overrides help agents work effectively with specific technologies and codebases.

#### Structure

```markdown
# Language: [Language Name]

## Behavioral Adaptations
- [How agents should modify their approach for this language]
- [Language-specific mindset and priorities]

## Code Conventions
- [Specific patterns and styles to follow]
- [Naming conventions and organization]

## Best Practices
- [Language-specific quality standards]
- [Performance and security considerations]

## Common Patterns
### [Pattern Name]
```[language]
// Concrete example showing the pattern
```

## Testing & Verification
- [Preferred testing approaches]
- [How to validate code quality]
```

## Component Creation Best Practices

### 1. Write for Agent Execution Context

Remember: agents only see your component content AFTER they've been invoked. Write for that context.

**✅ Agent-Focused Writing:**
- "You are now operating in [Mode] mode"
- "Your focus is on [specific capability]"
- "Follow this approach when [specific situation]"

**❌ User-Focused Writing:**
- "This mode helps with [general description]"
- "Switch to this mode when [trigger condition]"
- "Users can invoke this by [method]"

### 2. Provide Actionable Guidance

Agents need specific, executable instructions, not abstract principles.

**✅ Actionable:**
- "Use TDD if requirements are clear, implement-then-test if they're unclear"
- "Bias towards cost savings when choosing sub-agent models"
- "Focus on critical issues before stylistic preferences"

**❌ Abstract:**
- "Write good code"
- "Be thorough"
- "Consider best practices"

### 3. Balance Structure with Flexibility

Provide frameworks, not rigid scripts. Agents need to adapt to real situations.

**✅ Flexible Framework:**
```markdown
## Example Process
This is an example process. Be flexible and use good judgment based on the actual task.

### Phase 1: Planning
- Identify core requirements
- Gather context in parallel

### Phase 2: Implementation
- Spawn sub-agents as needed
```

**❌ Rigid Script:**
```markdown
## Steps
1. Always start by reading the requirements
2. Then analyze the codebase
3. Then create a plan
4. Then implement
```

### 4. Include Real Examples

Show agents exactly what effective execution looks like.

**Examples:**
- Code snippets for language overrides
- Natural language commands for workflows
- Decision-making scenarios for modes

## Testing Your Components

After creating a component:

1. **Install it**: `memento add [type] [name]`
2. **Test with real scenarios**: Use the component in actual development tasks
3. **Observe agent behavior**: Does the component actually improve how agents work?
4. **Iterate based on results**: Refine based on what works in practice

## Quality Indicators

**Effective Components:**
- Agents make better decisions when using them
- Clear improvement in task completion quality
- Natural integration with agent workflows
- Reduced need for clarification or iteration

**Ineffective Components:**
- Agents ignore or misinterpret guidance
- No observable improvement in outcomes
- Conflicts with natural agent behavior
- Requires extensive explanation to be useful

## Examples

See the `.zcc/modes/` and `.zcc/workflows/` directories for reference implementations that follow these patterns.