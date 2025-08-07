#!/usr/bin/env node

/**
 * Archivo de entrada para Phusion Passenger en Plesk
 * Este archivo redirige a la aplicación real en backend/
 */

console.log('=== Starting AI Assistant from root app.js ===');
console.log('Redirecting to backend/server.js...');

// Cargar y ejecutar el servidor del backend
require('./backend/server.js');