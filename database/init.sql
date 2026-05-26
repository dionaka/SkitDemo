-- 短剧互动平台数据库初始化脚本 (MySQL 8.0+)
CREATE DATABASE IF NOT EXISTS realtimegen DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE realtimegen;

CREATE TABLE IF NOT EXISTS video (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    cover_url VARCHAR(500) NOT NULL,
    video_url VARCHAR(500) NOT NULL,
    total_duration INT NOT NULL DEFAULT 0,
    status TINYINT NOT NULL DEFAULT 0 COMMENT '0-草稿 1-已发布',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS highlight (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    video_id BIGINT NOT NULL,
    timestamp INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL COMMENT 'conflict/reversal/sweet/scene',
    interaction_type VARCHAR(50) NOT NULL,
    options JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_video_id (video_id)
);

CREATE TABLE IF NOT EXISTS user_interaction (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    highlight_id BIGINT NOT NULL,
    user_session_id VARCHAR(100) NOT NULL,
    selected_option VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_highlight_id (highlight_id)
);

CREATE TABLE IF NOT EXISTS admin (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 默认管理员 admin / admin123
INSERT INTO admin (username, password_hash) VALUES
('admin', '$2a$10$rQZ8K8Y5xK5Y5xK5Y5xK5uK5Y5xK5Y5xK5Y5xK5Y5xK5Y5xK5Y5xK');
