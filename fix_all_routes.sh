#!/bin/bash

echo "Memperbaiki semua route dengan error TypeScript..."

# Function untuk memperbaiki file
fix_route_file() {
    local file="$1"
    echo "Memperbaiki: $file"
    
    # Backup file
    cp "$file" "${file}.backup"
    
    # Replace all variations of params types
    sed -i '' 's/params: { params: { id: string } }/params: { params: Promise<{ id: string }> }/g' "$file"
    sed -i '' 's/params: { params: { attendanceId: string } }/params: { params: Promise<{ attendanceId: string }> }/g' "$file"
    sed -i '' 's/params: { params: { path: string\[\] } }/params: { params: Promise<{ path: string\[\] }> }/g' "$file"
    
    # Add await params and extract variables
    if grep -q "params\.id" "$file"; then
        # Add const { id } = await params; after try {
        sed -i '' 's/try {/try {\n    const { id } = await params;/g' "$file"
        # Replace all params.id with id
        sed -i '' 's/params\.id/id/g' "$file"
    fi
    
    if grep -q "params\.attendanceId" "$file"; then
        # Add const { attendanceId } = await params; after try {
        sed -i '' 's/try {/try {\n    const { attendanceId } = await params;/g' "$file"
        # Replace all params.attendanceId with attendanceId
        sed -i '' 's/params\.attendanceId/attendanceId/g' "$file"
    fi
    
    if grep -q "params\.path" "$file"; then
        # Add const { path } = await params; after try {
        sed -i '' 's/try {/try {\n    const { path } = await params;/g' "$file"
        # Replace all params.path with path
        sed -i '' 's/params\.path/path/g' "$file"
    fi
    
    echo "✓ Selesai memperbaiki: $file"
}

# Find and fix all route.ts files
find frontend/src/app/api -name "route.ts" -type f | while read -r file; do
    if grep -q "params: { params: {" "$file"; then
        fix_route_file "$file"
    fi
done

echo "Selesai memperbaiki semua route!"
