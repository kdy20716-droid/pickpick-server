-- 1. pickpick 이라는 빈 데이터베이스를 먼저 만듭니다.
CREATE DATABASE pickpick;
-- 2. 이제 pickpick 데이터베이스를 사용하겠다고 선언합니다.
USE pickpick;

-- 1. 카테고리 테이블 (임시로 두거나, 태그 용도로 사용)
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,     -- 카테고리 고유 번호
    name VARCHAR(50) NOT NULL UNIQUE       -- 카테고리 이름 (예: 영화 / 드라마, 연예 등)
);

-- 2. 유저 테이블
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, -- 유저 고유 번호 (자동 증가)
    nickname VARCHAR(50) NOT NULL UNIQUE, -- 닉네임 (중복 불가)
    password VARCHAR(255) NOT NULL,       -- 암호화된 비밀번호
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 가입 시간
);

-- 3. 투표 게시글 테이블 (선택지는 무조건 2개, 테이블 하나로 통합)
CREATE TABLE vote_posts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,  -- 게시글 고유 번호
    author_id BIGINT NOT NULL,             -- 작성자 ID (users 테이블 참조)
    category VARCHAR(50),                  -- 카테고리(태그) (예: '영화 / 드라마')
    title VARCHAR(255) NOT NULL,           -- 투표 제목
    
    -- 왼쪽(1번) 후보군 정보
    candidate_a_name VARCHAR(255) NOT NULL,
    candidate_a_image VARCHAR(255),
    candidate_a_count INT DEFAULT 0,       -- 왼쪽 후보군 득표수
    
    -- 오른쪽(2번) 후보군 정보
    candidate_b_name VARCHAR(255) NOT NULL,
    candidate_b_image VARCHAR(255),
    candidate_b_count INT DEFAULT 0,       -- 오른쪽 후보군 득표수

    view_count INT DEFAULT 0,              -- 조회수
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 작성 시간
    
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. 투표 기록 테이블 (중복 투표 방지용, 1인 1투표)
CREATE TABLE vote_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,  -- 기록 고유 번호
    post_id BIGINT NOT NULL,               -- 투표한 게시글 ID
    user_id BIGINT NOT NULL,               -- 투표한 유저 ID
    selected_side ENUM('A', 'B') NOT NULL, -- 선택한 진영 ('A'는 왼쪽, 'B'는 오른쪽)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES vote_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_vote (post_id, user_id) -- ★ 1인 1투표 강제
);

-- 5. 댓글 테이블
CREATE TABLE comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,  -- 댓글 고유 번호
    post_id BIGINT NOT NULL,               -- 댓글 달린 게시글 ID
    user_id BIGINT NOT NULL,               -- 작성자 ID
    content TEXT NOT NULL,                 -- 댓글 내용
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES vote_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. 좋아요 테이블
CREATE TABLE likes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,  -- 좋아요 고유 번호
    user_id BIGINT NOT NULL,               -- 누른 유저 ID
    post_id BIGINT NOT NULL,               -- 눌린 게시글 ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES vote_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_like (post_id, user_id) -- ★ 1인 1좋아요 강제
);
