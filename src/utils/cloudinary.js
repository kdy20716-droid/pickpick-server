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
    // [임시 조치] ml_default 프리셋 사용 시 500 에러가 발생하여 주석 처리합니다.
    // 추후 AI 분석 기능을 활성화하려면 아래 사항을 확인하세요:
    // 1. Cloudinary 대시보드에서 ml_default 프리셋의 'Signing Mode'가 'Signed'인지 확인
    // 2. 'AI Vision' 또는 'AI Content Detection' Add-on이 정상 구독 중인지 확인
    const uploadOptions = { 
      folder: "pickpick",
      // upload_preset: "ml_default" 
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary Upload Stream Error:", error);
          return reject(error);
        }
        if (!result?.secure_url) {
          console.error("❌ Cloudinary Upload Error: No secure_url in result", result);
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
