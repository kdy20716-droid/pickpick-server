const express = require("express");
const router = express.Router();
const pool = require("./db"); // DB 연결 가져오기

// 1. 투표 게시글 목록 조회 API (일단 작동 확인용 메세지)
router.get("/", (req, res) => {
  res.send("게시글 API 라우터가 정상 작동 중입니다!");
});

// 2. 투표 게시글 생성 API (클라이언트의 Create.jsx 에서 데이터를 보낼 곳)
router.post("/", async (req, res) => {
  try {
    // 클라이언트가 보낸 데이터(body) 꺼내기
    const { 
      author_id, 
      category, 
      title, 
      candidate_a_name, 
      candidate_a_image, 
      candidate_b_name, 
      candidate_b_image 
    } = req.body;

    // 데이터가 다 있는지 간단히 검사 (이미지는 선택이라 뺌)
    if (!author_id || !title || !candidate_a_name || !candidate_b_name) {
      return res.status(400).json({ success: false, message: "필수 항목이 누락되었습니다." });
    }

    // DB에 데이터 넣기
    const query = `
      INSERT INTO vote_posts 
      (author_id, category, title, candidate_a_name, candidate_a_image, candidate_b_name, candidate_b_image) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [author_id, category, title, candidate_a_name, candidate_a_image, candidate_b_name, candidate_b_image];
    
    const [result] = await pool.execute(query, values);

    // 성공적으로 저장되면, 저장된 게시글의 번호(insertId)와 함께 성공 메세지 보내기
    res.status(201).json({ 
      success: true, 
      message: "투표 게시글이 성공적으로 생성되었습니다!",
      post_id: result.insertId 
    });

  } catch (error) {
    console.error("게시글 생성 에러:", error);
    res.status(500).json({ success: false, message: "서버 오류로 게시글 생성에 실패했습니다." });
  }
});

// DB 테이블 확인용 임시 API (포스트맨/브라우저 확인용)
router.get("/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SHOW TABLES");
    res.json({
      success: true,
      message: "DB 연결 성공! 현재 생성된 테이블 목록입니다.",
      tables: rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "DB 연결 실패 또는 테이블 조회 오류", error: error.message });
  }
});

module.exports = router;
