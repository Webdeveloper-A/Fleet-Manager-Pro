import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { requireAuth } from "../middlewares/auth";

export const uploadsRouter: IRouter = Router();

const uploadRoot = path.join(process.cwd(), "uploads", "documents");
fs.mkdirSync(uploadRoot, { recursive: true });

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

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(uploadRoot, { recursive: true });
    cb(null, uploadRoot);
  },
  filename: (_req, file, cb) => {
    const ext = getSafeExtension(file.originalname, file.mimetype);
    const random = crypto.randomBytes(16).toString("hex");
    cb(null, `${Date.now()}-${random}${ext}`);
  },
});

const upload = multer({
  storage,
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
  (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "Fayl topilmadi." });
      return;
    }

    res.json({
      fileUrl: `/api/uploads/document/${req.file.filename}`,
      fileName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
  },
);

uploadsRouter.get(
  "/uploads/document/:fileName",
  requireAuth,
  (req: Request<{ fileName: string }>, res: Response) => {
    const rawFileName = req.params.fileName;

    if (!rawFileName) {
      res.status(400).json({ error: "Fayl nomi topilmadi." });
      return;
    }

    const fileName = path.basename(rawFileName);
    const filePath = path.join(uploadRoot, fileName);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Fayl topilmadi." });
      return;
    }

    res.sendFile(filePath);
  },
);