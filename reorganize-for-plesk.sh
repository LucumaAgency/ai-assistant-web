#!/bin/bash
# Script para reorganizar archivos para Plesk
# Este script mueve los archivos del frontend a la carpeta public
# para resolver el conflicto de rutas en Plesk

echo "==================================="
echo "Reorganizando archivos para Plesk"
echo "==================================="

# Obtener el directorio base (donde está este script)
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Directorio base: $BASE_DIR"

# Crear carpeta public si no existe
if [ ! -d "$BASE_DIR/public" ]; then
    echo "Creando carpeta public..."
    mkdir -p "$BASE_DIR/public"
else
    echo "La carpeta public ya existe"
fi

# Mover archivos del frontend a public
echo ""
echo "Moviendo archivos del frontend a public..."

# Lista de archivos a mover
FILES_TO_MOVE=(
    "index.html"
    "vite.svg"
    "api-mock.php"
    "api-proxy.php"
    ".htaccess"
)

# Mover archivos individuales
for file in "${FILES_TO_MOVE[@]}"; do
    if [ -f "$BASE_DIR/$file" ]; then
        echo "  Moviendo $file..."
        mv "$BASE_DIR/$file" "$BASE_DIR/public/"
    else
        echo "  $file no encontrado o ya movido"
    fi
done

# Mover carpeta assets
if [ -d "$BASE_DIR/assets" ]; then
    echo "  Moviendo carpeta assets..."
    mv "$BASE_DIR/assets" "$BASE_DIR/public/"
else
    echo "  Carpeta assets no encontrada o ya movida"
fi

echo ""
echo "==================================="
echo "Reorganización completada!"
echo "==================================="
echo ""
echo "Ahora en Plesk debes:"
echo "1. Cambiar la 'Raíz del documento' a: $BASE_DIR/public"
echo "2. Mantener la 'Raíz de la aplicación' en: $BASE_DIR/backend"
echo "3. Mantener el 'Archivo de inicio' como: server.js"
echo "4. Hacer click en 'NPM install'"
echo "5. Reiniciar la aplicación Node.js"
echo ""
echo "La estructura ahora es:"
echo "  /aiassistant.pruebalucuma.site/"
echo "  ├── public/          (frontend - raíz del documento)"
echo "  │   ├── index.html"
echo "  │   ├── assets/"
echo "  │   ├── api-mock.php"
echo "  │   └── .htaccess"
echo "  └── backend/         (Node.js - raíz de la aplicación)"
echo "      ├── server.js"
echo "      ├── dist/"
echo "      └── node_modules/"