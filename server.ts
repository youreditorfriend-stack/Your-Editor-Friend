import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

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
