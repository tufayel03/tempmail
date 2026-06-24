import express from "express";
import path from "path";
import cors from "cors";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import { createServer as createViteServer } from "vite";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Ensure standard imports work in ESM/CJS depending on target
const PORT = 3000;
const app = express();

// Trust reverse proxy headers (Nginx, Cloud Run, etc.) for accurate rate limiting
app.set("trust proxy", 1);

// Set up basic CORS
app.use(cors({
  origin: "*", // Allow all in preview, configure strictly in production
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Webhook-Secret"],
}));

// Apply basic rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }, // Suppress internal validation warnings about proxy headers in sandbox
  message: { error: "Too many requests from this IP, please try again later." },
});

// We only rate limit standard API routes, not the webhook itself to avoid losing emails
app.use("/api/messages", apiLimiter);

// Parse JSON and URL-encoded bodies
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Define Email interface for both MongoDB & in-memory store
interface IEmail {
  to_address: string;
  from_address: string;
  subject: string;
  body_text: string;
  body_html: string;
  created_at: Date;
}

// In-Memory Database fallback for AI Studio Preview
class InMemoryDb {
  private emails: (IEmail & { _id: string })[] = [];

  constructor() {
    // Run a periodic TTL cleanup every minute to delete emails older than 1 hour (3600s)
    setInterval(() => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const beforeCount = this.emails.length;
      this.emails = this.emails.filter(email => email.created_at > oneHourAgo);
      const afterCount = this.emails.length;
      if (beforeCount !== afterCount) {
        console.log(`[TTL Cleanup] Deleted ${beforeCount - afterCount} expired emails from memory.`);
      }
    }, 60000);
  }

  async create(emailData: IEmail) {
    const newEmail = {
      ...emailData,
      _id: Math.random().toString(36).substring(2, 11),
      created_at: emailData.created_at || new Date(),
    };
    this.emails.push(newEmail);
    return newEmail;
  }

  async findByEmail(email: string) {
    const normalized = email.toLowerCase().trim();
    return this.emails
      .filter(item => item.to_address.toLowerCase().trim() === normalized)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  async deleteOne(id: string) {
    const index = this.emails.findIndex(item => item._id === id);
    if (index !== -1) {
      this.emails.splice(index, 1);
      return true;
    }
    return false;
  }

  async deleteByEmail(email: string) {
    const normalized = email.toLowerCase().trim();
    const initialCount = this.emails.length;
    this.emails = this.emails.filter(item => item.to_address.toLowerCase().trim() !== normalized);
    return initialCount - this.emails.length;
  }

  getAll() {
    return this.emails;
  }
}

const memoryDb = new InMemoryDb();

// MongoDB Mongoose Connection
let isMongoConnected = false;
let EmailModel: mongoose.Model<any>;

const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI) {
  console.log("Connecting to MongoDB...");
  mongoose.connect(MONGODB_URI)
    .then(() => {
      isMongoConnected = true;
      console.log("✅ MongoDB Connected successfully!");
    })
    .catch((err) => {
      console.error("❌ MongoDB connection error:", err.message);
      console.log("⚠️ Falling back to In-Memory Database.");
    });

  // Schema definition
  const emailSchema = new mongoose.Schema({
    to_address: { type: String, required: true, index: true },
    from_address: { type: String, required: true },
    subject: { type: String, default: "" },
    body_text: { type: String, default: "" },
    body_html: { type: String, default: "" },
    created_at: { type: Date, default: Date.now, index: { expires: 3600 } } // 1 hour TTL index
  }, { timestamps: false });

  // Add lowercase index for search optimization
  emailSchema.index({ to_address: 1 });

  EmailModel = mongoose.models.Email || mongoose.model("Email", emailSchema);
} else {
  console.log("ℹ️ No MONGODB_URI environment variable set. Database is running in Local In-Memory Fallback mode for AI Studio Preview.");
}

// REST API Endpoints

// Helper to save emails (unified for MongoDB or memory)
async function saveEmail(payload: IEmail) {
  const normalizedTo = payload.to_address.toLowerCase().trim();
  const data = {
    to_address: normalizedTo,
    from_address: payload.from_address,
    subject: payload.subject || "(No Subject)",
    body_text: payload.body_text || "",
    body_html: payload.body_html || "",
    created_at: new Date()
  };

  if (isMongoConnected && EmailModel) {
    const email = new EmailModel(data);
    return await email.save();
  } else {
    return await memoryDb.create(data);
  }
}

