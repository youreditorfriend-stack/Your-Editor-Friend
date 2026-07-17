import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
// The same serverless handler used on Vercel — reused locally so the AI chat
// works in dev too (Express req/res are compatible with what it expects).
import chatHandler from "./api/chat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/portfolio", async (req, res) => {
    try {
      const DATA_FILE = path.join(__dirname, "data", "portfolio.json");
      const data = await fs.readFile(DATA_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      console.error("File error:", error);
      res.status(500).json({ error: "Failed to read portfolio data" });
    }
  });

  app.get("/api/video", async (req, res) => {
    try {
      const DATA_FILE = path.join(__dirname, "data", "portfolio.json");
      const data = await fs.readFile(DATA_FILE, "utf-8");
      const json = JSON.parse(data);
      res.json(json.websiteData || { url: "" });
    } catch (error) {
      console.error("File error:", error);
      res.status(500).json({ error: "Failed to read video data" });
    }
  });

  app.post("/api/portfolio", async (req, res) => {
    try {
      const { data: newPortfolio } = req.body;
      const DATA_FILE = path.join(__dirname, "data", "portfolio.json");
      await fs.writeFile(DATA_FILE, JSON.stringify(newPortfolio, null, 2));
      res.json({ message: "Portfolio updated successfully" });
    } catch (error) {
      console.error("File save error:", error);
      res.status(500).json({ error: "Failed to update portfolio data" });
    }
  });

  // Razorpay endpoints live as Vercel serverless functions (/api folder) in
  // production. In local dev they're not configured, so return 503 — the site
  // then falls back to the WhatsApp purchase flow automatically.
  app.post("/api/create-order", (_req, res) => {
    res.status(503).json({ error: "Razorpay not configured in local dev" });
  });
  app.post("/api/verify-payment", (_req, res) => {
    res.status(503).json({ error: "Razorpay not configured in local dev" });
  });
  // Same for the YouTube stats function — the site falls back to the snapshot
  // in src/lib/site.ts when this isn't available.
  app.get("/api/youtube-stats", (_req, res) => {
    res.status(503).json({ error: "YouTube API not configured in local dev" });
  });
  // AI chat: reuse the real serverless handler. It reads OPENAI_API_KEY from
  // the environment (set a local .env — see .env.example) and returns 503 by
  // itself when the key is missing, so the UI still falls back gracefully.
  app.post("/api/chat", (req, res) => chatHandler(req, res));
  // R2 uploads only work on the deployed site; locally, paste an image URL.
  app.post("/api/upload-file-url", (_req, res) => {
    res.status(503).json({ error: "R2 not configured", missing: ["local dev"] });
  });
  app.post("/api/upload-image", (_req, res) => {
    res.status(503).json({ error: "R2 not configured", missing: ["local dev"] });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
