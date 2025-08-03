#!/bin/bash

# Vercel build script
echo "Starting Vercel build..."

# Install Python dependencies
pip install -r requirements.txt

# Ensure templates and static folders are accessible
echo "Verifying folder structure..."
ls -la

echo "Build completed successfully!"