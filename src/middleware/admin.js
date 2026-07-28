import jwt from "jsonwebtoken";

export const adminAuthMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "인증 토큰이 필요합니다." });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "관리자 권한이 필요합니다." });
    }

    req.userId = decoded.userId;
    return next();
  } catch (error) {
    console.error("[Admin Auth Error]", error);
    return res.status(401).json({
      message: "유효하지 않은 토큰입니다.",
      error: error.message,
    });
  }
};
