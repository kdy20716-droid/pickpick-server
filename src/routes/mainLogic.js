import express from "express";
import pool from "../db.js"; // DB 연결 가져오기

const router = express.Router();

const MAIN_FEATURED_VOTE_QUERY = `
  SELECT
    p.id,
    p.title,
    p.candidate_a_name,
    p.candidate_a_image,
    COALESCE(p.candidate_a_count, 0) AS candidate_a_count,
    p.candidate_b_name,
    p.candidate_b_image,
    COALESCE(p.candidate_b_count, 0) AS candidate_b_count,
    COALESCE(p.view_count, 0) AS view_count,
    (
      COALESCE(p.candidate_a_count, 0) +
      COALESCE(p.candidate_b_count, 0)
    ) AS total_votes
  FROM vote_posts p
  ORDER BY total_votes DESC
  LIMIT 1
`;

async function getFeaturedVote() {
  const [rows] = await pool.query(MAIN_FEATURED_VOTE_QUERY);
  return rows[0] ?? null;
}

// http://localhost:4000/main
router.get("/", async (req, res) => {
  try {
    res.json({
      success: true,
      featuredVote: await getFeaturedVote(),
    });
  } catch (error) {
    console.error("메인 인기 투표 조회 에러:", error);
    res.status(500).json({
      success: false,
      message: "서버 오류로 메인 인기 투표 조회에 실패했습니다.",
    });
  }
});

export default router;
