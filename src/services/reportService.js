import pool from "../config/database.js";

export async function createReport({ postId, reason, userId }) {
  const [posts] = await pool.query("SELECT title FROM vote_posts WHERE id = ?", [postId]);
  const postTitle = posts.length > 0 ? posts[0].title : "삭제되었거나 없는 게시물";

  const [result] = await pool.query(
    "INSERT INTO reports (post_id, post_title, user_id, reason) VALUES (?, ?, ?, ?)",
    [postId, postTitle, userId, reason],
  );

  return result.insertId;
}
