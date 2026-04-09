const express = require("express");
const router = express.Router();
const pool = require("../db"); // 경로는 실제 위치에 맞게 수정

// 기존 /api/posts/feed 로직을 이곳으로 옮깁니다.
// 경로는 /feed가 됩니다. (server.js에서 /api/posts로 연결해주기 때문)
router.get("/feed", async (req, res) => {
  const { userId } = req.query;
  try {
    const [posts] = await pool.query(
      `
      SELECT 
        p.*, 
        u.nickname as author_name,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', o.id,
            'content', o.content,
            'image_url', o.image_url,
            'vote_count', o.vote_count
          )
        ) as options
      FROM vote_posts p
      JOIN users u ON p.author_id = u.id
      JOIN vote_options o ON p.id = o.post_id
      WHERE p.id NOT IN (SELECT post_id FROM vote_records WHERE user_id = ?)
        AND p.id NOT IN (SELECT post_id FROM skip_records WHERE user_id = ?)
      GROUP BY p.id
      ORDER BY RAND()
      LIMIT 5
    `,
      [userId, userId],
    );

    res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "피드 로드 실패" });
  }
});

// 다른 posts 관련 라우트도 여기에 추가...

module.exports = router;
