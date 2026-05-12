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

// CORS 설정
app.use(cors({
  origin: ["https://pickpick.dev", "http://localhost:5173"], 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());

// DB 마이그레이션
async function initializeDatabase() {
  try {
    const conn = await pool.getConnection();
    await conn.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100)`);
    await conn.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(100)`);
    await conn.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS birth VARCHAR(8)`);
    await conn.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10)`);
    await conn.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality VARCHAR(10)`);
    await conn.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255)`);
    await conn.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role ENUM('user', 'admin') DEFAULT 'user'`);
    conn.release();
    console.log("✅ Database schema initialized");
  } catch (error) {
    console.error("⚠️ Database initialization:", error.message);
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

app.get("/env-check", (req, res) => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  
  res.json({
    email_user: user ? `${user.substring(0, 3)}***` : "MISSING",
    email_pass_exists: !!pass,
    email_pass_length: pass ? pass.length : 0,
    is_pass_format_correct: pass ? (pass.length === 16 || pass.length === 19) : false
  });
});

// 직접 이메일 발송 테스트 엔드포인트
app.get("/test-mail-direct", async (req, res) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS?.replace(/\s/g, "");

  if (!emailUser || !emailPass) {
    return res.status(500).json({ success: false, message: "이메일 설정 누락" });
  }

  const diagnostics = {
    dns: null,
    port465: null,
    port587: null
  };

  try {
    const address = await lookup("smtp.gmail.com");
    diagnostics.dns = { success: true, address: address.address };
  } catch (dnsError) {
    diagnostics.dns = { success: false, error: dnsError.message };
  }

  try {
    const transporter465 = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: emailUser, pass: emailPass },
      connectionTimeout: 5000,
    });
    await transporter465.verify();
    diagnostics.port465 = { success: true };
  } catch (err) {
    diagnostics.port465 = { success: false, error: err.message, code: err.code };
  }

  try {
    const transporter587 = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: emailUser, pass: emailPass },
      connectionTimeout: 5000,
    });
    await transporter587.verify();
    diagnostics.port587 = { success: true };
  } catch (err) {
    diagnostics.port587 = { success: false, error: err.message, code: err.code };
  }

  try {
    let finalTransporter = null;
    if (diagnostics.port465.success) {
      finalTransporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: emailUser, pass: emailPass },
      });
    } else if (diagnostics.port587.success) {
      finalTransporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: { user: emailUser, pass: emailPass },
      });
    }

    if (finalTransporter) {
      const info = await finalTransporter.sendMail({
        from: `"PICKPICK TEST" <${emailUser}>`,
        to: emailUser,
        subject: "Multi-Port Diagnostics Test",
        text: `Port 465: ${diagnostics.port465.success ? "OK" : "FAIL"}\nPort 587: ${diagnostics.port587.success ? "OK" : "FAIL"}\nDNS: ${diagnostics.dns.address || "Unknown"}`,
      });
      return res.json({ success: true, response: info.response, diagnostics });
    } else {
      return res.status(500).json({ success: false, message: "모든 포트 연결 실패", diagnostics });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "발송 중 에러 발생", error: error.message, diagnostics });
  }
});

app.use((err, req, res, next) => {
  console.error("🔥 [Global Error]:", err);
  res.status(500).json({ 
    message: "서버 내부 에러가 발생했습니다.", 
    error: err.message
  });
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 서버가 ${PORT}번 포트에서 시작되었습니다.`);
});