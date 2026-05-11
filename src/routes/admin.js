import express from "express";
import pool from "../db.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const router = express.Router();

// 관리자 권한 확인 미들웨어
const checkAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "인증 토큰이 필요합니다." });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: "관리자 권한이 필요합니다." });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error("Admin Check Error:", error);
    return res.status(401).json({ message: "유효하지 않은 토큰입니다.", error: error.message });
  }
};

// 2차 인증 코드 발송 API : POST /admin/send-verification
router.post("/send-verification", checkAdmin, async (req, res) => {
  try {
    // 6자리 랜덤 코드 생성
    const tempCode = Math.floor(100000 + Math.random() * 900000).toString();
    const adminEmail = "kdy20716@gmail.com";

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"PICKPICK Admin" <support@pickpick.dev>`,
      to: adminEmail,
      subject: "[PICKPICK] 관리자 페이지 2차 인증 코드",
      text: `관리자 대시보드 접근을 위한 인증 코드는 [ ${tempCode} ] 입니다.\n이 코드를 화면에 입력하여 인증을 완료해주세요.`,
    };

    console.log(`📮 관리자 인증 메일 전송 중... (대상: ${adminEmail})`);
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ 관리자 이메일 발송 성공! 구글 서버 응답:", info.response);

    res.status(200).json({
      success: true,
      message: "관리자 이메일로 인증 코드가 발송되었습니다.",
      code: tempCode
    });
  } catch (error) {
    console.error("관리자 인증 코드 발송 에러:", error);
    res.status(500).json({ message: "인증 코드 발송 중 에러가 발생했습니다." });
  }
});

// 투표 검색 API : GET /admin/votes/search?q=검색어
router.get("/votes/search", checkAdmin, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res.status(400).json({ message: "검색어를 입력해주세요." });
    }

    const searchTerm = `%${q}%`;
    const [votes] = await pool.query(
      `SELECT vp.*, u.nickname as author_nickname, u.name as author_name,
              (SELECT COUNT(*) FROM comments WHERE post_id = vp.id) as comment_count
       FROM vote_posts vp
       JOIN users u ON vp.author_id = u.id
       WHERE vp.title LIKE ? OR vp.candidate_a_name LIKE ? OR vp.candidate_b_name LIKE ?
       ORDER BY vp.created_at DESC`,
      [searchTerm, searchTerm, searchTerm]
    );

    res.status(200).json({
      success: true,
      count: votes.length,
      votes: votes
    });
  } catch (error) {
    console.error("투표 검색 에러:", error);
    res.status(500).json({ message: "검색 중 에러가 발생했습니다." });
  }
});

// 투표 조회 (모든 투표 목록) : GET /admin/votes
router.get("/votes", checkAdmin, async (req, res) => {
  try {
    const [votes] = await pool.query(
      `SELECT vp.*, u.nickname as author_nickname, u.name as author_name,
              (SELECT COUNT(*) FROM comments WHERE post_id = vp.id) as comment_count
       FROM vote_posts vp
       JOIN users u ON vp.author_id = u.id
       ORDER BY vp.created_at DESC
       LIMIT 100`
    );

    res.status(200).json({
      success: true,
      count: votes.length,
      votes: votes
    });
  } catch (error) {
    console.error("투표 조회 에러:", error);
    res.status(500).json({ message: "투표 조회 중 에러가 발생했습니다." });
  }
});

// 투표 삭제 API : DELETE /admin/votes/:voteId
router.delete("/votes/:voteId", checkAdmin, async (req, res) => {
  try {
    const { voteId } = req.params;

    const [result] = await pool.query(
      "DELETE FROM vote_posts WHERE id = ?",
      [voteId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "투표를 찾을 수 없습니다." });
    }

    res.status(200).json({
      success: true,
      message: "투표가 삭제되었습니다."
    });
  } catch (error) {
    console.error("투표 삭제 에러:", error);
    res.status(500).json({ message: "투표 삭제 중 에러가 발생했습니다." });
  }
});

// 댓글 조회 API : GET /admin/comments?postId=투표ID
router.get("/comments", checkAdmin, async (req, res) => {
  try {
    const { postId } = req.query;

    let query = `SELECT c.*, u.nickname as author_nickname, u.name as author_name,
                        vp.title as vote_title
                 FROM comments c
                 JOIN users u ON c.user_id = u.id
                 JOIN vote_posts vp ON c.post_id = vp.id`;
    let params = [];

    if (postId) {
      query += " WHERE c.post_id = ?";
      params.push(postId);
    }

    query += " ORDER BY c.created_at DESC LIMIT 200";

    const [comments] = await pool.query(query, params);

    res.status(200).json({
      success: true,
      count: comments.length,
      comments: comments
    });
  } catch (error) {
    console.error("댓글 조회 에러:", error);
    res.status(500).json({ message: "댓글 조회 중 에러가 발생했습니다." });
  }
});

// 댓글 삭제 API : DELETE /admin/comments/:commentId
router.delete("/comments/:commentId", checkAdmin, async (req, res) => {
  try {
    const { commentId } = req.params;

    const [result] = await pool.query(
      "DELETE FROM comments WHERE id = ?",
      [commentId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
    }

    res.status(200).json({
      success: true,
      message: "댓글이 삭제되었습니다."
    });
  } catch (error) {
    console.error("댓글 삭제 에러:", error);
    res.status(500).json({ message: "댓글 삭제 중 에러가 발생했습니다." });
  }
});

export default router;
