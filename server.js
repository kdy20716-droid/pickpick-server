const express = require("express");
const pool = require("./db");
const app = express();
app.use(express.json());

// 1. [투표하기 API] - 선택지 ID를 받아서 투표 처리
app.post("/api/votes/:postId", async (req, res) => {
  const { postId } = req.params;
  const { userId, optionId } = req.body; // 이제 'A'가 아니라 선택지의 고유 ID(숫자)를 받음

  // 트랜잭션을 위해 커넥션 하나를 빌려옵니다. (백엔드 1명의 생존 필수템)
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction(); // 여기서부터 시작! 하나라도 실패하면 롤백합니다.

    // (1) 투표 기록 추가 (이미 투표했으면 여기서 에러 발생 -> catch로 이동)
    await conn.query(
      "INSERT INTO vote_records (post_id, user_id, option_id) VALUES (?, ?, ?)",
      [postId, userId, optionId],
    );

    // (2) 선택지 테이블의 해당 항목 투표수(vote_count) +1 증가
    await conn.query(
      "UPDATE vote_options SET vote_count = vote_count + 1 WHERE id = ?",
      [optionId],
    );

    await conn.commit(); // 모든 쿼리가 성공하면 최종 저장!
    res.status(200).json({ success: true, message: "투표 완료!" });
  } catch (error) {
    await conn.rollback(); // 에러 나면 지금까지 한 거 다 취소!
    if (error.code === "ER_DUP_ENTRY") {
      res
        .status(400)
        .json({ success: false, message: "이미 참여한 투표입니다." });
    } else {
      console.error(error);
      res.status(500).json({ success: false, message: "서버 에러 발생" });
    }
  } finally {
    conn.release(); // 빌려온 커넥션 반납 (이거 안 하면 나중에 서버 멈춰요!)
  }
});

// 2. [스킵하기 API] - 투표 안 하고 넘겼을 때 기록
app.post("/api/skip/:postId", async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;

  try {
    // skip_records 테이블에 '나 이거 봤음' 기록 남기기
    await pool.query(
      "INSERT INTO skip_records (user_id, post_id) VALUES (?, ?)",
      [userId, postId],
    );
    res.status(200).json({ success: true, message: "스킵 기록 완료" });
  } catch (error) {
    // 이미 스킵한 기록이 있어도 에러 안 내고 성공으로 쳐주거나, 중복 처리
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(200).json({ success: true });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "서버 에러" });
  }
});
// 3. [쇼츠 피드 조회 API] - 내가 안 본 투표들만 가져오기
app.get("/api/posts/feed", async (req, res) => {
  const { userId } = req.query; // 유저 ID를 쿼리 스트링으로 받음 (예: /api/posts/feed?userId=1)

  try {
    // SQL 설명: 게시글(p)을 가져오되, 내가 투표했거나 스킵한 기록이 없는 것만 랜덤으로 5개 추출
    const [posts] = await pool.query(
      `
      SELECT p.*, u.nickname as author_name
      FROM vote_posts p
      JOIN users u ON p.author_id = u.id
      WHERE p.id NOT IN (SELECT post_id FROM vote_records WHERE user_id = ?)
        AND p.id NOT IN (SELECT post_id FROM skip_records WHERE user_id = ?)
      ORDER BY RAND()
      LIMIT 5
    `,
      [userId, userId],
    );

    // 각 게시글에 딸린 선택지(options)들을 가져와서 합쳐줍니다.
    for (let post of posts) {
      const [options] = await pool.query(
        "SELECT id, content, image_url, vote_count FROM vote_options WHERE post_id = ?",
        [post.id],
      );
      post.options = options; // 게시글 객체 안에 options 배열을 쏙 넣어줌
    }

    res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "피드 로드 실패" });
  }
});
