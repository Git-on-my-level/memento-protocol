# Simplify ScriptExecutor

## Priority: 🟡 Medium - Architecture Alignment

## Description
ScriptExecutor has 534 lines of complex shell detection, timeout handling, and process management. As a file generator, we may not need this complexity.

## Tasks
- [ ] Analyze actual usage of ScriptExecutor in the codebase
- [ ] Identify which features are actually needed vs over-engineered
- [ ] Consider replacing with simple `child_process.execSync` where appropriate
- [ ] Maintain backward compatibility for critical paths
- [ ] Document simplified approach

## Impact
- **Potential reduction**: 400+ lines
- **Complexity**: Major simplification
- **Risk**: Medium-High (affects script execution)
- **Time estimate**: 3-4 hours

## Analysis Needed
- How many scripts actually need timeout handling?
- Is shell detection necessary or can we assume bash/sh?
- Do we need streaming output or is sync execution sufficient?

## Alternative Approach
```typescript
// Simple replacement for most cases
function runScript(scriptPath: string, env?: Record<string, string>) {
  return execSync(`bash ${scriptPath}`, { 
    env: { ...process.env, ...env },
    encoding: 'utf8'
  });
}
```

## Notes
Aligns with "file generator, not runtime" philosophy. Most script execution is for simple file generation tasks, not complex long-running processes.

---
Created: 2025-08-27T09:49:43.444Z
