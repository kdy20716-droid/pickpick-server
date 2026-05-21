import express from "express";
import pool from "../db.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/email.js";
import { deleteFromCloudinary } from "../utils/cloudinary.js";

const router = express.Router();

// 관리자 권한 확인 미들웨어
const checkAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "인증 토큰이 필요합니다." });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "관리자 권한이 필요합니다." });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error("Admin Check Error:", error);
    return res
      .status(401)
      .json({ message: "유효하지 않은 토큰입니다.", error: error.message });
  }
};

// 2차 인증 코드 발송 API : POST /admin/send-verification
router.post("/send-verification", checkAdmin, async (req, res) => {
  try {
    // 6자리 랜덤 코드 생성
    const tempCode = Math.floor(100000 + Math.random() * 900000).toString();
    const adminEmail = "kdy20716@gmail.com";

    console.log(
      `📮 관리자 인증 메일 전송 시도 중 (Brevo)... (대상: ${adminEmail})`,
    );
    await sendEmail({
      to: adminEmail,
      subject: "[PICKPICK] 관리자 페이지 2차 인증 코드",
      text: `관리자 대시보드 접근을 위한 인증 코드는 [ ${tempCode} ] 입니다.\n이 코드를 화면에 입력하여 인증을 완료해주세요.`,
    });
    console.log("✅ 관리자 이메일 발송 성공!");

    res.status(200).json({
      success: true,
      message: "관리자 이메일로 인증 코드가 발송되었습니다.",
      code: tempCode,
    });
  } catch (error) {
    console.error("❌ 관리자 인증 코드 발송 에러 상세:", error);
    res.status(500).json({
      message: "인증 코드 발송 중 에러가 발생했습니다. (Brevo)",
      error: error.message,
    });
  }
});

// 투표 검색 API : GET /admin/votes/search?q=검색어&page=1&limit=50
router.get("/votes/search", checkAdmin, async (req, res) => {
  try {
    const { q, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    if (!q || q.trim() === "") {
      return res.status(400).json({ message: "검색어를 입력해주세요." });
    }

    const searchTerm = `%${q}%`;
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM vote_posts vp
       JOIN users u ON vp.author_id = u.id
       WHERE vp.title LIKE ? OR vp.candidate_a_name LIKE ? OR vp.candidate_b_name LIKE ?`,
      [searchTerm, searchTerm, searchTerm]
    );

    const [votes] = await pool.query(
      `SELECT vp.*, u.nickname as author_nickname, u.name as author_name,
              (SELECT COUNT(*) FROM comments WHERE post_id = vp.id) as comment_count
       FROM vote_posts vp
       JOIN users u ON vp.author_id = u.id
       WHERE vp.title LIKE ? OR vp.candidate_a_name LIKE ? OR vp.candidate_b_name LIKE ?
       ORDER BY vp.created_at DESC
       LIMIT ? OFFSET ?`,
      [searchTerm, searchTerm, searchTerm, Number(limit), Number(offset)]
    );

    res.status(200).json({
      success: true,
      total: countRows[0].total,
      votes: votes,
    });
  } catch (error) {
    console.error("투표 검색 에러:", error);
    res.status(500).json({ message: "검색 중 에러가 발생했습니다." });
  }
});

// 투표 조회 (모든 투표 목록) : GET /admin/votes?page=1&limit=50
router.get("/votes", checkAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const [countRows] = await pool.query("SELECT COUNT(*) as total FROM vote_posts");

    const [votes] = await pool.query(
      `SELECT vp.*, u.nickname as author_nickname, u.name as author_name,
              (SELECT COUNT(*) FROM comments WHERE post_id = vp.id) as comment_count
       FROM vote_posts vp
       JOIN users u ON vp.author_id = u.id
       ORDER BY vp.created_at DESC
       LIMIT ? OFFSET ?`,
      [Number(limit), Number(offset)]
    );

    res.status(200).json({
      success: true,
      total: countRows[0].total,
      votes: votes,
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

    const [votes] = await pool.query(
      "SELECT candidate_a_image, candidate_b_image FROM vote_posts WHERE id = ?",
      [voteId],
    );

    if (votes.length === 0) {
      return res.status(404).json({ message: "투표를 찾을 수 없습니다." });
    }

    const vote = votes[0];

    if (vote.candidate_a_image) {
      await deleteFromCloudinary(vote.candidate_a_image);
    }
    if (vote.candidate_b_image) {
      await deleteFromCloudinary(vote.candidate_b_image);
    }

    await pool.query("DELETE FROM vote_posts WHERE id = ?", [voteId]);

    res.status(200).json({
      success: true,
      message: "투표와 연관된 이미지가 삭제되었습니다.",
    });
  } catch (error) {
    console.error("투표 삭제 에러:", error);
    res.status(500).json({ message: "투표 삭제 중 에러가 발생했습니다." });
  }
});

// --- 유저 관리 API ---

// 유저 목록 조회 : GET /admin/users?page=1&limit=50
router.get("/users", checkAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const [countRows] = await pool.query("SELECT COUNT(*) as total FROM users");

    const [users] = await pool.query(
      "SELECT id, nickname, name, email, tier, selected_border, unlocked_borders, role, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [Number(limit), Number(offset)]
    );
    res.status(200).json({ success: true, total: countRows[0].total, users });
  } catch (error) {
    console.error("유저 목록 조회 에러:", error);
    res
      .status(500)
      .json({ message: "유저 목록을 불러오는 중 에러가 발생했습니다." });
  }
});

// 유저 티어/권한 수정 : PUT /admin/users/:userId/status
router.put("/users/:userId/status", checkAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { tier, unlocked_borders } = req.body;

    let updateFields = [];
    let params = [];

    if (tier) {
      updateFields.push("tier = ?");
      params.push(tier);
      updateFields.push("grade = ?");
      params.push(tier.toUpperCase());
      updateFields.push("selected_border = ?");
      params.push(tier);
    }

    if (unlocked_borders !== undefined) {
      updateFields.push("unlocked_borders = ?");
      params.push(unlocked_borders);
    }

    if (updateFields.length === 0)
      return res.status(400).json({ message: "수정할 내용이 없습니다." });

    params.push(userId);
    await pool.query(
      `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`,
      params,
    );

    res
      .status(200)
      .json({ success: true, message: "유저 정보가 수정되었습니다." });
  } catch (error) {
    console.error("유저 수정 에러:", error);
    res.status(500).json({ message: "유저 수정 중 에러가 발생했습니다." });
  }
});

// 유저 강제 탈퇴 API : DELETE /admin/users/:userId
router.delete("/users/:userId", checkAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const [users] = await pool.query(
      "SELECT profile_image FROM users WHERE id = ?",
      [userId],
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "유저를 찾을 수 없습니다." });
    }

    const user = users[0];
    if (user.profile_image) {
      await deleteFromCloudinary(user.profile_image);
    }

    await pool.query("DELETE FROM users WHERE id = ?", [userId]);

    res.status(200).json({
      success: true,
      message: "유저가 강제 탈퇴 처리되었습니다.",
    });
  } catch (error) {
    console.error("유저 강제 탈퇴 에러:", error);
    res.status(500).json({ message: "유저 탈퇴 처리 중 에러가 발생했습니다." });
  }
});

// --- 신고 관리 API ---

// 신고 목록 조회 : GET /admin/reports?page=1&limit=30
router.get("/reports", checkAdmin, async (req, res) => {
  try {
    // 1. 테이블 존재 여부 및 컬럼 구조 강제 교정 (충돌 방지)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT,
        user_id INT,
        reason TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const { page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;

    // 2. 전체 개수 조회
    const [countRows] = await pool.query("SELECT COUNT(*) as total FROM reports");

    // 3. 목록 조회 (JOIN 시 데이터가 없는 경우를 대비해 LEFT JOIN 사용)
    // u.nickname 대신 u.name을 고려하거나 COALESCE 사용
    const [reports] = await pool.query(
      `SELECT 
        r.id, r.post_id, r.user_id, r.reason, r.status, r.created_at,
        COALESCE(u.nickname, u.name, '탈퇴유저') as reporter_nickname,
        COALESCE(vp.title, '삭제된 게시물') as vote_title
       FROM reports r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN vote_posts vp ON r.post_id = vp.id
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [Number(limit), Number(offset)]
    );

    res.status(200).json({ 
      success: true, 
      total: countRows[0].total, 
      reports 
    });
  } catch (error) {
    console.error("신고 목록 조회 에러 상세:", error);
    res.status(500).json({ 
      success: false,
      message: "신고 목록을 불러오는 중 서버 에러가 발생했습니다.",
      error: error.message 
    });
  }
});

