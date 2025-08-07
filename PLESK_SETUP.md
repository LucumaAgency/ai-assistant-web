# 📋 Configuración para Plesk - AI Assistant

## 🚀 Estructura de Carpetas

Esta rama (`production-ready`) tiene la estructura correcta para Plesk:

```
/aiassistant.pruebalucuma.site/
├── public/               ← Frontend (Raíz del documento)
│   ├── index.html
│   ├── assets/
│   ├── api-mock.php
│   ├── api-proxy.php
│   ├── .htaccess
│   └── vite.svg
├── backend/              ← Backend Node.js (Raíz de la aplicación)
│   ├── server.js
│   ├── app.js
│   ├── dist/
│   ├── node_modules/
│   └── package.json
└── [otros archivos de proyecto]
```

## ⚙️ Configuración en Plesk

### 1. **Configuración de Node.js**
- **Versión de Node.js**: 20.x o superior
- **Raíz del documento**: `/aiassistant.pruebalucuma.site/public`
- **Raíz de la aplicación**: `/aiassistant.pruebalucuma.site/backend`
- **Archivo de inicio**: `server.js`
- **Modo de aplicación**: `production`

### 2. **Variables de Entorno**
Configurar en Plesk o crear archivo `backend/.env`:
```
NODE_ENV=production
PORT=3001
OPENAI_API_KEY=tu-api-key
DB_HOST=localhost
DB_NAME=tu-base-de-datos
DB_USER=tu-usuario
DB_PASSWORD=tu-password
```

### 3. **Pasos de Instalación**

1. **Hacer pull de esta rama**:
   ```bash
   git fetch origin
   git checkout production-ready
   git pull origin production-ready
   ```

2. **Instalar dependencias del backend**:
   - En Plesk Node.js, click en "NPM Install"
   - O por SSH: `cd backend && npm install`

3. **Compilar el backend** (si es necesario):
   ```bash
   cd backend && npm run build
   ```

4. **Reiniciar la aplicación Node.js** en Plesk

## 🔄 Estado Actual

### ✅ Backend con Mock API
Mientras se configura Node.js, el sistema usa `api-mock.php` para simular respuestas.

### 🔧 Para Activar el Backend Real
1. Asegurarse que Node.js esté corriendo en puerto 3001
2. Editar `public/.htaccess`:
   ```apache
   # Cambiar de:
   RewriteRule ^api/(.*)$ /api-mock.php?path=/api/$1 [L,QSA]
   
   # A:
   RewriteRule ^api/(.*)$ /api-proxy.php?path=/api/$1 [L,QSA]
   ```

## 📝 Verificación

### Test del Frontend:
- Visitar: `https://aiassistant.pruebalucuma.site`
- Debe cargar la aplicación React

### Test del Mock API:
- Visitar: `https://aiassistant.pruebalucuma.site/api/health`
- Debe devolver JSON con status "mock"

### Test del Backend (cuando esté activo):
```bash
curl http://localhost:3001/api/health
```

## 🐛 Solución de Problemas

### Si Node.js no inicia:
1. Verificar logs en Plesk
2. Verificar que las rutas estén correctas
3. Probar con `test-server.js` como archivo de inicio

### Si las peticiones API fallan:
1. Verificar que `.htaccess` esté en `/public`
2. Verificar que mod_rewrite esté habilitado
3. Revisar logs de Apache/Nginx

## 📞 Soporte
Para problemas específicos, revisar los logs en:
- Node.js logs en Plesk
- Apache error logs
- `backend/server.log`