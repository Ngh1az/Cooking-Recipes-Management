import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type SupportedEmailProvider = "sendgrid" | "postmark" | "ses";

const globalSes = globalThis as typeof globalThis & {
  __recipeMgSesClient__?: SESv2Client;
};

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getEmailProvider(): SupportedEmailProvider {
  const value = (process.env.EMAIL_PROVIDER || "sendgrid").trim().toLowerCase();

  if (value === "sendgrid" || value === "postmark" || value === "ses") {
    return value;
  }

  throw new Error(
    "Unsupported EMAIL_PROVIDER. Use 'sendgrid', 'postmark', or 'ses'.",
  );
}

function getSesClient() {
  if (!globalSes.__recipeMgSesClient__) {
    const region = getRequiredEnv("AWS_REGION");

    globalSes.__recipeMgSesClient__ = new SESv2Client({
      region,
    });
  }

  return globalSes.__recipeMgSesClient__;
}

async function sendViaSendGrid(input: SendEmailInput) {
  const apiKey = getRequiredEnv("SENDGRID_API_KEY");
  const from = getRequiredEnv("EMAIL_FROM");

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { email: from },
      personalizations: [{ to: [{ email: input.to }] }],
      subject: input.subject,
      content: [
        { type: "text/plain", value: input.text },
        { type: "text/html", value: input.html },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`SendGrid error ${response.status}: ${body}`);
  }
}

async function sendViaPostmark(input: SendEmailInput) {
  const serverToken = getRequiredEnv("POSTMARK_SERVER_TOKEN");
  const from = getRequiredEnv("EMAIL_FROM");

  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": serverToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      From: from,
      To: input.to,
      Subject: input.subject,
      TextBody: input.text,
      HtmlBody: input.html,
      MessageStream: process.env.POSTMARK_MESSAGE_STREAM || "outbound",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Postmark error ${response.status}: ${body}`);
  }
}

async function sendViaSes(input: SendEmailInput) {
  const from = getRequiredEnv("EMAIL_FROM");
  const sesClient = getSesClient();

  const command = new SendEmailCommand({
    FromEmailAddress: from,
    Destination: {
      ToAddresses: [input.to],
    },
    Content: {
      Simple: {
        Subject: {
          Data: input.subject,
          Charset: "UTF-8",
        },
        Body: {
          Text: {
            Data: input.text,
            Charset: "UTF-8",
          },
          Html: {
            Data: input.html,
            Charset: "UTF-8",
          },
        },
      },
    },
  });

  await sesClient.send(command);
}

async function sendEmail(input: SendEmailInput) {
  const provider = getEmailProvider();

  if (provider === "sendgrid") {
    await sendViaSendGrid(input);
    return;
  }

  if (provider === "postmark") {
    await sendViaPostmark(input);
    return;
  }

  await sendViaSes(input);
}

export async function sendVerificationEmail(input: {
  to: string;
  verifyUrl: string;
}) {
  const subject = "Verify your email";
  const text = `Welcome! Verify your email by opening this link: ${input.verifyUrl}`;
  const html = `<p>Welcome!</p><p>Verify your email by clicking the link below:</p><p><a href="${input.verifyUrl}">Verify email</a></p>`;

  await sendEmail({
    to: input.to,
    subject,
    text,
    html,
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  resetUrl: string;
}) {
  const subject = "Reset your password";
  const text = `Reset your password by opening this link: ${input.resetUrl}`;
  const html = `<p>You requested a password reset.</p><p>Click the link below to continue:</p><p><a href="${input.resetUrl}">Reset password</a></p>`;

  await sendEmail({
    to: input.to,
    subject,
    text,
    html,
  });
}
