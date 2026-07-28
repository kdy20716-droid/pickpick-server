import pool from "../config/database.js";

export async function initializeDatabase() {
  console.log("[DB] Initializing schema...");

  let conn;
  try {
    conn = await pool.getConnection();

    await conn.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100)");
    await conn.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(100)");
    await conn.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS birth VARCHAR(8)");
    await conn.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10)");
    await conn.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality VARCHAR(10)");
    await conn.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255)");
    await conn.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS role ENUM('user', 'admin') DEFAULT 'user'",
    );

    await conn.query(
      "ALTER TABLE vote_posts ADD COLUMN IF NOT EXISTS candidate_a_type VARCHAR(20) DEFAULT 'image'",
    );
    await conn.query(
      "ALTER TABLE vote_posts ADD COLUMN IF NOT EXISTS candidate_b_type VARCHAR(20) DEFAULT 'image'",
    );

    await conn.query(`
      CREATE TABLE IF NOT EXISTS monthly_achievements (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        year_month VARCHAR(7) NOT NULL,
        top3_count INT DEFAULT 0,
        top1_count INT DEFAULT 0,
        UNIQUE KEY user_month (user_id, year_month),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        post_id BIGINT NULL,
        post_title VARCHAR(255) NULL,
        user_id BIGINT NULL,
        reason TEXT NOT NULL,
        status ENUM('pending', 'resolved', 'ignored') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES vote_posts(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    const [columns] = await conn.query("SHOW COLUMNS FROM reports LIKE 'post_title'");
    if (columns.length === 0) {
      await conn.query("ALTER TABLE reports ADD COLUMN post_title VARCHAR(255) NULL AFTER post_id");
    }

    await conn.query("ALTER TABLE reports MODIFY COLUMN post_id BIGINT NULL");

    console.log("[DB] Schema initialized");
  } catch (error) {
    console.error("[DB] Schema initialization failed:", error.message);
  } finally {
    if (conn) conn.release();
  }
}
