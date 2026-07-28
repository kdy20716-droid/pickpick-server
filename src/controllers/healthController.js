import pool from "../config/database.js";
import { sendDirectTestMail } from "../services/mailService.js";

export const ping = (req, res) => {
  res.status(200).send("pong");
};

export const dbTest = async (req, res) => {
  try {
    const [result] = await pool.query("SELECT 1 + 1 AS result");
    res.status(200).json({
      success: true,
      message: "DB 연결 성공",
      result,
    });
  } catch (error) {
    console.error("[DB Test Error]", error);
    res.status(500).json({
      success: false,
      message: "DB 연결 실패",
      error: error.message,
    });
  }
};

export const sendTestMail = async (req, res, next) => {
  try {
    const result = await sendDirectTestMail();
    res.json({
      success: true,
      message: "Brevo API 발송 성공",
      result,
    });
  } catch (error) {
    next(error);
  }
};
