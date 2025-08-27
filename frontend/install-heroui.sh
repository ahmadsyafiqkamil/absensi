#!/bin/bash

echo "🚀 Installing HeroUI dependencies in Docker container..."

# Clean npm cache
npm cache clean --force

# Remove existing node_modules and package-lock.json
echo "🧹 Cleaning existing dependencies..."
rm -rf node_modules package-lock.json

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install HeroUI CLI globally (optional, for development)
echo "🔧 Installing HeroUI CLI..."
npm install -g @heroui/cli

# Verify installation
echo "✅ Verifying installation..."
npm list @heroui/react @heroui/theme @heroui/framer-motion

echo "🎉 HeroUI dependencies installed successfully!"
echo "💡 You can now use HeroUI components in your application."
echo "🔍 Run 'npm run dev' to start development server"

