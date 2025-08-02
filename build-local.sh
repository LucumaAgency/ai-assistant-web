#!/bin/bash
echo "Building frontend..."
cd frontend && npm run build && cd ..

echo "Building backend..."
cd backend && npm run build && cd ..

echo "Build complete! Ready to commit and push."