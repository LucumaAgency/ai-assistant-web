// Configuración de API
const API_BASE_URL = import.meta.env.PROD 
  ? '/api'  // En producción, usa rutas relativas (mismo dominio)
  : 'http://localhost:3001/api'; // En desarrollo, usa el servidor local

export default API_BASE_URL;