import pool from "../db.js";

/**
 * 사용자의 통계를 기반으로 등급을 계산하고 업데이트합니다.
 * @param {number} userId - 사용자 ID
 */
export const updateGrade = async (userId) => {
  console.log(`[Grade] Checking grade for user ${userId}...`);
  try {
    // 1. 사용자의 현재 통계 및 업적 조회
    const [users] = await pool.query(
      `SELECT u.vote_participation_count, u.post_creation_count, u.vote_win_count, u.grade, u.role,
              ma.top3_count, ma.top1_count
       FROM users u
       LEFT JOIN monthly_achievements ma ON u.id = ma.user_id AND ma.year_month = DATE_FORMAT(NOW(), '%Y-%m')
       WHERE u.id = ?`,
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
    const top3_count = user.top3_count || 0;
    const top1_count = user.top1_count || 0;
    const currentGrade = user.grade || "UnRanked";
    
    console.log(`[Grade] User stats: v=${vote_participation_count}, p=${post_creation_count}, w=${vote_win_count}, role=${role}, top3=${top3_count}, top1=${top1_count}, current=${currentGrade}`);

    let newGrade = "UnRanked";
    const isDiamondEligible = vote_win_count >= 1000 && post_creation_count >= 500;

    // 어드민은 무조건 CHALLENGER
    if (role === "admin") {
      newGrade = "CHALLENGER";
    }
    // CHALLENGER: 마스터 달성 후 한 달간 랭킹 1위 3회 이상
    // (다이아 요건 + top3 요건 + top1 요건을 모두 충족해야 함)
    else if (isDiamondEligible && top3_count >= 3 && top1_count >= 3) {
      newGrade = "CHALLENGER";
    }
    // MASTER: 다이아 등급 달성 후 한 달간 랭킹 1,2,3위 3회 이상
    else if (isDiamondEligible && top3_count >= 3) {
      newGrade = "MASTER";
    }
    // DIAMOND: 투표 우승 1000회 이상 AND 게시글 생성 500회 이상
    else if (isDiamondEligible) {
      newGrade = "DIAMOND";
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
        "UPDATE users SET grade = ?, tier = ?, selected_border = ? WHERE id = ?",
        [newGrade, newTier, newTier, userId]
      );
      console.log(`[Grade Update] User ${userId}: ${currentGrade} -> ${newGrade} (tier: ${newTier}, border: ${newTier})`);
    }
  } catch (error) {
    console.error(`[Grade Update Error] User ${userId}:`, error);
  }
};
