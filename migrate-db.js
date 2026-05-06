import mysql from 'mysql2/promise';

async function migrate() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'pickpick'
  });

  try {
    const conn = await pool.getConnection();
    
    console.log('Adding name column...');
    await conn.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100)`);
    
    console.log('Adding role column...');
    await conn.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role ENUM('user', 'admin') DEFAULT 'user'`);
    
    console.log('✅ Database schema updated successfully!');
    
    conn.release();
  } catch (error) {
    if (error.code === 'ER_DUPLICATE_COLUMN_NAME') {
      console.log('✅ Columns already exist');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await pool.end();
  }
}

migrate();
