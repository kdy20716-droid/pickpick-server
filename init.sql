-- 1. 유저 테이블 (가입한 사용자 정보)
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nickname VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 투표 게시글 테이블 (A/B 선택지와 각각의 득표수 저장)
CREATE TABLE vote_posts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    author_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50),
    option_a_title VARCHAR(100) NOT NULL,
    option_a_image VARCHAR(255),
    option_b_title VARCHAR(100) NOT NULL,
    option_b_image VARCHAR(255),
    count_a INT DEFAULT 0,  -- A 투표수 (기본값 0)
    count_b INT DEFAULT 0,  -- B 투표수 (기본값 0)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. 투표 기록 테이블 (핵심: 한 사람이 두 번 투표하는 것 방지)
CREATE TABLE vote_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    picked_option ENUM('A', 'B') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES vote_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vote (post_id, user_id) -- ★ 이 줄이 중복 투표를 막아주는 마법입니다.
);