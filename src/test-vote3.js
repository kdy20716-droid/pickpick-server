import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import pool from './db.js';

async function testVote() {
  const postId = "1";
  const user_id = 2; // test another user
  const selected_side = "A";

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    console.log("1. Inserting into vote_records");
    await conn.query(
      "INSERT INTO vote_records (post_id, user_id, selected_side) VALUES (?, ?, ?)",
      [postId, user_id, selected_side]
    );

    console.log("2. Updating vote_posts");
    const updateColumn = selected_side === "A" ? "candidate_a_count" : "candidate_b_count";
    await conn.query(
      `UPDATE vote_posts SET ${updateColumn} = ${updateColumn} + 1 WHERE id = ?`,
      [postId]
    );

    console.log("3. Selecting from vote_posts");
    const [rows] = await conn.query(
      "SELECT candidate_a_count, candidate_b_count FROM vote_posts WHERE id = ?",
      [postId]
    );

    await conn.commit();
    console.log("Success!", rows[0]);
  } catch (error) {
    await conn.rollback();
    console.error("Error:", error);
  } finally {
    conn.release();
    process.exit();
  }
}

testVote();