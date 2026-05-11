import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'kdy20716@gmail.com',
    pass: 'rhia oaek fenc wzso' // .env 파일의 비밀번호
  }
});

transporter.verify()
  .then(() => {
    console.log("✅ SMTP 연결 성공! 이메일 서버 정상입니다.");
  })
  .catch((error) => {
    console.error("❌ SMTP 연결 실패! 에러 상세 내용:");
    console.error(error);
  });