# Ticket: CLI Scaffolding

## Objective
Set up basic Node.js/TypeScript CLI structure with minimal dependencies

## Tasks
- [ ] Initialize npm project with TypeScript configuration
- [ ] Set up basic CLI entry point using commander.js
- [ ] Configure build tooling (esbuild for single-file output)
- [ ] Add basic commands: init, help, version
- [ ] Set up development scripts (build, watch, test)

## Dependencies
- commander: CLI framework
- typescript: Type safety
- esbuild: Fast bundling
- tsx: Development execution

## Acceptance Criteria
- Can run `memento --help` and see command list
- TypeScript compiles without errors
- Single executable output for distribution