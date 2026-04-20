import jwt from "jsonwebtoken";
import "dotenv/config";

// 미들웨어 : 요청과 라우터 사이에 실행되는 함수
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Authorization 헤더가 없거나 'Bearer '로 시작하지 않으면 에러
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "인증 정보가 유효하지 않습니다." });
    }

    const token = authHeader.split(" ")[1];

    // 토큰이 유효한지 검사 -> 안에 담긴 정보 꺼냄
    // users.js에서 SECRET_KEY로 토큰을 생성했으므로, 여기서도 동일한 키를 사용해야 합니다.
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.userId = decoded.userId; // req 객체에 user라는 속성으로 decoded 정보 저장

    // 통과했고 다음 요청으로 이동
    next();
  } catch (error) {
    // 토큰 만료, 서명 불일치 등 jwt.verify에서 발생하는 에러 처리
    console.error("Auth Error:", error.message);
    return res.status(401).json({ message: "인증에 실패했습니다." });
  }
};
export default authMiddleware;
