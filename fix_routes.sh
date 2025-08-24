#!/bin/bash

# Script untuk memperbaiki semua route dengan error TypeScript
echo "Memperbaiki semua route dengan error TypeScript..."

# Function untuk memperbaiki file
fix_file() {
    local file="$1"
    echo "Memperbaiki: $file"
    
    # Backup file
    cp "$file" "${file}.backup"
    
    # Replace params: { params: { id: string } } with params: { params: Promise<{ id: string }> }
    sed -i '' 's/params: { params: { id: string } }/params: { params: Promise<{ id: string }> }/g' "$file"
    
    # Replace params: { params: { path: string\[\] } } with params: { params: Promise<{ path: string\[\] }> }
    sed -i '' 's/params: { params: { path: string\[\] } }/params: { params: Promise<{ path: string\[\] }> }/g' "$file"
    
    # Add await params and extract id/path
    if grep -q "params\.id" "$file"; then
        sed -i '' 's/const response = await fetch(`${BACKEND_URL}\/api\/overtime-requests\/${params\.id}\//const { id } = await params;\n    const response = await fetch(`${BACKEND_URL}\/api\/overtime-requests\/${id}\//g' "$file"
        sed -i '' 's/params\.id/id/g' "$file"
    fi
    
    if grep -q "params\.path" "$file"; then
        sed -i '' 's/const raw = params\.path/const { path } = await params;\n\t\tconst raw = path/g' "$file"
        sed -i '' 's/params\.path/path/g' "$file"
    fi
    
    echo "✓ Selesai memperbaiki: $file"
}

# Find all route.ts files and fix them
find frontend/src/app/api -name "route.ts" -type f | while read -r file; do
    if grep -q "params: { params: { id: string }" "$file" || grep -q "params: { params: { path: string\[\] }" "$file"; then
        fix_file "$file"
    fi
done

echo "Selesai memperbaiki semua route!"
