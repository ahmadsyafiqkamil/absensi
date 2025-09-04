#!/bin/bash

# Script to fix hardcoded localhost:8000 URLs in frontend API routes
# This script will replace localhost:8000 with proper backend URL configuration

echo "🔧 Fixing backend URL configuration in frontend API routes..."

# Find all files with localhost:8000
files_with_localhost=$(find frontend/src -name "*.ts" -o -name "*.tsx" | xargs grep -l "localhost:8000")

echo "📋 Files that need fixing:"
echo "$files_with_localhost"
echo ""

# Counter for fixed files
fixed_count=0

for file in $files_with_localhost; do
    echo "🔄 Processing: $file"

    # Skip files that are already using proper configuration
    if grep -q "BACKEND_BASE_URL\|proxyToBackend\|getBackendUrl" "$file"; then
        echo "   ⏭️  Already using proper configuration, skipping"
        continue
    fi

    # Add import for getBackendUrl at the top
    if ! grep -q "import.*api-utils" "$file"; then
        # Find the last import line and add our import after it
        sed -i '' '/^import.*from/ a\
import { getBackendUrl } from '\''@/lib/api-utils'\''
' "$file"
    fi

    # Replace localhost:8000 patterns with getBackendUrl()
    # Pattern 1: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
    sed -i '' 's/process\.env\.NEXT_PUBLIC_BACKEND_URL || '\''http:\/\/localhost:8000'\''/getBackendUrl()/g' "$file"

    # Pattern 2: Direct localhost:8000 strings
    sed -i '' 's/http:\/\/localhost:8000/getBackendUrl()/g' "$file"

    echo "   ✅ Fixed: $file"
    fixed_count=$((fixed_count + 1))
done

echo ""
echo "🎉 Fixed $fixed_count files!"
echo ""
echo "📝 Next steps:"
echo "1. Review the changes in the modified files"
echo "2. Test the application to ensure everything works"
echo "3. For API routes, consider using proxyToBackend() instead of direct fetch calls"
echo ""
echo "⚠️  Note: Some files may need manual review for complex cases"
