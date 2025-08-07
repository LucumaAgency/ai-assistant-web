// Archivo de entrada para Phusion Passenger en Plesk
// Este archivo es necesario para que Passenger pueda iniciar la aplicación Node.js

// Cargar las variables de entorno según el ambiente
const path = require('path');
const fs = require('fs');

// Determinar el archivo .env a usar
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env';

const envPath = path.join(__dirname, envFile);

// Cargar variables de entorno si el archivo existe
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log(`Loaded environment from ${envFile}`);
} else {
  console.log(`Warning: ${envFile} not found, using system environment variables`);
}

// Importar y ejecutar el servidor principal
require('./dist/index.js');