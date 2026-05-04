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
    const { keyword, category, sort, user_id, only_voted, only_liked, author_id } = req.query;
    let params = [];

    // 1. SELECT 절 구성: 좋아요/댓글 수는 독립된 서브쿼리로 가져와 데이터 중복 방지
    let selectClause = `
      p.*, 
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
      (COALESCE(p.candidate_a_count, 0) + COALESCE(p.candidate_b_count, 0)) as total_votes
    `;

    if (user_id) {
      selectClause += `, vr.selected_side AS user_voted_side`;
    }

    let query = `SELECT ${selectClause} FROM vote_posts p`;

    // 2. JOIN 절 구성
    if (user_id) {
      if (only_voted === "true") {
        query += ` INNER JOIN vote_records vr ON p.id = vr.post_id AND vr.user_id = ?`;
      } else {
        query += ` LEFT JOIN vote_records vr ON p.id = vr.post_id AND vr.user_id = ?`;
      }
      params.push(user_id);
    }

    if (only_liked === "true" && user_id) {
      query += ` INNER JOIN likes l ON p.id = l.post_id AND l.user_id = ?`;
      params.push(user_id);
    }

    // 3. WHERE 절 구성
    let conditions = [];
    if (keyword) {
      conditions.push("(p.title LIKE ? OR p.category LIKE ?)");
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (category && category !== "전체") {
      conditions.push("p.category = ?");
      params.push(category);
    }

    if (author_id) {
      conditions.push("p.author_id = ?");
      params.push(author_id);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    // 4. ORDER BY 절 구성
    let orderClauses = [];
    
    // 로그인 시 투표하지 않은 게시글 우선 (NULL 우선 정렬)
    if (user_id) {
      orderClauses.push("vr.selected_side IS NOT NULL ASC"); // NULL(0) < NOT NULL(1)
    }

    if (sort === "popular") {
      orderClauses.push("total_votes DESC", "p.view_count DESC");
    } else if (sort === "comments") {
      orderClauses.push("comment_count DESC", "p.created_at DESC");
    } else if (sort === "name_asc") {
      orderClauses.push("p.title ASC");
    } else if (sort === "name_desc") {
      orderClauses.push("p.title DESC");
    } else if (sort === "random") {
      orderClauses.push("RAND()");
    } else {
      orderClauses.push("p.created_at DESC");
    }

    if (orderClauses.length > 0) {
      query += " ORDER BY " + orderClauses.join(", ");
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error("게시글 조회 에러 상세:", error);
    res.status(500).json({
      success: false,
      message: "서버 오류로 게시글 조회에 실패했습니다.",
      error: error.message
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

// DB 데이터 전체 확인용 API (디버깅용) http://localhost:4000/votelist/debug-data
router.get("/debug-data", async (req, res) => {
  try {
    const [users] = await pool.query("SELECT * FROM users");
    const [posts] = await pool.query("SELECT * FROM vote_posts");
    res.json({
      success: true,
      userCount: users.length,
      users: users,
      postCount: posts.length,
      posts: posts
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DB 테이블 초기화 API (누락된 테이블 생성용) http://localhost:4000/votelist/init-db
router.get("/init-db", async (req, res) => {
  try {
    // 1. 카테고리 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE
      )
    `);

    // 2. 유저 테이블 (이미 존재할 경우 name 컬럼이 없을 수 있음)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        nickname VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // name 컬럼이 없는 경우를 대비해 강제로 추가 시도 (오류 무시)
    try {
      await pool.query("ALTER TABLE users ADD COLUMN name VARCHAR(50)");
    } catch (e) {
      // 이미 컬럼이 있으면 에러가 나지만 무시하고 진행
    }


    // 3. 투표 게시글 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vote_posts (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        author_id BIGINT NOT NULL,
        category VARCHAR(50),
        title VARCHAR(255) NOT NULL,
        candidate_a_name VARCHAR(255) NOT NULL,
        candidate_a_image VARCHAR(255),
        candidate_a_count INT DEFAULT 0,
        candidate_b_name VARCHAR(255) NOT NULL,
        candidate_b_image VARCHAR(255),
        candidate_b_count INT DEFAULT 0,
        view_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 4. 투표 기록 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vote_records (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        post_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        selected_side ENUM('A', 'B') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES vote_posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_vote (post_id, user_id)
      )
    `);

    // 5. 댓글 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        post_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        content TEXT NOT NULL,
        parent_id BIGINT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES vote_posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 6. 좋아요 테이블
    await pool.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        post_id BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES vote_posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_like (post_id, user_id)
      )
    `);

    res.json({ success: true, message: "모든 테이블이 성공적으로 확인/생성되었습니다." });
  } catch (error) {
    console.error("DB 초기화 에러:", error);
    res.status(500).json({ success: false, message: "DB 초기화 실패", error: error.message });
  }
});

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
