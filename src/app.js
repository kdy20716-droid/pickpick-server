import "dotenv/config";
import express from "express"; 
import cors from "cors";
import pool from "./db.js";
import path from "path";
import nodemailer from "nodemailer";
import dns from "dns";
import { promisify } from "util";

// 라우터 가져오기
import usersRouter from "./routes/users.js";
import voteListRouter from "./routes/posts.js";
import votesRouter from "./routes/votes.js";
import mainRouter from "./routes/mainLogic.js"
import adminRouter from "./routes/admin.js";

const lookup = promisify(dns.lookup);
const app = express();

console.log("🚀 [System] 서버 초기화 시작...");

// CORS 설정
app.use(cors({
  origin: ["https://pickpick.dev", "http://localhost:5173"], 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());

// DB 마이그레이션 (비동기로 실행하여 부팅 차단 방지)
async function initializeDatabase() {
  console.log("📂 [DB] 스키마 초기화 시도 중...");
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100)`);
    await conn.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(100)`);
    await conn.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS birth VARCHAR(8)`);
    await conn.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10)`);
    await conn.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality VARCHAR(10)`);
    await conn.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255)`);
    await conn.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role ENUM('user', 'admin') DEFAULT 'user'`);
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

app.use("/users", usersRouter);
app.use("/votelist", voteListRouter);
app.use("/api/votes", votesRouter);
app.use("/main", mainRouter)
app.use("/admin", adminRouter);

app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

app.get("/db-test", async (req, res) => {
  try {
    const [result] = await pool.query("SELECT 1 + 1 AS result");
    res.status(200).json({ success: true, message: "DB 연결 성공!", result });
  } catch (error) {
    console.error("❌ DB 연결 테스트 실패:", error);
    res.status(500).json({ success: false, message: "DB 연결 실패", error: error.message });
  }
});

app.get("/test-mail-direct", async (req, res) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS?.replace(/\s/g, "");

  if (!emailUser || !emailPass) {
    return res.status(500).json({ success: false, message: "이메일 설정 누락" });
  }

  const diagnostics = {
    dns: "Pending",
    port465: "Pending",
    port587: "Pending",
    serviceGmail: "Pending"
  };

  try {
    const address = await lookup("smtp.gmail.com");
    diagnostics.dns = { success: true, address: address.address };
  } catch (dnsError) {
    diagnostics.dns = { success: false, error: dnsError.message };
  }

  // 1. Port 465
  try {
    const transporter465 = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: emailUser, pass: emailPass },
      connectionTimeout: 10000,
    });
    await transporter465.verify();
    diagnostics.port465 = "OK";
  } catch (err) {
    diagnostics.port465 = err.message;
  }

  // 2. Port 587
  try {
    const transporter587 = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: emailUser, pass: emailPass },
      connectionTimeout: 10000,
    });
    await transporter587.verify();
    diagnostics.port587 = "OK";
  } catch (err) {
    diagnostics.port587 = err.message;
  }

  // 3. Service Gmail
  try {
    const transporterService = nodemailer.createTransport({
      service: "gmail",
      auth: { user: emailUser, pass: emailPass },
      connectionTimeout: 10000,
    });
    await transporterService.verify();
    diagnostics.serviceGmail = "OK";
  } catch (err) {
    diagnostics.serviceGmail = err.message;
  }

  res.json({
    message: "진단 완료",
    diagnostics,
    advice: "만약 모두 실패한다면 Render 대시보드에서 'Clear Cache and Deploy'를 시도해보세요."
  });
});

app.use((err, req, res, next) => {
  console.error("🔥 [Global Error]:", err);
  res.status(500).json({ 
    message: "서버 내부 에러가 발생했습니다.", 
    error: err.message
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 [System] 서버가 ${PORT}번 포트에서 시작되었습니다.`);
});