const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  console.log('🔍 Probando conexión a la base de datos...\n');
  console.log('Configuración:');
  console.log('- Host:', process.env.DB_HOST || 'localhost');
  console.log('- Puerto:', process.env.DB_PORT || 3306);
  console.log('- Base de datos:', process.env.DB_NAME);
  console.log('- Usuario:', process.env.DB_USER);
  console.log('- Contraseña:', process.env.DB_PASSWORD ? '****** (configurada)' : '❌ NO CONFIGURADA');
  console.log('');

  if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === 'TU_CONTRASEÑA_REAL_AQUI' || process.env.DB_PASSWORD === 'your_db_password_here') {
    console.error('❌ ERROR: La contraseña de la base de datos no está configurada correctamente');
    console.error('   Por favor actualiza DB_PASSWORD en el archivo .env');
    return;
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ Conexión exitosa!\n');

    // Verificar tablas
    console.log('📊 Verificando tablas:');
    const [tables] = await connection.execute('SHOW TABLES');
    
    const requiredTables = ['users', 'password_reset_tokens', 'user_sessions', 'login_attempts', 'refresh_tokens', 'folders', 'chats', 'messages'];
    const existingTables = tables.map(t => Object.values(t)[0]);
    
    requiredTables.forEach(table => {
      if (existingTables.includes(table)) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} (NO EXISTE)`);
      }
    });

    // Verificar usuarios de prueba
    console.log('\n👥 Usuarios de prueba:');
    const [users] = await connection.execute('SELECT email, name FROM users WHERE email IN ("test@example.com", "demo@example.com")');
    if (users.length > 0) {
      users.forEach(user => {
        console.log(`   ✅ ${user.email} - ${user.name}`);
      });
    } else {
      console.log('   ⚠️  No hay usuarios de prueba');
    }

    await connection.end();
    console.log('\n✅ Prueba completada exitosamente');

  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n🔐 Problema de autenticación:');
      console.error('   - Verifica que el usuario y contraseña sean correctos');
      console.error('   - Asegúrate de que el usuario tenga permisos para acceder a la base de datos');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n🔌 No se puede conectar al servidor MySQL:');
      console.error('   - Verifica que MySQL/MariaDB esté ejecutándose');
      console.error('   - Verifica el host y puerto');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n📁 La base de datos no existe:');
      console.error('   - Crea la base de datos:', process.env.DB_NAME);
    }
  }
}

testConnection();