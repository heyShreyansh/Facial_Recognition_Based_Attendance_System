const nodemailer = require('nodemailer');

/**
 * Send a reset email. If SMTP env vars are set, we'll use them.
 * Otherwise this will create an Ethereal test account and return a preview URL.
 * Returns: { previewUrl } when using test account, or null when sent via real SMTP.
 */
async function sendResetEmail(to, resetLink) {
  const html = `<p>We received a password reset request. Click below to reset (valid 1 hour):</p>
    <p><a href="${resetLink}">${resetLink}</a></p>
    <p>If you didn't request this, ignore this message.</p>`;

  let transporter;
  let usingTestAccount = false;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false, // Use false and port 587 for STARTTLS
      requireTLS: true, // Require TLS upgrade (STARTTLS)
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  } else {
    // Create an Ethereal test account for development/testing
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    usingTestAccount = true;
  }

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@example.com',
    to,
    subject: 'FaceAttend — Password Reset',
    html,
  });

  if (usingTestAccount) {
    // nodemailer provides a preview URL for Ethereal accounts
    const previewUrl = nodemailer.getTestMessageUrl(info);
    return { previewUrl };
  }

  return null;
}

module.exports = sendResetEmail;