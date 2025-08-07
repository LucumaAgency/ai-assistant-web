#!/usr/bin/env node

// Archivo de inicio simple para Plesk
// Este archivo asegura que el servidor se inicie correctamente

console.log('=== STARTING AI ASSISTANT BACKEND ===');
console.log('Current directory:', __dirname);
console.log('Node version:', process.version);
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT || 3001);

// Verificar que tenemos las variables de entorno necesarias
if (!process.env.OPENAI_API_KEY) {
    console.warn('WARNING: OPENAI_API_KEY not set in environment');
}

if (!process.env.DB_HOST) {
    console.warn('WARNING: Database configuration not found in environment');
}

// Iniciar el servidor principal
try {
    console.log('Loading main application from dist/index.js...');
    require('./dist/index.js');
    console.log('Application loaded successfully');
} catch (error) {
    console.error('ERROR: Failed to start application');
    console.error(error);
    process.exit(1);
}