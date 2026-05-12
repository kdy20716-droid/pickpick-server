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
    internet_check_443: "Pending",
    port465: "Pending",
    port587: "Pending",
    port2525: "Pending"
  };

  // 1. DNS
  try {
    const address = await lookup("smtp.gmail.com");
    diagnostics.dns = { success: true, address: address.address };
  } catch (dnsError) {
    diagnostics.dns = { success: false, error: dnsError.message };
  }

  // 2. 일반 인터넷 접속 확인 (HTTPS 443)
  const checkPort = (port, host) => {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(5000);
      socket.on("connect", () => { socket.destroy(); resolve("OK"); });
      socket.on("error", (e) => { socket.destroy(); resolve(e.message); });
      socket.on("timeout", () => { socket.destroy(); resolve("Timeout"); });
      socket.connect(port, host);
    });
  };

  diagnostics.internet_check_443 = await checkPort(443, "google.com");
  diagnostics.port465 = await checkPort(465, "smtp.gmail.com");
  diagnostics.port587 = await checkPort(587, "smtp.gmail.com");
  diagnostics.port2525 = await checkPort(2525, "smtp.gmail.com");

  let advice = "모든 이메일 포트가 Timeout이라면 Render 서버에서 SMTP 발송이 막힌 것입니다.";
  if (diagnostics.internet_check_443 === "OK" && diagnostics.port465 === "Timeout") {
    advice += " [진단] 일반 인터넷은 되지만 이메일 포트만 막혀 있습니다. SendGrid 같은 외부 메일 API 사용을 권장합니다.";
  }

  res.json({
    message: "최종 상세 진단 완료",
    diagnostics,
    advice
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