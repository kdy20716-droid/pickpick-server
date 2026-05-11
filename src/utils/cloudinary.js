import { v2 as cloudinary } from 'cloudinary';
import "dotenv/config";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const hasCloudinaryConfig = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
);

if (hasCloudinaryConfig) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const createSafeFilename = (filename = "upload") => {
  const extension = path.extname(filename).toLowerCase() || ".png";
  return `${Date.now()}-${crypto.randomUUID()}${extension}`;
};

const saveToLocalUploads = async (buffer, filename) => {
  const uploadsDir = path.join(process.cwd(), "uploads");
  const savedFilename = createSafeFilename(filename);

  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(path.join(uploadsDir, savedFilename), buffer);

  return savedFilename;
};

export const uploadToCloudinary = (buffer, filename) => {
  if (!hasCloudinaryConfig) {
    return saveToLocalUploads(buffer, filename);
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "pickpick" },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url) {
          return reject(new Error("Cloudinary upload did not return a URL"));
        }
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
};
