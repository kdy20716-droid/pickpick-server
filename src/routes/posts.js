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

// 1. 투표 게시글 목록 조회 API
router.get("/", async (req, res) => {
  try {
    const { keyword } = req.query;
    let query = "SELECT * FROM vote_posts";
    let params = [];

    if (keyword) {
      query += " WHERE title LIKE ? OR category LIKE ?";
      params = [`%${keyword}%`, `%${keyword}%`];
    }

    query += " ORDER BY created_at DESC";

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

// 2. 투표 게시글 생성 API (이미지 업로드 포함)
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
      const candidate_a_image = req.files && req.files["candidate_a_image"]
        ? req.files["candidate_a_image"][0].filename
        : null;
      const candidate_b_image = req.files && req.files["candidate_b_image"]
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
        error: error.message
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
