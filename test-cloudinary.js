import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

// Cloudinary 설정 ( .env 파일의 정보를 사용합니다 )
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const TEST_IMAGE = "https://cloudinary-devs.github.io/cld-docs-assets-test/images/sample.jpg";

async function runTest() {
  console.log("🚀 Cloudinary 검열 설정 [최종 끝장 승부] 테스트 시작!\n");

  // --- 1라운드: 나의 제안 (google_vision_moderation) ---
  console.log("🥊 [Round 1] 나의 제안: google_vision_moderation");
  try {
    const r1 = await cloudinary.uploader.upload(TEST_IMAGE, {
      folder: "test_result",
      moderation: "google_vision_moderation"
    });
    console.log("✅ 성공! (구글 AI 표준 규격 확인)");
  } catch (e) {
    console.log("❌ 실패: " + e.message);
  }

  console.log("\n--------------------------------------------------\n");

  // --- 2라운드: 상대방 제안 (google_moderation) ---
  console.log("🥊 [Round 2] 상대방 제안: google_moderation");
  try {
    const r2 = await cloudinary.uploader.upload(TEST_IMAGE, {
      folder: "test_result",
      moderation: "google_moderation"
    });
    console.log("✅ 성공! (상대방이 말한 구글 이름이 맞음)");
  } catch (e) {
    console.log("❌ 실패: " + e.message);
  }

  console.log("\n--------------------------------------------------\n");

  // --- 3라운드: 상대방 회심의 일격 (cld_ai_content) ---
  console.log("🥊 [Round 3] 상대방 커스텀 룰: cld_ai_content:ai 자동 검열");
  try {
    const r3 = await cloudinary.uploader.upload(TEST_IMAGE, {
      folder: "test_result",
      moderation: "cld_ai_content:ai 자동 검열"
    });
    console.log("✅ 성공! (KIM님이 만든 커스텀 룰이 작동함)");
    console.log("👉 Moderation Data:", JSON.stringify(r3.moderation, null, 2));
  } catch (e) {
    console.log("❌ 실패: " + e.message);
  }

  console.log("\n🏁 모든 테스트가 끝났습니다. 어떤 라운드가 ✅ 성공했는지 확인해 보세요!");
}

runTest();
