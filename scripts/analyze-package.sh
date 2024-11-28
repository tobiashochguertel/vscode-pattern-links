#!/bin/bash

# Make the script exit on any error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Analyzing package content and size...${NC}\n"

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
PACKAGE_NAME="pattern-links"

# Cleanup function
cleanup() {
    rm -rf "$TEMP_DIR"
    rm -f "$PACKAGE_NAME"*.tgz
}

# Register the cleanup function to run on script exit
trap cleanup EXIT

# Pack the package
echo -e "${YELLOW}Creating package...${NC}"
pnpm pack --pack-destination "$TEMP_DIR"

# Get the exact package filename
PACKAGE_FILE=$(ls "$TEMP_DIR"/*.tgz | head -n 1)

# Extract the package
cd "$TEMP_DIR"
tar -xzf "$PACKAGE_FILE"

echo -e "\n${YELLOW}Package Contents:${NC}"
echo "===================="
# List all files with their sizes
cd package
find . -type f -exec ls -lh {} \; | awk '{print $5 "\t" $9}' | sort -h

# Calculate total size
TOTAL_SIZE=$(du -sh . | cut -f1)

echo -e "\n${YELLOW}Size Analysis:${NC}"
echo "==============="
echo -e "Total package size: ${GREEN}$TOTAL_SIZE${NC}"

# Check for large files (>500KB)
echo -e "\n${YELLOW}Large Files (>500KB):${NC}"
find . -type f -size +500k -exec ls -lh {} \; | awk '{print $5 "\t" $9}'

# Check for potential issues
echo -e "\n${YELLOW}Potential Issues:${NC}"
echo "=================="

# Check for source maps
if find . -name "*.map" -type f | grep -q .; then
    echo -e "${RED}⚠ Source map files found${NC}"
fi

# Check for TypeScript source files
if find . -name "*.ts" -not -name "*.d.ts" -type f | grep -q .; then
    echo -e "${RED}⚠ TypeScript source files found${NC}"
fi

# Check for test files
if find . -path "*/test/*" -o -name "*.test.*" -o -name "*.spec.*" | grep -q .; then
    echo -e "${RED}⚠ Test files found${NC}"
fi

# Check for development config files
if find . -name ".eslintrc*" -o -name ".prettierrc*" -o -name "tsconfig.json" | grep -q .; then
    echo -e "${RED}⚠ Development config files found${NC}"
fi

# Check for documentation beyond README
if find . -name "*.md" -not -name "README.md" -not -name "LICENSE.md" | grep -q .; then
    echo -e "${RED}⚠ Additional documentation files found${NC}"
fi

echo -e "\n${GREEN}Analysis complete!${NC}"
