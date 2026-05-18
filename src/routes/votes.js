import express from "express";
import pool from "../db.js"; // DB 연결 가져오기
import { updateGrade } from "../utils/grade.js";

const router = express.Router();

// 투표하기 API (POST /api/votes/:postId)
router.post("/:postId", async (req, res) => {
  const { postId } = req.params;
  const { user_id, selected_side } = req.body; // 'A' 또는 'B'

  if (!user_id || !selected_side) {
    return res.status(400).json({ success: false, message: "user_id와 selected_side('A' 또는 'B')가 필요합니다." });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // [추가] 만료 여부 확인
    const [posts] = await conn.query(
      "SELECT expires_at FROM vote_posts WHERE id = ?",
      [postId]
    );

    if (posts.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "게시글을 찾을 수 없습니다." });
    }

    const expiresAt = new Date(posts[0].expires_at);
    if (expiresAt <= new Date()) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "이미 만료된 투표입니다." });
    }

    // 1. 투표 기록 추가 (이미 투표했으면 ER_DUP_ENTRY 에러 발생)
    await conn.query(
      "INSERT INTO vote_records (post_id, user_id, selected_side) VALUES (?, ?, ?)",
      [postId, user_id, selected_side]
    );

    // 2. 게시글의 해당 진영 투표수 증가
    const updateColumn = selected_side === "A" ? "candidate_a_count" : "candidate_b_count";
    await conn.query(
      `UPDATE vote_posts SET ${updateColumn} = ${updateColumn} + 1 WHERE id = ?`,
      [postId]
    );

    // 3. 사용자 투표 참여 횟수 증가 및 등급 업데이트
    await conn.query(
      "UPDATE users SET vote_participation_count = COALESCE(vote_participation_count, 0) + 1 WHERE id = ?",
      [user_id]
    );

    // 4. 업데이트된 최신 투표수 가져오기 (비율 계산을 위해)
    const [rows] = await conn.query(
      "SELECT candidate_a_count, candidate_b_count FROM vote_posts WHERE id = ?",
      [postId]
    );

    await conn.commit();

    // 트랜잭션 종료 후 등급 계산
    try {
      await updateGrade(user_id);
    } catch (gradeError) {
      console.error("❌ 등급 업데이트 중 에러 (투표는 성공):", gradeError);
    }

    res.status(200).json({
      success: true,
      message: "투표 완료!",
      counts: rows[0]
    });
  } catch (error) {
    if (conn) await conn.rollback();
    console.error("❌ 투표 처리 상세 에러:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      userId: user_id,
      postId: postId
    });
    
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ success: false, message: "이미 참여한 투표입니다." });
    } else if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(401).json({ success: false, message: "유효하지 않은 계정입니다. 다시 로그인해주세요." });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: "서버 에러 발생", 
        error: error.message // 디버깅을 위해 에러 메시지 포함
      });
    }
  } finally {
    if (conn) conn.release();
  }
});

// 좋아요 토글 API (POST /api/votes/:postId/like)
router.post("/:postId/like", async (req, res) => {
  const { postId } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ success: false, message: "user_id가 필요합니다." });
  }

  try {
    // 이미 좋아요를 눌렀는지 확인
    const [existingLike] = await pool.query(
      "SELECT * FROM likes WHERE post_id = ? AND user_id = ?",
      [postId, user_id]
    );

    if (existingLike.length > 0) {
      // 이미 좋아요를 눌렀으면 취소 (삭제)
      await pool.query("DELETE FROM likes WHERE post_id = ? AND user_id = ?", [postId, user_id]);
      return res.status(200).json({ success: true, liked: false, message: "좋아요 취소" });
    } else {
      // 좋아요 추가
      await pool.query("INSERT INTO likes (post_id, user_id) VALUES (?, ?)", [postId, user_id]);
      return res.status(200).json({ success: true, liked: true, message: "좋아요 추가" });
    }
  } catch (error) {
    console.error("좋아요 처리 에러:", error);
    res.status(500).json({ success: false, message: "서버 에러 발생" });
  }
});

// 특정 투표의 댓글 조회 API (GET /api/votes/:postId/comments)
router.get("/:postId/comments", async (req, res) => {
  const { postId } = req.params;
  
  try {
    const [comments] = await pool.query(
      `SELECT c.*, COALESCE(u.name, u.nickname) as author, u.profile_image as author_image, u.selected_border as author_border,
              (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) as likes
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.post_id = ? 
       ORDER BY c.created_at DESC`,
      [postId],
    );
    res.status(200).json({ success: true, comments });
  } catch (error) {
    console.error("댓글 조회 에러 상세:", error);
    res.status(500).json({ success: false, message: "서버 에러 발생", error: error.message });
  }
});

