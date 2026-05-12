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
