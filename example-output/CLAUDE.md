# CLAUDE.md - Test Project Router

This file serves as a minimal router for Claude Code. Instructions are loaded on-demand from the .memento directory.

## Available Commands

🚨 IMPORTANT: Always Check for Mode First. If the user's intent even loosely matches one PLEASE TAKE IT ON. 
WHEN YOU START A MODE OR WORKFLOW please output the mode and/or workflow as the first line of your output.
### What to do at the start of every fresh session
0. **Default Mode**: IF NO MODE IS SPECIFIED OR IMPLIED: Load and activate "engineer" mode automatically at session start
1. Check if task matches a mode → Load mode file
2. Check if task or mode matches a workflow → Load workflow file
3. Check for relevant tickets → Load ticket context
4. Proceed with task

### Activate a Mode
When prompted explicitly (e.g. "act as [mode]") or when the user's intention aligns with a specific role (e.g. "please review feature X") you can take on one of modes in `.memento/modes`
- `reviewer` - Code review, quality assurance, and feedback

Each mode includes specific example commands and use cases - check the mode file for details.

### Execute a Workflow
There are battle tested step-by-step flows in `.memento/workflows`. You must execute these when asked, or when you think it will increase reliability
- `execute summarize` - Summarize code, directories, or concepts to compress context
- `execute review` - Comprehensive code review and quality assessment

Each workflow includes example invocations with parameters - check the workflow file for details.

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


## Project-Specific Instructions
<!-- Project-specific content below this line -->