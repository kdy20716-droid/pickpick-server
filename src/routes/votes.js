import express from "express";
import pool from "../db.js"; // DB 연결 가져오기

const router = express.Router();

// http://localhost:4000/api/votes
// 예시: GET /api/votes 요청 처리
router.get("/", (req, res) => {
  res.send("투표 API 라우터가 정상 작동 중입니다!");
});

export default router;
