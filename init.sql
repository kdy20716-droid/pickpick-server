-- 1. 카테고리 테이블 (임시로 두거나, 태그 용도로 사용)
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,     -- 카테고리 고유 번호
    name VARCHAR(50) NOT NULL UNIQUE       -- 카테고리 이름
);

-- 2. 유저 테이블
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, -- 유저 고유 번호
    nickname VARCHAR(50) NOT NULL UNIQUE, -- 닉네임
    password VARCHAR(255) NOT NULL,       -- 암호화된 비밀번호
    name VARCHAR(50),                     -- 유저 이름 (실명 등)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 가입 시간
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
    parent_id BIGINT DEFAULT NULL,
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
