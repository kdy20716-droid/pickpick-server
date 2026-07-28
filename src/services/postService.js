import pool from "../config/database.js";
import { updateGrade } from "../utils/grade.js";

export function parseVoteExpiresAt(value) {
  if (!value) {
    return { date: null };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { error: "마감시간 형식이 올바르지 않습니다." };
  }

  if (date <= new Date()) {
    return { error: "마감시간은 현재 이후로 설정해주세요." };
  }

  return { date };
}

export function toUnixTimestamp(date) {
  return Math.floor(date.getTime() / 1000);
}

export function isTruthy(value) {
  return value === true || value === "true" || value === "1" || value === 1;
}

export async function finalizeExpiredPosts() {
  const [expiredPosts] = await pool.query(
    "SELECT id, candidate_a_count, candidate_b_count FROM vote_posts WHERE expires_at <= NOW() AND winner_side IS NULL",
  );

  for (const post of expiredPosts) {
    const {
      id: postId,
      candidate_a_count: candidateACount,
      candidate_b_count: candidateBCount,
    } = post;

    let winnerSide = "DRAW";
    if (candidateACount > candidateBCount) winnerSide = "A";
    else if (candidateBCount > candidateACount) winnerSide = "B";

    if (winnerSide !== "DRAW") {
      const [voters] = await pool.query(
        "SELECT user_id FROM vote_records WHERE post_id = ? AND selected_side = ?",
        [postId, winnerSide],
      );

      for (const voter of voters) {
        await pool.query(
          "UPDATE users SET vote_win_count = COALESCE(vote_win_count, 0) + 1 WHERE id = ?",
          [voter.user_id],
        );

        await updateGrade(voter.user_id).catch((error) => {
          console.error("[Grade Update Error After Expiration]", error);
        });
      }
    }

    await pool.query("UPDATE vote_posts SET winner_side = ? WHERE id = ?", [
      winnerSide,
      postId,
    ]);
  }
}
