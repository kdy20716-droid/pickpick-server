// db.js
const mysql = require("mysql2/promise");
require("dotenv").config();

// DB 연결 풀(Pool) 생성: 한 번에 여러 프론트엔드 요청이 와도 버티게 해줍니다.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
