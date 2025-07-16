# NPM Package Release Workflow

This workflow outlines the steps to publish a new version of the npm package. The current version is in `package.json`.

## 1. Verify Version Bump

- Make sure we are on `main` branch, if not, ABORT and inform the user.
- Look at git history to see the last tag. If the current commit is not tagged, please tag it by bumping the version.
- Check `package.json` to confirm the `version` matches the latest tag. If it can be bumped to match, then bump it.
- If there is a wild discrepancy between the git tag and the package.json version, ABORT and inform the user.

## 2. Update Changelog

- Open `CHANGELOG.md` in the root directory.
- Add a new release section for our new version.
- Summarize changes since the last git tag by reviewing git commits.

## 3. Run Validation Scripts

- Run `npm run prepublishOnly`

## 4. Commit and Tag Release

- Stage the changed files (`package.json`, `CHANGELOG.md`).
- Commit the changes with a message like `chore(release): vX.Y.Z`, replacing `X.Y.Z` with the new version.
- Create a git tag for the new version: `git tag -a vX.Y.Z -m "Version X.Y.Z"`.

## 5. Publish to NPM

- Publish the package: `npm publish`.

## 6. Push to Remote Repository

- Push the commit to the remote repository: `git push`.
- Push the new tag to the remote repository: `git push --tags`.
