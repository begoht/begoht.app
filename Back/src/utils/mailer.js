const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

module.exports = async (to, subject, html) => {
  await transporter.sendMail({
    from: `"BeGO 🚀" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  });
};
