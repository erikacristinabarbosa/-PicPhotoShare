import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { google } from "googleapis";
import cors from "cors";
import { Readable } from "stream";
import fs from "fs";
import os from "os";

// Configure multer for disk storage in the temp directory to save memory
const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // Google Drive API setup
  // Using OAuth2 Refresh Token flow
  const getDriveService = () => {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

      if (!clientId || !clientSecret || !refreshToken) {
        console.warn("Google Drive OAuth2 credentials not fully set. Please provide GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN.");
        return null;
      }

      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        "https://developers.google.com/oauthplayground"
      );

      oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      return google.drive({ version: "v3", auth: oauth2Client });
    } catch (error) {
      console.error("Error initializing Google Drive service:", error);
      return null;
    }
  };

  // Helper to handle Google API errors and provide better context
  const handleGoogleError = (error: any, context: string) => {
    const message = error.message || "";
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || "NÃO DEFINIDO";
    
    if (message.includes('Rate limit exceeded') || message.includes('User Rate Limit Exceeded') || error.code === 429) {
      console.error(`${context} - Rate Limit Error: You are making too many requests to Google Drive.`);
      return "GOOGLE_RATE_LIMIT: O Google Drive está recebendo muitas solicitações. Isso é comum ao carregar muitos arquivos ao mesmo tempo. Por favor, aguarde alguns segundos e tente novamente.";
    }

    if (message.includes('ETIMEDOUT') || message.includes('ECONNRESET')) {
      console.error(`${context} - Network Timeout/Reset Error:`, error);
      return "NETWORK_ERROR: Conexão interrompida. O arquivo pode ser muito grande ou a internet oscilou. Tente novamente.";
    }

    if (message.includes('invalid_grant') || message.includes('unauthorized_client')) {
      console.error(`${context} - Auth Error (${message.includes('invalid_grant') ? 'invalid_grant' : 'unauthorized_client'}): Method: OAuth2`);
      return "Erro de Autenticação (OAuth2): O Refresh Token expirou ou é inválido. Por favor, gere um novo token no OAuth Playground e atualize o segredo GOOGLE_REFRESH_TOKEN.";
    } 
    
    if (message.includes('Google Drive API has not been used') || message.includes('disabled')) {
      const projectMatch = message.match(/project (\d+)/);
      const projectId = projectMatch ? projectMatch[1] : "";
      const enableUrl = projectId 
        ? `https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=${projectId}`
        : "https://console.cloud.google.com/apis/library/drive.googleapis.com";
      
      console.error(`${context} - API Disabled: Google Drive API is not enabled in your Google Cloud project.`);
      return `A API do Google Drive está desativada. Por favor, ative-a neste link: ${enableUrl}`;
    }

    if (message.includes('File not found')) {
      console.error(`${context} - File Not Found: The folder ID [${folderId}] was not found or the account doesn't have access.`);
      return `Pasta não encontrada: O ID [${folderId}] é inválido ou sua conta não tem acesso. Verifique se o ID está correto (sem links ou caracteres extras).`;
    }

    if (error.code === 403 || message.includes('insufficient permissions')) {
      console.error(`${context} - Permission Error: Folder: ${folderId}`);
      
      let extraHint = "";
      if (folderId.includes('drive.google.com') || folderId.includes('/')) {
        extraHint = " DICA: O ID da pasta parece estar incorreto (você colocou o link inteiro?). Use apenas o código final da URL.";
      }

      return `Erro de Permissão: Verifique se você compartilhou a pasta com o e-mail da sua credencial OAuth como 'Editor'. ID da Pasta configurado: [${folderId}].${extraHint}`;
    }

    console.error(`${context} Error:`, error);
    return message || `Falha ao processar ${context.toLowerCase()}`;
  };

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/upload", upload.single("file"), async (req, res) => {
    let filePath = "";
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      filePath = req.file.path;
      const drive = getDriveService();
      if (!drive) {
        return res.status(503).json({ error: "Google Drive service not configured" });
      }

      let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      if (!folderId) {
        return res.status(503).json({ error: "GOOGLE_DRIVE_FOLDER_ID not set" });
      }

      // Sanitize folderId in case user pasted a URL or ID with query params
      if (folderId.includes('?')) {
        folderId = folderId.split('?')[0];
      }
      if (folderId.includes('/')) {
        folderId = folderId.split('/').pop() || folderId;
      }
      folderId = folderId.trim();

      // Ensure filename is safe and not too long
      const originalName = req.file.originalname || 'unnamed_file';
      const ext = path.extname(originalName);
      const base = path.basename(originalName, ext);
      const safeName = base.substring(0, 50) + (ext || '');

      const fileMetadata = {
        name: safeName,
        parents: [folderId],
      };

      const media = {
        mimeType: req.file.mimetype,
        body: fs.createReadStream(filePath),
      };

      const driveRes = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id, webViewLink, webContentLink, thumbnailLink",
        supportsAllDrives: true,
      }, {
        // Increase timeout for uploads
        timeout: 60000,
        retry: true,
      });

      // Make the file publicly readable
      if (driveRes.data.id) {
        await drive.permissions.create({
          fileId: driveRes.data.id,
          requestBody: {
            role: "reader",
            type: "anyone",
          },
          supportsAllDrives: true,
        });
      }

      res.json({
        id: driveRes.data.id,
        webViewLink: driveRes.data.webViewLink,
        webContentLink: driveRes.data.webContentLink,
        thumbnailLink: driveRes.data.thumbnailLink,
      });
    } catch (error: any) {
      const errorMessage = handleGoogleError(error, "Upload");
      const statusCode = (error.code === 429 || (error.message && (error.message.includes('Limit Exceeded') || error.message.includes('Rate limit')))) ? 429 : 500;
      res.status(statusCode).json({ error: errorMessage });
    } finally {
      // Clean up the temporary file
      if (filePath) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error("Error deleting temp file:", err);
        }
      }
    }
  });

  app.get("/api/video/:id", async (req, res) => {
    try {
      const drive = getDriveService();
      if (!drive) {
        return res.status(500).json({ error: "Google Drive service not configured" });
      }

      const fileId = req.params.id;
      
      // Get file metadata to get the mime type and size
      const file = await drive.files.get({
        fileId: fileId,
        fields: 'size, mimeType',
        supportsAllDrives: true,
      });

      const fileSize = parseInt(file.data.size || '0', 10);
      const mimeType = file.data.mimeType || 'video/mp4';

      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': mimeType,
        });

        const response = await drive.files.get(
          { fileId: fileId, alt: 'media', supportsAllDrives: true },
          { responseType: 'stream', headers: { Range: `bytes=${start}-${end}` } }
        );

        response.data.on('error', (err) => {
          console.error('Stream error:', err);
          if (!res.headersSent) res.status(500).end();
        }).pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': mimeType,
        });

        const response = await drive.files.get(
          { fileId: fileId, alt: 'media', supportsAllDrives: true },
          { responseType: 'stream' }
        );

        response.data.on('error', (err) => {
          console.error('Stream error:', err);
          if (!res.headersSent) res.status(500).end();
        }).pipe(res);
      }
    } catch (error: any) {
      const errorMessage = handleGoogleError(error, "Video stream");
      if (!res.headersSent) {
        res.status(500).json({ error: errorMessage });
      }
    }
  });

  app.get("/api/image/:id", async (req, res) => {
    try {
      const drive = getDriveService();
      if (!drive) {
        return res.status(500).json({ error: "Google Drive service not configured" });
      }

      const fileId = req.params.id;
      
      const file = await drive.files.get({
        fileId: fileId,
        fields: 'size, mimeType',
        supportsAllDrives: true,
      });

      const fileSize = parseInt(file.data.size || '0', 10);
      const mimeType = file.data.mimeType || 'image/jpeg';

      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      });

      const response = await drive.files.get(
        { fileId: fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'stream' }
      );

      response.data.on('error', (err) => {
        console.error('Image stream error:', err);
        if (!res.headersSent) res.status(500).end();
      }).pipe(res);
    } catch (error: any) {
      const errorMessage = handleGoogleError(error, "Image stream");
      if (!res.headersSent) {
        res.status(500).json({ error: errorMessage });
      }
    }
  });

  app.delete("/api/drive/:id", async (req, res) => {
    try {
      const drive = getDriveService();
      if (!drive) {
        return res.status(500).json({ error: "Google Drive service not configured" });
      }

      const fileId = req.params.id;
      
      await drive.files.delete({
        fileId: fileId,
        supportsAllDrives: true,
      });

      res.json({ success: true });
    } catch (error: any) {
      if (error.code === 404 || (error.message && error.message.includes('File not found'))) {
        return res.json({ success: true, message: 'File already deleted or not found' });
      }
      const errorMessage = handleGoogleError(error, "Drive delete");
      res.status(500).json({ error: errorMessage });
    }
  });

  // Catch-all for API routes to ensure they return JSON and don't fall through to Vite SPA
  app.all("/api/*", (req, res) => {
    res.status(404).json({ 
      error: `API route not found: ${req.method} ${req.path}`,
      hint: "Check if the endpoint is correctly spelled and the method is correct."
    });
  });

  // Catch-all for /upload in case the frontend sends it without /api
  app.all("/upload", (req, res) => {
    res.status(404).json({ error: "Please use /api/upload instead of /upload" });
  });

  const distPath = path.resolve(__dirname, "dist");
  const isProduction = process.env.NODE_ENV === "production" || fs.existsSync(path.join(distPath, "index.html"));

  // Vite middleware for development
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global error handler for API routes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api/')) {
      console.error(`[API Error] ${req.method} ${req.path}:`, err);
      const statusCode = err.status || err.statusCode || 500;
      res.status(statusCode).json({ 
        error: err.message || "Internal Server Error",
        code: err.code || 'UNKNOWN_ERROR'
      });
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
  process.exit(1);
});
