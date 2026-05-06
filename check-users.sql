-- DB에 저장된 모든 사용자 정보 확인
SELECT id, nickname, name, email, birth, gender, nationality, role, created_at 
FROM users 
ORDER BY created_at DESC;
