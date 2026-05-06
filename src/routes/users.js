import express from "express";
import pool from "../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const router = express.Router();

// 회원가입 API : POST /users/signin
router.post("/signin", async (req, res) => {
  try {
    const { id, pw, name } = req.body;

    if (!id || !pw || !name) {
      return res.status(400).json({ message: "아이디, 비밀번호, 이름은 필수 입력 항목입니다." });
    }

    // 1. 아이디(nickname) 중복체크
    const [existingUser] = await pool.query("SELECT * FROM users WHERE nickname = ?", [id]);
    
    if (existingUser.length > 0) {
      return res.status(409).json({ message: "이미 사용 중인 아이디입니다." });
    }

    // 2. 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(pw, 10);

    // 3. DB에 저장 (name 컬럼 포함)
    await pool.query(
      "INSERT INTO users (nickname, password, name) VALUES (?, ?, ?)",
      [id, hashedPassword, name]
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
      { userId: user.id, nickname: user.nickname, role: user.role || 'user' },
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

// 로그아웃 API : POST /users/logout
router.post("/logout", (req, res) => {
  // JWT 기반 인증이므로 서버측에서 토큰을 무효화하는 로직(예: Redis 블랙리스트)을
  // 추가할 수 있으나, 현재 구조상 클라이언트에서 토큰을 삭제하는 것으로 로그아웃을 처리합니다.
  // 서버는 단순히 성공 응답을 내려줍니다.
  res.status(200).json({ success: true, message: "로그아웃 되었습니다." });
});

// 임시 비밀번호(인증 코드) 발송 API : POST /users/send-temp-password
router.post("/send-temp-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "이메일을 입력해주세요." });
  }

  // 6자리 랜덤 코드 생성
  const tempCode = Math.floor(100000 + Math.random() * 900000).toString();

  // 이메일 전송 설정
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "[PICKPICK] 인증 코드 발송",
    text: `요청하신 인증 코드는 [ ${tempCode} ] 입니다.\n해당 코드를 사용하여 비밀번호를 변경해주세요.`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ 이메일 발송 성공! 구글 서버 응답:", info.response);
    res.status(200).json({ message: "인증 코드가 발송되었습니다." });
  } catch (error) {
    console.error("❌ 이메일 발송 에러:", error);
    res.status(500).json({ message: "이메일 발송에 실패했습니다." });
  }
});

// 이메일 인증 코드 발송 API : POST /users/send-email-code
router.post("/send-email-code", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "이메일을 입력해주세요." });
  }

  // 6자리 랜덤 코드 생성
  const tempCode = Math.floor(100000 + Math.random() * 900000).toString();

  // 이메일 전송 설정
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "[PICKPICK] 이메일 인증 코드 발송",
    text: `요청하신 이메일 인증 코드는 [ ${tempCode} ] 입니다.\n해당 코드를 회원가입 화면에 입력해주세요.`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ 이메일 발송 성공! 구글 서버 응답:", info.response);
    // 프론트엔드에서 코드를 비교할 수 있도록 생성된 코드를 응답으로 보내줍니다. (단순화된 방식)
    res.status(200).json({ message: "인증 코드가 발송되었습니다.", code: tempCode });
  } catch (error) {
    console.error("❌ 이메일 발송 에러:", error);
    res.status(500).json({ message: "이메일 발송에 실패했습니다." });
  }
});

// 알림 조회 API : GET /users/:userId/notifications
router.get("/:userId/notifications", async (req, res) => {
  try {
    const { userId } = req.params;
    const [notifications] = await pool.query(
      `SELECT n.*, u.name as sender_name, u.nickname as sender_nickname, c.content as comment_content
       FROM notifications n
       JOIN users u ON n.sender_id = u.id
       LEFT JOIN comments c ON n.comment_id = c.id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC`,
      [userId]
    );
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error("알림 조회 에러:", error);
    res.status(500).json({ message: "알림을 불러오는 중 오류가 발생했습니다." });
  }
});

// 알림 읽음 처리 API : PUT /users/:userId/notifications/:notifId/read
router.put("/:userId/notifications/:notifId/read", async (req, res) => {
  try {
    const { userId, notifId } = req.params;
    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?",
      [notifId, userId]
    );
    res.status(200).json({ success: true, message: "알림을 읽음 처리했습니다." });
  } catch (error) {
    console.error("알림 읽음 처리 에러:", error);
    res.status(500).json({ message: "오류가 발생했습니다." });
  }
});

// 모든 알림 읽음 처리 API : PUT /users/:userId/notifications/read-all
router.put("/:userId/notifications/read-all", async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.query("UPDATE notifications SET is_read = TRUE WHERE user_id = ?", [userId]);
    res.status(200).json({ success: true, message: "모든 알림을 읽음 처리했습니다." });
  } catch (error) {
    console.error("알림 전체 읽음 처리 에러:", error);
    res.status(500).json({ message: "오류가 발생했습니다." });
  }
});

// 회원 탈퇴 API : DELETE /users/account/:userId
router.delete("/account/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    // DB에서 사용자 삭제 (ON DELETE CASCADE로 인해 연관된 데이터도 함께 삭제됨)
    const [result] = await pool.query("DELETE FROM users WHERE id = ?", [userId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "사용자를 찾을 수 없습니다." });
    }

    res.status(200).json({ success: true, message: "회원 탈퇴가 완료되었습니다." });
  } catch (error) {
    console.error("회원 탈퇴 에러:", error);
    res.status(500).json({ success: false, message: "서버 에러가 발생했습니다." });
  }
});

export default router;
