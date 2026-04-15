import express from "express";
import pool from "../db.js";
import bcrypt from "bcrypt"; // 비밀번호 암호화 라이브러리
import jwt from "jsonwebtoken"; // JWT 토큰 생성 라이브러리

const router = express.Router();

// 회원가입 API : POST /users/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 이메일 중복체크
    const [checked] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    console.log(checked.length);
    if (checked.length > 0) {
      return res.status(409).json({ message: "이미 사용중인 이메일" });
    }

    // 비밀번호는 암호화!
    // bcrypt.hash(원본비밀번호, 복잡도숫자) : 숫자가 높을수록 더 안전하지만 느려짐
    const hashedPassword = await bcrypt.hash(password, 10);

    // users 테이블에 새 사용자 정보 저장
    await pool.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword],
    );

    res.status(201).json({ message: "회원가입이 완료되었습니다." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 에러" });
  }
});

// 로그인 API : POST /users/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. 이메일로 사용자 조회
    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    // 2. 사용자가 존재하지 않으면 에러
    if (users.length === 0) {
      return res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 일치하지 않습니다." });
    }

    const user = users[0];

    // 3. 비밀번호 비교
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (isPasswordValid) {
      // 로그인 성공 시 JWT 토큰 생성
      const token = jwt.sign(
        { userId: user.id },
        process.env.SECRET_KEY || "secret",
        {
          expiresIn: "1h", // 토큰 유효 기간 설정
        },
      );
      res.status(200).json({ message: "로그인 성공", user: user, token });
    } else {
      res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 일치하지 않습니다." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 에러" });
  }
});

// users/login -- 수업 내용[참고용]
router.get("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    // 이메일로 사용자 조회
    const [checked] = await pool.query(
      "SELECT * FROM users WHERE email = ? ,[email]",
    );
    // 회원 정보가 없는 경우
    if (checked.length === 0) {
      return res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 일치하지 않습니다." });
    }

    // 비밀번호 확인 -> 사용자한테 입력받은 비밀번호와 DB에 저장된 암호화된 비밀번호 비교
    const isPasswordValid = await bcrypt.compare(password, checked[0].password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 일치하지 않습니다." });
    }

    // 비밀번호 확인 -> 사용자한테 입력받은 비밀번호와 DB에 저장된 암호화된 비밀번호 비교
    // bcrypt.compare(사용자가 입력한 비밀번호, DB에 저장된 암호화된 비밀번호) -> true/false 반환
    // 암호화 비밀번호를 동일한 방식으로 암호화해서 DB 값과 비교하는 방식이 아님! ->
    // bcrypt가 자체적으로 비교해주는 방식
    const isMatch = await bcrypt.compare(password, checked[0].password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 일치하지 않습니다." });
    }

    // 로그인 성공 -> JWT 토큰 생성 (출입증 발급)
    // JWT 토큰은 서버에서 발급하는 암호화된 문자열로, 사용자의 인증 정보를 담고 있습니다.
    // jwt.sign(토큰에 담을 정보, 비밀키, 옵션)
    // expiresIN : 토큰의 유효 기간 설정 (예: "1h" -> 1시간)

    const token = jwt.sign({ userId: checked[0].id }, process.env.SECRET_KEY, {
      expiresIn: "1h", // 토큰 유효 기간 설정
    });
    res.status(200).json({ message: "로그인 성공", user: checked[0], token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 에러" });
  }
});

export default router;
