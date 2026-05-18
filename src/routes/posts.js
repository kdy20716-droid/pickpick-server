import express from "express";
import pool from "../db.js"; // DB 연결 가져오기
import multer from "multer";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

const router = express.Router();

// 메모리 스토리지로 변경 (Cloudinary로 바로 업로드하기 위함)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 1. 투표 게시글 목록 조회 API (검색, 카테고리, 정렬 포함) http://localhost:4000/votelist
router.get("/", async (req, res) => {
  try {
    // [추가] 만료된 투표 결과 집계 (winner_side 설정)
    // 1일이 지난 투표 중 아직 winner_side가 결정되지 않은 게시글들을 찾아 업데이트
    await pool.query(`
      UPDATE vote_posts 
      SET winner_side = CASE 
        WHEN candidate_a_count > candidate_b_count THEN 'A'
        WHEN candidate_b_count > candidate_a_count THEN 'B'
        ELSE 'DRAW'
      END
      WHERE expires_at <= NOW() AND winner_side IS NULL
    `);

    const {
      keyword,
      category,
      sort,
      user_id,
      only_voted,
      only_liked,
      author_id,
      pinned_post_id,
    } = req.query;
    let params = [];

    // 1. SELECT 절 구성: 좋아요/댓글 수는 독립된 서브쿼리로 가져와 데이터 중복 방지
    let selectClause = `
      p.*, 
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
      (COALESCE(p.candidate_a_count, 0) + COALESCE(p.candidate_b_count, 0)) as total_votes
    `;

    if (user_id) {
      selectClause += `, vr.selected_side AS user_voted_side, (l_user.id IS NOT NULL) AS user_liked`;
    }

    // 보안 및 로직 체크: 특정 필터링이 필요하지만 유저 ID가 없는 경우 빈 결과 반환
    if ((only_voted === "true" || only_liked === "true") && !user_id) {
      return res.json([]);
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

      // 현재 유저의 좋아요 여부를 확인하기 위한 JOIN
      query += ` LEFT JOIN likes l_user ON p.id = l_user.post_id AND l_user.user_id = ?`;
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

    if (pinned_post_id) {
      orderClauses.push("(p.id = ?) DESC");
      params.push(pinned_post_id);
    }
    
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

      // Cloudinary에 파일 업로드 및 URL 반환
      let candidate_a_image = null;
      if (req.files && req.files["candidate_a_image"]) {
        const file = req.files["candidate_a_image"][0];
        candidate_a_image = await uploadToCloudinary(file.buffer, file.originalname);
      }

      let candidate_b_image = null;
      if (req.files && req.files["candidate_b_image"]) {
        const file = req.files["candidate_b_image"][0];
        candidate_b_image = await uploadToCloudinary(file.buffer, file.originalname);
      }

      if (!author_id || !title || !candidate_a_name || !candidate_b_name) {
        return res
          .status(400)
          .json({ success: false, message: "필수 항목이 누락되었습니다." });
      }

      const query = `
      INSERT INTO vote_posts 
      (author_id, category, title, candidate_a_name, candidate_a_image, candidate_b_name, candidate_b_image, expires_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY))
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

// 5. 투표 게시글 삭제 API
router.delete("/:postId", async (req, res) => {
  const { postId } = req.params;
  const { user_id } = req.body; // 보안을 위해 요청 본문에서 user_id를 받음

  try {
    // 1. 게시글 정보 조회 (작성자 확인 및 이미지 URL 확보)
    const [posts] = await pool.query(
      "SELECT author_id, candidate_a_image, candidate_b_image FROM vote_posts WHERE id = ?",
      [postId],
    );

    if (posts.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "게시글을 찾을 수 없습니다." });
    }

    const post = posts[0];

    // 2. 작성자 권한 확인
    if (post.author_id.toString() !== user_id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "삭제 권한이 없습니다." });
    }

    // 3. Cloudinary에서 이미지 삭제
    if (post.candidate_a_image) {
      await deleteFromCloudinary(post.candidate_a_image);
    }
    if (post.candidate_b_image) {
      await deleteFromCloudinary(post.candidate_b_image);
    }

    // 4. DB에서 게시글 삭제
    await pool.query("DELETE FROM vote_posts WHERE id = ?", [postId]);
    res.json({ success: true, message: "게시글과 이미지가 성공적으로 삭제되었습니다." });
  } catch (error) {
    console.error("게시글 삭제 에러:", error);
    res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
  }
});

// 6. 투표 게시글 수정 API
router.put(
  "/:postId",
  upload.fields([
    { name: "candidate_a_image", maxCount: 1 },
    { name: "candidate_b_image", maxCount: 1 },
  ]),
  async (req, res) => {
    const { postId } = req.params;
    try {
      const { author_id, category, title, candidate_a_name, candidate_b_name } =
        req.body;

      // 작성자 확인
      const [posts] = await pool.query(
        "SELECT author_id FROM vote_posts WHERE id = ?",
        [postId],
      );

      if (posts.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "게시글을 찾을 수 없습니다." });
      }

      if (posts[0].author_id.toString() !== author_id.toString()) {
        return res
          .status(403)
          .json({ success: false, message: "수정 권한이 없습니다." });
      }

      // 수정할 필드 구성
      let updateFields = [];
      let values = [];

      if (category) {
        updateFields.push("category = ?");
        values.push(category);
      }
      if (title) {
        updateFields.push("title = ?");
        values.push(title);
      }
      if (candidate_a_name) {
        updateFields.push("candidate_a_name = ?");
        values.push(candidate_a_name);
      }
      if (candidate_b_name) {
        updateFields.push("candidate_b_name = ?");
        values.push(candidate_b_name);
      }

      // 이미지 처리
      if (req.files) {
        // 기존 이미지 정보 조회 (삭제를 위함)
        const [oldPost] = await pool.query("SELECT candidate_a_image, candidate_b_image FROM vote_posts WHERE id = ?", [postId]);

        if (req.files["candidate_a_image"]) {
          if (oldPost.length > 0 && oldPost[0].candidate_a_image) {
            await deleteFromCloudinary(oldPost[0].candidate_a_image);
          }
          const file = req.files["candidate_a_image"][0];
          const candidate_a_image = await uploadToCloudinary(file.buffer, file.originalname);
          updateFields.push("candidate_a_image = ?");
          values.push(candidate_a_image);
        }
        if (req.files["candidate_b_image"]) {
          if (oldPost.length > 0 && oldPost[0].candidate_b_image) {
            await deleteFromCloudinary(oldPost[0].candidate_b_image);
          }
          const file = req.files["candidate_b_image"][0];
          const candidate_b_image = await uploadToCloudinary(file.buffer, file.originalname);
          updateFields.push("candidate_b_image = ?");
          values.push(candidate_b_image);
        }
      }

      if (updateFields.length === 0) {
        return res.json({ success: true, message: "수정할 내용이 없습니다." });
      }

      values.push(postId);
      const query = `UPDATE vote_posts SET ${updateFields.join(", ")} WHERE id = ?`;
      await pool.execute(query, values);

      res.json({ success: true, message: "게시글이 성공적으로 수정되었습니다!" });
    } catch (error) {
      console.error("게시글 수정 에러:", error);
      res.status(500).json({
        success: false,
        message: "서버 오류로 게시글 수정에 실패했습니다.",
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

    // name 컬럼 추가 시도
    try { await pool.query("ALTER TABLE users ADD COLUMN name VARCHAR(50)"); } catch (e) {}

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
        expires_at TIMESTAMP NULL,
        winner_side ENUM('A', 'B', 'DRAW') NULL,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // expires_at 컬럼 추가 시도
    try { await pool.query("ALTER TABLE vote_posts ADD COLUMN expires_at TIMESTAMP NULL"); } catch (e) {}
    // winner_side 컬럼 추가 시도
    try { await pool.query("ALTER TABLE vote_posts ADD COLUMN winner_side ENUM('A', 'B', 'DRAW') NULL"); } catch (e) {}
    
    // 기존 데이터 만료 시간 설정 (1일 뒤)
    try { await pool.query("UPDATE vote_posts SET expires_at = DATE_ADD(NOW(), INTERVAL 1 DAY) WHERE expires_at IS NULL"); } catch (e) {}

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

    // parent_id 컬럼 추가 시도
    try { await pool.query("ALTER TABLE comments ADD COLUMN parent_id BIGINT DEFAULT NULL"); } catch (e) {}
    try { await pool.query("ALTER TABLE comments ADD FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE"); } catch (e) {}

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

    // 7. 댓글 좋아요 테이블 (추가)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comment_likes (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        comment_id BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_comment_like (comment_id, user_id)
      )
    `);

    // 8. 알림 테이블 (추가)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        sender_id BIGINT NOT NULL,
        type VARCHAR(50) NOT NULL,
        post_id BIGINT NOT NULL,
        comment_id BIGINT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES vote_posts(id) ON DELETE CASCADE
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
