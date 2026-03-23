// db.js
const mysql = require("mysql2/promise");

// DB 연결 풀(Pool) 생성: 한 번에 여러 프론트엔드 요청이 와도 버티게 해줍니다.
const pool = mysql.createPool({
  host: "localhost",
  user: "root", // 본인의 MySQL 아이디
  password: "password", // 본인의 MySQL 비밀번호
  database: "pickpick", // 생성한 데이터베이스 이름
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
