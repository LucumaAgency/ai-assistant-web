#!/bin/bash

echo "Starting deployment..."

# Copiar frontend construido a la raíz
if [ -d "frontend/dist" ]; then
    echo "Copying frontend build files..."
    cp -r frontend/dist/* ./
elif [ -d "client/dist" ]; then
    echo "Copying client build files..."
    cp -r client/dist/* ./
else
    echo "Warning: No dist folder found"
fi

# Buscar npm en diferentes ubicaciones
NPM_PATH=""
if [ -f "/opt/plesk/node/20/bin/npm" ]; then
    NPM_PATH="/opt/plesk/node/20/bin/npm"
elif [ -f "/opt/plesk/node/18/bin/npm" ]; then
    NPM_PATH="/opt/plesk/node/18/bin/npm"
elif [ -f "/usr/bin/npm" ]; then
    NPM_PATH="/usr/bin/npm"
else
    NPM_PATH="npm"
fi

echo "Using npm at: $NPM_PATH"

# Instalar dependencias del backend
echo "Installing backend dependencies..."
cd backend && $NPM_PATH install --production && cd ..

# Reiniciar aplicación
echo "Restarting application..."
mkdir -p tmp
touch tmp/restart.txt

echo "Deployment completed successfully!"