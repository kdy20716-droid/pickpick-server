-- 1. 카테고리 테이블 (가장 먼저 생성해야 함)
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,     -- 카테고리 고유 번호
    name VARCHAR(50) NOT NULL UNIQUE       -- 카테고리 이름 (예: 음식, 패션)
);

-- 2. 유저 테이블 (동일)
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, -- 유저 고유 번호 (자동 증가)
    nickname VARCHAR(50) NOT NULL UNIQUE, -- 닉네임 (중복 불가)
    password VARCHAR(255) NOT NULL,       -- 암호화된 비밀번호
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 가입 시간
);

-- 3. 투표 게시글 테이블 (쇼츠 최적화)
CREATE TABLE vote_posts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,  -- 게시글 고유 번호
    author_id BIGINT NOT NULL,             -- 작성자 ID (users 테이블 참조)
    category_id INT NOT NULL,              -- 카테고리 ID (categories 참조)
    title VARCHAR(255) NOT NULL,           -- 투표 제목
    category VARCHAR(50),                  -- 카테고리(임시) 만약 만든다면 테이블 하나 생성
    view_count INT DEFAULT 0,              -- 얼마나 많은 사람에게 노출되었는지
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 작성 시간
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    FOREIGN KEY (category) REFERENCES categories(name) ON DELETE CASCADE -- 이 코드는 임시(카테고리 사용시)
);

-- 4. 선택지 테이블 (1개~최대 10개 유동적 생성)
CREATE TABLE vote_options (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,  -- 선택지 고유 번호
    post_id BIGINT NOT NULL,               -- 소속된 게시글 ID
    content VARCHAR(255) NOT NULL,         -- 선택지 텍스트
    image_url VARCHAR(255),                -- 선택지 배경/이미지 URL
    vote_count INT DEFAULT 0,              -- 해당 선택지 득표수
    FOREIGN KEY (post_id) REFERENCES vote_posts(id) ON DELETE CASCADE
);

-- 5. 투표 기록 테이블 (중복 투표 방지용)
CREATE TABLE vote_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,  -- 기록 고유 번호
    post_id BIGINT NOT NULL,               -- 투표한 게시글 ID
    user_id BIGINT NOT NULL,               -- 투표한 유저 ID
    option_id BIGINT NOT NULL,             -- 최종 선택한 옵션 ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES vote_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES vote_options(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_vote (post_id, user_id) -- ★ 1인 1투표 강제
);

-- 6. 댓글 테이블
CREATE TABLE comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,  -- 댓글 고유 번호
    post_id BIGINT NOT NULL,               -- 댓글 달린 게시글 ID
    user_id BIGINT NOT NULL,               -- 작성자 ID
    content TEXT NOT NULL,                 -- 댓글 내용
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES vote_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. 좋아요 테이블
CREATE TABLE likes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,  -- 좋아요 고유 번호
    user_id BIGINT NOT NULL,               -- 누른 유저 ID
    post_id BIGINT NOT NULL,               -- 눌린 게시글 ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES vote_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_like (post_id, user_id) -- ★ 1인 1좋아요 강제
);


