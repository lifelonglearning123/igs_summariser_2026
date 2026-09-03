#!/bin/bash

# Deploy to Vercel - Automated Script
# This script automates the GitHub push process

echo ""
echo "================================"
echo "IGS Summariser - Vercel Deploy"
echo "================================"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "ERROR: Git is not installed"
    echo "Please install Git from: https://git-scm.com"
    exit 1
fi

# Check if in correct directory
if [ ! -f "package.json" ]; then
    echo "ERROR: package.json not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo "Step 1: Initialize Git Repository"
git init
echo ""

echo "Step 2: Add all files"
git add .
echo ""

echo "Step 3: Create initial commit"
git commit -m "Initial commit: IGS Summariser application"
echo ""

echo "Step 4: Rename branch to main"
git branch -M main
echo ""

echo "Step 5: GitHub Repository Setup"
echo ""
echo "IMPORTANT: Before continuing, you must:"
echo "1. Go to https://github.com/new"
echo "2. Create a new repository named 'igs-summariser'"
echo "3. Leave everything as default"
echo "4. Click 'Create repository'"
echo ""
read -p "Press Enter to continue after creating the repository..."

echo ""
echo "Step 6: Enter your GitHub username"
read -p "Enter your GitHub username: " GITHUB_USERNAME

echo ""
echo "Step 7: Push code to GitHub"
git remote add origin https://github.com/$GITHUB_USERNAME/igs-summariser.git
git push -u origin main

echo ""
echo "================================"
echo "✅ Code pushed to GitHub!"
echo "================================"
echo ""
echo "Your repository is at:"
echo "https://github.com/$GITHUB_USERNAME/igs-summariser"
echo ""
echo "Next steps:"
echo "1. Go to https://vercel.com/dashboard"
echo "2. Click \"Add New\" → \"Project\""
echo "3. Click \"Import Git Repository\""
echo "4. Enter: https://github.com/$GITHUB_USERNAME/igs-summariser.git"
echo "5. Click \"Import\" then \"Deploy\""
echo ""
echo "For backend deployment, see: VERCEL_DEPLOYMENT.md"
echo ""
