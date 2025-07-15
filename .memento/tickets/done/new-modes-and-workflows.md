Please add support for the following new modes:
- templates/modes/autonomous-project-manager.md
- templates/modes/ai-debt-maintainer.md

Deleted
- templates/modes/project-manager.md

Updated the rest of the modes

Please make sure to update any of our code that depends on the formatting of these templates, since the format has changed

Please also make sure the tests pass, since some of them may be asserting specific template content

## Status: COMPLETED

### Updates made:
1. Added new mode entries to `templates/metadata.json`:
   - `autonomous-project-manager`: Agentic project management with autonomous delegation to sub-agents
   - `ai-debt-maintainer`: Identify and clean up AI-generated code smells and technical debt

2. Updated the mode heading conformity test (`src/lib/__tests__/modeHeadingConformity.test.ts`):
   - Changed required headings from old format to new format: `## Behavioral Guidelines` and `## Example Process`
   - Updated subsection test to check for "Phase" headings under Example Process instead of old subsections

3. All tests are now passing, including the mode conformity tests

The CLI will automatically generate the `.memento/modes/` files based on the templates when the init or update commands are run.