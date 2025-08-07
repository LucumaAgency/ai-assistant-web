<?php
// Mock API para pruebas cuando el backend no está disponible
// TEMPORAL: Este archivo simula las respuestas del backend

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Manejar preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$path = $_GET['path'] ?? $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

// Log para debug
error_log("Mock API: $method $path");

// Simular respuestas según la ruta
if (strpos($path, '/api/auth/register') !== false && $method === 'POST') {
    // Simular registro exitoso
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Usuario registrado exitosamente (MODO PRUEBA - Backend no disponible)',
        'userId' => rand(1000, 9999),
        'note' => 'Esta es una respuesta simulada. El backend real no está funcionando.'
    ]);
    exit();
}

if (strpos($path, '/api/auth/login') !== false && $method === 'POST') {
    // Simular login exitoso
    echo json_encode([
        'success' => true,
        'message' => 'Login exitoso (MODO PRUEBA)',
        'token' => 'mock-token-' . uniqid(),
        'refreshToken' => 'mock-refresh-' . uniqid(),
        'user' => [
            'id' => 1,
            'email' => $input['email'] ?? 'test@test.com',
            'name' => 'Usuario de Prueba',
            'role' => 'user'
        ]
    ]);
    exit();
}

if (strpos($path, '/api/health') !== false) {
    echo json_encode([
        'success' => true,
        'status' => 'mock',
        'message' => 'Mock API está funcionando',
        'timestamp' => date('c'),
        'warning' => 'El backend real de Node.js no está disponible'
    ]);
    exit();
}

// Respuesta por defecto
http_response_code(404);
echo json_encode([
    'error' => 'Not found',
    'path' => $path,
    'method' => $method,
    'mode' => 'mock'
]);
?>