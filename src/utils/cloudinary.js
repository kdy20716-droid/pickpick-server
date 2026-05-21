import "dotenv/config";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const hasCloudinaryConfig = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
);

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

export const uploadToCloudinary = async (buffer, filename) => {
  if (!hasCloudinaryConfig) {
    return saveToLocalUploads(buffer, filename);
  }

  const { v2: cloudinary } = await import("cloudinary");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  return new Promise((resolve, reject) => {
    // 환경 변수에서 검열 규칙을 가져옵니다 (예: cld_ai_content:my_rule_id)
    const moderation = process.env.CLOUDINARY_MODERATION;
    
    const uploadOptions = { 
      folder: "pickpick" 
    };

    if (moderation) {
      uploadOptions.moderation = moderation;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url) {
          return reject(new Error("Cloudinary upload did not return a URL"));
        }
        resolve(result.secure_url);
      },
    );
    uploadStream.end(buffer);
  });
};

export const deleteFromCloudinary = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes("cloudinary.com")) return;

  try {
    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    // URL에서 public_id 추출
    // 예: https://res.cloudinary.com/cloud_name/image/upload/v12345678/pickpick/abcdefg.jpg
    const parts = imageUrl.split("/");
    const folderIndex = parts.indexOf("pickpick");
    if (folderIndex === -1) return;

    const publicIdWithExtension = parts.slice(folderIndex).join("/"); // pickpick/abcdefg.jpg
    const publicId = publicIdWithExtension.split(".")[0]; // pickpick/abcdefg

    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary 삭제 에러:", error);
  }
};
