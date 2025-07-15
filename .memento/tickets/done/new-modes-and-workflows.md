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

### Additional Updates (Latest Session):
1. **Fixed misreading of ticket** - Correctly deleted `project-manager.md` template as requested
2. **Removed all project-manager references**:
   - Removed from `templates/metadata.json`
   - Updated CLAUDE.md to use autonomous-project-manager as default
   - Updated CHANGELOG.md mode list
   - Updated projectDetector.ts default suggestions
   - Updated interactiveSetup.ts fullstack suggestions
   - Updated test-project/CLAUDE.md mode list
   - Updated test expectations in projectDetector.test.ts

3. **Updated mode pre-selection** - Added `ai-debt-maintainer` to all project types:
   - fullstack: autonomous-project-manager, architect, engineer, reviewer, ai-debt-maintainer
   - web/backend: architect, engineer, reviewer, ai-debt-maintainer
   - cli: engineer, reviewer, ai-debt-maintainer
   - library: architect, engineer, ai-debt-maintainer

4. **Verified final mode structure** - 5 modes with proper templates:
   - autonomous-project-manager
   - ai-debt-maintainer
   - architect
   - engineer
   - reviewer

The refactoring is now complete with project-manager fully removed and new modes properly integrated with pre-selection.

### Final Refactoring (Latest Update):
1. **Changed mode selection strategy** - ALL modes are now selected by default during init
2. **Removed hardcoded mode lists** from project type suggestions in:
   - `src/lib/interactiveSetup.ts` - Changed `checked: projectInfo.suggestedModes.includes(mode.name)` to `checked: true`
   - `src/lib/projectDetector.ts` - Set suggestedModes to empty array
   - Updated tests accordingly
3. **Future-proofed the system** - When new modes are added, they will automatically be selected by default
4. **Updated documentation** - Added ai-debt-maintainer to the mode list in CLAUDE.md

This eliminates the fragility of having to manually update mode lists in multiple places when adding new modes.