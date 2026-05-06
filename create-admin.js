import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

async function createAdmin() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'pickpick'
  });

  try {
    const conn = await pool.getConnection();
    
    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // 관리자 계정 생성 (중복 무시)
    await conn.query(
      `INSERT IGNORE INTO users (nickname, password, name, role, created_at) 
       VALUES (?, ?, ?, ?, NOW())`,
      ['admin', hashedPassword, '관리자', 'admin']
    );
    
    // 확인
    const [users] = await conn.query(
      'SELECT id, nickname, name, role, created_at FROM users WHERE nickname = ?',
      ['admin']
    );
    
    if (users.length > 0) {
      console.log('✅ 관리자 계정이 생성되었습니다!');
      console.log('📋 계정정보:');
      console.log(`  - 아이디: ${users[0].nickname}`);
      console.log(`  - 이름: ${users[0].name}`);
      console.log(`  - 역할: ${users[0].role}`);
      console.log(`  - 기본 비밀번호: admin123`);
      console.log('⚠️ 보안을 위해 로그인 후 비밀번호를 변경해주세요!');
    }
    
    conn.release();
  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await pool.end();
  }
}

createAdmin();
