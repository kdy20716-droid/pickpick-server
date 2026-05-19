import pool from "../db.js";

/**
 * 사용자의 통계를 기반으로 등급을 계산하고 업데이트합니다.
 * @param {number} userId - 사용자 ID
 */
export const updateGrade = async (userId) => {
  console.log(`[Grade] Checking grade for user ${userId}...`);
  try {
    // 1. 사용자의 현재 통계 조회
    const [users] = await pool.query(
      "SELECT vote_participation_count, post_creation_count, vote_win_count, grade, role FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      console.log(`[Grade] User ${userId} not found.`);
      return;
    }

    const user = users[0];
    const role = user.role || "user";
    const vote_participation_count = user.vote_participation_count || 0;
    const post_creation_count = user.post_creation_count || 0;
    const vote_win_count = user.vote_win_count || 0;
    const currentGrade = user.grade || "UnRanked";
    
    console.log(`[Grade] User stats: v=${vote_participation_count}, p=${post_creation_count}, w=${vote_win_count}, role=${role}, current=${currentGrade}`);

    let newGrade = "UnRanked";

    // 어드민은 무조건 MASTER
    if (role === "admin") {
      newGrade = "MASTER";
    }
    // 2. 등급 기준 적용 (상위 등급부터 확인)
    else if (vote_win_count >= 1000 && post_creation_count >= 500) {
      newGrade = "MASTER";
    }
    // PLATINUM: 투표 우승 500회 이상 AND 게시글 생성 200회 이상
    else if (vote_win_count >= 500 && post_creation_count >= 200) {
      newGrade = "PLATINUM";
    }
    // GOLD: 투표 우승 100회 이상 AND 게시글 생성 100회 이상
    else if (vote_win_count >= 100 && post_creation_count >= 100) {
      newGrade = "GOLD";
    }
    // SILVER: 투표 참여 100회 이상 AND 게시글 생성 10회 이상
    else if (vote_participation_count >= 100 && post_creation_count >= 10) {
      newGrade = "SILVER";
    }
    // BRONZE: 투표 참여 10회 이상
    else if (vote_participation_count >= 10) {
      newGrade = "BRONZE";
    }

    // 3. 등급이 변경된 경우에만 DB 업데이트
    if (newGrade !== currentGrade) {
      const newTier = newGrade.toLowerCase();
      await pool.query(
        "UPDATE users SET grade = ?, tier = ? WHERE id = ?",
        [newGrade, newTier, userId]
      );
      console.log(`[Grade Update] User ${userId}: ${currentGrade} -> ${newGrade} (tier: ${newTier})`);
    }
  } catch (error) {
    console.error(`[Grade Update Error] User ${userId}:`, error);
  }
};
