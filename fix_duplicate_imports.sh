#!/bin/bash

# Script to fix duplicate getBackendUrl imports in frontend files
# This script will remove duplicate imports and keep only one import per file

echo "🔧 Fixing duplicate getBackendUrl imports in frontend files..."

# Find all files with getBackendUrl imports
files_with_imports=$(find frontend/src -name "*.ts" -o -name "*.tsx" | xargs grep -l "getBackendUrl.*@/lib/api-utils")

echo "📋 Found $(echo "$files_with_imports" | wc -l) files with getBackendUrl imports"

fixed_count=0

for file in $files_with_imports; do
    echo "🔄 Processing: $file"

    # Count occurrences of the import
    import_count=$(grep -c "import.*getBackendUrl.*from.*@/lib/api-utils" "$file")

    if [ "$import_count" -le 1 ]; then
        echo "   ⏭️  No duplicates found, skipping"
        continue
    fi

    # Create a temporary file
    temp_file="${file}.tmp"

    # Process the file to keep only the first import
    awk '
    BEGIN { found_import = 0 }
    /^import.*getBackendUrl.*from.*@\/lib\/api-utils/ {
        if (found_import == 0) {
            print
            found_import = 1
        }
        next
    }
    { print }
    ' "$file" > "$temp_file"

    # Replace original file with cleaned version
    mv "$temp_file" "$file"

    echo "   ✅ Fixed $import_count duplicate imports"
    ((fixed_count++))

done

echo ""
echo "🎉 Fixed duplicate imports in $fixed_count files"
echo "✅ All duplicate getBackendUrl imports have been resolved"
