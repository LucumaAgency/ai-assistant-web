const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Proxy para el backend API
const apiProxy = createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  logLevel: 'debug',
  on: {
    error: (err, req, res) => {
      console.error('Proxy error:', err);
      if (res && res.writeHead) {
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ 
          error: 'Backend no disponible',
          message: 'No se pudo conectar con el servidor backend'
        }));
      }
    }
  }
});

app.use('/api', apiProxy);

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname)));

// Manejar rutas de React (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});