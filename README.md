# PICKPICK Server

PICKPICK의 Express 기반 API 서버입니다. 클라이언트에서 사용하는 기존 API 경로는 유지하면서 내부 구조를 라우트, 컨트롤러, 서비스, 설정, 미들웨어 레이어로 분리했습니다.

## 실행

```bash
npm install
npm run dev
```

기본 포트는 `4000`입니다.

## 구조

```text
src/
  app.js                 # 서버 조립 및 시작점
  config/                # DB, CORS, 외부 서비스 설정
  controllers/           # 요청/응답 처리
  middleware/            # 인증, 업로드, 에러 처리
  routes/                # URL과 컨트롤러 연결
  services/              # 비즈니스 로직과 DB 작업
  utils/                 # 공통 유틸리티
```

## 주요 API

- `GET /ping`
- `GET /db-test`
- `POST /users/signin`
- `POST /users/login`
- `GET /users/me`
- `GET /votelist`
- `POST /votelist`
- `POST /api/votes/:postId`
- `GET /api/votes/:postId/comments`
- `POST /reports`
- `GET /admin/votes`

## 환경 변수

`.env`에 DB, JWT, 메일, Cloudinary 설정을 둡니다.

- `PORT`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`, `DB_SSL`
- `SECRET_KEY`
- `CLIENT_ORIGINS`
- `BREVO_API_KEY`, `EMAIL_USER`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
