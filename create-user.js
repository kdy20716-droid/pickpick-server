import pool from "./src/db.js";

async function createTestUser() {
  try {
    const [result] = await pool.execute(
      "INSERT INTO users (nickname, password) VALUES (?, ?)",
      ["testuser", "1234"]
    );
    console.log("Test user created with ID:", result.insertId);
    process.exit(0);
  } catch (error) {
    console.error("Error creating test user:", error);
    process.exit(1);
  }
}

createTestUser();
