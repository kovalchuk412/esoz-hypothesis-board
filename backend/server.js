import express from "express";
import cors from "cors";
import helmet from "helmet";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "board.sqlite");
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  blob TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",") }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "esoz-hypothesis-board-api" });
});

app.get("/api/users", (_req, res) => {
  const rows = db.prepare("SELECT id, blob, updated_at FROM users ORDER BY updated_at DESC").all();
  const users = rows.map(row => ({
    id: row.id,
    updated_at: row.updated_at,
    blob: safeJson(row.blob)
  }));
  res.json({ users });
});

app.get("/api/users/:id", (req, res) => {
  const row = db.prepare("SELECT id, blob, updated_at FROM users WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "User not found" });
  res.json({ id: row.id, updated_at: row.updated_at, blob: safeJson(row.blob) });
});

app.put("/api/users/:id", (req, res) => {
  const { blob } = req.body || {};
  if (!blob || typeof blob !== "object" || Array.isArray(blob)) {
    return res.status(400).json({ error: "Expected body: { blob: object }" });
  }

  const normalized = {
    name: String(blob.name || "—").slice(0, 40),
    votes: sanitizeVotes(blob.votes || {}),
    comments: sanitizeComments(blob.comments || {})
  };

  db.prepare(`
    INSERT INTO users (id, blob, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET blob = excluded.blob, updated_at = CURRENT_TIMESTAMP
  `).run(req.params.id, JSON.stringify(normalized));

  res.json({ id: req.params.id, blob: normalized });
});

function safeJson(value) {
  try { return JSON.parse(value); } catch { return null; }
}

function sanitizeVotes(votes) {
  const result = {};
  for (const [cardId, choice] of Object.entries(votes)) {
    if (/^[A-D]\d{1,2}$/.test(cardId) && ["keep", "q", "rm"].includes(choice)) {
      result[cardId] = choice;
    }
  }
  return result;
}

function sanitizeComments(comments) {
  const result = {};
  for (const [cardId, arr] of Object.entries(comments)) {
    if (!/^[A-D]\d{1,2}$/.test(cardId) || !Array.isArray(arr)) continue;
    result[cardId] = arr.slice(-100).map(item => ({
      t: Number(item?.t || Date.now()),
      txt: String(item?.txt || "").slice(0, 500)
    })).filter(item => item.txt.trim());
  }
  return result;
}

app.listen(PORT, () => {
  console.log(`API is running on http://localhost:${PORT}`);
});
