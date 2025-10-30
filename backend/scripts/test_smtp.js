const path = require('path');
const nodemailer = require('nodemailer');

// Load env from backend/.env
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

async function run() {
  const toArg = process.argv[2] || process.env.EMAIL_FROM || '';
  if (!toArg) {
    console.error('Usage: node test_smtp.js recipient@example.com');
    process.exit(2);
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const from = (process.env.EMAIL_FROM || 'no-reply@example.com').trim();

  let transporter;
  let usingTestAccount = false;

  try {
    if (smtpHost && smtpUser && smtpPass) {
      console.log('Using SMTP host:', smtpHost, 'port:', smtpPort);
      // Print safe diagnostics (do NOT print the actual password)
      console.log('SMTP_USER=', smtpUser, 'SMTP_PASS length=', smtpPass ? smtpPass.length : 0);
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        requireTLS: true,
        auth: { user: smtpUser, pass: smtpPass },
        logger: true,
        debug: true,
      });
    } else {
      console.log('No SMTP config found, creating Ethereal test account...');
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      usingTestAccount = true;
    }

    console.log('Verifying transporter...');
    await transporter.verify();
    console.log('Transporter verified. Sending test email to', toArg);

    const info = await transporter.sendMail({
      from,
      to: toArg,
      subject: 'FaceAttend — SMTP test',
      text: `This is a test message from FaceAttend to verify SMTP.\n+If you receive this, SMTP is configured correctly.`,
    });

    console.log('Send attempt result:');
    console.log('  messageId:', info.messageId);

    if (usingTestAccount) {
      const preview = nodemailer.getTestMessageUrl(info);
      console.log('Ethereal preview URL:', preview);
    }

    console.log('Done.');
  } catch (err) {
    console.error('SMTP test failed:');
    console.error(err && err.message ? err.message : err);
    if (err && err.response) console.error('SMTP response:', err.response);
    if (err && err.responseCode) console.error('SMTP response code:', err.responseCode);
    process.exitCode = 1;
  }
}

run();
