import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function validateConfig() {
  const required = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "NOTIFY_EMAIL_FROM",
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required SMTP environment variables: ${missing.join(", ")}`
    );
  }
}

export function initEmailTransporter() {
  if (transporter) return;

  validateConfig();

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  });

  console.log("✅ Email transporter ready (Gmail SMTP)");
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!transporter) {
    throw new Error("Email transporter not initialized");
  }

  await transporter.sendMail({
    from: process.env.NOTIFY_EMAIL_FROM!,
    to,
    subject,
    html,
  });
}
