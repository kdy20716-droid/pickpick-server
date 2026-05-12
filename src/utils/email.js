import "dotenv/config";

/**
 * Brevo API를 사용하여 이메일을 발송하는 공통 함수
 * @param {string} to 받는 사람 이메일
 * @param {string} subject 제목
 * @param {string} text 내용 (일반 텍스트)
 * @param {string} html 내용 (HTML 형식, 선택사항)
 */
export async function sendEmail({ to, subject, text, html }) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_USER || "kdy20716@gmail.com";

  if (!BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY가 설정되지 않았습니다.");
  }

  console.log(`📧 [Brevo] ${to}로 이메일 발송 시도 중...`);

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: { name: "PICKPICK", email: senderEmail },
        to: [{ email: to }],
        subject: subject,
        textContent: text,
        htmlContent: html || text.replace(/\n/g, "<br>")
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ [Brevo] 발송 실패:", data);
      throw new Error(data.message || "이메일 발송에 실패했습니다.");
    }

    console.log("✅ [Brevo] 이메일 발송 성공:", data.messageId);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error("❌ [Brevo] 에러 발생:", error.message);
    throw error;
  }
}
