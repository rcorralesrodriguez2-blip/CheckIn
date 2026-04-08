import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function initDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    // Crear base de datos si no existe
    await connection.query('CREATE DATABASE IF NOT EXISTS checkin_db');
    console.log('✅ Base de datos "checkin_db" creada o ya existe');

    // Usar la base de datos
    await connection.query('USE checkin_db');

    // Leer y ejecutar el archivo SQL
    const sqlPath = path.join(process.cwd(), 'database', 'checkin_database.sql');
    let sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // También leer la alteración de faceDescriptor
    try {
      const faceSqlPath = path.join(process.cwd(), 'database', 'add_face_descriptor.sql');
      const faceSqlContent = fs.readFileSync(faceSqlPath, 'utf8');
      sqlContent += '\n' + faceSqlContent;
    } catch (e) {
      console.log('No add_face_descriptor.sql found, skipping.');
    }

    // Dividir el SQL en statements individuales
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.query(statement);
        } catch (error) {
          // Ignorar errores de "table already exists" u otros no críticos
          if (!error.message.includes('already exists') &&
              !error.message.includes('Duplicate entry')) {
            console.log('⚠️  Error en statement:', statement.substring(0, 100) + '...');
            console.log('Error:', error.message);
          }
        }
      }
    }

    console.log('✅ Base de datos inicializada correctamente');
    console.log('Usuario admin por defecto: admin / admin');

  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
  } finally {
    await connection.end();
  }
}

initDatabase();