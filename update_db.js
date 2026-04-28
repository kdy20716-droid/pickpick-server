import pool from "./src/db.js";

async function updateDB() {
  try {
    const conn = await pool.getConnection();
    console.log("DB Connected.");

    await conn.query("ALTER TABLE comments ADD COLUMN parent_id BIGINT NULL");
    await conn.query("ALTER TABLE comments ADD FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE");
    console.log("Altered comments table.");

    await conn.query(`
      CREATE TABLE notifications (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        sender_id BIGINT NOT NULL,
        type VARCHAR(50) NOT NULL,
        post_id BIGINT NOT NULL,
        comment_id BIGINT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES vote_posts(id) ON DELETE CASCADE
      )
    `);
    console.log("Created notifications table.");

    conn.release();
    process.exit(0);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log("parent_id already exists.");
    } else if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log("notifications table already exists.");
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

updateDB();