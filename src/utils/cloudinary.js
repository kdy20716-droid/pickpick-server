import { v2 as cloudinary } from 'cloudinary';
import "dotenv/config";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadToCloudinary = (buffer, filename) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "pickpick" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
};

export const deleteFromCloudinary = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes("cloudinary.com")) return;

  try {
    // URL에서 public_id 추출
    // 예: https://res.cloudinary.com/cloud_name/image/upload/v12345678/pickpick/abcdefg.jpg
    const parts = imageUrl.split("/");
    const filename = parts[parts.length - 1]; // abcdefg.jpg
    const publicIdWithExtension = parts.slice(parts.indexOf("pickpick")).join("/"); // pickpick/abcdefg.jpg
    const publicId = publicIdWithExtension.split(".")[0]; // pickpick/abcdefg

    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary 삭제 에러:", error);
  }
};
