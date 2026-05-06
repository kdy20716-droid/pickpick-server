import mysql from 'mysql2/promise';

async function checkDatabase() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'pickpick'
  });

  try {
    const conn = await pool.getConnection();
    
    console.log("📊 현재 DB에 저장된 모든 사용자 정보:");
    console.log("===============================================");
    
    const [users] = await conn.query(
      'SELECT id, nickname, name, email, birth, gender, nationality, role, created_at FROM users ORDER BY created_at DESC'
    );
    
    if (users.length === 0) {
      console.log("❌ 저장된 사용자가 없습니다.");
    } else {
      console.log(`✅ 총 ${users.length}명의 사용자가 저장되어 있습니다.\n`);
      
      users.forEach((user, index) => {
        console.log(`[${index + 1}번] ID: ${user.id}`);
        console.log(`  - 아이디(nickname): ${user.nickname}`);
        console.log(`  - 이름: ${user.name}`);
        console.log(`  - 이메일: ${user.email}`);
        console.log(`  - 생년월일: ${user.birth}`);
        console.log(`  - 성별: ${user.gender}`);
        console.log(`  - 내외국인: ${user.nationality}`);
        console.log(`  - 역할: ${user.role}`);
        console.log(`  - 가입일시: ${user.created_at}\n`);
      });
    }

    // 이메일 중복 확인
    console.log("===============================================");
    console.log("📧 이메일 중복 확인:");
    console.log("===============================================");
    
    const [emailStats] = await conn.query(
      'SELECT email, COUNT(*) as count FROM users WHERE email IS NOT NULL GROUP BY email HAVING count > 1'
    );
    
    if (emailStats.length === 0) {
      console.log("✅ 중복된 이메일이 없습니다.");
    } else {
      console.log("❌ 다음 이메일들이 중복되어 있습니다:");
      emailStats.forEach(stat => {
        console.log(`  - ${stat.email}: ${stat.count}개`);
      });
    }

    conn.release();
  } catch (error) {
    console.error("❌ 에러:", error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase();
