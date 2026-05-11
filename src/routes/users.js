import express from "express";
import pool from "../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import multer from "multer";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const router = express.Router();

// 메모리 스토리지로 변경 (Cloudinary로 바로 업로드하기 위함)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 프로필 정보 및 사진 업데이트 API : PUT /users/profile/:userId
router.put(
  "/profile/:userId",
  upload.single("profile_image"),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { name, email, birth, gender, nationality } = req.body;
      let profile_image = null;

      if (req.file) {
        // Cloudinary에 파일 업로드
        profile_image = await uploadToCloudinary(req.file.buffer, req.file.originalname);
      }

      // 업데이트할 필드들을 동적으로 구성
      let updateFields = [];
      let params = [];

      if (name !== undefined) {
        updateFields.push("name = ?");
        params.push(name);
      }
      if (email !== undefined) {
        updateFields.push("email = ?");
        params.push(email);
      }
      if (birth !== undefined) {
        updateFields.push("birth = ?");
        params.push(birth);
      }
      if (gender !== undefined) {
        updateFields.push("gender = ?");
        params.push(gender);
      }
      if (nationality !== undefined) {
        updateFields.push("nationality = ?");
        params.push(nationality);
      }
      if (profile_image) {
        updateFields.push("profile_image = ?");
        params.push(profile_image);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ message: "수정할 정보가 없습니다." });
      }

      const query = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`;
      params.push(userId);

      await pool.query(query, params);

      // 업데이트된 사용자 정보 조회
      const [users] = await pool.query("SELECT * FROM users WHERE id = ?", [
        userId,
      ]);
      const updatedUser = users[0];
      delete updatedUser.password;

      res.status(200).json({
        success: true,
        message: "프로필이 업데이트되었습니다.",
        user: updatedUser,
      });
    } catch (error) {
      console.error("프로필 업데이트 에러:", error);
      res.status(500).json({ message: "프로필 업데이트에 실패했습니다." });
    }
  },
);

// 회원가입 API : POST /users/signin
router.post("/signin", async (req, res) => {
  try {
    const { id, pw, name, email, birth, gender, nationality } = req.body;

    console.log("📝 회원가입 요청 받음:", {
      id,
      name,
      email,
      birth,
      gender,
      nationality,
    });

    // 필수값 체크
    if (!id || !pw || !name || !email) {
      console.log("❌ 필수 정보 누락");
      return res.status(400).json({
        message: "아이디, 비밀번호, 이름, 이메일은 필수 입력 항목입니다.",
      });
    }

    // 1. 아이디(nickname) 중복체크
    console.log("🔍 아이디 중복 체크:", id);
    const [existingUserByNickname] = await pool.query(
      "SELECT * FROM users WHERE nickname = ?",
      [id],
    );

    if (existingUserByNickname.length > 0) {
      console.log("❌ 아이디 중복:", id);
      return res.status(409).json({ message: "이미 사용 중인 아이디입니다." });
    }

    // 2. 이메일 중복체크 (새로 추가)
    console.log("🔍 이메일 중복 체크:", email);
    const [existingUserByEmail] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email],
    );

    if (existingUserByEmail.length > 0) {
      console.log("❌ 이메일 중복:", email);
      return res
        .status(409)
        .json({ message: "이 이메일은 이미 회원가입되었습니다." });
    }

    // 3. 비밀번호 암호화
    console.log("🔐 비밀번호 암호화 중...");
    const hashedPassword = await bcrypt.hash(pw, 10);

    // 4. DB에 저장 (모든 정보 포함)
    console.log("💾 DB에 저장 중...");
    const result = await pool.query(
      `INSERT INTO users (nickname, password, name, email, birth, gender, nationality) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, hashedPassword, name, email, birth, gender, nationality],
    );

    console.log("✅ 회원가입 완료 - DB 저장됨:", {
      userId: result[0].insertId,
      nickname: id,
      name,
      email,
      birth,
      gender,
      nationality,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ message: "회원가입이 완료되었습니다." });
  } catch (error) {
    console.error("❌ 회원가입 에러:", error.message);
    res.status(500).json({ message: "서버 에러가 발생했습니다." });
  }
});