// 특정 투표에 댓글 추가 API (POST /api/votes/:postId/comments)
router.post("/:postId/comments", async (req, res) => {
  const { postId } = req.params;
  const { user_id, content, parent_id } = req.body;

  if (!user_id || !content) {
    return res.status(400).json({ success: false, message: "user_id와 content가 필요합니다." });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO comments (post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)",
      [postId, user_id, content, parent_id || null]
    );
    
    const insertId = result.insertId;

    // 알림 추가 로직 (에러 발생 시에도 댓글 작성은 유지되도록 개별 try-catch)
    try {
      const [posts] = await pool.query("SELECT author_id FROM vote_posts WHERE id = ?", [postId]);
      const postAuthorId = posts.length > 0 ? posts[0].author_id : null;

      if (parent_id) {
        const [parentComments] = await pool.query("SELECT user_id FROM comments WHERE id = ?", [parent_id]);
        const parentAuthorId = parentComments.length > 0 ? parentComments[0].user_id : null;

        if (parentAuthorId && parentAuthorId !== user_id) {
          await pool.query(
            "INSERT INTO notifications (user_id, sender_id, type, post_id, comment_id) VALUES (?, ?, ?, ?, ?)",
            [parentAuthorId, user_id, "REPLY_ON_COMMENT", postId, insertId]
          );
        }

        if (postAuthorId && postAuthorId !== user_id && postAuthorId !== parentAuthorId) {
          await pool.query(
            "INSERT INTO notifications (user_id, sender_id, type, post_id, comment_id) VALUES (?, ?, ?, ?, ?)",
            [postAuthorId, user_id, "COMMENT_ON_POST", postId, insertId]
          );
        }
      } else {
        if (postAuthorId && postAuthorId !== user_id) {
          await pool.query(
            "INSERT INTO notifications (user_id, sender_id, type, post_id, comment_id) VALUES (?, ?, ?, ?, ?)",
            [postAuthorId, user_id, "COMMENT_ON_POST", postId, insertId]
          );
        }
      }
    } catch (notifError) {
      console.error("알림 생성 중 에러 (댓글 작성은 성공):", notifError);
    }

    // 추가된 댓글 정보를 바로 반환 (작성자 이름 및 프로필 이미지 포함)
    const [newComment] = await pool.query(
      `SELECT c.*, COALESCE(u.name, u.nickname) as author, u.profile_image as author_image, u.selected_border as author_border
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.id = ?`,
      [insertId]
    );

    res.status(201).json({ success: true, comment: newComment[0] });
  } catch (error) {
    console.error("댓글 추가 에러 상세:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({ success: false, message: "서버 에러 발생", error: error.message });
  }
});

// 특정 투표의 댓글 삭제 API (DELETE /api/votes/:postId/comments/:commentId)
router.delete("/:postId/comments/:commentId", async (req, res) => {
  const { commentId } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ success: false, message: "user_id가 필요합니다." });
  }

  try {
    const [user] = await pool.query("SELECT role FROM users WHERE id = ?", [user_id]);
    const isAdmin = user.length > 0 && user[0].role === 'admin';

    let result;
    if (isAdmin) {
      [result] = await pool.query(
        "DELETE FROM comments WHERE id = ?",
        [commentId]
      );
    } else {
      [result] = await pool.query(
        "DELETE FROM comments WHERE id = ? AND user_id = ?",
        [commentId, user_id]
      );
    }

    if (result.affectedRows > 0) {
      res.status(200).json({ success: true, message: "댓글이 삭제되었습니다." });
    } else {
      res.status(403).json({ success: false, message: "권한이 없거나 댓글이 존재하지 않습니다." });
    }
  } catch (error) {
    console.error("댓글 삭제 에러:", error);
    res.status(500).json({ success: false, message: "서버 에러 발생" });
  }
});

// 댓글 좋아요 토글 API (POST /api/votes/:postId/comments/:commentId/like)
router.post("/:postId/comments/:commentId/like", async (req, res) => {
  const { commentId } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ success: false, message: "user_id가 필요합니다." });
  }

  try {
    const [existingLike] = await pool.query(
      "SELECT * FROM comment_likes WHERE comment_id = ? AND user_id = ?",
      [commentId, user_id]
    );

    if (existingLike.length > 0) {
      await pool.query("DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?", [commentId, user_id]);
      const [countResult] = await pool.query("SELECT COUNT(*) as likes FROM comment_likes WHERE comment_id = ?", [commentId]);
      return res.status(200).json({ success: true, liked: false, likes: countResult[0].likes, message: "댓글 좋아요 취소" });
    } else {
      await pool.query("INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)", [commentId, user_id]);
      const [countResult] = await pool.query("SELECT COUNT(*) as likes FROM comment_likes WHERE comment_id = ?", [commentId]);
      return res.status(200).json({ success: true, liked: true, likes: countResult[0].likes, message: "댓글 좋아요 추가" });
    }
  } catch (error) {
    console.error("댓글 좋아요 처리 에러:", error);
    res.status(500).json({ success: false, message: "서버 에러 발생" });
  }
});

export default router;
