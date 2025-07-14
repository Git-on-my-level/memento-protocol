#!/bin/bash

# Memento Protocol Installation Script
# This script downloads and installs the latest version of Memento Protocol

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect OS
OS=""
ARCH=""
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="darwin"
else
    echo -e "${RED}Unsupported operating system: $OSTYPE${NC}"
    exit 1
fi

# GitHub repository
REPO="memento-protocol/memento-protocol"
INSTALL_DIR="/usr/local/bin"
BINARY_NAME="memento"

echo -e "${GREEN}Installing Memento Protocol...${NC}"

# Get latest release
echo "Fetching latest release..."
LATEST_RELEASE=$(curl -s https://api.github.com/repos/$REPO/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$LATEST_RELEASE" ]; then
    echo -e "${RED}Failed to fetch latest release${NC}"
    exit 1
fi

echo "Latest version: $LATEST_RELEASE"

# Download URL
DOWNLOAD_URL="https://github.com/$REPO/releases/download/$LATEST_RELEASE/memento-${LATEST_RELEASE#v}-$OS"

# Download binary
echo "Downloading from: $DOWNLOAD_URL"
curl -L -o /tmp/memento "$DOWNLOAD_URL"

# Make executable
chmod +x /tmp/memento

# Install (may require sudo)
if [ -w "$INSTALL_DIR" ]; then
    mv /tmp/memento "$INSTALL_DIR/$BINARY_NAME"
else
    echo -e "${YELLOW}Installation requires sudo privileges${NC}"
    sudo mv /tmp/memento "$INSTALL_DIR/$BINARY_NAME"
fi

# Verify installation
if command -v memento &> /dev/null; then
    echo -e "${GREEN}✓ Memento Protocol installed successfully!${NC}"
    echo -e "Version: $(memento --version)"
    echo -e "\nRun 'memento --help' to get started"
else
    echo -e "${RED}Installation failed${NC}"
    exit 1
fi