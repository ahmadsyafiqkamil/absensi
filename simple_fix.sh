#!/bin/bash

echo "Memperbaiki semua route dengan error TypeScript..."

# Find all route.ts files and fix them
find frontend/src/app/api -name "route.ts" -type f | while read -r file; do
    echo "Memperbaiki: $file"
    
    # Backup file
    cp "$file" "${file}.backup"
    
    # Fix params types
    sed -i '' 's/params: { params: { id: string } }/params: { params: Promise<{ id: string }> }/g' "$file"
    sed -i '' 's/params: { params: { attendanceId: string } }/params: { params: Promise<{ attendanceId: string }> }/g' "$file"
    sed -i '' 's/params: { params: { employeeId: string } }/params: { params: Promise<{ employeeId: string }> }/g' "$file"
    sed -i '' 's/params: { params: { path: string\[\] } }/params: { params: Promise<{ path: string\[\] }> }/g' "$file"
    
    # Add await params and extract variables
    if grep -q "params\.id" "$file"; then
        sed -i '' 's/try {/try {\n    const { id } = await params;/g' "$file"
        sed -i '' 's/params\.id/id/g' "$file"
    fi
    
    if grep -q "params\.attendanceId" "$file"; then
        sed -i '' 's/try {/try {\n    const { attendanceId } = await params;/g' "$file"
        sed -i '' 's/params\.attendanceId/attendanceId/g' "$file"
    fi
    
    if grep -q "params\.employeeId" "$file"; then
        sed -i '' 's/try {/try {\n    const { employeeId } = await params;/g' "$file"
        sed -i '' 's/params\.employeeId/employeeId/g' "$file"
    fi
    
    if grep -q "params\.path" "$file"; then
        sed -i '' 's/try {/try {\n    const { path } = await params;/g' "$file"
        sed -i '' 's/params\.path/path/g' "$file"
    fi
    
    echo "✓ Selesai: $file"
done

echo "Selesai memperbaiki semua route!"