// 1. POST /api/incoming-email (Cloudflare Webhook)
app.post("/api/incoming-email", async (req, res) => {
  try {
    // Authenticate Webhook using shared secret key
    const secretHeader = req.headers["x-webhook-secret"];
    const expectedSecret = process.env.CF_WEBHOOK_SECRET || "SUPER_SECRET_CF_KEY_123";

    if (!secretHeader || secretHeader !== expectedSecret) {
      console.warn("Unauthorized webhook attempt detected.");
      return res.status(401).json({ error: "Unauthorized. Invalid webhook secret." });
    }

    const { to_address, from_address, subject, body_text, body_html } = req.body;

    if (!to_address || !from_address) {
      return res.status(400).json({ error: "Missing required fields: to_address and from_address." });
    }

    const saved = await saveEmail({
      to_address,
      from_address,
      subject,
      body_text,
      body_html,
      created_at: new Date()
    });

    console.log(`📥 Incoming email received: ${from_address} -> ${to_address} (${subject})`);
    return res.status(201).json({ success: true, message: "Email received and saved.", data: saved });
  } catch (error: any) {
    console.error("Error processing incoming webhook:", error);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// 2. GET /api/messages (Retrieve emails for an address)
app.get("/api/messages", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Query parameter 'email' is required." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    let messages;
    if (isMongoConnected && EmailModel) {
      messages = await EmailModel.find({ to_address: normalizedEmail })
        .sort({ created_at: -1 })
        .exec();
    } else {
      messages = await memoryDb.findByEmail(normalizedEmail);
    }

    return res.json({
      success: true,
      email: normalizedEmail,
      count: messages.length,
      messages,
      db_mode: isMongoConnected ? "mongodb" : "in-memory-fallback"
    });
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// 3. DELETE /api/messages/:id (Delete individual message)
app.delete("/api/messages/:id", async (req, res) => {
  try {
    const { id } = req.params;

    let deleted = false;
    if (isMongoConnected && EmailModel) {
      const result = await EmailModel.deleteOne({ _id: id });
      deleted = result.deletedCount > 0;
    } else {
      deleted = await memoryDb.deleteOne(id);
    }

    if (deleted) {
      return res.json({ success: true, message: "Message deleted successfully." });
    } else {
      return res.status(404).json({ error: "Message not found." });
    }
  } catch (error: any) {
    console.error("Error deleting message:", error);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// 4. DELETE /api/messages (Clear mailbox)
app.delete("/api/messages", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Query parameter 'email' is required." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    let deletedCount = 0;
    if (isMongoConnected && EmailModel) {
      const result = await EmailModel.deleteMany({ to_address: normalizedEmail });
      deletedCount = result.deletedCount;
    } else {
      deletedCount = await memoryDb.deleteByEmail(normalizedEmail);
    }

    return res.json({ success: true, message: `Inbox cleared. Deleted ${deletedCount} messages.` });
  } catch (error: any) {
    console.error("Error clearing inbox:", error);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// 5. POST /api/generate-mock-email (Simulation endpoint for testing)
app.post("/api/generate-mock-email", async (req, res) => {
  try {
    const { to_address, sender, subject, body_html, body_text } = req.body;

    if (!to_address) {
      return res.status(400).json({ error: "to_address is required to simulate an email." });
    }

    const testSenders = [
      "support@github.com",
      "newsletter@medium.com",
      "no-reply@netflix.com",
      "hello@figma.com",
      "security@google.com",
      "verify@discord.com",
      "team@canva.com",
      "billing@stripe.com"
    ];

    const testSubjects = [
      "Verify your email address",
      "Your weekly newsletter has arrived!",
      "New login detected from custom browser",
      "Welcome to our platform!",
      "Important security update for your account",
      "Invoice for subscription #104857",
      "Colleague shared a document with you",
      "Your workspace setup is ready"
    ];

    const testHTMLs = [
      `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff; color: #1f2937;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80" alt="Logo" style="width: 60px; height: 60px; border-radius: 12px; object-fit: cover;" />
        </div>
        <h2 style="font-size: 20px; font-weight: 600; text-align: center; color: #111827; margin-top: 0;">Verify your email address</h2>
        <p style="font-size: 14px; line-height: 1.5; color: #4b5563;">Thank you for signing up for our service. To complete your registration and secure your temporary account, please click the verification button below:</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="#" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="font-size: 13px; line-height: 1.5; color: #6b7280; text-align: center;">If the button doesn't work, copy and paste this link in your browser:<br/><a href="#" style="color: #2563eb;">https://example.com/verify?token=abc123xyz456</a></p>
        <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
        <p style="font-size: 11px; color: #9ca3af; text-align: center; margin-bottom: 0;">This is an automated system email. Please do not reply.</p>
      </div>
      `,
      `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9f9f9; padding: 40px 20px; color: #333;">
        <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Medium Weekly Roundup</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 14px;">Handpicked stories based on your interests</p>
          </div>
          <div style="padding: 30px;">
            <div style="margin-bottom: 25px;">
              <span style="font-size: 12px; color: #4f46e5; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Technology</span>
              <h3 style="margin: 5px 0 8px 0; font-size: 18px; line-height: 1.3;"><a href="#" style="color: #111111; text-decoration: none; font-weight: bold;">How I Built a Temporary Email Service Using Cloudflare Workers and Node.js</a></h3>
              <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.5;">A detailed architectural look into processing high-throughput incoming mail streams completely on the edge...</p>
            </div>
            <div style="margin-bottom: 25px; border-top: 1px solid #eee; padding-top: 20px;">
              <span style="font-size: 12px; color: #ec4899; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Software Engineering</span>
              <h3 style="margin: 5px 0 8px 0; font-size: 18px; line-height: 1.3;"><a href="#" style="color: #111111; text-decoration: none; font-weight: bold;">Understanding TTL Indexes in MongoDB</a></h3>
              <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.5;">Learn how MongoDB leverages background threads to automatically expire and prune stale data records for systems like session stores and temp mail...</p>
            </div>
            <a href="#" style="display: block; text-align: center; background: #111111; color: #fff; text-decoration: none; padding: 12px; border-radius: 5px; font-weight: bold; margin-top: 10px;">Read All Selected Stories</a>
          </div>
        </div>
      </div>
      `,
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; background-color: #fff; padding: 20px; border-radius: 4px;">
        <div style="border-bottom: 2px solid #e50914; padding-bottom: 10px; margin-bottom: 20px;">
          <h2 style="color: #e50914; margin: 0; font-size: 28px; font-weight: bold; letter-spacing: -1px;">NETFLIX</h2>
        </div>
        <h3 style="font-size: 18px; margin-top: 0; color: #333;">New login detected on your account</h3>
        <p>A new device has signed in to your Netflix profile. Here are the details of the login event:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr style="background-color: #f7f7f7;">
            <td style="padding: 10px; font-weight: bold; width: 120px;">Device:</td>
            <td style="padding: 10px;">Linux Web Browser (Chrome/124.0)</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold;">Location:</td>
            <td style="padding: 10px;">Frankfurt, Germany (IP: 193.168.42.11)</td>
          </tr>
          <tr style="background-color: #f7f7f7;">
            <td style="padding: 10px; font-weight: bold;">Time:</td>
            <td style="padding: 10px;">June 24, 2026, 8:24 AM PST</td>
          </tr>
        </table>
        <p>If this was you, you can ignore this email. If this wasn't you, we recommend that you immediately change your password to secure your account.</p>
        <div style="margin-top: 30px; text-align: center;">
          <a href="#" style="background-color: #e50914; color: white; padding: 10px 20px; text-decoration: none; border-radius: 3px; font-weight: bold;">Secure Your Account</a>
        </div>
      </div>
      `
    ];

    const randomSender = sender || testSenders[Math.floor(Math.random() * testSenders.length)];
    const randomIndex = Math.floor(Math.random() * testSubjects.length);
    const randomSubject = subject || testSubjects[randomIndex];
    const randomHTML = body_html || testHTMLs[randomIndex % testHTMLs.length];
    const randomText = body_text || `This is a test plain text body for email: ${randomSubject}. It contains details of your simulated message.`;

    const saved = await saveEmail({
      to_address: to_address,
      from_address: randomSender,
      subject: randomSubject,
      body_text: randomText,
      body_html: randomHTML,
      created_at: new Date()
    });

    return res.status(201).json({
      success: true,
      message: "Mock email simulated and saved successfully.",
      data: saved
    });
  } catch (error: any) {
    console.error("Error creating mock email:", error);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// START EXPRESS & VITE HYBRID SERVER
async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in DEVELOPMENT mode with Vite integration...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    // Inject Vite middlewares to route assets and HMR
    app.use(vite.middlewares);
  } else {
    console.log("Starting in PRODUCTION mode serving static client assets...");
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static client assets from /dist
    app.use(express.static(distPath));
    
    // Fallback everything else to index.html for Single Page App routing
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server successfully booted and listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
