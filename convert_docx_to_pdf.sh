#!/bin/bash

# Script to convert all DOCX files in media/overtime_docx to PDF in media/overtime_pdf
# using the DOCX converter service

SOURCE_DIR="drf/app/media/overtime_docx"
DEST_DIR="drf/app/media/overtime_pdf"

echo "Starting DOCX to PDF conversion..."

# Create destination directory if it doesn't exist
mkdir -p "$DEST_DIR"

# Loop through all DOCX files in source directory
for docx_file in "$SOURCE_DIR"/*.docx; do
    if [ -f "$docx_file" ]; then
        # Get filename without extension
        filename=$(basename "$docx_file" .docx)
        pdf_file="$DEST_DIR/${filename}.pdf"

        echo "Converting: $docx_file -> $pdf_file"

        # Convert using the DOCX converter service
        curl -X POST http://localhost:3001/convert \
             -F "method=file" \
             -F "file=@$docx_file" \
             -o "$pdf_file" \
             --silent

        # Check if conversion was successful
        if [ $? -eq 0 ] && [ -f "$pdf_file" ]; then
            file_type=$(file "$pdf_file" | grep -o "PDF document")
            if [ "$file_type" = "PDF document" ]; then
                echo "✅ Successfully converted: $filename.pdf"
            else
                echo "❌ Conversion failed or invalid PDF: $filename.pdf"
                rm -f "$pdf_file"  # Remove invalid file
            fi
        else
            echo "❌ Conversion failed: $filename"
        fi
    fi
done

echo "Conversion process completed!"
echo "PDF files saved in: $DEST_DIR"
