// const express = require("express"); // 옛날 문법
import express from "express"; // ES 문법 (자바스크립트 최신문법)

// 투표 목록 라우터 파일을 가져온다
import usersRouter from "./routes/users.js";
import voteListRouter from "./routes/posts.js";
import votesRouter from "./routes/votes.js";
import mainRouter from "./routes/mainLogic.js"

const app = express();

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
app.use("/uploads", express.static("uploads"));

app.use("/users", usersRouter);
// /votelist로 시작하는 모든 요청은 voteListRouter가 처리하도록 위임
app.use("/votelist", voteListRouter);
app.use("/api/votes", votesRouter);
app.use("/main", mainRouter)

app.listen(4000, () => {
  console.log("4000번 포트번호로 서버 실행중");
});
