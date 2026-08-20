import pool from "../config/database.js";
import { sendEmail } from "../utils/email.js";

export async function createReport({ postId, reason, userId }) {
  const [posts] = await pool.query("SELECT title FROM vote_posts WHERE id = ?", [postId]);
  const postTitle = posts.length > 0 ? posts[0].title : "삭제되었거나 없는 게시물";

  const [result] = await pool.query(
    "INSERT INTO reports (post_id, post_title, user_id, reason) VALUES (?, ?, ?, ?)",
    [postId, postTitle, userId, reason],
  );

  // 신고 접수 시 관리자(support@pickpick.dev)에게 이메일 알림 발송
  const adminEmail = process.env.ADMIN_EMAIL || "support@pickpick.dev";
  if (adminEmail) {
    sendEmail({
      to: adminEmail,
      subject: `[PICKPICK] 새로운 게시물 신고 접수 알림 (게시물: ${postTitle})`,
      text: `[PICKPICK 신고 접수 알림]\n\n- 게시물 ID: ${postId}\n- 게시물 제목: ${postTitle}\n- 신고자: ${userId ? `회원 (ID: ${userId})` : "비회원"}\n- 신고 사유: ${reason}\n- 접수 시간: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
    }).catch((err) => {
      console.error("❌ 신고 알림 이메일 전송 실패:", err.message);
    });
  }

  return result.insertId;
}
