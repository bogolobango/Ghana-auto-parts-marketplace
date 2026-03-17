import { Router } from "express";
import multer from "multer";
import { nanoid } from "nanoid";
import { storagePut } from "./storage";
import { sdk } from "./_core/sdk";
import * as db from "./db";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

const router = Router();

router.post(
  "/product-image",
  upload.array("images", 5),
  async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const vendor = await db.getVendorByUserId(user.id);
      if (!vendor || vendor.status !== "approved") {
        res.status(403).json({ error: "Approved vendor account required" });
        return;
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: "No images provided" });
        return;
      }

      const results: { url: string; key: string }[] = [];

      for (const file of files) {
        const sanitizedName = file.originalname
          .replace(/[^a-zA-Z0-9._-]/g, "_")
          .substring(0, 100);
        const relKey = `products/${vendor.id}/${nanoid(12)}-${sanitizedName}`;
        const { url, key } = await storagePut(relKey, file.buffer, file.mimetype);
        results.push({ url, key });
      }

      res.json({ images: results });
    } catch (error: any) {
      if (error?.message?.includes("session") || error?.message?.includes("Forbidden")) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      console.error("[Upload] Error:", error);
      res.status(500).json({ error: "Image upload failed" });
    }
  }
);

export default router;
