const express = require("express");
const pool = require("./db");
const app = express();

const postsRouter = require("./routes/posts"); // 라우터 파일 불러오기
const votesRouter = require("./routes/votes"); // 투표 라우터 불러오기

app.use(express.json());

// /api/posts로 시작하는 모든 요청은 postsRouter가 처리하도록 위임
app.use("/api/posts", postsRouter);
app.use("/api/votes", votesRouter);
