import "dotenv/config";
// const express = require("express"); // 옛날 문법
import express from "express"; // ES 문법 (자바스크립트 최신문법)
import cors from "cors";
import pool from "./db.js";
import path from "path";
import fs from "fs";

import { sendEmail } from "./utils/email.js";

// 라우터 가져오기
import usersRouter from "./routes/users.js";
import voteListRouter from "./routes/posts.js";
import votesRouter from "./routes/votes.js";
import mainRouter from "./routes/mainLogic.js";
import adminRouter from "./routes/admin.js";
import reportsRouter from "./routes/reports.js";

const app = express();

console.log("🚀 [System] 서버 초기화 시작...");

// CORS 설정
app.use(
  cors({
    origin: [
      "https://pickpick.dev",
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(express.json());

// DB 마이그레이션 (비동기로 실행하여 부팅 차단 방지)
async function initializeDatabase() {
  console.log("📂 [DB] 스키마 초기화 시도 중...");
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100)`,
    );
    await conn.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(100)`,
    );
    await conn.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS birth VARCHAR(8)`,
    );
    await conn.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10)`,
    );
    await conn.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality VARCHAR(10)`,
    );
    await conn.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255)`,
    );
    await conn.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS role ENUM('user', 'admin') DEFAULT 'user'`,
    );

    // 미디어 타입 컬럼 추가
    await conn.query(
      `ALTER TABLE vote_posts ADD COLUMN IF NOT EXISTS candidate_a_type VARCHAR(20) DEFAULT 'image'`,
    );
    await conn.query(
      `ALTER TABLE vote_posts ADD COLUMN IF NOT EXISTS candidate_b_type VARCHAR(20) DEFAULT 'image'`,
    );

    // 월간 업적 테이블 추가 (마스터, 챌린저 티어용)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS monthly_achievements (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        year_month VARCHAR(7) NOT NULL, -- YYYY-MM 형식
        top3_count INT DEFAULT 0,
        top1_count INT DEFAULT 0,
        UNIQUE KEY user_month (user_id, year_month),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 신고 테이블 추가
    await conn.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        post_id BIGINT NULL,
        post_title VARCHAR(255) NULL,
        user_id BIGINT NULL,
        reason TEXT NOT NULL,
        status ENUM('pending', 'resolved', 'ignored') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES vote_posts(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    console.log("✅ [DB] Database schema initialized");
  } catch (error) {
    console.error("⚠️ [DB] Database initialization failed:", error.message);
  } finally {
    if (conn) conn.release();
  }
}

initializeDatabase();

const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const clientDistPath = path.resolve(__dirname, "../pickpick-client/dist");
const clientIndexPath = path.join(clientDistPath, "index.html");
const hasClientBuild = fs.existsSync(clientIndexPath);

if (hasClientBuild) {
  app.use(express.static(clientDistPath));
}

app.use("/users", usersRouter);
app.use("/votelist", voteListRouter);
app.use("/api/votes", votesRouter);
app.use("/main", mainRouter);
app.use("/admin", adminRouter);
app.use("/reports", reportsRouter);

app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

app.get("/db-test", async (req, res) => {
  try {
    const [result] = await pool.query("SELECT 1 + 1 AS result");
    res.status(200).json({ success: true, message: "DB 연결 성공!", result });
  } catch (error) {
    console.error("❌ DB 연결 테스트 실패:", error);
    res
      .status(500)
      .json({ success: false, message: "DB 연결 실패", error: error.message });
  }
});

app.get("/test-mail-direct", async (req, res) => {
  const emailUser = process.env.EMAIL_USER;

  if (!emailUser) {
    return res
      .status(500)
      .json({ success: false, message: "EMAIL_USER 설정 누락" });
  }

  try {
    console.log("🚀 [Test] Brevo API를 통한 테스트 메일 발송 시도...");
    const result = await sendEmail({
      to: emailUser,
      subject: "[PICKPICK] Brevo API 전환 테스트",
      text: "Gmail SMTP 대신 Brevo API를 사용하여 전송된 메일입니다. 이제 DigitalOcean 서버에서도 안정적으로 발송됩니다.",
    });

    res.json({
      success: true,
      message: "Brevo API 발송 성공!",
      result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Brevo API 발송 실패",
      error: error.message,
    });
  }
});

if (hasClientBuild) {
  app.get("*", (req, res, next) => {
    if (!req.accepts("html")) {
      return next();
    }

    return res.sendFile(clientIndexPath);
  });
}

app.use((err, req, res, next) => {
  console.error("🔥 [Global Error]:", err);
  res.status(500).json({
    message: "서버 내부 에러가 발생했습니다.",
    error: err.message,
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 [System] 서버가 ${PORT}번 포트에서 시작되었습니다.`);
});
