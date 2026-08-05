import pool from "../config/database.js";

const MAIN_FEATURED_VOTE_QUERY = `
  SELECT
    p.id,
    p.title,
    p.candidate_a_name,
    p.candidate_a_image,
    p.candidate_a_type,
    COALESCE(p.candidate_a_count, 0) AS candidate_a_count,
    p.candidate_b_name,
    p.candidate_b_image,
    p.candidate_b_type,
    COALESCE(p.candidate_b_count, 0) AS candidate_b_count,
    COALESCE(p.view_count, 0) AS view_count,
    (
      COALESCE(p.candidate_a_count, 0) +
      COALESCE(p.candidate_b_count, 0)
    ) AS total_votes
  FROM vote_posts p
  ORDER BY total_votes DESC, p.id DESC
  LIMIT 1
`;

export async function getFeaturedVote() {
  const [rows] = await pool.query(MAIN_FEATURED_VOTE_QUERY);
  return rows[0] ?? null;
}
