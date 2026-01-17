import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Vite builds to dist/public (from vite.config.ts)
const clientDistPath = path.resolve(__dirname, "../dist/public");

export function serveStatic(app: express.Express) {
  app.use(express.static(clientDistPath));

  // SPA fallback (important)
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}
