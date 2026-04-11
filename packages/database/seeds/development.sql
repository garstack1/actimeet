-- ActiMeet Seed Data
-- For development and testing only
-- DO NOT run in production!

-- ============================================
-- ADMIN USER
-- ============================================

-- Password: 'admin123' (bcrypt hashed)
INSERT INTO users (id, email, password_hash, display_name, role, email_verified, city, country_code)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@actimeet.ie',
    '$2b$10$rQZ8K8HvZxJZPJvJZPJvJeQZ8K8HvZxJZPJvJZPJvJeQZ8K8HvZxJ', -- placeholder
    'ActiMeet Admin',
    'admin',
    true,
    'Dublin',
    'IE'
);

-- ============================================
-- TEST USERS (Attendees)
-- ============================================

INSERT INTO users (id, email, password_hash, display_name, bio, date_of_birth, gender, city, country_code, email_verified, photos) VALUES
-- Male users
('10000000-0000-0000-0000-000000000001', 'john@example.com', '$2b$10$placeholder', 'John Murphy', 'Love dancing and meeting new people!', '1992-05-15', 'male', 'Dublin', 'IE', true, ARRAY['https://placeholder.com/john1.jpg']),
('10000000-0000-0000-0000-000000000002', 'sean@example.com', '$2b$10$placeholder', 'Seán O''Connor', 'Tennis player looking for doubles partners', '1988-11-22', 'male', 'Cork', 'IE', true, ARRAY['https://placeholder.com/sean1.jpg']),
('10000000-0000-0000-0000-000000000003', 'mike@example.com', '$2b$10$placeholder', 'Mike Walsh', 'Beginner at everything, expert at fun', '1995-03-08', 'male', 'Galway', 'IE', true, ARRAY['https://placeholder.com/mike1.jpg']),
('10000000-0000-0000-0000-000000000004', 'david@example.com', '$2b$10$placeholder', 'David Ryan', 'Here to learn salsa!', '1990-07-30', 'male', 'Dublin', 'IE', true, ARRAY['https://placeholder.com/david1.jpg']),
('10000000-0000-0000-0000-000000000005', 'tom@example.com', '$2b$10$placeholder', 'Tom Kelly', 'Climber and adventure seeker', '1993-12-01', 'male', 'Dublin', 'IE', true, ARRAY['https://placeholder.com/tom1.jpg']),

-- Female users
('20000000-0000-0000-0000-000000000001', 'emma@example.com', '$2b$10$placeholder', 'Emma Byrne', 'Dance enthusiast, wine lover', '1994-02-14', 'female', 'Dublin', 'IE', true, ARRAY['https://placeholder.com/emma1.jpg']),
('20000000-0000-0000-0000-000000000002', 'sarah@example.com', '$2b$10$placeholder', 'Sarah Doyle', 'Looking for fun activities and great company', '1991-08-19', 'female', 'Dublin', 'IE', true, ARRAY['https://placeholder.com/sarah1.jpg']),
('20000000-0000-0000-0000-000000000003', 'aoife@example.com', '$2b$10$placeholder', 'Aoife McCarthy', 'Tennis newbie, experienced socialiser', '1996-04-25', 'female', 'Cork', 'IE', true, ARRAY['https://placeholder.com/aoife1.jpg']),
('20000000-0000-0000-0000-000000000004', 'niamh@example.com', '$2b$10$placeholder', 'Niamh O''Brien', 'Here for the salsa, staying for the people', '1989-10-12', 'female', 'Dublin', 'IE', true, ARRAY['https://placeholder.com/niamh1.jpg']),
('20000000-0000-0000-0000-000000000005', 'claire@example.com', '$2b$10$placeholder', 'Claire Fitzgerald', 'Yoga and hiking lover', '1992-06-07', 'female', 'Galway', 'IE', true, ARRAY['https://placeholder.com/claire1.jpg']);

-- ============================================
-- TEST PROVIDERS
-- ============================================

-- Provider user accounts
INSERT INTO users (id, email, password_hash, display_name, role, email_verified, city, country_code) VALUES
('30000000-0000-0000-0000-000000000001', 'info@dublindance.ie', '$2b$10$placeholder', 'Dublin Dance Academy', 'provider', true, 'Dublin', 'IE'),
('30000000-0000-0000-0000-000000000002', 'hello@corktennis.ie', '$2b$10$placeholder', 'Cork Tennis Club', 'provider', true, 'Cork', 'IE'),
('30000000-0000-0000-0000-000000000003', 'contact@urbanclimb.ie', '$2b$10$placeholder', 'Urban Climb Dublin', 'provider', true, 'Dublin', 'IE');

