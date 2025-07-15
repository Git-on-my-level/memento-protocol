# CLAUDE.md - Memento Protocol Router

This file serves as a minimal router for Claude Code. Instructions are loaded on-demand from the .memento directory.

## Available Commands

🚨 IMPORTANT: Always Check for Mode First. If the user's intent even loosely matches one PLEASE TAKE IT ON. 
WHEN YOU START A MODE OR WORKFLOW please output the mode and/or workflow as the first line of your output.
### What to do at the start of every fresh session
0. **Default Mode**: Load and activate "project-manager" mode automatically at session start
1. Check if task matches a mode → Load mode file
2. Check if task or mode matches a workflow → Load workflow file
3. Check for relevant tickets → Load ticket context
4. Proceed with task

### Activate a Mode
When prompted explicitly (e.g. "act as [mode]") or when the user's intention aligns with a specific role (e.g. "please review feature X") you can take on one of modes in `.memento/modes`
- `project manager` - Planning and coordination
- `architect` - System design and technical decisions
- `engineer` - Implementation and debugging
- `reviewer` - Code review and quality checks

Each mode includes specific example commands and use cases - check the mode file for details.

### Execute a Workflow
There are battle tested step-by-step flows in `.memento/workflows`. You must execute these when asked, or when you think it will increase reliability
- `execute summarize` - Compress context and analyze directories
- `execute review` - Perform code review and quality checks

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
 
Note that we are using Memento Protocol to develop memento protocol by generating and committing the `.memento/` content to this repo. Keep this meta-development pattern in mind when developing or testing features.
