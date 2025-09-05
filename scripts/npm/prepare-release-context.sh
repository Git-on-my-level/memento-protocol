#!/bin/bash

# Exit if not on main branch
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
    echo "ERROR: Not on main branch (current: $BRANCH)" >&2
    exit 1
fi

# Exit if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "ERROR: Uncommitted changes detected" >&2
    git status --short >&2
    exit 1
fi

# Get version info
LAST_TAG=$(git tag --sort=-version:refname | head -1)
CURRENT_VERSION=$(node -p "require('./package.json').version")

# Check if last tag exists
if [ -z "$LAST_TAG" ]; then
    LAST_TAG="0.0.0"
fi

# Output JSON with all release context
echo "{"
echo "  \"branch\": \"$BRANCH\","
echo "  \"lastTag\": \"$LAST_TAG\","
echo "  \"currentVersion\": \"$CURRENT_VERSION\","
echo "  \"isCurrentVersionTagged\": $(git describe --exact-match --tags HEAD 2>/dev/null >/dev/null && echo "true" || echo "false"),"
echo "  \"commitCount\": $(git rev-list ${LAST_TAG}..HEAD --count 2>/dev/null || echo 0),"
echo "  \"commits\": ["

# Get commits since last tag
if [ "$LAST_TAG" != "0.0.0" ]; then
    git log --pretty=format:"%h|%s" ${LAST_TAG}..HEAD | while IFS='|' read -r hash message; do
        # Extract commit type from message
        if [[ $message =~ ^([^:]+): ]]; then
            type="${BASH_REMATCH[1]}"
            # Remove type prefix from message
            message="${message#*: }"
        else
            type="other"
        fi
        # Escape quotes and backslashes in message
        message=$(echo "$message" | sed 's/\\/\\\\/g; s/"/\\"/g')
        echo "    {\"hash\": \"$hash\", \"message\": \"$message\", \"type\": \"$type\"},"
    done | sed '$ s/,$//'
else
    git log --pretty=format:"%h|%s" | head -20 | while IFS='|' read -r hash message; do
        # Extract commit type from message
        if [[ $message =~ ^([^:]+): ]]; then
            type="${BASH_REMATCH[1]}"
            # Remove type prefix from message
            message="${message#*: }"
        else
            type="other"
        fi
        # Escape quotes and backslashes in message
        message=$(echo "$message" | sed 's/\\/\\\\/g; s/"/\\"/g')
        echo "    {\"hash\": \"$hash\", \"message\": \"$message\", \"type\": \"$type\"},"
    done | sed '$ s/,$//'
fi

echo ""
echo "  ],"
echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\""
echo "}"