// 신고 상태 업데이트 : PUT /admin/reports/:id/status
router.put("/reports/:id/status", checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.query("UPDATE reports SET status = ? WHERE id = ?", [status, id]);
    res.status(200).json({ success: true, message: "신고 상태가 업데이트되었습니다." });
  } catch (error) {
    console.error("신고 상태 업데이트 에러:", error);
    res.status(500).json({ message: "신고 처리에 실패했습니다." });
  }
});

// --- 이메일 차단(BAN) 관리 API ---

// 차단된 이메일 목록 조회 : GET /admin/banned-emails?page=1&limit=30
router.get("/banned-emails", checkAdmin, async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS banned_emails (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const { page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;

    const [countRows] = await pool.query("SELECT COUNT(*) as total FROM banned_emails");

    const [rows] = await pool.query(
      "SELECT * FROM banned_emails ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [Number(limit), Number(offset)]
    );
    res.status(200).json({ success: true, total: countRows[0].total, bannedEmails: rows });
  } catch (error) {
    console.error("차단 이메일 조회 에러:", error);
    res
      .status(500)
      .json({ message: "차단 목록을 불러오는 중 에러가 발생했습니다." });
  }
});

// 이메일 차단 추가 : POST /admin/banned-emails
router.post("/banned-emails", checkAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ message: "이메일을 입력해주세요." });

    await pool.query("INSERT IGNORE INTO banned_emails (email) VALUES (?)", [
      email,
    ]);
    res
      .status(201)
      .json({ success: true, message: "이메일이 차단되었습니다." });
  } catch (error) {
    console.error("이메일 차단 추가 에러:", error);
    res.status(500).json({ message: "이메일 차단 중 에러가 발생했습니다." });
  }
});

// 이메일 차단 해제 : DELETE /admin/banned-emails/:id
router.delete("/banned-emails/:id", checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM banned_emails WHERE id = ?", [id]);
    res
      .status(200)
      .json({ success: true, message: "이메일 차단이 해제되었습니다." });
  } catch (error) {
    console.error("이메일 차단 해제 에러:", error);
    res.status(500).json({ message: "차단 해제 중 에러가 발생했습니다." });
  }
});

export default router;
