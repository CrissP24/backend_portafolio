const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Función para inicializar la base de datos
async function init() {
  try {
    // Crear tablas si no existen
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        technologies TEXT[] NOT NULL,
        image_url VARCHAR(500),
        github_url VARCHAR(500),
        demo_url VARCHAR(500),
        category VARCHAR(100) DEFAULT 'web',
        featured BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        author_name VARCHAR(255) NOT NULL,
        author_email VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        approved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        color VARCHAR(7) NOT NULL DEFAULT '#7FB3D5',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear usuario admin por defecto si no existe
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@cristhoper.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    const adminExists = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    
    if (adminExists.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      await pool.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
        [adminEmail, hashedPassword, 'admin']
      );
      console.log('👤 Usuario admin creado por defecto');
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Password: ${adminPassword}`);
    } else {
      console.log('👤 Usuario admin ya existe');
      console.log(`📧 Email: ${adminEmail}`);
    }

    // Insertar proyectos de ejemplo si no existen
    const projectsExist = await pool.query('SELECT COUNT(*) FROM projects');
    
    if (parseInt(projectsExist.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO projects (title, description, technologies, github_url, demo_url, category, featured) VALUES
        ('Syllabus Backend', 'Sistema de gestión de cursos online con autenticación y administración completa', 
         ARRAY['Node.js', 'Express', 'PostgreSQL', 'JWT'], 
         'https://github.com/cristhoper/syllabus-backend', 
         'https://syllabus-demo.com', 'backend', true),
        ('Museo Interactivo Jipijapa', 'Experiencia 3D y Realidad Aumentada para museo virtual', 
         ARRAY['Three.js', 'React', 'WebXR', 'Blender'], 
         'https://github.com/cristhoper/museo-jipijapa', 
         'https://museo-jipijapa.com', 'web', true),
        ('ExactApp', 'Sistema de gestión de cursos vacacionales con reservas y pagos', 
         ARRAY['Laravel', 'MySQL', 'Bootstrap', 'Stripe'], 
         'https://github.com/cristhoper/exactapp', 
         'https://exactapp.com', 'web', true)
      `);
      console.log('📁 Proyectos de ejemplo insertados');
    }

    // Insertar categorías por defecto si no existen
    const categoriesExist = await pool.query('SELECT COUNT(*) FROM categories');
    
    if (parseInt(categoriesExist.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO categories (name, color, description) VALUES
        ('Web', '#7FB3D5', 'Aplicaciones y sitios web'),
        ('Backend', '#82E0AA', 'APIs y servicios backend'),
        ('Mobile', '#BB8FCE', 'Aplicaciones móviles'),
        ('Desktop', '#F7DC6F', 'Aplicaciones de escritorio'),
        ('DevOps', '#E74C3C', 'Infraestructura y deployment')
      `);
      console.log('📂 Categorías por defecto insertadas');
    }

    console.log('✅ Base de datos inicializada correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar base de datos:', error);
    throw error;
  }
}

// Función para resetear usuario admin
async function resetAdminUser() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@cristhoper.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    // Eliminar usuario admin existente
    await pool.query('DELETE FROM users WHERE email = $1', [adminEmail]);
    
    // Crear nuevo usuario admin
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    await pool.query(
      'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
      [adminEmail, hashedPassword, 'admin']
    );
    
    console.log('🔄 Usuario admin reseteado correctamente');
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
    
    return { success: true, email: adminEmail, password: adminPassword };
  } catch (error) {
    console.error('❌ Error al resetear usuario admin:', error);
    throw error;
  }
}

module.exports = {
  pool,
  init,
  resetAdminUser
};
