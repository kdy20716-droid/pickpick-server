import express from "express";
import pool from "../db.js"; // DB 연결 가져오기
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// uploads 폴더가 없으면 생성
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 이미지 저장을 위한 multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // uploads 폴더에 저장
  },
  filename: (req, file, cb) => {
    // 파일명 중복 방지를 위해 타임스탬프 추가
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// 1. 투표 게시글 목록 조회 API (검색, 카테고리, 정렬 포함) http://localhost:4000/votelist
router.get("/", async (req, res) => {
  try {
    const { keyword, category, sort, user_id } = req.query;

    // 기본 쿼리: 좋아요 개수와 댓글 개수를 함께 가져옴
    let query = `
      SELECT p.*, 
             COUNT(DISTINCT l.id) as like_count,
             COUNT(DISTINCT c.id) as comment_count,
             (p.candidate_a_count + p.candidate_b_count) as total_votes
    `;

    if (user_id) {
      query += `, (SELECT selected_side FROM vote_records WHERE post_id = p.id AND user_id = ?) AS user_voted_side`;
    }

    query += `
      FROM vote_posts p
      LEFT JOIN likes l ON p.id = l.post_id
      LEFT JOIN comments c ON p.id = c.post_id
    `;

    let params = [];
    if (user_id) {
      params.push(user_id);
    }

    let conditions = [];

    if (keyword) {
      conditions.push("(p.title LIKE ? OR p.category LIKE ?)");
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (category && category !== "전체") {
      conditions.push("p.category = ?");
      params.push(category);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " GROUP BY p.id";

    // 정렬 로직
    let orderClauses = [];
    if (user_id) {
      orderClauses.push("user_voted_side IS NOT NULL"); // 투표 안 한 것(NULL)이 먼저 오도록 정렬 (0, 1)
    }

    if (sort === "popular") {
      orderClauses.push("total_votes DESC", "p.view_count DESC");
    } else if (sort === "comments") {
      orderClauses.push("comment_count DESC", "p.created_at DESC");
    } else if (sort === "name_asc") {
      orderClauses.push("p.title ASC");
    } else if (sort === "name_desc") {
      orderClauses.push("p.title DESC");
    } else {
      orderClauses.push("p.created_at DESC"); // 최신순 (기본값)
    }

    query += " ORDER BY " + orderClauses.join(", ");

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error("게시글 조회 에러:", error);
    res.status(500).json({
      success: false,
      message: "서버 오류로 게시글 조회에 실패했습니다.",
    });
  }
});

// 2. 랭킹 데이터 조회 API (투표수 정렬)
router.get("/ranking", async (req, res) => {
  try {
    const query = `
      SELECT p.*, (p.candidate_a_count + p.candidate_b_count) as total_votes
      FROM vote_posts p
      ORDER BY total_votes DESC
      LIMIT 10
    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error("랭킹 조회 에러:", error);
    res.status(500).json({
      success: false,
      message: "서버 오류로 랭킹 조회에 실패했습니다.",
    });
  }
});

// 3. 조회수 증가 API
router.post("/:postId/view", async (req, res) => {
  const { postId } = req.params;
  try {
    await pool.query(
      "UPDATE vote_posts SET view_count = view_count + 1 WHERE id = ?",
      [postId],
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 4. 투표 게시글 생성 API (이미지 업로드 포함)
router.post(
  "/",
  upload.fields([
    { name: "candidate_a_image", maxCount: 1 },
    { name: "candidate_b_image", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { author_id, category, title, candidate_a_name, candidate_b_name } =
        req.body;

      // 업로드된 파일 정보 가져오기
      const candidate_a_image =
        req.files && req.files["candidate_a_image"]
          ? req.files["candidate_a_image"][0].filename
          : null;
      const candidate_b_image =
        req.files && req.files["candidate_b_image"]
          ? req.files["candidate_b_image"][0].filename
          : null;

      if (!author_id || !title || !candidate_a_name || !candidate_b_name) {
        return res
          .status(400)
          .json({ success: false, message: "필수 항목이 누락되었습니다." });
      }

      const query = `
      INSERT INTO vote_posts 
      (author_id, category, title, candidate_a_name, candidate_a_image, candidate_b_name, candidate_b_image) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
      const values = [
        author_id,
        category,
        title,
        candidate_a_name,
        candidate_a_image,
        candidate_b_name,
        candidate_b_image,
      ];

      const [result] = await pool.execute(query, values);

      res.status(201).json({
        success: true,
        message: "투표 게시글이 성공적으로 생성되었습니다!",
        post_id: result.insertId,
      });
    } catch (error) {
      console.error("게시글 생성 에러:", error);
      res.status(500).json({
        success: false,
        message: "서버 오류로 게시글 생성에 실패했습니다.",
        error: error.message,
      });
    }
  },
);

// DB 테이블 확인용 임시 API (포스트맨/브라우저 확인용)
router.get("/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SHOW TABLES");
    res.json({
      success: true,
      message: "DB 연결 성공! 현재 생성된 테이블 목록입니다.",
      tables: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "DB 연결 실패 또는 테이블 조회 오류",
      error: error.message,
    });
  }
});

export default router;
