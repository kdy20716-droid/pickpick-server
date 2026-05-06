-- 관리자 계정 생성 및 업그레이드 스크립트

-- 1. 기존 사용자를 관리자로 업그레이드 (선택사항)
UPDATE users SET role = 'admin' WHERE nickname = 'admin' LIMIT 1;

-- 2. 관리자 계정이 없으면 생성 (비밀번호: admin123 해시됨)
INSERT IGNORE INTO users (nickname, password, name, role, created_at) VALUES 
('admin', '$2b$10$xK1.ErQfL7J5gVzH9.xqKOYxL2X9Z1N2M3P4Q5R6S7T8U9V0W1X2', '관리자', 'admin', NOW());

-- 3. 확인
SELECT id, nickname, name, role, created_at FROM users;
