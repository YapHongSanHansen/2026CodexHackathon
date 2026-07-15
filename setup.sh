#!/bin/bash

# Halal-X Setup Script
# This script helps you get started quickly

echo "🕌 Halal-X Setup Script"
echo "======================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ npm version: $(npm -v)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Run: npm run dev"
echo "2. Open: http://localhost:3000"
echo "3. On mobile (same WiFi): http://YOUR_IP:3000"
echo ""
echo "📖 Read QUICKSTART.md for detailed instructions"
echo "🎭 Read DEMO_GUIDE.md for demo day preparation"
echo ""
echo "🚀 Ready to build something amazing!"
