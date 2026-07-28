import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
  addComment,
  deleteComment,
  getComments,
  setPostLike,
  submitVote,
  toggleCommentLike,
} from "../services/voteService.js";

const router = express.Router();

const isAuthorizedUser = (req, userId) =>
  userId && parseInt(req.userId) === parseInt(userId);

const handleControllerError = (res, error, fallbackMessage) => {
  console.error("[Vote Controller Error]", error);
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: error.message || fallbackMessage,
    error: statusCode === 500 ? error.message : undefined,
  });
};

router.post("/:postId", authMiddleware, async (req, res) => {
  const { postId } = req.params;
  const { user_id: userId, selected_side: selectedSide } = req.body;

  if (!isAuthorizedUser(req, userId) || !["A", "B"].includes(selectedSide)) {
    return res.status(403).json({
      success: false,
      message: "접근 권한이 없거나 필수 데이터가 누락되었습니다.",
    });
  }

  try {
    const counts = await submitVote({ postId, userId, selectedSide });
    return res.status(200).json({
      success: true,
      message: "투표 완료",
      counts,
    });
  } catch (error) {
    return handleControllerError(res, error, "투표 처리에 실패했습니다.");
  }
});

router.post("/:postId/like", authMiddleware, async (req, res) => {
  const { postId } = req.params;
  const { user_id: userId, liked } = req.body;

  if (!isAuthorizedUser(req, userId)) {
    return res.status(403).json({
      success: false,
      message: "접근 권한이 없습니다.",
    });
  }

  try {
    const result = await setPostLike({ postId, userId, liked });
    return res.status(200).json({
      success: true,
      ...result,
      message: result.liked ? "좋아요 추가" : "좋아요 취소",
    });
  } catch (error) {
    return handleControllerError(res, error, "좋아요 처리에 실패했습니다.");
  }
});

router.get("/:postId/comments", async (req, res) => {
  try {
    const comments = await getComments(req.params.postId);
    return res.status(200).json({ success: true, comments });
  } catch (error) {
    return handleControllerError(res, error, "댓글 조회에 실패했습니다.");
  }
});

router.post("/:postId/comments", authMiddleware, async (req, res) => {
  const { postId } = req.params;
  const { user_id: userId, content, parent_id: parentId } = req.body;

  if (!isAuthorizedUser(req, userId) || !content) {
    return res.status(403).json({
      success: false,
      message: "접근 권한이 없거나 댓글 내용이 누락되었습니다.",
    });
  }

  try {
    const comment = await addComment({ postId, userId, content, parentId });
    return res.status(201).json({ success: true, comment });
  } catch (error) {
    return handleControllerError(res, error, "댓글 작성에 실패했습니다.");
  }
});

router.delete("/:postId/comments/:commentId", authMiddleware, async (req, res) => {
  const { commentId } = req.params;
  const { user_id: userId } = req.body;

  if (!isAuthorizedUser(req, userId)) {
    return res.status(403).json({
      success: false,
      message: "접근 권한이 없습니다.",
    });
  }

  try {
    await deleteComment({ commentId, userId });
    return res.status(200).json({
      success: true,
      message: "댓글이 삭제되었습니다.",
    });
  } catch (error) {
    return handleControllerError(res, error, "댓글 삭제에 실패했습니다.");
  }
});

router.post("/:postId/comments/:commentId/like", authMiddleware, async (req, res) => {
  const { commentId } = req.params;
  const { user_id: userId } = req.body;

  if (!isAuthorizedUser(req, userId)) {
    return res.status(403).json({
      success: false,
      message: "접근 권한이 없습니다.",
    });
  }

  try {
    const result = await toggleCommentLike({ commentId, userId });
    return res.status(200).json({
      success: true,
      ...result,
      message: result.liked ? "댓글 좋아요 추가" : "댓글 좋아요 취소",
    });
  } catch (error) {
    return handleControllerError(res, error, "댓글 좋아요 처리에 실패했습니다.");
  }
});

export default router;
