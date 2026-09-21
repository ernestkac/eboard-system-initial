-- ==============================================================================
-- ADMARC Limited - Executive Board Management System (eBoard)
-- Database Seed Data
-- ==============================================================================

-- Password for all default accounts is: "Password123!"
-- BCrypt Hash: $2b$10$wEeVg7mJzD0hY.nQhF4jqun5a2eRkP3F5j4h6G7i8J9k0L1m2N3o4
-- (The application service will also check / initialize admin if table is empty)

INSERT INTO users (id, email, password_hash, role, status) VALUES
(1, 'admin@admarc.mw', '$2b$10$7vN3fQ2z8ZpE4fJ1rK7sTuY6VwX8oP0qL9mM1nK2j3h4g5f6e7d8c', 'ADMINISTRATOR', 'active'),
(2, 'chairperson@admarc.mw', '$2b$10$7vN3fQ2z8ZpE4fJ1rK7sTuY6VwX8oP0qL9mM1nK2j3h4g5f6e7d8c', 'OFFICER', 'active'),
(3, 'ceo@admarc.mw', '$2b$10$7vN3fQ2z8ZpE4fJ1rK7sTuY6VwX8oP0qL9mM1nK2j3h4g5f6e7d8c', 'OFFICER', 'active'),
(4, 'secretary@admarc.mw', '$2b$10$7vN3fQ2z8ZpE4fJ1rK7sTuY6VwX8oP0qL9mM1nK2j3h4g5f6e7d8c', 'OFFICER', 'active'),
(5, 'member1@admarc.mw', '$2b$10$7vN3fQ2z8ZpE4fJ1rK7sTuY6VwX8oP0qL9mM1nK2j3h4g5f6e7d8c', 'MEMBER', 'active'),
(6, 'member2@admarc.mw', '$2b$10$7vN3fQ2z8ZpE4fJ1rK7sTuY6VwX8oP0qL9mM1nK2j3h4g5f6e7d8c', 'MEMBER', 'active');

INSERT INTO members (id, user_id, name, email, role, committee, join_date, created_by) VALUES
(1, 1, 'System Administrator', 'admin@admarc.mw', 'System Administrator', 'ICT Governance', '2024-01-15', 1),
(2, 2, 'Dr. Patrick Banda', 'chairperson@admarc.mw', 'Board Chairperson', 'Executive Committee', '2023-06-01', 1),
(3, 3, 'Grace Mphande', 'ceo@admarc.mw', 'Chief Executive Officer', 'Executive Committee', '2023-08-15', 1),
(4, 4, 'Chikondi Phiri', 'secretary@admarc.mw', 'Corporate Secretary', 'Governance & Legal', '2024-02-01', 1),
(5, 5, 'Kondwani Chirwa', 'member1@admarc.mw', 'Board Member', 'Finance & Audit', '2024-03-10', 1),
(6, 6, 'Thokozani Gondwe', 'member2@admarc.mw', 'Board Member', 'Human Resources', '2024-04-01', 1);

INSERT INTO member_role_history (member_id, old_role, new_role, old_committee, new_committee, changed_by, notes) VALUES
(2, 'Interim Board Member', 'Board Chairperson', 'General Board', 'Executive Committee', 1, 'Appointed Board Chairperson by ministerial directive.');

INSERT INTO meetings (id, title, meeting_date, location, status, minutes_text, minutes_status, created_by) VALUES
(1, 'ADMARC Q3 Executive Board Meeting', '2026-10-15 09:00:00', 'ADMARC Head Office, Boardroom 1, Limbe', 'scheduled', NULL, 'none', 4),
(2, 'ADMARC Special Grain Procurement Review', '2026-08-20 14:00:00', 'Virtual Conference Room A', 'completed', 'The board deliberated on national strategic grain reserves procurement targets and approved additional logistics funding.', 'published', 4);

INSERT INTO agenda_items (id, meeting_id, title, description, order_num, status, created_by) VALUES
(1, 1, 'Call to Order and Adoption of Agenda', 'Opening remarks by the Chairperson and approval of agenda items.', 1, 'pending', 4),
(2, 1, 'Review of Q3 Commodity Storage Reports', 'Presentation by Director of Operations on national storage depot readiness.', 2, 'pending', 4),
(3, 1, 'Motion: Approval of 2026/2027 Capital Budget', 'Deliberation and formal vote on capital procurement allocation.', 3, 'pending', 4),
(4, 2, 'Review of Strategic Grain Reserve Deficit', 'Urgent analysis of regional grain reserves.', 1, 'completed', 4);

INSERT INTO motions (id, title, description, meeting_id, agenda_item_id, status, result, threshold_type, threshold_percentage, eligible_pool_type, created_by) VALUES
(1, 'Approval of 2026/2027 Strategic Grain Purchase Facility', 'Motion to authorize management to negotiate a 25 billion MWK commercial financing facility for seasonal maize purchases.', 1, 3, 'open', 'pending', 'simple_majority', 50.00, 'all_officers', 3),
(2, 'Adoption of Revised Employee Whistleblower Policy', 'Motion to formalize the updated corporate governance and whistleblower protections.', 2, 4, 'closed', 'passed', 'simple_majority', 50.00, 'all_officers', 4);

-- Eligible voters for Motion 1 (Officers: Users 2, 3, 4)
INSERT INTO motion_eligible_voters (motion_id, user_id) VALUES
(1, 2),
(1, 3),
(1, 4),
(2, 2),
(2, 3),
(2, 4);

-- Votes on Motion 2 (Closed, passed)
INSERT INTO votes (motion_id, user_id, vote_choice) VALUES
(2, 2, 'FOR'),
(2, 3, 'FOR'),
(2, 4, 'ABSTAIN');

UPDATE motions SET for_votes = 2, against_votes = 0, abstain_votes = 1, total_votes = 3, closed_at = '2026-08-20 16:30:00' WHERE id = 2;

INSERT INTO announcements (id, title, body, published_date, created_by) VALUES
(1, 'Scheduled Board Portal System Maintenance', 'Please be advised that the eBoard portal will undergo routine security patching this Friday from 22:00 to 24:00 CAT.', '2026-09-18 10:00:00', 1),
(2, 'Submission Deadline: Q3 Committee Reports', 'All committee chairs are requested to submit finalized Q3 reports to the Corporate Secretary by 5th October 2026.', '2026-09-15 08:30:00', 4);

INSERT INTO documents (id, title, description, link_or_reference, category, meeting_id, created_by) VALUES
(1, 'ADMARC Strategic Plan 2024-2029', 'Comprehensive five-year corporate strategic roadmap.', 'https://documents.admarc.mw/corporate/strategic-plan-2024-2029.pdf', 'policies', NULL, 1),
(2, 'ADMARC Board Governance Charter', 'Formal operational charter and terms of reference for the executive board.', 'https://documents.admarc.mw/governance/board-charter-2026.pdf', 'bylaws', NULL, 1),
(3, 'Minutes - Special Grain Procurement Meeting 2026-08-20', 'Certified minutes of the completed grain procurement review meeting.', 'https://documents.admarc.mw/minutes/meeting-20260820-minutes.pdf', 'minutes', 2, 4);

INSERT INTO audit_logs (user_id, action, entity, record_id, details) VALUES
(1, 'SYSTEM_INIT', 'system', NULL, '{"message": "ADMARC eBoard backend initialized"}'),
(4, 'PUBLISH_MINUTES', 'meetings', 2, '{"meeting_id": 2, "status": "published"}');
