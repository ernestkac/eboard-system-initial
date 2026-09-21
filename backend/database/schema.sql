-- ==============================================================================
-- ADMARC Limited - Executive Board Management System (eBoard)
-- Database Schema Definition (MySQL 8.0+ / MariaDB 10.5+)
-- Storage Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS votes;
DROP TABLE IF EXISTS motion_eligible_voters;
DROP TABLE IF EXISTS motions;
DROP TABLE IF EXISTS agenda_items;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS meetings;
DROP TABLE IF EXISTS member_role_history;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------------------------
-- 1. USERS TABLE
-- Authentication and base system roles (ADMINISTRATOR, OFFICER, MEMBER)
-- ------------------------------------------------------------------------------
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMINISTRATOR', 'OFFICER', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    last_login_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email),
    INDEX idx_user_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. MEMBERS TABLE
-- Executive board and organization member directory
-- ------------------------------------------------------------------------------
CREATE TABLE members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(100) NOT NULL,
    committee VARCHAR(100) NOT NULL,
    join_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NULL,
    updated_by INT NULL,
    CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_members_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_members_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_member_name (name),
    INDEX idx_member_role (role),
    INDEX idx_member_committee (committee),
    INDEX idx_member_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. MEMBER ROLE HISTORY TABLE
-- Tracks historical role and committee progressions per member
-- ------------------------------------------------------------------------------
CREATE TABLE member_role_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    old_role VARCHAR(100) NULL,
    new_role VARCHAR(100) NOT NULL,
    old_committee VARCHAR(100) NULL,
    new_committee VARCHAR(100) NOT NULL,
    changed_by INT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT NULL,
    CONSTRAINT fk_mrh_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_mrh_changed_by FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_mrh_member (member_id),
    INDEX idx_mrh_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. MEETINGS TABLE
-- Board meetings, agendas, and minutes lifecycle
-- ------------------------------------------------------------------------------
CREATE TABLE meetings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    meeting_date DATETIME NOT NULL,
    location VARCHAR(255) NOT NULL,
    status ENUM('scheduled', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
    minutes_text LONGTEXT NULL,
    minutes_status ENUM('none', 'draft', 'published') NOT NULL DEFAULT 'none',
    minutes_published_at DATETIME NULL,
    cancellation_reason VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NULL,
    updated_by INT NULL,
    CONSTRAINT fk_meetings_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_meetings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_meeting_date (meeting_date),
    INDEX idx_meeting_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. AGENDA ITEMS TABLE
-- Ordered topics and agenda items within a board meeting
-- ------------------------------------------------------------------------------
CREATE TABLE agenda_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    order_num INT NOT NULL DEFAULT 1,
    status ENUM('pending', 'in_progress', 'completed', 'deferred') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NULL,
    updated_by INT NULL,
    CONSTRAINT fk_agenda_meeting FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_agenda_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_agenda_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_agenda_meeting_order (meeting_id, order_num)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. MOTIONS TABLE
-- Proposals put to formal board votes with defined rules & thresholds
-- ------------------------------------------------------------------------------
CREATE TABLE motions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    meeting_id INT NULL,
    agenda_item_id INT NULL,
    status ENUM('open', 'closed', 'withdrawn') NOT NULL DEFAULT 'open',
    result ENUM('pending', 'passed', 'failed', 'withdrawn') NOT NULL DEFAULT 'pending',
    threshold_type ENUM('simple_majority', 'two_thirds', 'percentage') NOT NULL DEFAULT 'simple_majority',
    threshold_percentage DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    eligible_pool_type ENUM('all_officers', 'committee', 'custom') NOT NULL DEFAULT 'all_officers',
    target_committee VARCHAR(100) NULL,
    for_votes INT NOT NULL DEFAULT 0,
    against_votes INT NOT NULL DEFAULT 0,
    abstain_votes INT NOT NULL DEFAULT 0,
    total_votes INT NOT NULL DEFAULT 0,
    closed_at DATETIME NULL,
    withdrawn_at DATETIME NULL,
    withdrawal_reason VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NULL,
    updated_by INT NULL,
    CONSTRAINT fk_motions_meeting FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_motions_agenda FOREIGN KEY (agenda_item_id) REFERENCES agenda_items(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_motions_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_motions_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_motion_status (status),
    INDEX idx_motion_meeting (meeting_id),
    INDEX idx_motion_agenda (agenda_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. MOTION ELIGIBLE VOTERS TABLE
-- Explicit allowed voter pool mapping for each motion
-- ------------------------------------------------------------------------------
CREATE TABLE motion_eligible_voters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    motion_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mev_motion FOREIGN KEY (motion_id) REFERENCES motions(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_mev_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY uq_motion_user (motion_id, user_id),
    INDEX idx_mev_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. VOTES TABLE
-- Permanent immutable casting record with exactly one vote per eligible user
-- ------------------------------------------------------------------------------
CREATE TABLE votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    motion_id INT NOT NULL,
    user_id INT NOT NULL,
    vote_choice ENUM('FOR', 'AGAINST', 'ABSTAIN') NOT NULL,
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_votes_motion FOREIGN KEY (motion_id) REFERENCES motions(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_votes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY uq_vote_motion_user (motion_id, user_id),
    INDEX idx_votes_motion (motion_id),
    INDEX idx_votes_choice (vote_choice)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. ANNOUNCEMENTS TABLE
-- Time-sensitive organization announcements ordered reverse-chronologically
-- ------------------------------------------------------------------------------
CREATE TABLE announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    published_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NULL,
    updated_by INT NULL,
    CONSTRAINT fk_announcements_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_announcements_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_announcement_date (published_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. DOCUMENTS TABLE
-- Shared library of board references, policies, financial reports & attachments
-- ------------------------------------------------------------------------------
CREATE TABLE documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    link_or_reference VARCHAR(500) NOT NULL,
    category ENUM('bylaws', 'policies', 'financial_reports', 'minutes', 'general') NOT NULL DEFAULT 'general',
    meeting_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NULL,
    updated_by INT NULL,
    CONSTRAINT fk_documents_meeting FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_documents_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_documents_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_document_title (title),
    INDEX idx_document_category (category),
    INDEX idx_document_meeting (meeting_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 11. AUDIT LOGS TABLE
-- Immutable system audit trail capturing user, action, entity, record ID and details
-- ------------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    record_id INT NULL,
    details JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_entity_record (entity, record_id),
    INDEX idx_audit_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