-- Provider profiles
INSERT INTO providers (id, user_id, business_name, business_description, verification_status, verified_at, stripe_account_id, stripe_onboarding_complete) VALUES
('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Dublin Dance Academy', 'Dublin''s premier Latin dance school. We offer salsa, bachata, tango, and more. Perfect for beginners and experienced dancers alike!', 'approved', NOW(), 'acct_test_dublin_dance', true),
('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'Cork Tennis Club', 'Friendly tennis club in the heart of Cork. Lessons, social play, and tournaments for all levels.', 'approved', NOW(), 'acct_test_cork_tennis', true),
('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 'Urban Climb Dublin', 'Indoor climbing centre with routes for all abilities. Great community atmosphere!', 'approved', NOW(), 'acct_test_urban_climb', true);

-- ============================================
-- TEST VENUES
-- ============================================

INSERT INTO venues (id, provider_id, name, description, address_line1, city, postcode, country_code, location, facilities) VALUES
(
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    'Dublin Dance Academy - Temple Bar',
    'Beautiful dance studio in the heart of Temple Bar',
    '15 Eustace Street',
    'Dublin',
    'D02 PY52',
    'IE',
    ST_SetSRID(ST_MakePoint(-6.2672, 53.3454), 4326),
    ARRAY['wooden_floor', 'mirrors', 'changing_rooms', 'air_conditioning']
),
(
    '50000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000002',
    'Cork Tennis Club - Douglas',
    '6 outdoor courts and a clubhouse',
    'Douglas Road',
    'Cork',
    'T12 X8Y9',
    'IE',
    ST_SetSRID(ST_MakePoint(-8.4608, 51.8754), 4326),
    ARRAY['outdoor_courts', 'floodlights', 'parking', 'clubhouse', 'showers']
),
(
    '50000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-000000000003',
    'Urban Climb - Sandyford',
    'State of the art climbing centre with bouldering and roped climbing',
    'Unit 5, Sandyford Industrial Estate',
    'Dublin',
    'D18 K7W2',
    'IE',
    ST_SetSRID(ST_MakePoint(-6.2225, 53.2747), 4326),
    ARRAY['bouldering', 'top_rope', 'lead_climbing', 'cafe', 'parking', 'equipment_rental']
);

-- ============================================
-- TEST EVENTS
-- ============================================

-- Salsa taster course (mixed gender)
INSERT INTO events (
    id, provider_id, venue_id, title, description, short_description,
    category, activity_type, tags,
    gender_mode, male_capacity, female_capacity,
    min_age, max_age, price_cents, currency,
    refund_policy, refund_days_before,
    is_published, listing_fee_paid
) VALUES (
    '60000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    '4-Week Salsa Taster Course',
    'Ever wanted to learn salsa? This is your chance! Our beginner-friendly 4-week course will have you dancing in no time. No partner needed - we rotate throughout the class so you''ll dance with everyone. Great way to meet new people while learning a fun new skill!',
    'Learn salsa basics over 4 fun-filled weeks. No partner or experience needed!',
    'dance', 'salsa', ARRAY['beginner', 'latin', 'social', 'no_partner_needed'],
    'mixed', 15, 15,
    18, 55, 8000, 'EUR', -- €80
    'moderate', 7,
    true, true
);

-- Sessions for salsa course (4 weeks, Tuesday evenings)
INSERT INTO event_sessions (id, event_id, session_date, start_time, end_time, session_order) VALUES
('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', CURRENT_DATE + INTERVAL '7 days', '19:00', '20:30', 1),
('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', CURRENT_DATE + INTERVAL '14 days', '19:00', '20:30', 2),
('70000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000001', CURRENT_DATE + INTERVAL '21 days', '19:00', '20:30', 3),
('70000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000001', CURRENT_DATE + INTERVAL '28 days', '19:00', '20:30', 4);

-- Tennis social mixer (mixed gender)
INSERT INTO events (
    id, provider_id, venue_id, title, description, short_description,
    category, activity_type, tags,
    gender_mode, male_capacity, female_capacity,
    min_age, price_cents, currency,
    refund_policy, refund_days_before,
    is_published, listing_fee_paid
) VALUES (
    '60000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000002',
    'Saturday Tennis Social',
    'Join us for a relaxed Saturday morning of doubles tennis! We''ll mix up the pairs throughout the session so everyone plays with everyone. Suitable for intermediate players. Light refreshments included. A great way to meet other tennis lovers in Cork!',
    'Mixed doubles tennis social. Meet new people, play great tennis!',
    'sports', 'tennis', ARRAY['doubles', 'social', 'intermediate', 'outdoor'],
    'mixed', 8, 8,
    21, 2500, 'EUR', -- €25
    'flexible', 2,
    true, true
);

-- Session for tennis (single Saturday)
INSERT INTO event_sessions (id, event_id, session_date, start_time, end_time, session_order) VALUES
('70000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000002', CURRENT_DATE + INTERVAL '10 days', '10:00', '12:00', 1);

-- Climbing intro (open gender mode)
INSERT INTO events (
    id, provider_id, venue_id, title, description, short_description,
    category, activity_type, tags,
    gender_mode, total_capacity,
    min_age, price_cents, currency,
    refund_policy, refund_days_before,
    is_published, listing_fee_paid
) VALUES (
    '60000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-000000000003',
    '50000000-0000-0000-0000-000000000003',
    'Intro to Indoor Climbing',
    'New to climbing? This 2-hour introduction will teach you everything you need to know to climb safely and confidently. Learn basic techniques, safety procedures, and have a go on our beginner-friendly routes. All equipment provided. Great for meeting fellow adventure-seekers!',
    'Learn to climb in a fun, social environment. All equipment included!',
    'sports', 'climbing', ARRAY['beginner', 'indoor', 'bouldering', 'equipment_provided'],
    'open', 12,
    16, 3500, 'EUR', -- €35
    'moderate', 3,
    true, true
);

-- Session for climbing (Sunday afternoon)
INSERT INTO event_sessions (id, event_id, session_date, start_time, end_time, session_order) VALUES
('70000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000003', CURRENT_DATE + INTERVAL '12 days', '14:00', '16:00', 1);

-- ============================================
-- TEST TICKETS
-- ============================================

-- Some tickets for the salsa course
INSERT INTO tickets (id, event_id, user_id, ticket_number, qr_code_data, gender_slot, amount_paid_cents, status) VALUES
('80000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'ACT-SA01-0001', 'encrypted_data_here', 'male', 8000, 'active'),
('80000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'ACT-SA01-0002', 'encrypted_data_here', 'male', 8000, 'active'),
('80000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'ACT-SA01-0003', 'encrypted_data_here', 'female', 8000, 'active'),
('80000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', 'ACT-SA01-0004', 'encrypted_data_here', 'female', 8000, 'active');

-- Update ticket counts on event
UPDATE events SET male_tickets_sold = 2, female_tickets_sold = 2, total_tickets_sold = 4 
WHERE id = '60000000-0000-0000-0000-000000000001';

-- ============================================
-- TEST CONNECTIONS (from shared event)
-- ============================================

-- Users who share the salsa event can now message each other
INSERT INTO connections (user_a_id, user_b_id, source_event_id) VALUES
('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000001');

-- ============================================
-- TEST CONVERSATIONS & MESSAGES
-- ============================================

-- A conversation between John and Emma (from salsa event)
INSERT INTO conversations (id, user_a_id, user_b_id, source_event_id, last_message_at, last_message_preview) VALUES
('90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', NOW() - INTERVAL '1 hour', 'Looking forward to the class!');

INSERT INTO messages (id, message_type, conversation_id, sender_id, content, created_at) VALUES
('a0000000-0000-0000-0000-000000000001', 'direct', '90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Hey Emma! Saw you''re also signed up for the salsa course. Have you done any dancing before?', NOW() - INTERVAL '2 hours'),
('a0000000-0000-0000-0000-000000000002', 'direct', '90000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Hi John! No, complete beginner here 😅 You?', NOW() - INTERVAL '1 hour 30 minutes'),
('a0000000-0000-0000-0000-000000000003', 'direct', '90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Same! Should be fun though. Looking forward to the class!', NOW() - INTERVAL '1 hour');

-- Some event chat messages
INSERT INTO messages (id, message_type, event_id, sender_id, content, created_at) VALUES
('a0000000-0000-0000-0000-000000000004', 'event_chat', '60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Hey everyone! Excited for next week!', NOW() - INTERVAL '3 hours'),
('a0000000-0000-0000-0000-000000000005', 'event_chat', '60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Me too! Anyone know if we need to bring special shoes?', NOW() - INTERVAL '2 hours 45 minutes'),
('a0000000-0000-0000-0000-000000000006', 'event_chat', '60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'I think any smooth-soled shoes should be fine for beginners!', NOW() - INTERVAL '2 hours 30 minutes');

-- ============================================
-- OUTPUT SUMMARY
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '=== Seed Data Summary ===';
    RAISE NOTICE 'Users: % (% attendees, % providers, 1 admin)', 
        (SELECT COUNT(*) FROM users),
        (SELECT COUNT(*) FROM users WHERE role = 'user'),
        (SELECT COUNT(*) FROM users WHERE role = 'provider');
    RAISE NOTICE 'Providers: %', (SELECT COUNT(*) FROM providers);
    RAISE NOTICE 'Venues: %', (SELECT COUNT(*) FROM venues);
    RAISE NOTICE 'Events: %', (SELECT COUNT(*) FROM events);
    RAISE NOTICE 'Sessions: %', (SELECT COUNT(*) FROM event_sessions);
    RAISE NOTICE 'Tickets: %', (SELECT COUNT(*) FROM tickets);
    RAISE NOTICE 'Connections: %', (SELECT COUNT(*) FROM connections);
    RAISE NOTICE 'Conversations: %', (SELECT COUNT(*) FROM conversations);
    RAISE NOTICE 'Messages: %', (SELECT COUNT(*) FROM messages);
    RAISE NOTICE '========================';
END $$;
