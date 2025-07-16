Currently the templates/claude_router_template.md hard-codes modes and workflows. However we want to refactor the behavior of both

# For modes

For modes we will auto-generate the list of ALL modes, both official modes AND any custom modes the user already has in their .memento/modes directory. Just a simple list of the file paths is sufficient, no need to include a description since the name should be self explanatory. You can replace the `<list_modes>` tag in the template with the actual list of modes. We should list official modes first, then custom modes, but no need to differentiate them in the CLAUDE.md

I have also added a tag `<default_mode>` which you can replace with the default mode instead of the current hacky logic which looks for the specifc header. Going forward we will use tags for template replacement standardization.

# For workflows

I have updated the workflows section of the template to ask the agent to read the workflows directory when prompted, rather than listing all workflows there, since it could take up unnecessary context and confuse the agent since workflow invocations are rare. 

I have also updated the workflows to no longer follow any specific structure and be more freeform. Make sure the tests still pass and we haven't broken any hardcoded workflow logic.