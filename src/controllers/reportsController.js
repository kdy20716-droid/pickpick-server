import express from "express";
import jwt from "jsonwebtoken";
import { createReport } from "../services/reportService.js";

const router = express.Router();

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    req.userId = null;
    return next();
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.userId = decoded.userId;
  } catch (error) {
    req.userId = null;
  }

  return next();
};

router.post("/", optionalAuth, async (req, res) => {
  const { postId, reason } = req.body;

  if (!postId || !reason) {
    return res.status(400).json({
      success: false,
      message: "필수 정보가 누락되었습니다.",
    });
  }

  try {
    const reportId = await createReport({
      postId,
      reason,
      userId: req.userId,
    });

    return res.status(201).json({
      success: true,
      message: "신고가 접수되었습니다.",
      reportId,
    });
  } catch (error) {
    console.error("[Report Create Error]", error);
    return res.status(500).json({
      success: false,
      message: "신고 처리에 실패했습니다.",
      error: error.message,
      code: error.code,
    });
  }
});

export default router;
