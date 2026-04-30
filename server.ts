import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { google } from "googleapis";
import { Readable } from "stream";
import dotenv from "dotenv";
import fs from "fs";
import os from "os";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Google Drive Auth
let driveClient: any = null;

function getDriveClient() {
  if (driveClient) return driveClient;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Configuração do Google Drive ausente (Client ID, Secret ou Refresh Token)");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  driveClient = google.drive({ version: "v3", auth: oauth2Client });
  return driveClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Mullter for file uploads (use memoryStorage for small files)
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
  });

  // Basic API for status
  app.get("/api/status", (req, res) => {
    res.json({ 
      status: "running",
      dependencies: {
        ytdlp: true,
        ffmpeg: true,
        googleDrive: !!(process.env.GOOGLE_DRIVE_FOLDER_ID && process.env.GOOGLE_REFRESH_TOKEN)
      }
    });
  });

  // Photo Proxy
  app.get("/api/image/:id", async (req, res) => {
    try {
      if (!req.params.id || req.params.id === 'undefined' || req.params.id === 'null' || req.params.id === '') {
        res.status(400).send("Invalid image ID");
        return;
      }
      const drive = getDriveClient();
      const response = await drive.files.get(
        { fileId: req.params.id, alt: "media" },
        { responseType: "stream" }
      );
      
      // Set appropriate content type if possible, or default to image/jpeg
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=31536000"); // 1 year cache
      response.data.pipe(res);
    } catch (error: any) {
      const status = error.response?.status || 500;
      let errorMsg = error.message;
      if (error.response?.data) {
         try {
           errorMsg = JSON.stringify(error.response.data);
         } catch(e) {}
      }
      if (status === 404) {
        console.warn(`Image not found in Drive (${req.params.id})`);
        res.status(404).send("Image not found");
      } else {
        console.error(`Error proxying image (${req.params.id}) [${status}]:`, errorMsg);
        res.status(status).send("Error fetching image");
      }
    }
  });

  // Video Proxy
  app.get("/api/video/:id", async (req, res) => {
    try {
      if (!req.params.id || req.params.id === 'undefined' || req.params.id === 'null' || req.params.id === '') {
        res.status(400).send("Invalid video ID");
        return;
      }
      const drive = getDriveClient();
      const fileId = req.params.id;

      // Get metadata to support ranges and content type
      const metaResponse = await drive.files.get({
        fileId: fileId,
        fields: "size, mimeType"
      });
      
      const fileSize = parseInt(metaResponse.data.size || "0", 10);
      const mimeType = metaResponse.data.mimeType || "video/mp4";
      const range = req.headers.range;

      if (range && fileSize > 0) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        
        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": mimeType,
        });
        
        const response = await drive.files.get(
          { fileId: fileId, alt: "media" },
          { 
            responseType: "stream",
            headers: {
              Range: `bytes=${start}-${end}`
            }
          }
        );
        response.data.pipe(res);
      } else {
        res.writeHead(200, {
          "Content-Length": fileSize,
          "Content-Type": mimeType,
          "Accept-Ranges": "bytes"
        });
        const response = await drive.files.get(
          { fileId: fileId, alt: "media" },
          { responseType: "stream" }
        );
        response.data.pipe(res);
      }
    } catch (error: any) {
      const status = error.response?.status || 500;
      let errorMsg = error.message;
      if (error.response?.data) {
         try {
           errorMsg = JSON.stringify(error.response.data);
         } catch(e) {}
      }
      if (status === 404) {
        console.warn(`Video not found in Drive (${req.params.id})`);
        res.status(404).send("Video not found");
      } else {
        console.error(`Error proxying video (${req.params.id}) [${status}]:`, errorMsg);
        res.status(status).send("Error fetching video");
      }
    }
  });

  // Delete Drive File Endpoint
  app.delete("/api/drive/:id", async (req, res) => {
    try {
      const drive = getDriveClient();
      await drive.files.delete({ fileId: req.params.id });
      res.json({ success: true });
    } catch (error: any) {
      console.error(`Error deleting file (${req.params.id}):`, error.message);
      // If it's already 404, we don't care, it's deleted
      if (error.response?.status === 404) {
        return res.json({ success: true });
      }
      res.status(500).json({ error: "Failed to delete file from Drive" });
    }
  });

  // Upload Endpoint
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
      const fileMetadata = {
        name: req.file.originalname,
        parents: [folderId],
      };

      const stream = new Readable();
      stream.push(req.file.buffer);
      stream.push(null);

      const media = {
        mimeType: req.file.mimetype,
        body: stream, 
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id, webViewLink, thumbnailLink",
      });

      // Grant public read permission so links work (optional, depends on security needs)
      try {
        await drive.permissions.create({
          fileId: file.data.id,
          requestBody: {
            role: "reader",
            type: "anyone",
          },
        });
      } catch (permError: any) {
        console.warn("Could not set public permissions, links might be restricted:", permError.message);
      }

      res.json({
        id: file.data.id,
        webViewLink: file.data.webViewLink,
        thumbnailLink: file.data.thumbnailLink,
      });
    } catch (error: any) {
      console.error("Upload error:", error.message);
      res.status(500).json({ error: error.message || "Falha no upload para o Google Drive" });
    }
  });

  // Example download endpoint (placeholder)
  app.post("/api/download", (req, res) => {
    res.json({ message: "Download iniciado! Verifique sua pasta de downloads." });
  });

  // SMS Recovery Endpoint
  app.post("/api/recover-pin", express.json(), async (req, res) => {
    try {
      const { phone, pin } = req.body;
      if (!phone || !pin) {
        return res.status(400).json({ error: "Telefone e PIN são necessários" });
      }

      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromPhone = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !fromPhone) {
        console.warn("Twilio não está configurado. Simulando envio de SMS.");
        return res.json({ 
          message: "Em ambiente de produção, um SMS seria enviado.", 
          simulated: true, 
          recoveredPin: pin 
        });
      }

      const twilio = await import("twilio");
      const client = twilio.default(accountSid, authToken);

      await client.messages.create({
        body: `Seu PIN de acesso é: ${pin}`,
        from: fromPhone,
        to: `+55${phone}`
      });

      res.json({ message: "SMS enviado com sucesso!" });
    } catch (error: any) {
      console.error("SMS error:", error.message);
      res.status(500).json({ error: "Falha ao enviar SMS" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global express error:", err);
    if (req.path.startsWith('/api/')) {
      res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
    } else {
      next(err);
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
