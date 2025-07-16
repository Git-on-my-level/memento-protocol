#!/bin/bash

# Validate arguments
if [ $# -ne 1 ]; then
    echo "Usage: commit-tag-and-publish.sh <version>"
    echo "Example: commit-tag-and-publish.sh v0.2.0"
    exit 1
fi

VERSION=$1
# Remove 'v' prefix if present for package.json
VERSION_NUMBER=${VERSION#v}

# Ensure we have the v prefix for git tag
if [[ ! "$VERSION" =~ ^v ]]; then
    VERSION="v${VERSION}"
fi

# Final safety check - ensure package.json has the correct version
PACKAGE_VERSION=$(node -p "require('./package.json').version")
if [ "$PACKAGE_VERSION" != "$VERSION_NUMBER" ]; then
    echo "ERROR: package.json version ($PACKAGE_VERSION) doesn't match expected version ($VERSION_NUMBER)"
    exit 1
fi

# Stage the changed files
echo "Staging changes..."
git add package.json CHANGELOG.md

# Commit the changes
echo "Creating release commit..."
git commit -m "chore(release): ${VERSION}"

# Create annotated tag
echo "Creating git tag..."
git tag -a ${VERSION} -m "Version ${VERSION_NUMBER}"

# Publish to npm
echo "Publishing to npm..."
npm publish

# Check if publish succeeded
if [ $? -ne 0 ]; then
    echo "ERROR: npm publish failed"
    echo "The commit and tag have been created locally but not pushed."
    echo "Fix the issue and run: git push && git push --tags"
    exit 1
fi

# Push to remote
echo "Pushing to remote repository..."
git push && git push --tags

echo "✅ Release ${VERSION} completed successfully!"
echo "- Published to npm"
echo "- Pushed commit and tag to remote"