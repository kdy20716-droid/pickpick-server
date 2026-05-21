import express from "express";
import pool from "../db.js";

const router = express.Router();

// 신고 제출
router.post("/", async (req, res) => {
  const { postId, userId, reason } = req.body;

  if (!postId || !reason) {
    return res.status(400).json({ success: false, message: "필수 정보가 누락되었습니다." });
  }

  try {
    console.log("📥 신고 데이터 수신:", { postId, userId, reason });
    const [result] = await pool.query(
      "INSERT INTO reports (post_id, user_id, reason) VALUES (?, ?, ?)",
      [postId, userId || null, reason]
    );

    res.status(201).json({ success: true, message: "신고가 접수되었습니다.", reportId: result.insertId });
  } catch (error) {
    console.error("❌ 신고 제출 오류 상세:", error);
    res.status(500).json({ 
      success: false, 
      message: "신고 처리에 실패했습니다.", 
      error: error.message,
      code: error.code // DB 에러 코드 확인용
    });
  }
});

export default router;
