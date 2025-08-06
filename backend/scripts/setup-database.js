const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function setupDatabase() {
  let connection;
  
  try {
    // Crear conexión
    console.log('Conectando a la base de datos...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true
    });

    console.log('Conexión exitosa!');

    // Leer el archivo SQL
    const sqlFile = path.join(__dirname, '../database/auth_schema.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    // Dividir el contenido por DELIMITER para manejar los procedimientos almacenados
    const statements = sqlContent
      .split('DELIMITER')
      .filter(s => s.trim());

    // Ejecutar las declaraciones principales (antes del DELIMITER)
    if (statements[0]) {
      console.log('Ejecutando tablas y configuración inicial...');
      const mainStatements = statements[0].trim();
      await connection.query(mainStatements);
      console.log('✅ Tablas creadas exitosamente');
    }

    // Si hay procedimientos almacenados (después del DELIMITER)
    if (statements.length > 1) {
      console.log('Creando procedimientos almacenados...');
      
      // Reconstruir el procedimiento almacenado
      const procedureSQL = `
        CREATE PROCEDURE IF NOT EXISTS cleanup_expired_tokens()
        BEGIN
          DELETE FROM password_reset_tokens 
          WHERE expires_at < NOW() OR used = TRUE;
          
          DELETE FROM user_sessions 
          WHERE expires_at < NOW();
          
          DELETE FROM refresh_tokens 
          WHERE (expires_at < NOW()) 
          OR (revoked = TRUE AND revoked_at < DATE_SUB(NOW(), INTERVAL 30 DAY));
          
          DELETE FROM login_attempts 
          WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
        END
      `;
      
      await connection.query(procedureSQL);
      console.log('✅ Procedimientos almacenados creados');
    }

    // Crear evento de limpieza
    const eventSQL = `
      CREATE EVENT IF NOT EXISTS cleanup_expired_tokens_event
      ON SCHEDULE EVERY 1 DAY
      STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 DAY + INTERVAL 2 HOUR)
      DO CALL cleanup_expired_tokens()
    `;
    
    try {
      await connection.query(eventSQL);
      console.log('✅ Evento de limpieza programado');
    } catch (err) {
      console.log('⚠️  No se pudo crear el evento (puede requerir permisos especiales)');
    }

    // Verificar las tablas creadas
    const [tables] = await connection.query('SHOW TABLES');
    console.log('\n📊 Tablas en la base de datos:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`   - ${tableName}`);
    });

    // Verificar si el usuario de prueba se creó
    const [users] = await connection.query('SELECT email FROM users WHERE email = "test@example.com"');
    if (users.length > 0) {
      console.log('\n✅ Usuario de prueba creado: test@example.com (contraseña: Test123!)');
    }

    console.log('\n🎉 ¡Base de datos configurada exitosamente!');

  } catch (error) {
    console.error('❌ Error al configurar la base de datos:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   Verifica las credenciales en el archivo .env');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   No se pudo conectar al servidor MySQL. Verifica que esté ejecutándose.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('   La base de datos especificada no existe.');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nConexión cerrada.');
    }
  }
}

// Ejecutar
console.log('🚀 Iniciando configuración de base de datos...\n');
setupDatabase();