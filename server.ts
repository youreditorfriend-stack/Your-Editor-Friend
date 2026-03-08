import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, "data", "portfolio.json");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.post("/api/login", (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    
    if (password === adminPassword) {
      res.json({ success: true, token: Buffer.from(adminPassword).toString('base64') });
    } else {
      res.status(401).json({ success: false, message: "Invalid password" });
    }
  });

  app.get("/api/portfolio", async (req, res) => {
    try {
      const data = await fs.readFile(DATA_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      res.status(500).json({ error: "Failed to read portfolio data" });
    }
  });

  app.post("/api/portfolio", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
      const expectedToken = Buffer.from(adminPassword).toString('base64');

      if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { data: newPortfolio } = req.body;
      await fs.writeFile(DATA_FILE, JSON.stringify(newPortfolio, null, 2));
      res.json({ message: "Portfolio updated successfully" });
    } catch (error) {
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
