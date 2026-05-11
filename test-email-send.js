import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'kdy20716@gmail.com',
    pass: 'rhia oaek fenc wzso' // .env 파일의 비밀번호
  }
});

const mailOptions = {
  from: '"Test" <kdy20716@gmail.com>',
  to: 'kdy20716@gmail.com',
  subject: 'Test Email',
  text: 'This is a test email'
};

transporter.sendMail(mailOptions)
  .then(info => console.log("Email sent successfully:", info.response))
  .catch(err => console.error("Email sending failed:", err));
