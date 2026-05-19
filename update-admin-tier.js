import pool from './src/db.js';

async function updateAdminTier() {
  try {
    const [admins] = await pool.query("SELECT id, nickname, role, grade, tier FROM users WHERE role = 'admin'");
    console.log("Admins found:", admins);

    if (admins.length === 0) {
      console.log("No admin user found.");
      return;
    }

    for (const admin of admins) {
      console.log(`Updating admin ${admin.nickname} (ID: ${admin.id}) to MASTER...`);
      await pool.query(
        `UPDATE users SET 
          grade = 'MASTER', 
          tier = 'master',
          vote_participation_count = GREATEST(vote_participation_count, 1000),
          post_creation_count = GREATEST(post_creation_count, 500),
          vote_win_count = GREATEST(vote_win_count, 1000)
        WHERE id = ?`,
        [admin.id]
      );
      console.log(`Successfully updated admin ${admin.nickname}`);
    }
  } catch (error) {
    console.error("Error updating admin tier:", error);
  } finally {
    process.exit(0);
  }
}

updateAdminTier();
