import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const TEST_IMAGE = "https://cloudinary-devs.github.io/cld-docs-assets-test/images/sample.jpg";

async function testPreset() {
  console.log("🚀 [프리셋 방식] 최종 검증 테스트를 시작합니다.");
  console.log("📡 사용 프리셋: ml_default\n");

  try {
    console.log("⏳ ml_default 프리셋을 적용하여 업로드 중...");
    const result = await cloudinary.uploader.upload(TEST_IMAGE, {
      upload_preset: "ml_default" // 👈 저쪽 제미나이가 말한 핵심 옵션!
    });

    console.log("\n✅ [테스트 성공!] 업로드가 완료되었습니다.");
    console.log("--------------------------------------------------");
    // AI 분석 결과가 들어오는지 확인
    if (result.info && result.info.detection) {
      console.log("🤖 AI 분석 결과 감지됨!");
      console.log("👉 상세 내용:", JSON.stringify(result.info.detection, null, 2));
    } else {
      console.log("⚠️ 업로드는 성공했으나, AI 분석(detection) 데이터가 결과에 없습니다.");
      console.log("💡 팁: 대시보드의 ml_default 설정에서 'Auto-tagging'이나 'Object Detection'이 켜져 있는지 확인하세요.");
    }
    
    // 검열(Moderation) 결과도 확인
    if (result.moderation) {
      console.log("\n🛡️ 검열(Moderation) 데이터:");
      console.log(JSON.stringify(result.moderation, null, 2));
    }
    console.log("--------------------------------------------------");

  } catch (error) {
    console.log("\n❌ [테스트 실패]");
    console.log("👉 에러 메시지: " + error.message);
    console.log("\n💡 해결 팁: Cloudinary 대시보드 -> Settings -> Upload -> Upload Presets 목록에 'ml_default'라는 이름이 정확히 있는지 확인해 보세요.");
  }
}

testPreset();
