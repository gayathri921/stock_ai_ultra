import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import dotenv from "dotenv";

dotenv.config();

const db = new Database("stockai.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    pin TEXT,
    biometrics_enabled INTEGER DEFAULT 0,
    language TEXT DEFAULT 'en',
    theme TEXT DEFAULT 'dark'
  );

  CREATE TABLE IF NOT EXISTS portfolio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    symbol TEXT,
    quantity REAL,
    buy_price REAL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    role TEXT,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  const PORT = 3000;

  app.use(express.json());

  // --- Auth Middleware ---
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // --- API Routes ---

  // Auth
  app.post("/api/auth/signup", async (req, res) => {
    const { email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const stmt = db.prepare("INSERT INTO users (email, password) VALUES (?, ?)");
      const info = stmt.run(email, hashedPassword);
      res.status(201).json({ id: info.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'secret');
    res.json({ token, user: { id: user.id, email: user.email, language: user.language, theme: user.theme } });
  });

  // Portfolio
  app.get("/api/portfolio", authenticateToken, (req: any, res) => {
    const stocks = db.prepare("SELECT * FROM portfolio WHERE user_id = ?").all(req.user.id);
    res.json(stocks);
  });

  app.post("/api/portfolio", authenticateToken, (req: any, res) => {
    const { symbol, quantity, buy_price } = req.body;
    const stmt = db.prepare("INSERT INTO portfolio (user_id, symbol, quantity, buy_price) VALUES (?, ?, ?, ?)");
    stmt.run(req.user.id, symbol, quantity, buy_price);
    res.sendStatus(201);
  });

  // User Settings
  app.get("/api/user/settings", authenticateToken, (req: any, res) => {
    const settings = db.prepare("SELECT language, theme, biometrics_enabled FROM users WHERE id = ?").get(req.user.id);
    res.json(settings);
  });

  app.post("/api/user/settings", authenticateToken, (req: any, res) => {
    const { language, theme, biometrics_enabled } = req.body;
    db.prepare("UPDATE users SET language = ?, theme = ?, biometrics_enabled = ? WHERE id = ?")
      .run(language, theme, biometrics_enabled ? 1 : 0, req.user.id);
    res.sendStatus(200);
  });

  app.post("/api/user/password", authenticateToken, async (req: any, res) => {
    const { currentPassword, newPassword } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ error: "Invalid current password" });
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedNewPassword, req.user.id);
    res.sendStatus(200);
  });

  app.delete("/api/user", authenticateToken, (req: any, res) => {
    try {
      const userId = req.user.id;
      // Use a transaction to ensure all data is deleted
      const deleteUser = db.transaction((id) => {
        db.prepare("DELETE FROM portfolio WHERE user_id = ?").run(id);
        db.prepare("DELETE FROM chat_history WHERE user_id = ?").run(id);
        db.prepare("DELETE FROM users WHERE id = ?").run(id);
      });
      deleteUser(userId);
      res.sendStatus(200);
    } catch (e) {
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // --- Real-time Stock Mock ---
  const STOCKS = ["AAPL", "TSLA", "GOOGL", "AMZN", "MSFT", "NVDA", "META", "BTC", "ETH", "NFLX", "DIS", "PYPL", "ADBE", "INTC", "AMD", "ORCL", "CRM", "UBER", "ABNB", "COIN", "HOOD", "SQ", "SHOP", "SPOT", "ZM", "SPX", "IXIC", "DJI"];
  const stockPrices: Record<string, number> = {
    AAPL: 185.92, TSLA: 175.34, GOOGL: 142.12, AMZN: 178.22, MSFT: 415.10, NVDA: 875.23, META: 490.22, BTC: 65000, ETH: 3500,
    NFLX: 605.20, DIS: 112.45, PYPL: 64.32, ADBE: 520.11, INTC: 42.50, AMD: 180.45, ORCL: 125.30, CRM: 305.20, UBER: 78.45,
    ABNB: 155.20, COIN: 245.30, HOOD: 18.45, SQ: 72.10, SHOP: 75.40, SPOT: 260.10, ZM: 65.20,
    SPX: 5847.23, IXIC: 20891.54, DJI: 43524.12
  };

  setInterval(() => {
    Object.keys(stockPrices).forEach(symbol => {
      const change = (Math.random() - 0.5) * 1.5;
      stockPrices[symbol] = parseFloat((stockPrices[symbol] + change).toFixed(2));
    });
    io.emit("stock_update", stockPrices);
  }, 1000);

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
