import dotenv from 'dotenv';
dotenv.config();
import pool from './src/db.js';

async function run() {
  try {
    const updateColumn = "candidate_a_count";
    const postId = "1";
    await pool.query(
      `UPDATE vote_posts SET ${updateColumn} = ${updateColumn} + 1 WHERE id = ?`,
      [postId]
    );
    console.log('vote post updated');

    const [rows] = await pool.query("SELECT candidate_a_count, candidate_b_count FROM vote_posts WHERE id = ?", [postId]);
    console.log(rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();