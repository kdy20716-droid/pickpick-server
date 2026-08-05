import express from "express";
import { getFeaturedVote } from "../services/mainService.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    res.json({
      success: true,
      featuredVote: await getFeaturedVote(),
    });
  } catch (error) {
    console.error("[Main Featured Vote Error]", error);
    res.status(500).json({
      success: false,
      message: "메인 인기 투표 조회에 실패했습니다.",
    });
  }
});

export default router;
