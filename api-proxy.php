<?php
// API Proxy para redirigir peticiones al backend de Node.js
// Este archivo actúa como intermediario cuando Node.js no responde directamente

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Si es una petición OPTIONS (preflight), responder inmediatamente
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuración del backend
$backend_url = 'http://localhost:3001';

// Obtener el path de la API desde el query string o request URI
if (isset($_GET['path'])) {
    $api_path = $_GET['path'];
} else {
    $request_uri = $_SERVER['REQUEST_URI'];
    // Remover /api-proxy.php del path si existe
    $api_path = str_replace('/api-proxy.php', '', $request_uri);
    // Remover query string
    $api_path = strtok($api_path, '?');
}

// Log para debug
error_log("API Proxy: {$_SERVER['REQUEST_METHOD']} {$api_path}");

// Construir la URL completa del backend
$url = $backend_url . $api_path;

// Inicializar cURL
$ch = curl_init();

// Configurar opciones de cURL
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5); // Timeout de 5 segundos
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2); // Timeout de conexión de 2 segundos

// Configurar método HTTP
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);

// Si hay datos POST/PUT, enviarlos
if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH'])) {
    $input = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Content-Length: ' . strlen($input)
    ]);
}

// Ejecutar la petición
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

// Si hay error de conexión, intentar respuesta de fallback para registro
if ($error || $http_code === 0) {
    error_log("API Proxy Error: " . $error);
    
    // Si es registro, dar una respuesta de prueba
    if (strpos($api_path, '/api/auth/register') !== false && $_SERVER['REQUEST_METHOD'] === 'POST') {
        header('Content-Type: application/json');
        http_response_code(503);
        echo json_encode([
            'success' => false,
            'message' => 'El servidor backend no está disponible. Por favor contacte al administrador.',
            'debug' => [
                'backend_url' => $backend_url,
                'error' => $error,
                'note' => 'El servicio Node.js no está respondiendo en el puerto 3001'
            ]
        ]);
        exit();
    }
    
    // Para otras rutas, error genérico
    header('Content-Type: application/json');
    http_response_code(503);
    echo json_encode([
        'error' => 'Backend service unavailable',
        'message' => 'No se puede conectar con el servidor Node.js',
        'details' => $error
    ]);
    exit();
}

// Devolver la respuesta del backend
http_response_code($http_code);
header('Content-Type: application/json');
echo $response;
?>