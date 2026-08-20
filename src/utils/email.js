import "dotenv/config";
import nodemailer from "nodemailer";

/**
 * 이메일을 발송하는 공통 함수 (Brevo API 및 Nodemailer SMTP 지원)
 * @param {string} to 받는 사람 이메일
 * @param {string} subject 제목
 * @param {string} text 내용 (일반 텍스트)
 * @param {string} html 내용 (HTML 형식, 선택사항)
 */
export async function sendEmail({ to, subject, text, html }) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const emailUser = process.env.EMAIL_USER || "kdy20716@gmail.com";
  const emailPass = process.env.EMAIL_PASS || process.env.GMAIL_PASS;

  console.log(`📧 [Email] ${to}로 이메일 발송 시도 중...`);

  // 1. Brevo API가 설정되어 있는 경우
  if (BREVO_API_KEY) {
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": BREVO_API_KEY,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "PICKPICK", email: emailUser },
          to: [{ email: to }],
          subject: subject,
          textContent: text,
          htmlContent: html || text.replace(/\n/g, "<br>"),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.warn("⚠️ [Brevo] API 발송 실패:", data);
        throw new Error(data.message || "Brevo 이메일 발송에 실패했습니다.");
      }

      console.log("✅ [Brevo] 이메일 발송 성공:", data.messageId);
      return { success: true, messageId: data.messageId };
    } catch (brevoError) {
      console.warn("⚠️ [Brevo] 발송 실패로 Nodemailer SMTP 대체 시도:", brevoError.message);
      if (!emailPass) {
        throw brevoError;
      }
    }
  }

  // 2. Nodemailer SMTP (Gmail 등) 발송
  if (emailUser && emailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });

      const info = await transporter.sendMail({
        from: `"PICKPICK" <${emailUser}>`,
        to,
        subject,
        text,
        html: html || text.replace(/\n/g, "<br>"),
      });

      console.log("✅ [Nodemailer] 이메일 발송 성공:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (smtpError) {
      console.error("❌ [Nodemailer] SMTP 발송 에러:", smtpError.message);
      throw smtpError;
    }
  }

  throw new Error("이메일 발송 설정(BREVO_API_KEY 또는 EMAIL_PASS)이 구성되지 않았습니다.");
}
