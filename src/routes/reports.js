import express from "express";
import pool from "../db.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// 선택적 인증 확인 (게스트 신고 허용, 로그인 유저 식별용)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      req.userId = decoded.userId;
    } catch (err) {
      // 잘못된 토큰은 무시하고 게스트로 처리 (또는 에러 처리 가능)
      req.userId = null;
    }
  } else {
    req.userId = null;
  }
  next();
};

// 신고 제출
router.post("/", optionalAuth, async (req, res) => {
  const { postId, reason } = req.body;

  if (!postId || !reason) {
    return res.status(400).json({ success: false, message: "필수 정보가 누락되었습니다." });
  }

  try {
    console.log("📥 신고 데이터 수신:", { postId, userId: req.userId, reason });
    
    // 게시물 제목 가져오기 (게시물이 삭제되어도 신고 내역을 유지하기 위해 미리 저장)
    const [posts] = await pool.query("SELECT title FROM vote_posts WHERE id = ?", [postId]);
    const postTitle = posts.length > 0 ? posts[0].title : "알 수 없는 게시물";

    const [result] = await pool.query(
      "INSERT INTO reports (post_id, post_title, user_id, reason) VALUES (?, ?, ?, ?)",
      [postId, postTitle, req.userId, reason]
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
