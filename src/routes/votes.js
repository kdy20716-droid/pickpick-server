const express = require("express");
const router = express.Router();
const pool = require("./db"); // DB 연결 가져오기

// 예시: GET /api/votes 요청 처리
router.get("/", (req, res) => {
  res.send("투표 API 라우터가 정상 작동 중입니다!");
});

module.exports = router;
