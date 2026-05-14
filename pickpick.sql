-- 1. pickpick 이라는 빈 데이터베이스를 먼저 만듭니다.
CREATE DATABASE IF NOT EXISTS pickpick;
-- 2. 이제 pickpick 데이터베이스를 사용하겠다고 선언합니다.
USE pickpick;

-- 기존 테이블이 있다면 삭제 (초기화를 원할 경우 주석 해제)
-- DROP TABLE IF EXISTS comment_likes, notifications, likes, comments, vote_records, vote_posts, users, categories;

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
    email VARCHAR(100),
    name VARCHAR(100),
    profile_image VARCHAR(255),
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 투표 게시글 테이블 (선택지는 무조건 2개, 테이블 하나로 통합)
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
    expires_at TIMESTAMP NULL,
    winner_side ENUM('A', 'B', 'DRAW') NULL,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. 투표 기록 테이블 (중복 투표 방지용, 1인 1투표)
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

-- 7. 댓글 좋아요 테이블
CREATE TABLE IF NOT EXISTS comment_likes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    comment_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_comment_like (comment_id, user_id)
);

-- 8. 알림 테이블
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

INSERT IGNORE INTO users (id, nickname, password, name, created_at) VALUES 
(1, 'kdy20716', '$2b$10$P/G3UYNlNrigthmju5vnCOMpoa6h5zLj1I5epQVE9.JtF1g8AB6ZG', '관리자', '2026-04-27 10:32:07');

INSERT IGNORE INTO vote_posts (id, author_id, category, title, candidate_a_name, candidate_a_image, candidate_a_count, candidate_b_name, candidate_b_image, candidate_b_count, view_count, created_at) VALUES 
(1, 1, '영화 / 드라마', '아이언맨 vs 캡틴 아메리카', '아이언맨', NULL, 0, '캡틴 아메리카', NULL, 0, 0, '2026-04-27 10:44:06'),
(2, 1, '영화 / 드라마', '배트맨 vs 슈퍼맨', '배트맨', NULL, 0, '슈퍼맨', NULL, 0, 0, '2026-04-27 10:57:37');

-- =====================================================================
-- 👁️ 데이터 조회 쿼리
-- =====================================================================

SELECT * FROM users;
SELECT * FROM vote_posts;
SELECT * FROM comments;
SELECT * FROM notifications;
