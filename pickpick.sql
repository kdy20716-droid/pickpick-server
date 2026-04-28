-- 1. pickpick 이라는 빈 데이터베이스를 먼저 만듭니다.
CREATE DATABASE IF NOT EXISTS pickpick;
-- 2. 이제 pickpick 데이터베이스를 사용하겠다고 선언합니다.
USE pickpick;

-- 기존 테이블이 있다면 삭제 (초기화를 원할 경우 주석 해제)
-- DROP TABLE IF EXISTS likes, comments, vote_records, vote_posts, users, categories;

-- 1. 카테고리 테이블
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- 2. 유저 테이블
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nickname VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 투표 게시글 테이블
CREATE TABLE IF NOT EXISTS vote_posts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    author_id BIGINT NOT NULL,
    category VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    candidate_a_name VARCHAR(255) NOT NULL,
    candidate_a_image VARCHAR(255),
    candidate_a_count INT DEFAULT 0,
    candidate_b_name VARCHAR(255) NOT NULL,
    candidate_b_image VARCHAR(255),
    candidate_b_count INT DEFAULT 0,
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. 투표 기록 테이블
CREATE TABLE IF NOT EXISTS vote_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    selected_side ENUM('A', 'B') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES vote_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_vote (post_id, user_id)
);

-- 5. 댓글 테이블
CREATE TABLE IF NOT EXISTS comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    parent_id BIGINT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES vote_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- 6. 좋아요 테이블
CREATE TABLE IF NOT EXISTS likes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    post_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES vote_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_like (post_id, user_id)
);

-- 7. 알림 테이블 (새로 추가됨)
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    post_id BIGINT NOT NULL,
    comment_id BIGINT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES vote_posts(id) ON DELETE CASCADE
);

-- =====================================================================
-- 💾 현재까지 저장된 데이터 백업 (INSERT 문)
-- =====================================================================

INSERT IGNORE INTO users (id, nickname, password, created_at) VALUES 
(1, 'kdy20716', '$2b$10$P/G3UYNlNrigthmju5vnCOMpoa6h5zLj1I5epQVE9.JtF1g8AB6ZG', '2026-04-27 10:32:07');

INSERT IGNORE INTO vote_posts (id, author_id, category, title, candidate_a_name, candidate_a_image, candidate_a_count, candidate_b_name, candidate_b_image, candidate_b_count, view_count, created_at) VALUES 
(1, 1, '영화 / 드라마', 'ㅇㅇㅇ', 'ㅇㅇ', NULL, 0, 'ㅇㅇ', NULL, 0, 0, '2026-04-27 10:44:06'),
(2, 1, '영화 / 드라마', 'ㅇㅇ', 'ㅇㅇ', NULL, 0, 'ㅇㅇ', NULL, 0, 0, '2026-04-27 10:57:37');





-- =====================================================================
-- 👁️ 데이터 조회 쿼리 (아래 쿼리들을 드래그해서 실행해 보세요)
-- =====================================================================

-- 1) 가입된 전체 유저 보기
SELECT * FROM users;

-- 2) 생성된 투표 게시글 목록 보기
SELECT * FROM vote_posts;

-- 3) (보너스) 투표글 목록을 작성자 닉네임과 함께 예쁘게 보기!
SELECT
    v.id AS '투표번호',
    u.nickname AS '작성자',
    v.title AS '제목',
    v.candidate_a_name AS '후보A',
    v.candidate_a_count AS 'A득표수',
    v.candidate_b_name AS '후보B',
    v.candidate_b_count AS 'B득표수'
FROM vote_posts v
JOIN users u ON v.author_id = u.id;

-- 4) 누가 어디에 투표했는지 기록 보기
SELECT * FROM vote_records;

-- 5) 작성된 댓글 목록 보기
SELECT * FROM comments;

-- 6) 누가 어떤 글에 좋아요를 눌렀는지 보기
SELECT * FROM likes;

-- 7) 알림(Notification) 전체 보기 (기본)
SELECT * FROM notifications;

-- 8) (보너스) 사람별로 받은 알림을 예쁘게 정리해서 보기!
SELECT 
    n.id AS '알림번호',
    receiver.nickname AS '받는사람',
    sender.nickname AS '보낸사람',
    CASE 
        WHEN n.type = 'COMMENT_ON_POST' THEN '내 투표에 댓글을 달았습니다'
        WHEN n.type = 'REPLY_ON_COMMENT' THEN '내 댓글에 대댓글을 달았습니다'
        ELSE n.type 
    END AS '알림내용',
    vp.title AS '관련 투표글',
    c.content AS '작성된 댓글',
    IF(n.is_read = 1, '읽음', '안읽음') AS '읽음여부',
    n.created_at AS '발생시간'
FROM notifications n
JOIN users receiver ON n.user_id = receiver.id
JOIN users sender ON n.sender_id = sender.id
JOIN vote_posts vp ON n.post_id = vp.id
LEFT JOIN comments c ON n.comment_id = c.id
ORDER BY n.created_at DESC;
