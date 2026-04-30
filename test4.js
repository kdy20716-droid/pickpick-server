import dotenv from 'dotenv';
dotenv.config();
import pool from './src/db.js';

async function run() {
  try {
    await pool.query("INSERT IGNORE INTO users (id, nickname, password) VALUES (100, 'test100', '123')");
    console.log('user inserted');
    
    await pool.query("INSERT INTO vote_records (post_id, user_id, selected_side) VALUES ('1', 100, 'A')");
    console.log('vote record inserted');

    const [rows] = await pool.query("SELECT * FROM vote_records WHERE user_id = 100");
    console.log(rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();