const express = require("express");
const router = express.Router();
const pool = require("../db");

// 1. [투표하기 API]
router.post("/:postId", async (req, res) => {
  const { postId } = req.params;
  const { userId, optionId } = req.body;

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    await conn.query(
      "INSERT INTO vote_records (post_id, user_id, option_id) VALUES (?, ?, ?)",
      [postId, userId, optionId],
    );

    await conn.query(
      "UPDATE vote_options SET vote_count = vote_count + 1 WHERE id = ?",
      [optionId],
    );

    await conn.commit();
    res.status(200).json({ success: true, message: "투표 완료!" });
  } catch (error) {
    await conn.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      res
        .status(400)
        .json({ success: false, message: "이미 참여한 투표입니다." });
    } else {
      console.error(error);
      res.status(500).json({ success: false, message: "서버 에러 발생" });
    }
  } finally {
    conn.release();
  }
});

// 2. [스킵하기 API]
router.post("/skip/:postId", async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;

  try {
    await pool.query(
      "INSERT INTO skip_records (user_id, post_id) VALUES (?, ?)",
      [userId, postId],
    );
    res.status(200).json({ success: true, message: "스킵 기록 완료" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(200).json({ success: true });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "서버 에러" });
  }
});

module.exports = router;
