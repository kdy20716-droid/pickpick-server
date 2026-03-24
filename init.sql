-- 1. 유저 테이블 (동일)
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nickname VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 투표 게시글 테이블 (쇼츠 최적화)
CREATE TABLE vote_posts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    author_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,              -- 쇼츠 하단에 들어갈 짧은 설명
    category VARCHAR(50),          -- 카테고리(임시) 만약 만든다면 테이블 하나 생성
    view_count INT DEFAULT 0,      -- 얼마나 많은 사람에게 노출되었는지
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    FOREIGN KEY (category) REFERENCES categories(name) ON DELETE CASCADE -- 이 코드는 임시(카테고리 사용시)
);

-- 3. 선택지 테이블 (자유로운 선택지 개수)
CREATE TABLE vote_options (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL,
    content VARCHAR(255) NOT NULL,
    image_url VARCHAR(255),        -- 쇼츠 배경이나 선택지 이미지
    vote_count INT DEFAULT 0,
    FOREIGN KEY (post_id) REFERENCES vote_posts(id) ON DELETE CASCADE
);

-- 4. 투표 기록 테이블 (중복 방지 및 사용자 피드 구성용)
CREATE TABLE vote_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    option_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES vote_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_vote (post_id, user_id)
);

-- 사용자가 게시글의 댓글
CREATE TABLE comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL, -- 게시글
    user_id BIGINT NOT NULL, -- 사용자
    content TEXT NOT NULL, -- 댓글 내용
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 댓글 작성 시간
    FOREIGN KEY (post_id) REFERENCES vote_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 사용자가 게시글의 좋아요 
CREATE TABLE likes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL, -- 사용자
    post_id BIGINT NOT NULL, -- 게시글
);



