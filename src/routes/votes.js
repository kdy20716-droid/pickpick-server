import express from "express";
import pool from "../db.js"; // DB 연결 가져오기

const router = express.Router();

// 투표하기 API (POST /api/votes/:postId)
router.post("/:postId", async (req, res) => {
  const { postId } = req.params;
  const { user_id, selected_side } = req.body; // 'A' 또는 'B'

  if (!user_id || !selected_side) {
    return res.status(400).json({ success: false, message: "user_id와 selected_side('A' 또는 'B')가 필요합니다." });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. 투표 기록 추가 (이미 투표했으면 ER_DUP_ENTRY 에러 발생)
    await conn.query(
      "INSERT INTO vote_records (post_id, user_id, selected_side) VALUES (?, ?, ?)",
      [postId, user_id, selected_side]
    );

    // 2. 게시글의 해당 진영 투표수 증가
    const updateColumn = selected_side === "A" ? "candidate_a_count" : "candidate_b_count";
    await conn.query(
      `UPDATE vote_posts SET ${updateColumn} = ${updateColumn} + 1 WHERE id = ?`,
      [postId]
    );

    // 3. 업데이트된 최신 투표수 가져오기 (비율 계산을 위해)
    const [rows] = await conn.query(
      "SELECT candidate_a_count, candidate_b_count FROM vote_posts WHERE id = ?",
      [postId]
    );

    await conn.commit();
    res.status(200).json({ 
      success: true, 
      message: "투표 완료!",
      counts: rows[0]
    });
  } catch (error) {
    await conn.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      res.status(400).json({ success: false, message: "이미 참여한 투표입니다." });
    } else {
      console.error("투표 처리 에러:", error);
      res.status(500).json({ success: false, message: "서버 에러 발생" });
    }
  } finally {
    conn.release();
  }
});

export default router;
