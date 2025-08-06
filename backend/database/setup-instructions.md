# Instrucciones para configurar la base de datos de autenticación

## Opción 1: Usando phpMyAdmin (Recomendado para Plesk)

1. Accede a phpMyAdmin desde tu panel de Plesk
2. Selecciona la base de datos `carlosm_ai_assistant`
3. Ve a la pestaña "SQL"
4. Copia y pega todo el contenido del archivo `auth_schema.sql`
5. Haz clic en "Ejecutar"

## Opción 2: Usando línea de comandos

Si tienes acceso SSH a tu servidor:

```bash
mysql -u carlosm_ai_assistant -p carlosm_ai_assistant < auth_schema.sql
```

## Opción 3: Ejecutar por partes

Si encuentras errores, puedes ejecutar el script por partes:

### Parte 1: Crear tablas principales

```sql
USE carlosm_ai_assistant;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500) DEFAULT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    role ENUM('user', 'admin', 'premium') DEFAULT 'user',
    google_id VARCHAR(255) DEFAULT NULL,
    facebook_id VARCHAR(255) DEFAULT NULL,
    INDEX idx_email (email),
    INDEX idx_google_id (google_id),
    INDEX idx_facebook_id (facebook_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Parte 2: Crear tabla de tokens de recuperación

```sql
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Parte 3: Crear tabla de sesiones

```sql
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(500) NOT NULL UNIQUE,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session_token (session_token),
    INDEX idx_user_sessions (user_id),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Parte 4: Crear tabla de intentos de login

```sql
CREATE TABLE IF NOT EXISTS login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    success BOOLEAN DEFAULT FALSE,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_ip (email, ip_address),
    INDEX idx_attempted_at (attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Parte 5: Crear tabla de refresh tokens

```sql
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP NULL DEFAULT NULL,
    replaced_by_token VARCHAR(500) DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_refresh_token (token),
    INDEX idx_user_refresh (user_id),
    INDEX idx_expires_refresh (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Parte 6: Actualizar tablas existentes

```sql
-- Agregar user_id a la tabla folders si no existe
ALTER TABLE folders 
ADD COLUMN IF NOT EXISTS user_id INT DEFAULT NULL,
ADD FOREIGN KEY IF NOT EXISTS (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Agregar user_id a la tabla chats si no existe
ALTER TABLE chats 
ADD COLUMN IF NOT EXISTS user_id INT DEFAULT NULL,
ADD FOREIGN KEY IF NOT EXISTS (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

### Parte 7: Crear usuario de prueba

```sql
INSERT INTO users (email, password_hash, name, email_verified, role) 
VALUES (
    'test@example.com', 
    '$2b$10$YJQmKXKqHQaVYKlgTt3vZO8LxGWLxQqN9VhPKK7MnQoV7vnVqUqLa',
    'Usuario de Prueba',
    TRUE,
    'user'
) ON DUPLICATE KEY UPDATE id=id;
```

## Verificación

Después de ejecutar el script, verifica que las tablas se crearon correctamente:

```sql
SHOW TABLES;
```

Deberías ver:
- users
- password_reset_tokens
- user_sessions
- login_attempts
- refresh_tokens
- folders (ya existente, con columna user_id agregada)
- chats (ya existente, con columna user_id agregada)
- messages (ya existente)

## Solución de problemas

### Error: "Cannot add foreign key constraint"
Si encuentras este error, primero crea las tablas sin las foreign keys y luego agrégalas:

```sql
ALTER TABLE password_reset_tokens
ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_sessions
ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE refresh_tokens
ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

### Error: "Duplicate column name 'user_id'"
Esto significa que la columna ya existe. Puedes ignorar este error.

### Error con procedimientos almacenados
Si no puedes crear procedimientos almacenados (algunos hostings lo restringen), puedes omitir esa parte. El sistema funcionará sin la limpieza automática.

## Usuario de prueba

Una vez ejecutado el script, puedes probar el login con:
- **Email:** test@example.com
- **Contraseña:** Test123!

## Configuración del backend

Asegúrate de actualizar el archivo `.env` del backend con las credenciales correctas de tu base de datos:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=carlosm_ai_assistant
DB_USER=carlosm_ai_assistant
DB_PASSWORD=tu_contraseña_aqui
```