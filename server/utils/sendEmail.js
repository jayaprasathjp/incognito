import nodemailer from "nodemailer";

const sendEmail = async (options) => {
  try {
    let transporter;

    // 1. Use Custom SMTP if SMTP_HOST is set (e.g. Brevo on port 2525 for Render)
    if (process.env.SMTP_HOST) {
      const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 2525;
      console.log(`Sending email via Custom SMTP (${process.env.SMTP_HOST}:${port})...`);
      
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: port,
        secure: process.env.SMTP_SECURE === "true", // false for port 2525
        auth: {
          user: process.env.SMTP_USER || process.env.EMAIL_USER,
          pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
        },
      });
    } else {
      // 2. Fallback to standard Gmail SMTP (works perfectly on localhost)
      console.log("Sending email via standard Gmail SMTP...");
      transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Message sent successfully: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    if (error.code === "EAUTH") {
      console.error(
        "Authentication failed. Please ensure your SMTP credentials or App Password are correct."
      );
    }
    return null;
  }
};

export default sendEmail;

