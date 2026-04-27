import express from "express";
import pool from "../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = express.Router();

// 회원가입 API : POST /users/signin
// 클라이언트의 signin API(instance.post("/users/signin", form))와 연결됩니다.
router.post("/signin", async (req, res) => {
  try {
    // 클라이언트 Signin.jsx의 form 데이터: { id, pw, email, name, birth }
    // DB의 users 테이블 스키마에 맞춰 id를 nickname으로, pw를 password로 사용합니다.
    const { id, pw } = req.body;

    if (!id || !pw) {
      return res.status(400).json({ message: "아이디와 비밀번호는 필수 입력 항목입니다." });
    }

    // 1. 아이디(nickname) 중복체크
    const [existingUser] = await pool.query("SELECT * FROM users WHERE nickname = ?", [id]);
    
    if (existingUser.length > 0) {
      return res.status(409).json({ message: "이미 사용 중인 아이디입니다." });
    }

    // 2. 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(pw, 10);

    // 3. DB에 저장
    await pool.query(
      "INSERT INTO users (nickname, password) VALUES (?, ?)",
      [id, hashedPassword]
    );

    res.status(201).json({ message: "회원가입이 완료되었습니다." });
  } catch (error) {
    console.error("회원가입 에러:", error);
    res.status(500).json({ message: "서버 에러가 발생했습니다." });
  }
});

// 로그인 API : POST /users/login
// 클라이언트의 login API(instance.post("/users/login", form))와 연결됩니다.
router.post("/login", async (req, res) => {
  try {
    // 클라이언트 Login.jsx의 form 데이터: { username, password }
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "아이디와 비밀번호를 입력해주세요." });
    }

    // 1. 닉네임(아이디)으로 사용자 조회
    const [users] = await pool.query("SELECT * FROM users WHERE nickname = ?", [username]);

    // 2. 사용자가 존재하지 않는 경우
    if (users.length === 0) {
      return res.status(401).json({ message: "아이디 또는 비밀번호가 일치하지 않습니다." });
    }

    const user = users[0];

    // 3. 비밀번호 비교
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "아이디 또는 비밀번호가 일치하지 않습니다." });
    }

    // 4. 로그인 성공 - JWT 토큰 생성
    const token = jwt.sign(
      { userId: user.id, nickname: user.nickname },
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
    );

    // 보안을 위해 비밀번호 정보는 제외하고 전송
    const { password: _, ...userInfo } = user;

    res.status(200).json({
      message: "로그인 성공",
      user: userInfo,
      token: token
    });
  } catch (error) {
    console.error("로그인 에러:", error);
    res.status(500).json({ message: "서버 에러가 발생했습니다." });
  }
});

export default router;
