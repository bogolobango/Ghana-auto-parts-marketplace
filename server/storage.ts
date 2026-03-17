// Image storage via Cloudinary
// Falls back to Forge API proxy if Cloudinary is not configured

import { v2 as cloudinary } from "cloudinary";
import { ENV } from "./_core/env";

let cloudinaryConfigured = false;

function ensureCloudinary() {
  if (cloudinaryConfigured) return;
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) {
    throw new Error(
      "Cloudinary credentials missing: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET"
    );
  }
  cloudinary.config({ cloud_name: cloud, api_key: key, api_secret: secret });
  cloudinaryConfigured = true;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  // Try Cloudinary first
  const hasCloudinary = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

  if (hasCloudinary) {
    ensureCloudinary();
    const base64Data = Buffer.isBuffer(data)
      ? data.toString("base64")
      : data instanceof Uint8Array
        ? Buffer.from(data).toString("base64")
        : data; // already base64 or string
    const dataUri = `data:${contentType};base64,${base64Data}`;
    const folder = relKey.split("/").slice(0, -1).join("/") || "uploads";
    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: "image",
    });
    return { key: result.public_id, url: result.secure_url };
  }

  // Fallback: Forge API proxy
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "No storage backend configured. Set either CLOUDINARY_* or BUILT_IN_FORGE_API_* env vars."
    );
  }
  const key = relKey.replace(/^\/+/, "");
  const url = new URL("v1/storage/upload", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  url.searchParams.set("path", key);
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, key.split("/").pop() ?? "file");
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Storage upload failed (${response.status}): ${message}`);
  }
  const resUrl = (await response.json()).url;
  return { key, url: resUrl };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  // For Cloudinary URLs, they're already absolute URLs stored in the DB
  // This function is mainly for Forge API proxy
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    // If using Cloudinary, the URL is already stored directly in DB
    return { key: relKey, url: relKey };
  }
  const key = relKey.replace(/^\/+/, "");
  const downloadUrl = new URL("v1/storage/downloadUrl", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  downloadUrl.searchParams.set("path", key);
  const response = await fetch(downloadUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return { key, url: (await response.json()).url };
}
