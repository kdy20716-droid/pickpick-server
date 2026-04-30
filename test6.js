import dotenv from 'dotenv';
dotenv.config();
import pool from './src/db.js';

async function run() {
  try {
    await pool.query("INSERT INTO vote_records (post_id, user_id, selected_side) VALUES (?, ?, ?)", ['undefined', 100, 'A']);
    console.log('success');
  } catch (e) {
    console.log('ERROR:', e.code, e.message);
  } finally {
    process.exit();
  }
}
run();