-- =============================================
-- Script para crear las tablas del sistema de chat
-- Base de datos: carlosm_ai_assistant
-- =============================================

USE carlosm_ai_assistant;

-- =============================================
-- Tabla de carpetas (folders)
-- =============================================
CREATE TABLE IF NOT EXISTS folders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#407bff',
    system_prompt TEXT DEFAULT NULL,
    user_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_folders (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabla de chats
-- =============================================
CREATE TABLE IF NOT EXISTS chats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL DEFAULT 'Nueva conversación',
    folder_id INT DEFAULT NULL,
    user_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_folder (folder_id),
    INDEX idx_user_chats (user_id),
    INDEX idx_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabla de mensajes
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chat_id INT NOT NULL,
    role ENUM('user', 'assistant', 'system') NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tokens_used INT DEFAULT NULL,
    model_used VARCHAR(50) DEFAULT NULL,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    INDEX idx_chat_messages (chat_id),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Insertar carpetas por defecto
-- =============================================
INSERT INTO folders (name, color, system_prompt, user_id) VALUES 
('Trabajo', '#407bff', 'Eres un asistente profesional especializado en temas laborales y de productividad. Mantén un tono formal y enfócate en soluciones prácticas y eficientes.', NULL),
('Fitness', '#00c896', 'Eres un entrenador personal y nutricionista experto. Proporciona consejos sobre ejercicio, nutrición y estilo de vida saludable. Sé motivador y específico en tus recomendaciones.', NULL),
('Personal', '#ff6b6b', 'Eres un asistente amigable y empático. Ayuda con temas personales, organización del hogar y vida cotidiana. Mantén un tono cálido y comprensivo.', NULL),
('Ideas', '#9c27b0', 'Eres un compañero creativo para lluvia de ideas. Ayuda a desarrollar y explorar conceptos creativos, proyectos e innovaciones. Sé imaginativo y fomenta el pensamiento lateral.', NULL)
ON DUPLICATE KEY UPDATE id=id;

-- =============================================
-- Crear usuario de prueba si no existe (para testing)
-- =============================================
INSERT INTO users (email, password_hash, name, email_verified, role) 
VALUES (
    'demo@example.com', 
    '$2b$10$YJQmKXKqHQaVYKlgTt3vZO8LxGWLxQqN9VhPKK7MnQoV7vnVqUqLa', -- Password: Test123!
    'Usuario Demo',
    TRUE,
    'user'
) ON DUPLICATE KEY UPDATE id=id;

-- =============================================
-- Crear algunos chats de ejemplo para el usuario demo
-- =============================================
SET @demo_user_id = (SELECT id FROM users WHERE email = 'demo@example.com');
SET @trabajo_folder_id = (SELECT id FROM folders WHERE name = 'Trabajo' LIMIT 1);
SET @fitness_folder_id = (SELECT id FROM folders WHERE name = 'Fitness' LIMIT 1);

-- Chat de ejemplo 1: Trabajo
INSERT INTO chats (title, folder_id, user_id) 
VALUES ('Planificación de proyecto Q1', @trabajo_folder_id, @demo_user_id);

SET @chat1_id = LAST_INSERT_ID();

INSERT INTO messages (chat_id, role, content) VALUES
(@chat1_id, 'user', '¿Cuáles son las mejores prácticas para gestionar un proyecto ágil?'),
(@chat1_id, 'assistant', 'Las mejores prácticas para gestionar un proyecto ágil incluyen:

1. **Sprints cortos y consistentes**: Trabaja en ciclos de 2-4 semanas
2. **Daily standups**: Reuniones diarias de 15 minutos para sincronización
3. **Retrospectivas regulares**: Al final de cada sprint para mejora continua
4. **Backlog priorizado**: Mantén las tareas ordenadas por valor de negocio
5. **Comunicación transparente**: Usa tableros Kanban visibles para todo el equipo

¿Te gustaría profundizar en alguna de estas prácticas?');

-- Chat de ejemplo 2: Fitness
INSERT INTO chats (title, folder_id, user_id) 
VALUES ('Rutina de ejercicios en casa', @fitness_folder_id, @demo_user_id);

SET @chat2_id = LAST_INSERT_ID();

INSERT INTO messages (chat_id, role, content) VALUES
(@chat2_id, 'user', 'Necesito una rutina de ejercicios para hacer en casa sin equipamiento'),
(@chat2_id, 'assistant', 'Te he preparado una rutina efectiva de cuerpo completo sin equipamiento:

**Calentamiento (5 min):**
- Jumping jacks: 1 minuto
- Rodillas al pecho: 1 minuto
- Círculos de brazos: 30 seg cada dirección
- Sentadillas sin peso: 1 minuto

**Rutina Principal (20 min):**
1. Flexiones: 3 series x 10-15 reps
2. Sentadillas: 3 series x 15-20 reps
3. Plancha: 3 series x 30-60 segundos
4. Lunges alternados: 3 series x 10 cada pierna
5. Mountain climbers: 3 series x 20 reps

**Enfriamiento (5 min):**
- Estiramientos estáticos de todos los grupos musculares

Realiza esta rutina 3-4 veces por semana. ¿Necesitas modificaciones para algún ejercicio?');

-- =============================================
-- Estadísticas y verificación
-- =============================================
SELECT 'Tablas creadas exitosamente' AS status;

-- Mostrar resumen
SELECT 
    (SELECT COUNT(*) FROM folders) AS total_folders,
    (SELECT COUNT(*) FROM chats) AS total_chats,
    (SELECT COUNT(*) FROM messages) AS total_messages,
    (SELECT COUNT(*) FROM users) AS total_users;