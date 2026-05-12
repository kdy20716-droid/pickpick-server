import "dotenv/config";
import express from "express"; // ES 문법 (자바스크립트 최신문법)
import cors from "cors";
import pool from "./db.js";
import path from "path";

// 투표 목록 라우터 파일을 가져온다
import usersRouter from "./routes/users.js";
import voteListRouter from "./routes/posts.js";
import votesRouter from "./routes/votes.js";
import mainRouter from "./routes/mainLogic.js"
import adminRouter from "./routes/admin.js";

const app = express();

// CORS 설정
app.use(cors({
  origin: ["https://pickpick.dev", "http://localhost:5173"], 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// JSON 형태로 들어오는 요청을 파싱해서 req.body에 추가
app.use(express.json());

// DB 마이그레이션: 필요한 컬럼 추가
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

// uploads 폴더를 정적 폴더로 설정 (이미지 접근 가능하게 함)
const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/users", usersRouter);
// /votelist로 시작하는 모든 요청은 voteListRouter가 처리하도록 위임
app.use("/votelist", voteListRouter);
app.use("/api/votes", votesRouter);
app.use("/main", mainRouter)
app.use("/admin", adminRouter);

// 헬스체크 엔드포인트 추가 (서버 생존 확인용)
app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// DB 연결 테스트 엔드포인트 추가
app.get("/db-test", async (req, res) => {
  try {
    const [result] = await pool.query("SELECT 1 + 1 AS result");
    res.status(200).json({ success: true, message: "DB 연결 성공!", result });
  } catch (error) {
    console.error("❌ DB 연결 테스트 실패:", error);
    res.status(500).json({ success: false, message: "DB 연결 실패", error: error.message });
  }
});

// 환경 변수 설정 확인 엔드포인트 (보안 주의)
app.get("/env-check", (req, res) => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  
  res.json({
    email_user: user ? `${user.substring(0, 3)}***` : "MISSING",
    email_pass_exists: !!pass,
    email_pass_length: pass ? pass.length : 0,
    // 비밀번호가 공백 포함 19자인지 확인 (rhia oaek fenc wzso 형태)
    is_pass_format_correct: pass ? (pass.length === 16 || pass.length === 19) : false
  });
});

// 직접 이메일 발송 테스트 엔드포인트
import nodemailer from "nodemailer";
import dns from "dns";
app.get("/test-mail-direct", async (req, res) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    return res.status(500).json({ success: false, message: "이메일 설정 누락" });
  }

  const results = {
    step1_dns: "Pending",
    step2_connection: "Pending",
    logs: []
  };

  try {
    // 1단계: DNS 확인
    const addresses = await new Promise((resolve, reject) => {
      dns.resolve4("smtp.gmail.com", (err, addresses) => {
        if (err) reject(err); else resolve(addresses);
      });
    });
    results.step1_dns = `Success! IP: ${addresses.join(", ")}`;

    // 2단계: 587 포트로 우회 연결 시도
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // 587 포트는 STARTTLS 사용을 위해 false
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      tls: {
        rejectUnauthorized: false // 보안 인증 무시 (테스트용)
      },
      connectionTimeout: 20000, // 20초 대기
      greetingTimeout: 20000,
    });

    console.log("🚀 [Direct Test] 587 포트 발송 시도...");
    const info = await transporter.sendMail({
      from: `"PICKPICK TEST" <${emailUser}>`,
      to: emailUser,
      subject: "Render Server Port 587 Test",
      text: "587번 포트로 우회하여 보낸 테스트 메일입니다.",
    });

    results.step2_connection = "Success!";
    res.json({ success: true, results, response: info.response });
  } catch (error) {
    console.error("❌ [Direct Test] 실패:", error);
    res.status(500).json({ 
      success: false, 
      results,
      error: error.message,
      code: error.code,
      stack: error.stack
    });
  }
});

// 전역 에러 핸들러 (마지막에 위치해야 함)
app.use((err, req, res, next) => {
  console.error("🔥 [Global Error]:", err);
  res.status(500).json({ 
    message: "서버 내부 에러가 발생했습니다.", 
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 프로세스 종료 방지 및 로그 기록
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  // 치명적인 에러의 경우 로그를 남기고 안전하게 종료하거나 재시작 로직이 필요할 수 있음
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 서버가 ${PORT}번 포트에서 시작되었습니다.`);
  console.log(`- 환경 변수 확인: EMAIL_USER=${process.env.EMAIL_USER ? "OK" : "MISSING"}`);
});
