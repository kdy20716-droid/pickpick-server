export const notFoundHandler = (req, res, next) => {
  if (req.accepts("html")) {
    return next();
  }

  return res.status(404).json({
    success: false,
    message: "요청한 API 경로를 찾을 수 없습니다.",
  });
};

export const errorHandler = (err, req, res, next) => {
  console.error("[Global Error]", err);

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    success: false,
    message: err.message || "서버 내부 오류가 발생했습니다.",
  });
};
