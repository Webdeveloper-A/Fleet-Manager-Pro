import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import { requireAuth } from "../middlewares/auth";
import { saveDocumentFile, sendDocumentFile } from "../lib/document-storage";

export const uploadsRouter: IRouter = Router();

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function getSafeExtension(originalName: string, mimetype: string) {
  const ext = path.extname(originalName).toLowerCase();

  if ([".pdf", ".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    return ext;
  }

  if (mimetype === "application/pdf") return ".pdf";
  if (mimetype === "image/jpeg") return ".jpg";
  if (mimetype === "image/png") return ".png";
  if (mimetype === "image/webp") return ".webp";

  return "";
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error("Faqat PDF, JPG, PNG yoki WEBP fayl yuklash mumkin."));
      return;
    }

    cb(null, true);
  },
});

uploadsRouter.post(
  "/uploads/document",
  requireAuth,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Fayl topilmadi." });
        return;
      }

      const ext = getSafeExtension(req.file.originalname, req.file.mimetype);
      const random = crypto.randomBytes(16).toString("hex");
      const storedName = `${Date.now()}-${random}${ext}`;

      const stored = await saveDocumentFile({
        buffer: req.file.buffer,
        storedName,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      });

      res.json(stored);
    } catch (err) {
      console.error("[upload] failed", err);
      res.status(500).json({ error: "Fayl yuklashda xatolik yuz berdi." });
    }
  },
);

uploadsRouter.get(
  "/uploads/document/:fileName",
  requireAuth,
  async (req: Request<{ fileName: string }>, res: Response) => {
    try {
      const rawFileName = req.params.fileName;

      if (!rawFileName) {
        res.status(400).json({ error: "Fayl nomi topilmadi." });
        return;
      }

      await sendDocumentFile({
        storedName: rawFileName,
        res,
      });
    } catch (err) {
      console.error("[download] failed", err);
      res.status(500).json({ error: "Faylni yuklab bo‘lmadi." });
    }
  },
);