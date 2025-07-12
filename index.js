// 💼 Smart HR Outreach System – Auto Emailer by Yash Lalwani

const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");

const app = express();
const port = 5000;

// 🔗 Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/HR_Details", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB connected to HR_Details"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// 🎯 HR Info Schema
const hrInfoSchema = new mongoose.Schema({
  id: String,
  SNo: Number,
  Name: String,
  Email: String,
  Title: String,
  Company: String
}, { collection: "HR_info" });

const HRInfo = mongoose.model("HRInfo", hrInfoSchema);

// 📨 Email Logs Schema
const emailLogSchema = new mongoose.Schema({
  sender: String,
  recipient: String,
  subject: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
  status: String,
  error: String,
});

const EmailLog = mongoose.model("EmailLog", emailLogSchema);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🛠️ Mail Sender Function
let currentSNo = 1; // Start after S.No 40

async function sendEmailToNextHR() {
  const resumePath = path.join(__dirname, "resume.pdf");

  try {
    // Find the next HR with SNo >= currentSNo
    const hr = await HRInfo.findOne({ SNo: { $gte: currentSNo } }).sort({ SNo: 1 });
    const subject = `Unlock Growth at ${hr.Company}: Hire a Top-Ranked Engineer (LNCT, Backend/MERN, 1500+ LeetCode)`;

    if (!hr) {
      console.log("✅ All HRs after S.No 40 have been emailed.");
      return;
    }

    const message = `
      Dear ${hr.Name},<br><br>
      I hope this message finds you well.<br><br>
      My name is Yash Lalwani, and I am reaching out to express my interest in opportunities at <strong>${hr.Company}</strong>.<br><br>
      I am a recent B.Tech graduate in Computer Science from LNCT, Bhopal, with hands-on experience in backend development (Node.js, Express.js), MERN stack, and a strong foundation in algorithms and data structures.<br><br>
      My experience includes internships at Altruism Labs (Backend Developer), Persistent Martian Program (Trainee), and CISCO Virtual Internship, as well as leading and developing several web applications and projects using modern technologies.<br><br>
      I have consistently demonstrated strong problem-solving skills, with a 1500+ rating on Leetcode and an AIR-2284 at CodeKaze-Sep’23.<br><br>
      I am eager to contribute my technical skills, adaptability, and passion for building scalable solutions to your team. My resume is attached for your review.<br><br>
      Thank you for considering my application. I look forward to the possibility of discussing how I can add value to your organization.<br><br>
      Best regards,<br>
      <strong>Yash Lalwani</strong><br>
      yashlalwani661@gmail.com<br>
      (917)-405-4636<br>
      <a href="https://linkedin.com/in/yash-lalwani9">LinkedIn</a> | <a href="https://github.com/codewithlalwani">GitHub</a>
    `;

    await sendEmailWithAttachment({
      recipient_email: hr.Email,
      subject,
      message,
      resumePath,
    });

    console.log(`📬 Email sent to HR S.No ${hr.SNo} (${hr.Email})`);
    currentSNo = hr.SNo + 1;

    // Immediately send to next HR
    setImmediate(sendEmailToNextHR);
  } catch (err) {
    console.error("❌ Error sending email:", err);
    // Try next HR after a short delay in case of error
    setTimeout(sendEmailToNextHR, 5000);
  }
}

// 📤 Send Email With Attachment
function sendEmailWithAttachment({ recipient_email, subject, message, resumePath }) {
  return new Promise((resolve, reject) => {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: "",
        pass: "", // 🔐 Use env variable in production
      },
    });

    const mail_configs = {
      from: '"Yash Lalwani" <yashlalwani661@gmail.com>',
      to: recipient_email,
      subject: subject,
      html: message,
      attachments: [
        {
          filename: "resume.pdf",
          path: resumePath,
          contentType: "application/pdf",
        },
      ],
    };

    transporter.sendMail(mail_configs, async (error, info) => {
      const log = new EmailLog({
        sender: "yashlalwani661@gmail.com",
        recipient: recipient_email,
        subject,
        message,
        status: error ? "failed" : "success",
        error: error ? error.toString() : null,
      });

      try {
        await log.save();
        console.log(`📨 Email log saved for ${recipient_email}`);
      } catch (err) {
        console.error("❌ Failed to save email log:", err);
      }

      if (error) {
        console.log(`❌ Send failed for ${recipient_email}:`, error);
        return reject({ message: "Error sending email." });
      }

      console.log(`✅ Email sent to ${recipient_email}:`, info.response);
      return resolve({ message: "Email sent and logged." });
    });
  });
}

// 🌐 Email Log API
app.get("/email_logs", async (req, res) => {
  try {
    const logs = await EmailLog.find().sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).send("Error fetching logs");
  }
});

// ⏰ Auto-send on Startup
app.listen(port, async () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log("📩 Starting to send emails to HRs after S.No 40...");
  sendEmailToNextHR();
});

// ⏰ Retry daily at 9AM (will continue from last S.No)
cron.schedule("0 9 * * *", async () => {
  console.log("⏰ Cron triggered – continuing daily follow-up emails...");
  sendEmailToNextHR();
});

// ⏰ Retry daily at 9AM
cron.schedule("0 9 * * *", async () => {
  console.log("⏰ Cron triggered – sending daily follow-up emails...");
  await sendEmailToHRs();
});
