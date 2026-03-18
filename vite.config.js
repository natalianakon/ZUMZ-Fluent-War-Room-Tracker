import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(__dirname, "data");

function fileApiPlugin() {
  return {
    name: "war-room-file-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // GET /api/projects — list all project metadata
        if (req.method === "GET" && req.url === "/api/projects") {
          const metaFile = path.join(DATA_DIR, "projects.json");
          if (fs.existsSync(metaFile)) {
            res.setHeader("Content-Type", "application/json");
            res.end(fs.readFileSync(metaFile, "utf-8"));
          } else {
            res.setHeader("Content-Type", "application/json");
            res.end("null");
          }
          return;
        }

        // POST /api/projects — save project metadata
        if (req.method === "POST" && req.url === "/api/projects") {
          let body = "";
          req.on("data", chunk => { body += chunk; });
          req.on("end", () => {
            fs.writeFileSync(path.join(DATA_DIR, "projects.json"), body);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true }));
          });
          return;
        }

        // GET /api/board/:id — read board data for a project
        const getMatch = req.url?.match(/^\/api\/board\/([^/?]+)$/);
        if (req.method === "GET" && getMatch) {
          const id = getMatch[1];
          // Legacy: fluent-commerce maps to board-live.json
          const file = id === "fluent-commerce"
            ? path.join(DATA_DIR, "board-live.json")
            : path.join(DATA_DIR, `board-${id}.json`);
          if (fs.existsSync(file)) {
            res.setHeader("Content-Type", "application/json");
            res.end(fs.readFileSync(file, "utf-8"));
          } else {
            res.setHeader("Content-Type", "application/json");
            res.end("null");
          }
          return;
        }

        // POST /api/board/:id — save board data for a project
        const postMatch = req.url?.match(/^\/api\/board\/([^/?]+)$/);
        if (req.method === "POST" && postMatch) {
          const id = postMatch[1];
          const file = id === "fluent-commerce"
            ? path.join(DATA_DIR, "board-live.json")
            : path.join(DATA_DIR, `board-${id}.json`);
          let body = "";
          req.on("data", chunk => { body += chunk; });
          req.on("end", () => {
            fs.writeFileSync(file, body);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true }));
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), fileApiPlugin()],
  server: {
    port: 5174,
    host: "127.0.0.1",
    open: false,
  },
});
