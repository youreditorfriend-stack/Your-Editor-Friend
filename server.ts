import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBqgmzrNelS701uQ1ngLvcoatUkcBuiRic",
  authDomain: "gen-lang-client-0681082317.firebaseapp.com",
  projectId: "gen-lang-client-0681082317",
  appId: "1:834918791822:web:ef4b1dc9724967ab64a7df"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

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
      const docRef = doc(db, "app", "data");
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        res.json(docSnap.data());
      } else {
        res.status(404).json({ error: "Portfolio data not found in Firebase" });
      }
    } catch (error) {
      console.error("Firebase read error:", error);
      res.status(500).json({ error: "Failed to read portfolio data from Firebase" });
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
      await setDoc(doc(db, "app", "data"), newPortfolio);
      res.json({ message: "Portfolio updated successfully in Firebase" });
    } catch (error) {
      console.error("Firebase write error:", error);
      res.status(500).json({ error: "Failed to update portfolio data in Firebase" });
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
