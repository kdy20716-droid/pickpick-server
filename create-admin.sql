-- 관리자 계정 생성 및 업그레이드 스크립트

-- 1. 기존 사용자를 관리자로 업그레이드 (선택사항)
UPDATE users SET role = 'admin' WHERE nickname = 'admin' LIMIT 1;

-- 3. 확인
SELECT id, nickname, name, role, created_at FROM users;
