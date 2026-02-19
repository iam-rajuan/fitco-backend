import nodemailer from 'nodemailer';

interface PasswordResetPayload {
  email: string;
  otp: string;
}

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || smtpUser || 'no-reply@creedtng.com';

const transporter =
  smtpHost && smtpUser && smtpPass
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      })
    : null;

export const sendPasswordResetEmail = async ({ email, otp }: PasswordResetPayload): Promise<void> => {
  if (!transporter) {
    console.log(`Password reset OTP for ${email}: ${otp}`);
    return;
  }

  await transporter.sendMail({
    from: smtpFrom,
    to: email,
    subject: 'Your Creedtng Password Reset OTP',
    text: `Your password reset OTP is ${otp}. It will expire in 60 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Creedtng Password Reset</h2>
        <p>Your OTP code is:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
        <p>This OTP expires in 60 minutes.</p>
      </div>
    `
  });
};
