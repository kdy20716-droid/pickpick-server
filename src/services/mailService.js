import { sendEmail } from "../utils/email.js";

export async function sendDirectTestMail() {
  const to = process.env.EMAIL_USER;

  if (!to) {
    const error = new Error("EMAIL_USER 환경 변수가 설정되어 있지 않습니다.");
    error.statusCode = 500;
    throw error;
  }

  return sendEmail({
    to,
    subject: "[PICKPICK] Brevo API 전환 테스트",
    text:
      "Brevo API를 사용해 발송한 테스트 메일입니다. DigitalOcean 서버에서도 안정적으로 발송되는지 확인합니다.",
  });
}
