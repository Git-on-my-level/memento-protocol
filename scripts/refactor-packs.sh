#!/bin/bash

# Script to refactor pack structure - remove components layer and make packs self-contained

set -e

TEMPLATES_DIR="templates/starter-packs"
SCRIPTS_DIR="templates/scripts"

echo "Starting pack refactoring..."

# Process each pack
for PACK_DIR in "$TEMPLATES_DIR"/*/ ; do
    if [ -d "$PACK_DIR" ]; then
        PACK_NAME=$(basename "$PACK_DIR")
        
        # Skip schema.json or other non-pack files
        if [ "$PACK_NAME" = "schema.json" ]; then
            continue
        fi
        
        echo "Processing pack: $PACK_NAME"
        
        # Check if components directory exists
        if [ -d "$PACK_DIR/components" ]; then
            echo "  Flattening components directory..."
            
            # Move all component directories up one level
            for COMPONENT_DIR in "$PACK_DIR/components"/*/ ; do
                if [ -d "$COMPONENT_DIR" ]; then
                    COMPONENT_NAME=$(basename "$COMPONENT_DIR")
                    echo "    Moving $COMPONENT_NAME..."
                    mv "$COMPONENT_DIR" "$PACK_DIR/$COMPONENT_NAME"
                fi
            done
            
            # Remove the now-empty components directory
            rmdir "$PACK_DIR/components" 2>/dev/null || true
        fi
        
        # Create scripts directory in the pack
        mkdir -p "$PACK_DIR/scripts"
        
        # Copy all shared scripts to make pack self-contained
        echo "  Copying scripts to make pack self-contained..."
        if [ -d "$SCRIPTS_DIR" ]; then
            cp -r "$SCRIPTS_DIR"/* "$PACK_DIR/scripts/" 2>/dev/null || true
        fi
    fi
done

echo "Pack refactoring complete!"
echo ""
echo "Summary of changes:"
echo "1. Removed 'components' layer from all packs"
echo "2. Added scripts directory to each pack with all necessary scripts"
echo "3. Each pack is now fully self-contained"