// 로그인 API : POST /users/login
router.post("/login", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    console.log("🔑 로그인 요청 받음:", { username });

    if (!username || !password) {
      console.log("❌ 아이디 또는 비밀번호 누락");
      return res
        .status(400)
        .json({ message: "아이디와 비밀번호를 입력해주세요." });
    }

    // 1. 닉네임(아이디) 또는 이메일로 사용자 조회
    console.log("🔍 DB에서 사용자 조회:", username);
    const [users] = await pool.query(
      "SELECT * FROM users WHERE nickname = ? OR email = ? LIMIT 1",
      [username, username],
    );

    // 2. 사용자가 존재하지 않는 경우
    if (users.length === 0) {
      console.log("❌ 사용자를 찾을 수 없음:", username);
      return res
        .status(401)
        .json({ message: "아이디 또는 비밀번호가 일치하지 않습니다." });
    }

    const user = users[0];
    console.log("✅ DB에서 조회된 사용자:", {
      id: user.id,
      nickname: user.nickname,
      name: user.name,
      email: user.email,
      birth: user.birth,
      gender: user.gender,
      nationality: user.nationality,
      profile_image: user.profile_image,
      role: user.role,
    });

    // 3. 비밀번호 비교
    console.log("🔐 비밀번호 검증 중...");
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log("❌ 비밀번호 불일치");
      return res
        .status(401)
        .json({ message: "아이디 또는 비밀번호가 일치하지 않습니다." });
    }

    console.log("✅ 비밀번호 일치");

    // 4. 로그인 성공 - JWT 토큰 생성
    const token = jwt.sign(
      { userId: user.id, nickname: user.nickname, role: user.role || "user" },
      process.env.SECRET_KEY,
      { expiresIn: "1h" },
    );

    // 클라이언트에 전송할 사용자 정보 (비밀번호 제외)
    const userInfo = {
      id: user.id,
      nickname: user.nickname,
      name: user.name,
      email: user.email,
      birth: user.birth,
      gender: user.gender,
      nationality: user.nationality,
      profile_image: user.profile_image,
      role: user.role || "user",
      created_at: user.created_at,
    };

    console.log("🎉 로그인 성공 - 클라이언트로 전송되는 정보:", userInfo);

    res.status(200).json({
      message: "로그인 성공",
      user: userInfo,
      token: token,
    });
  } catch (error) {
    console.error("❌ 로그인 에러:", error.message);
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
  const email = String(req.body.email || "").trim();

  if (!email) {
    return res.status(400).json({ message: "이메일을 입력해주세요." });
  }

  try {
    const [users] = await pool.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);

    if (users.length === 0) {
      return res
        .status(404)
        .json({ message: "가입된 이메일을 찾을 수 없습니다." });
    }

    // 임시 비밀번호 생성 및 DB 반영
    const tempPassword = Math.random().toString(36).slice(2, 10);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 이메일 전송 설정
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"PICKPICK" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "[PICKPICK] 임시 비밀번호 발송",
      text: `요청하신 임시 비밀번호는 [ ${tempPassword} ] 입니다.\n로그인 후 비밀번호를 변경해주세요.`,
    };

    const info = await transporter.sendMail(mailOptions);
    await pool.query("UPDATE users SET password = ? WHERE email = ?", [
      hashedPassword,
      email,
    ]);
    console.log("✅ 이메일 발송 성공! 구글 서버 응답:", info.response);
    res.status(200).json({ message: "임시 비밀번호가 발송되었습니다." });
  } catch (error) {
    console.error("❌ 이메일 발송 에러:", error);
    res.status(500).json({ message: "임시 비밀번호 발송에 실패했습니다." });
  }
});

// 비밀번호 변경 API : POST /users/reset-password
router.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ message: "이메일과 새 비밀번호를 모두 입력해주세요." });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const [result] = await pool.query("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, email]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    res.status(200).json({ success: true, message: "비밀번호가 성공적으로 변경되었습니다." });
  } catch (error) {
    console.error("❌ 비밀번호 변경 에러:", error);
    res.status(500).json({ message: "비밀번호 변경에 실패했습니다." });
  }
});

// 이메일 인증 코드 발송 API : POST /users/send-email-code
router.post("/send-email-code", async (req, res) => {
  const { email } = req.body;

  console.log("📧 이메일 코드 발송 요청:", email);

  if (!email) {
    console.log("❌ 이메일 미입력");
    return res.status(400).json({ message: "이메일을 입력해주세요." });
  }

  try {
    // 🔍 이메일 중복 체크 (최우선)
    console.log("🔍 이메일 중복 체크:", email);
    const [existingEmail] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email],
    );

    if (existingEmail.length > 0) {
      console.log("❌ 이미 가입된 이메일:", email);
      return res.status(409).json({
        message: "이 이메일은 이미 회원가입되었습니다.",
      });
    }

    console.log("✅ 새로운 이메일입니다:", email);

    // 6자리 랜덤 코드 생성
    const tempCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("📝 생성된 인증코드:", tempCode);

    // 이메일 전송 설정
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"PICKPICK" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "[PICKPICK] 이메일 인증 코드 발송",
      text: `요청하신 이메일 인증 코드는 [ ${tempCode} ] 입니다.\n해당 코드를 회원가입 화면에 입력해주세요.`,
    };

    try {
      console.log("📮 Gmail 서버로 이메일 전송 중...");
      const info = await transporter.sendMail(mailOptions);
      console.log("✅ 이메일 발송 성공! 구글 서버 응답:", info.response);

      res.status(200).json({
        message: "인증 코드가 발송되었습니다.",
        code: tempCode,
      });
    } catch (emailError) {
      console.error("❌ 이메일 발송 에러:", emailError.message);
      res.status(500).json({
        message: "이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.",
      });
    }
  } catch (error) {
    console.error("❌ 서버 에러:", error.message);
    res.status(500).json({
      message: "서버 에러가 발생했습니다.",
    });
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
      [userId],
    );
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error("알림 조회 에러:", error);
    res
      .status(500)
      .json({ message: "알림을 불러오는 중 오류가 발생했습니다." });
  }
});

// 알림 읽음 처리 API : PUT /users/:userId/notifications/:notifId/read
router.put("/:userId/notifications/:notifId/read", async (req, res) => {
  try {
    const { userId, notifId } = req.params;
    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?",
      [notifId, userId],
    );
    res
      .status(200)
      .json({ success: true, message: "알림을 읽음 처리했습니다." });
  } catch (error) {
    console.error("알림 읽음 처리 에러:", error);
    res.status(500).json({ message: "오류가 발생했습니다." });
  }
});

// 모든 알림 읽음 처리 API : PUT /users/:userId/notifications/read-all
router.put("/:userId/notifications/read-all", async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE user_id = ?",
      [userId],
    );
    res
      .status(200)
      .json({ success: true, message: "모든 알림을 읽음 처리했습니다." });
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
    const [result] = await pool.query("DELETE FROM users WHERE id = ?", [
      userId,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "사용자를 찾을 수 없습니다." });
    }

    res
      .status(200)
      .json({ success: true, message: "회원 탈퇴가 완료되었습니다." });
  } catch (error) {
    console.error("회원 탈퇴 에러:", error);
    res
      .status(500)
      .json({ success: false, message: "서버 에러가 발생했습니다." });
  }
});

export default router;
