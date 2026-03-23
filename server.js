// server.js (일부)
const express = require("express");
const pool = require("./db");
const app = express();
app.use(express.json());

// [투표하기 API]
app.post("/api/votes/:postId", async (req, res) => {
  const { postId } = req.params;
  const { userId, option } = req.body; // 프론트엔드가 보내주는 값 (예: userId: 1, option: 'A')

  try {
    // 1. 투표 기록 추가 (이미 투표한 유저면 여기서 에러가 나서 catch 블록으로 넘어갑니다)
    await pool.query(
      "INSERT INTO vote_records (post_id, user_id, picked_option) VALUES (?, ?, ?)",
      [postId, userId, option],
    );

    // 2. 게시글의 A 또는 B 투표수 +1 증가시키기
    const targetColumn = option === "A" ? "count_a" : "count_b";
    await pool.query(
      `UPDATE vote_posts SET ${targetColumn} = ${targetColumn} + 1 WHERE id = ?`,
      [postId],
    );

    res.status(200).json({ success: true, message: "투표가 완료되었습니다!" });
  } catch (error) {
    // ER_DUP_ENTRY는 MySQL에서 '중복된 값'을 넣으려 할 때 뜨는 에러 코드입니다.
    if (error.code === "ER_DUP_ENTRY") {
      res
        .status(400)
        .json({ success: false, message: "이미 참여한 투표입니다." });
    } else {
      console.error(error);
      res
        .status(500)
        .json({ success: false, message: "서버 에러가 발생했습니다." });
    }
  }
});
