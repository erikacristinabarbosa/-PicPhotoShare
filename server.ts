import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { google } from "googleapis";
import { Readable } from "stream";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Google Drive Auth ────────────────────────────────────────────────────────
let driveClient: any = null;

function getDriveClient() {
  if (driveClient) return driveClient;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Configuração do Google Drive ausente (Client ID, Secret ou Refresh Token)"
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  driveClient = google.drive({ version: "v3", auth: oauth2Client });
  return driveClient;
}

// ─── Server Bootstrap ─────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  // ── Middlewares globais ──────────────────────────────────────────────────────
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // CORS — necessário quando frontend e backend estão na mesma origem na Hostinger
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", process.env.APP_URL || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  // ── Multer ───────────────────────────────────────────────────────────────────
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ROTAS DE API
  // IMPORTANTE: todas as rotas /api/* devem vir ANTES do bloco de static/SPA
  // ─────────────────────────────────────────────────────────────────────────────

  // Status
  app.get("/api/status", (_req, res) => {
    res.json({
      status: "running",
      env: process.env.NODE_ENV,
      dependencies: {
        googleDrive: !!(
          process.env.GOOGLE_DRIVE_FOLDER_ID && process.env.GOOGLE_REFRESH_TOKEN
        ),
        twilio: !!(
          process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
        ),
      },
    });
  });

  // Photo Proxy
  app.get("/api/image/:id", async (req, res) => {
    const { id } = req.params;
    if (!id || ["undefined", "null", ""].includes(id)) {
      res.status(400).send("Invalid image ID");
      return;
    }
    try {
      const drive = getDriveClient();
      const response = await drive.files.get(
        { fileId: id, alt: "media" },
        { responseType: "stream" }
      );
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=31536000");
      response.data.pipe(res);
    } catch (error: any) {
      const status = error.response?.status || 500;
      if (status === 404) {
        console.warn(`Image not found in Drive (${id})`);
        res.status(404).send("Image not found");
      } else {
        console.error(`Error proxying image (${id}) [${status}]:`, error.message);
        res.status(status).send("Error fetching image");
      }
    }
  });

  // Video Proxy com suporte a Range (streaming)
  app.get("/api/video/:id", async (req, res) => {
    const { id } = req.params;
    if (!id || ["undefined", "null", ""].includes(id)) {
      res.status(400).send("Invalid video ID");
      return;
    }
    try {
      const drive = getDriveClient();

      const metaResponse = await drive.files.get({
        fileId: id,
        fields: "size, mimeType",
      });

      const fileSize = parseInt(metaResponse.data.size || "0", 10);
      const mimeType = metaResponse.data.mimeType || "video/mp4";
      const range = req.headers.range;

      if (range && fileSize > 0) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": mimeType,
        });

        const response = await drive.files.get(
          { fileId: id, alt: "media" },
          {
            responseType: "stream",
            headers: { Range: `bytes=${start}-${end}` },
          }
        );
        response.data.pipe(res);
      } else {
        res.writeHead(200, {
          "Content-Length": fileSize,
          "Content-Type": mimeType,
          "Accept-Ranges": "bytes",
        });
        const response = await drive.files.get(
          { fileId: id, alt: "media" },
          { responseType: "stream" }
        );
        response.data.pipe(res);
      }
    } catch (error: any) {
      const status = error.response?.status || 500;
      if (status === 404) {
        res.status(404).send("Video not found");
      } else {
        console.error(`Error proxying video (${id}) [${status}]:`, error.message);
        res.status(status).send("Error fetching video");
      }
    }
  });

  // Delete Drive File
  app.delete("/api/drive/:id", async (req, res) => {
    try {
      const drive = getDriveClient();
      await drive.files.delete({ fileId: req.params.id });
      res.json({ success: true });
    } catch (error: any) {
      if (error.response?.status === 404) {
        return res.json({ success: true }); // já deletado, tudo bem
      }
      console.error(`Error deleting file (${req.params.id}):`, error.message);
      res.status(500).json({ error: "Failed to delete file from Drive" });
    }
  });

  // Upload → Google Drive
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }

      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      if (!folderId) {
        throw new Error("GOOGLE_DRIVE_FOLDER_ID não configurado");
      }

      const drive = getDriveClient();

      const stream = new Readable();
      stream.push(req.file.buffer);
      stream.push(null);

      const file = await drive.files.create({
        requestBody: {
          name: req.file.originalname,
          parents: [folderId],
        },
        media: {
          mimeType: req.file.mimetype,
          body: stream,
        },
        fields: "id, webViewLink, thumbnailLink",
      });

      // Permissão pública de leitura
      try {
        await drive.permissions.create({
          fileId: file.data.id,
          requestBody: { role: "reader", type: "anyone" },
        });
      } catch (permError: any) {
        console.warn(
          "Could not set public permissions:",
          permError.message
        );
      }

      res.json({
        id: file.data.id,
        webViewLink: file.data.webViewLink,
        thumbnailLink: file.data.thumbnailLink,
      });
    } catch (error: any) {
      console.error("Upload error:", error.message);
      res.status(500).json({ error: error.message || "Falha no upload" });
    }
  });

  // Placeholder de download
  app.post("/api/download", (_req, res) => {
    res.json({ message: "Download iniciado! Verifique sua pasta de downloads." });
  });

  // SMS / Recover PIN
  app.post("/api/recover-pin", async (req, res) => {
    try {
      const { phone, pin } = req.body;
      if (!phone || !pin) {
        return res.status(400).json({ error: "Telefone e PIN são necessários" });
      }

      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromPhone = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !fromPhone) {
        console.warn("Twilio não configurado — simulando envio.");
        return res.json({
          message: "Em produção, um SMS seria enviado.",
          simulated: true,
        });
      }

      const twilio = await import("twilio");
      const client = twilio.default(accountSid, authToken);

      await client.messages.create({
        body: `Seu PIN de acesso é: ${pin}`,
        from: fromPhone,
        to: `+55${phone}`,
      });

      res.json({ message: "SMS enviado com sucesso!" });
    } catch (error: any) {
      console.error("SMS error:", error.message);
      res.status(500).json({ error: "Falha ao enviar SMS" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FRONTEND — Dev vs Produção
  // ─────────────────────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("🔧 Vite dev server ativo");
  } else {
    const distPath = path.join(process.cwd(), "dist");

    // Verifica se o dist existe antes de tentar servir
    if (!fs.existsSync(distPath)) {
      console.error(
        `ERRO: pasta 'dist' não encontrada em ${distPath}. Execute 'npm run build' primeiro.`
      );
      process.exit(1);
    }

    app.use(express.static(distPath, { maxAge: "1y", etag: true }));

    // Todas as rotas desconhecidas → index.html (React Router)
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });

    console.log(`📦 Servindo frontend estático de: ${distPath}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLER GLOBAL DE ERROS
  // ─────────────────────────────────────────────────────────────────────────────
  app.use(
    (
      err: any,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error("Global express error:", err);
      if (req.path.startsWith("/api/")) {
        res
          .status(err.status || 500)
          .json({ error: err.message || "Internal Server Error" });
      } else {
        res.status(500).send("Internal Server Error");
      }
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // START
  // ─────────────────────────────────────────────────────────────────────────────
  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `🚀 Server running on http://0.0.0.0:${PORT} [${process.env.NODE_ENV || "development"}]`
    );
  });
}

// Import fs aqui para não criar conflito com o import dinâmico do vite
import fs from "fs";

startServer().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
