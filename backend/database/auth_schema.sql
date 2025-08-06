-- =============================================
-- Script de creación de tablas para autenticación
-- Base de datos: carlosm_ai_assistant
-- =============================================

USE carlosm_ai_assistant;

-- =============================================
-- Tabla de usuarios
-- =============================================
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

-- =============================================
-- Tabla de tokens de recuperación de contraseña
-- =============================================
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

-- =============================================
-- Tabla de sesiones activas
-- =============================================
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

-- =============================================
-- Tabla de intentos de login (para seguridad)
-- =============================================
CREATE TABLE IF NOT EXISTS login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    success BOOLEAN DEFAULT FALSE,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_ip (email, ip_address),
    INDEX idx_attempted_at (attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabla de refresh tokens (para JWT)
-- =============================================
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

-- =============================================
-- Actualizar las tablas existentes de chats y folders
-- para relacionarlas con usuarios
-- =============================================

-- Verificar si la columna user_id ya existe en folders
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'carlosm_ai_assistant' 
AND table_name = 'folders' 
AND column_name = 'user_id';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE folders ADD COLUMN user_id INT DEFAULT NULL, ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
    'SELECT "Column user_id already exists in folders"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar si la columna user_id ya existe en chats
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'carlosm_ai_assistant' 
AND table_name = 'chats' 
AND column_name = 'user_id';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE chats ADD COLUMN user_id INT DEFAULT NULL, ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
    'SELECT "Column user_id already exists in chats"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================
-- Crear usuario de prueba (opcional)
-- Password: Test123! (hasheado con bcrypt)
-- =============================================
INSERT INTO users (email, password_hash, name, email_verified, role) 
VALUES (
    'test@example.com', 
    '$2b$10$YJQmKXKqHQaVYKlgTt3vZO8LxGWLxQqN9VhPKK7MnQoV7vnVqUqLa',
    'Usuario de Prueba',
    TRUE,
    'user'
) ON DUPLICATE KEY UPDATE id=id;

-- =============================================
-- Procedimiento almacenado para limpiar tokens expirados
-- =============================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS cleanup_expired_tokens()
BEGIN
    -- Eliminar tokens de recuperación expirados
    DELETE FROM password_reset_tokens 
    WHERE expires_at < NOW() OR used = TRUE;
    
    -- Eliminar sesiones expiradas
    DELETE FROM user_sessions 
    WHERE expires_at < NOW();
    
    -- Eliminar refresh tokens expirados o revocados hace más de 30 días
    DELETE FROM refresh_tokens 
    WHERE (expires_at < NOW()) 
    OR (revoked = TRUE AND revoked_at < DATE_SUB(NOW(), INTERVAL 30 DAY));
    
    -- Limpiar intentos de login de más de 30 días
    DELETE FROM login_attempts 
    WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
END//

DELIMITER ;

-- =============================================
-- Evento para ejecutar limpieza automática diariamente
-- =============================================
CREATE EVENT IF NOT EXISTS cleanup_expired_tokens_event
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 DAY + INTERVAL 2 HOUR)
DO CALL cleanup_expired_tokens();

-- Asegurarse de que el event scheduler está activado
SET GLOBAL event_scheduler = ON;

-- =============================================
-- Mensaje de confirmación
-- =============================================
SELECT 'Tablas de autenticación creadas exitosamente' AS message;