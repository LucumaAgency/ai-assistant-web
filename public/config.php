<?php
/**
 * Configuración del proxy para el backend
 * Cambia el puerto aquí si Node.js usa un puerto diferente
 */

// Puerto donde está ejecutándose Node.js
define('BACKEND_PORT', '3003'); // Cambia este valor al puerto correcto

// URL completa del backend
define('BACKEND_URL', 'http://localhost:' . BACKEND_PORT);

// Modo debug (muestra más información en errores)
define('DEBUG_MODE', true);
?>