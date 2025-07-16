# CLAUDE.md - Memento Protocol Router

This file serves as a minimal router for Claude Code. Instructions are loaded on-demand from the .memento directory.

## Available Commands

🚨 IMPORTANT: Always Check for Mode First. 
WHEN YOU START A MODE please output: `Mode: [mode-name]`
WHEN YOU START A WORKFLOW please output: `Workflow: [workflow-name]`
### What to do at the start of every fresh session
0. **Default Mode**: IF NO MODE IS SPECIFIED OR IMPLIED: Load and activate "autonomous-project-manager" mode automatically at session start
1. Check if user requested a different mode → Load mode file
2. Check if task or mode matches a workflow → Load workflow file
3. Check for relevant tickets → Load ticket context
4. Proceed with task

### Activate a Mode
When prompted explicitly (e.g. "act as [mode]") or when the user's intention aligns with a specific role (e.g. "please review feature X") you can take on one of modes in `.memento/modes`
- `ai-debt-maintainer`
- `architect`
- `autonomous-project-manager`
- `engineer`
- `reviewer`
- `project-manager`

Each mode includes specific example commands and use cases - check the mode file for details.

### Execute a Workflow
There are battle tested step-by-step flows in `.memento/workflows`. You must execute these when asked, or when you think it will increase task reliability. You can treat these as additional tools at your disposal.
Example workflow invocations: `execute summarize` / `execute summarize workflow` / `workflow summarize` / `summarize workflow` - These should all trigger `./memento/workflows/summarize.md`
The full list of workflows is in the `.memento/workflows` directory. When asked to execute a workflow, check there for available workflows and pick up the one that matches.

### Work with Tickets
To manage complex or long running work, please persist context in `.memento/tickets/`
- Tickets are in 3 directories, `next` `done` and `in-progress`
- You must move tickets to their respective directory based on status at the end of a run
- You should use tickets to share context between sub-agents or to coordinate parallel agents
- Each agent must add their updates to their respective ticket before finishing

## Component Location
All components are in the `.memento/` directory:
- **Modes**: `.memento/modes/[mode-name].md`
- **Workflows**: `.memento/workflows/[workflow-name].md`
- **Tickets**: `.memento/tickets/[status]/[ticket-id]/`

---
# Project-Specific Instructions
---
<!-- Project-specific content below this line -->      
 
Note that we are using Memento Protocol to develop memento protocol by generating and committing the `.memento/` content to this repo. Keep this meta-development pattern in mind when developing or testing features.
