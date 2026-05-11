// const express = require("express"); // 옛날 문법
import express from "express"; // ES 문법 (자바스크립트 최신문법)
import pool from "./db.js";
import path from "path";

// 투표 목록 라우터 파일을 가져온다
import usersRouter from "./routes/users.js";
import voteListRouter from "./routes/posts.js";
import votesRouter from "./routes/votes.js";
import mainRouter from "./routes/mainLogic.js"
import adminRouter from "./routes/admin.js";

const app = express();

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

app.use((req, res, next) => {
  // CORS 허용
  res.header("Access-Control-Allow-Origin", "*");
  // GET(조회), POST(추가), PUT(수정), DELETE(삭제) 요청 허용
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  // JSON 데이터를 받을수있도록 허용
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// JSON 형태로 들어오는 요청을 파싱해서 req.body에 추가
app.use(express.json());

// uploads 폴더를 정적 폴더로 설정 (이미지 접근 가능하게 함)
const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/users", usersRouter);
// /votelist로 시작하는 모든 요청은 voteListRouter가 처리하도록 위임
app.use("/votelist", voteListRouter);
app.use("/api/votes", votesRouter);
app.use("/main", mainRouter)
app.use("/admin", adminRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`${PORT}번 포트번호로 서버 실행중`);
});
