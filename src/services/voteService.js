import pool from "../config/database.js";
import AppError from "../utils/AppError.js";
import { updateGrade } from "../utils/grade.js";

export async function getPostLikeCount(postId) {
  const [countResult] = await pool.query(
    "SELECT COUNT(*) as like_count FROM likes WHERE post_id = ?",
    [postId],
  );

  return Number(countResult[0]?.like_count ?? 0);
}

export async function submitVote({ postId, userId, selectedSide }) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [posts] = await conn.query(
      "SELECT expires_at FROM vote_posts WHERE id = ?",
      [postId],
    );

    if (posts.length === 0) {
      throw new AppError("게시글을 찾을 수 없습니다.", 404);
    }

    const expiresAt = posts[0].expires_at ? new Date(posts[0].expires_at) : null;
    if (expiresAt && expiresAt <= new Date()) {
      throw new AppError("이미 만료된 투표입니다.", 400);
    }

    await conn.query(
      "INSERT INTO vote_records (post_id, user_id, selected_side) VALUES (?, ?, ?)",
      [postId, userId, selectedSide],
    );

    const updateColumn =
      selectedSide === "A" ? "candidate_a_count" : "candidate_b_count";
    await conn.query(
      `UPDATE vote_posts SET ${updateColumn} = ${updateColumn} + 1 WHERE id = ?`,
      [postId],
    );

    await conn.query(
      "UPDATE users SET vote_participation_count = COALESCE(vote_participation_count, 0) + 1 WHERE id = ?",
      [userId],
    );

    const [rows] = await conn.query(
      "SELECT candidate_a_count, candidate_b_count FROM vote_posts WHERE id = ?",
      [postId],
    );

    await conn.commit();

    await updateGrade(userId).catch((error) => {
      console.error("[Grade Update Error After Vote]", error);
    });

    return rows[0];
  } catch (error) {
    await conn.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      throw new AppError("이미 참여한 투표입니다.", 400);
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      throw new AppError("유효하지 않은 계정입니다. 다시 로그인해주세요.", 401);
    }

    throw error;
  } finally {
    conn.release();
  }
}

export async function setPostLike({ postId, userId, liked }) {
  if (typeof liked === "boolean") {
    if (liked) {
      await pool.query("INSERT IGNORE INTO likes (post_id, user_id) VALUES (?, ?)", [
        postId,
        userId,
      ]);
    } else {
      await pool.query("DELETE FROM likes WHERE post_id = ? AND user_id = ?", [
        postId,
        userId,
      ]);
    }

    return {
      liked,
      like_count: await getPostLikeCount(postId),
    };
  }

  const [existingLike] = await pool.query(
    "SELECT id FROM likes WHERE post_id = ? AND user_id = ?",
    [postId, userId],
  );

  if (existingLike.length > 0) {
    await pool.query("DELETE FROM likes WHERE post_id = ? AND user_id = ?", [
      postId,
      userId,
    ]);

    return {
      liked: false,
      like_count: await getPostLikeCount(postId),
    };
  }

  await pool.query("INSERT INTO likes (post_id, user_id) VALUES (?, ?)", [
    postId,
    userId,
  ]);

  return {
    liked: true,
    like_count: await getPostLikeCount(postId),
  };
}

export async function getComments(postId) {
  const [comments] = await pool.query(
    `SELECT c.*, COALESCE(u.name, u.nickname) as author,
            u.profile_image as author_image,
            u.selected_border as author_border,
            UNIX_TIMESTAMP(c.created_at) * 1000 as created_at_ms,
            (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) as likes
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.post_id = ?
     ORDER BY c.created_at DESC`,
    [postId],
  );

  return comments;
}

async function createCommentNotifications({ postId, userId, parentId, commentId }) {
  const [posts] = await pool.query("SELECT author_id FROM vote_posts WHERE id = ?", [postId]);
  const postAuthorId = posts.length > 0 ? posts[0].author_id : null;

  if (parentId) {
    const [parentComments] = await pool.query(
      "SELECT user_id FROM comments WHERE id = ?",
      [parentId],
    );
    const parentAuthorId = parentComments.length > 0 ? parentComments[0].user_id : null;

    if (parentAuthorId && parentAuthorId !== userId) {
      await pool.query(
        "INSERT INTO notifications (user_id, sender_id, type, post_id, comment_id) VALUES (?, ?, ?, ?, ?)",
        [parentAuthorId, userId, "REPLY_ON_COMMENT", postId, commentId],
      );
    }

    if (postAuthorId && postAuthorId !== userId && postAuthorId !== parentAuthorId) {
      await pool.query(
        "INSERT INTO notifications (user_id, sender_id, type, post_id, comment_id) VALUES (?, ?, ?, ?, ?)",
        [postAuthorId, userId, "COMMENT_ON_POST", postId, commentId],
      );
    }

    return;
  }

  if (postAuthorId && postAuthorId !== userId) {
    await pool.query(
      "INSERT INTO notifications (user_id, sender_id, type, post_id, comment_id) VALUES (?, ?, ?, ?, ?)",
      [postAuthorId, userId, "COMMENT_ON_POST", postId, commentId],
    );
  }
}

export async function addComment({ postId, userId, content, parentId = null }) {
  const [result] = await pool.query(
    "INSERT INTO comments (post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)",
    [postId, userId, content, parentId],
  );

  const commentId = result.insertId;

  await createCommentNotifications({ postId, userId, parentId, commentId }).catch(
    (error) => {
      console.error("[Notification Create Error]", error);
    },
  );

  const [newComment] = await pool.query(
    `SELECT c.*, COALESCE(u.name, u.nickname) as author,
            u.profile_image as author_image,
            u.selected_border as author_border,
            UNIX_TIMESTAMP(c.created_at) * 1000 as created_at_ms
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.id = ?`,
    [commentId],
  );

  return newComment[0];
}

export async function deleteComment({ commentId, userId }) {
  const [user] = await pool.query("SELECT role FROM users WHERE id = ?", [userId]);
  const isAdmin = user.length > 0 && user[0].role === "admin";

  const [result] = isAdmin
    ? await pool.query("DELETE FROM comments WHERE id = ?", [commentId])
    : await pool.query("DELETE FROM comments WHERE id = ? AND user_id = ?", [
        commentId,
        userId,
      ]);

  if (result.affectedRows === 0) {
    throw new AppError("권한이 없거나 댓글이 존재하지 않습니다.", 403);
  }
}

export async function toggleCommentLike({ commentId, userId }) {
  const [existingLike] = await pool.query(
    "SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?",
    [commentId, userId],
  );

  const liked = existingLike.length === 0;

  if (liked) {
    await pool.query("INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)", [
      commentId,
      userId,
    ]);
  } else {
    await pool.query("DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?", [
      commentId,
      userId,
    ]);
  }

  const [countResult] = await pool.query(
    "SELECT COUNT(*) as likes FROM comment_likes WHERE comment_id = ?",
    [commentId],
  );

  return {
    liked,
    likes: countResult[0].likes,
  };
}
