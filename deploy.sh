#!/bin/bash

echo "Starting deployment..."

# Crear carpeta public si no existe
if [ ! -d "public" ]; then
    echo "Creating public directory..."
    mkdir -p public
fi

# Copiar frontend construido a public
if [ -d "frontend/dist" ]; then
    echo "Copying frontend build files to public..."
    cp -r frontend/dist/* ./public/
elif [ -d "client/dist" ]; then
    echo "Copying client build files to public..."
    cp -r client/dist/* ./public/
else
    echo "Warning: No dist folder found"
fi

# Copiar archivos PHP a public si existen
if [ -f "api-mock.php" ]; then
    cp api-mock.php ./public/
fi
if [ -f "api-proxy.php" ]; then
    cp api-proxy.php ./public/
fi
if [ -f ".htaccess" ]; then
    cp .htaccess ./public/
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