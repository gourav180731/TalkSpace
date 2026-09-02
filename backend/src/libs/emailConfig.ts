import { Resend } from "resend";

let resend: Resend | null = null;

function validateConfig() {
  const required = ["RESEND_API_KEY", "NOTIFY_EMAIL_FROM"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required email environment variables: ${missing.join(", ")}`
    );
  }
}

export function initEmailTransporter() {
  if (resend) return;

  validateConfig();

  resend = new Resend(process.env.RESEND_API_KEY!);

  console.log("✅ Email service ready (Resend HTTPS API)");
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
  if (!resend) {
    throw new Error("Email service not initialized");
  }

  const from = process.env.NOTIFY_EMAIL_FROM!;

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) {
    // Log non-sensitive error info without exposing API key
    console.error("Resend API error", {
      to,
      subject,
      error: error.message || error,
    });
    throw new Error(error.message || "Failed to send email via Resend");
  }

  // Optional: log success without sensitive data
  // console.log("Email sent via Resend", { to, subject, id: data?.id });
}
