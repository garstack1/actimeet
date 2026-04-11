-- ActiMeet Database Schema
-- Version: 1.0.0
-- Description: Initial schema with all core tables

-- ============================================
-- EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "postgis";         -- Geospatial queries
CREATE EXTENSION IF NOT EXISTS "pg_trgm";         -- Fuzzy text search

-- ============================================
-- ENUMS
-- ============================================

-- User roles
CREATE TYPE user_role AS ENUM ('user', 'provider', 'admin');

-- Subscription tiers
CREATE TYPE subscription_tier AS ENUM ('free', 'pro');

-- Provider verification status
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- Event gender modes
CREATE TYPE gender_mode AS ENUM ('mixed', 'same_gender', 'open');

-- Orientation tags for same_gender events
CREATE TYPE orientation_tag AS ENUM ('gay', 'lesbian', 'queer', 'all');

-- Activity categories
CREATE TYPE activity_category AS ENUM (
    'dance', 'sports', 'music', 'hobbies', 'wellness', 'other'
);

-- Ticket status
CREATE TYPE ticket_status AS ENUM ('active', 'used', 'cancelled', 'refunded', 'expired');

-- Payment status
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'disputed');

-- Refund policy types
CREATE TYPE refund_policy AS ENUM ('flexible', 'moderate', 'strict', 'credit_only', 'none');

-- Connection status between users
CREATE TYPE connection_status AS ENUM ('active', 'blocked');

-- Message type
CREATE TYPE message_type AS ENUM ('direct', 'event_chat');

-- Subscription billing period
CREATE TYPE billing_period AS ENUM ('monthly', 'annual');

-- ============================================
-- CORE TABLES
-- ============================================

-- Users table (both attendees and providers start here)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Profile fields
    display_name VARCHAR(100) NOT NULL,
    bio TEXT,
    date_of_birth DATE,
    gender VARCHAR(20), -- 'male', 'female', 'non_binary', 'prefer_not_to_say'
    show_exact_age BOOLEAN DEFAULT false, -- false = show range like "25-30"
    
    -- Photos stored as array of URLs
    photos TEXT[] DEFAULT '{}',
    profile_photo_index INTEGER DEFAULT 0, -- which photo is the main one
    
    -- Location (for matching/discovery)
    city VARCHAR(100),
    country_code CHAR(2), -- ISO 3166-1 alpha-2
    
    -- Account status
    role user_role DEFAULT 'user',
    subscription_tier subscription_tier DEFAULT 'free',
    email_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_country_code CHECK (country_code ~* '^[A-Z]{2}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_city_country ON users(city, country_code);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- PROVIDER TABLES
-- ============================================

-- Providers (extended profile for event organisers)
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Business details
    business_name VARCHAR(200) NOT NULL,
    business_description TEXT,
    business_email VARCHAR(255),
    business_phone VARCHAR(50),
    website_url VARCHAR(500),
    
    -- Verification
    verification_status verification_status DEFAULT 'pending',
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Stripe Connect
    stripe_account_id VARCHAR(100),
    stripe_onboarding_complete BOOLEAN DEFAULT false,
    
    -- Commission (can override platform defaults)
    custom_commission_rate DECIMAL(4,3), -- e.g., 0.080 = 8%
    is_pro_provider BOOLEAN DEFAULT false,
    
    -- Stats (denormalised for performance)
    total_events_hosted INTEGER DEFAULT 0,
    total_tickets_sold INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_providers_user_id ON providers(user_id);
CREATE INDEX idx_providers_verification_status ON providers(verification_status);
CREATE INDEX idx_providers_stripe_account ON providers(stripe_account_id);

-- Venues (locations where events happen)
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    
    -- Details
    name VARCHAR(200) NOT NULL,
    description TEXT,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    county VARCHAR(100), -- state/province
    postcode VARCHAR(20),
    country_code CHAR(2) NOT NULL DEFAULT 'IE',
    
    -- Geolocation (PostGIS)
    location GEOGRAPHY(POINT, 4326), -- lat/lng
    
    -- Facilities
    facilities TEXT[], -- ['parking', 'wheelchair_accessible', 'changing_rooms']
    
    -- Photos
    photos TEXT[] DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_venues_provider_id ON venues(provider_id);
CREATE INDEX idx_venues_city ON venues(city);
CREATE INDEX idx_venues_location ON venues USING GIST(location);

-- ============================================
-- EVENT TABLES
-- ============================================

-- Events (the main event record)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
    
    -- Basic info
    title VARCHAR(200) NOT NULL,
    description TEXT,
    short_description VARCHAR(500), -- for cards/previews
    
    -- Categorisation
    category activity_category NOT NULL,
    activity_type VARCHAR(100) NOT NULL, -- 'salsa', 'tango', 'tennis', etc.
    tags TEXT[] DEFAULT '{}', -- additional searchable tags
    
    -- Gender configuration
    gender_mode gender_mode NOT NULL DEFAULT 'mixed',
    -- For mixed mode
    male_capacity INTEGER,
    female_capacity INTEGER,
    -- For same_gender and open modes
    total_capacity INTEGER,
    -- For same_gender mode
    orientation orientation_tag,
    
    -- Age restrictions
    min_age INTEGER,
    max_age INTEGER,
    
    -- Pricing (in cents to avoid floating point issues)
    price_cents INTEGER NOT NULL,
    currency CHAR(3) DEFAULT 'EUR', -- ISO 4217
    -- Optional different pricing by gender
    male_price_cents INTEGER,
    female_price_cents INTEGER,
    
    -- Refunds
    refund_policy refund_policy DEFAULT 'moderate',
    refund_days_before INTEGER DEFAULT 7, -- full refund up to X days before
    
    -- Media
    cover_image_url TEXT,
    images TEXT[] DEFAULT '{}',
    
    -- Status
    is_published BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    is_cancelled BOOLEAN DEFAULT false,
    cancellation_reason TEXT,
    
    -- Listing fee (has this event been paid for?)
    listing_fee_paid BOOLEAN DEFAULT false,
    listing_fee_payment_id VARCHAR(100),
    
    -- Stats (denormalised)
    male_tickets_sold INTEGER DEFAULT 0,
    female_tickets_sold INTEGER DEFAULT 0,
    total_tickets_sold INTEGER DEFAULT 0,
    
    -- Cloning reference
    cloned_from_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_gender_mode_capacity CHECK (
        (gender_mode = 'mixed' AND male_capacity IS NOT NULL AND female_capacity IS NOT NULL) OR
        (gender_mode IN ('same_gender', 'open') AND total_capacity IS NOT NULL)
    ),
    CONSTRAINT valid_same_gender_orientation CHECK (
        (gender_mode = 'same_gender' AND orientation IS NOT NULL) OR
        (gender_mode != 'same_gender')
    ),
    CONSTRAINT valid_age_range CHECK (
        (min_age IS NULL AND max_age IS NULL) OR
        (min_age IS NOT NULL AND max_age IS NOT NULL AND min_age < max_age) OR
        (min_age IS NOT NULL AND max_age IS NULL) OR
        (min_age IS NULL AND max_age IS NOT NULL)
    ),
    CONSTRAINT positive_price CHECK (price_cents >= 0)
);

CREATE INDEX idx_events_provider_id ON events(provider_id);
CREATE INDEX idx_events_venue_id ON events(venue_id);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_activity_type ON events(activity_type);
CREATE INDEX idx_events_is_published ON events(is_published) WHERE is_published = true;
CREATE INDEX idx_events_tags ON events USING GIN(tags);

-- Event Sessions (individual dates/times within an event)
CREATE TABLE event_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- Timing
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Europe/Dublin',
    
    -- Session-specific overrides (usually NULL, inherits from event)
    override_venue_id UUID REFERENCES venues(id),
    
    -- Status
    is_cancelled BOOLEAN DEFAULT false,
    cancellation_reason TEXT,
    
    -- Order for display
    session_order INTEGER NOT NULL DEFAULT 1,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_session_times CHECK (end_time > start_time)
);

CREATE INDEX idx_event_sessions_event_id ON event_sessions(event_id);
CREATE INDEX idx_event_sessions_date ON event_sessions(session_date);
CREATE INDEX idx_event_sessions_upcoming ON event_sessions(session_date) 
    WHERE session_date >= CURRENT_DATE AND is_cancelled = false;

-- ============================================
-- TICKET & PAYMENT TABLES
-- ============================================

-- Tickets
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Ticket details
    ticket_number VARCHAR(20) NOT NULL UNIQUE, -- human-readable: ACT-XXXX-XXXX
    qr_code_data TEXT NOT NULL, -- encrypted/signed data for QR
    
    -- Gender slot this ticket occupies (NULL for open events)
    gender_slot VARCHAR(10), -- 'male' or 'female'
    
    -- Pricing at time of purchase (in cents)
    amount_paid_cents INTEGER NOT NULL,
    currency CHAR(3) DEFAULT 'EUR',
    
    -- Status
    status ticket_status DEFAULT 'active',
    checked_in_at TIMESTAMP WITH TIME ZONE,
    checked_in_by UUID REFERENCES users(id), -- provider/staff who checked them in
    
    -- Refund info
    refunded_at TIMESTAMP WITH TIME ZONE,
    refund_amount_cents INTEGER,
    refund_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate tickets
    CONSTRAINT unique_user_event UNIQUE (user_id, event_id)
);

CREATE INDEX idx_tickets_event_id ON tickets(event_id);
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_ticket_number ON tickets(ticket_number);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    -- What was paid for
    payment_type VARCHAR(50) NOT NULL, -- 'ticket', 'subscription', 'listing_fee'
    
    -- Stripe
    stripe_payment_intent_id VARCHAR(100),
    stripe_charge_id VARCHAR(100),
    
    -- Amounts (all in cents)
    amount_cents INTEGER NOT NULL,
    platform_fee_cents INTEGER NOT NULL, -- our commission
    provider_amount_cents INTEGER, -- what provider receives (for tickets)
    currency CHAR(3) DEFAULT 'EUR',
    
    -- Status
    status payment_status DEFAULT 'pending',
    
    -- Error handling
    failure_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_payments_ticket_id ON payments(ticket_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_stripe_payment_intent ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Provider Payouts
CREATE TABLE provider_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
    
    -- Stripe transfer
    stripe_transfer_id VARCHAR(100),
    
    -- Amount
    amount_cents INTEGER NOT NULL,
    currency CHAR(3) DEFAULT 'EUR',
    
    -- Period this covers
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_provider_payouts_provider_id ON provider_payouts(provider_id);
CREATE INDEX idx_provider_payouts_status ON provider_payouts(status);

-- ============================================
-- SOCIAL TABLES
-- ============================================

-- Connections between users (from shared events)
CREATE TABLE connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- The event that created this connection
    source_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    
    -- Status
    status connection_status DEFAULT 'active',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure user_a_id < user_b_id to prevent duplicates
    CONSTRAINT ordered_users CHECK (user_a_id < user_b_id),
    CONSTRAINT unique_connection UNIQUE (user_a_id, user_b_id),
    CONSTRAINT no_self_connection CHECK (user_a_id != user_b_id)
);

CREATE INDEX idx_connections_user_a ON connections(user_a_id);
CREATE INDEX idx_connections_user_b ON connections(user_b_id);
CREATE INDEX idx_connections_event ON connections(source_event_id);

-- Blocks (one-directional)
CREATE TABLE blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Reason (for moderation)
    reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id),
    CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);

CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_id);

-- Reports (for moderation)
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reported_event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    reported_message_id UUID, -- references messages.id (added after messages table)
    
    -- Report details
    reason VARCHAR(100) NOT NULL, -- 'harassment', 'spam', 'inappropriate', 'fake_profile', etc.
    description TEXT,
    
    -- Moderation
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'reviewed', 'actioned', 'dismissed'
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    action_taken TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- At least one thing must be reported
    CONSTRAINT valid_report CHECK (
        reported_user_id IS NOT NULL OR 
        reported_event_id IS NOT NULL OR 
        reported_message_id IS NOT NULL
    )
);

CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX idx_reports_status ON reports(status);

-- ============================================
-- MESSAGING TABLES
-- ============================================

-- Conversations (for DMs)
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- The event that enabled this conversation
    source_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    
    -- Last activity (for sorting)
    last_message_at TIMESTAMP WITH TIME ZONE,
    last_message_preview TEXT, -- first 100 chars of last message
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure ordering and uniqueness
    CONSTRAINT ordered_conversation_users CHECK (user_a_id < user_b_id),
    CONSTRAINT unique_conversation UNIQUE (user_a_id, user_b_id)
);

CREATE INDEX idx_conversations_user_a ON conversations(user_a_id);
CREATE INDEX idx_conversations_user_b ON conversations(user_b_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

-- Messages (both DMs and event chat)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Type and context
    message_type message_type NOT NULL,
    
    -- For DMs: the conversation
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- For event chat: the event
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    
    -- Sender
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Content
    content TEXT NOT NULL,
    
    -- Status
    is_deleted BOOLEAN DEFAULT false, -- soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    edited_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_message_context CHECK (
        (message_type = 'direct' AND conversation_id IS NOT NULL AND event_id IS NULL) OR
        (message_type = 'event_chat' AND event_id IS NOT NULL AND conversation_id IS NULL)
    )
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC) 
    WHERE conversation_id IS NOT NULL;
CREATE INDEX idx_messages_event ON messages(event_id, created_at DESC) 
    WHERE event_id IS NOT NULL;
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- Add foreign key for reports -> messages now that messages table exists
ALTER TABLE reports 
    ADD CONSTRAINT fk_reports_message 
    FOREIGN KEY (reported_message_id) REFERENCES messages(id) ON DELETE CASCADE;

-- Message read receipts (for DMs)
CREATE TABLE message_read_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_read_receipt UNIQUE (conversation_id, user_id)
);

CREATE INDEX idx_read_receipts_conversation ON message_read_receipts(conversation_id);
CREATE INDEX idx_read_receipts_user ON message_read_receipts(user_id);

-- ============================================
-- SUBSCRIPTION TABLES
-- ============================================

-- User subscriptions (Pro)
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Subscription details
    tier subscription_tier NOT NULL,
    billing_period billing_period NOT NULL,
    
    -- Stripe
    stripe_subscription_id VARCHAR(100),
    stripe_customer_id VARCHAR(100),
    
    -- Dates
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Trial
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_stripe ON user_subscriptions(stripe_subscription_id);
CREATE INDEX idx_user_subscriptions_active ON user_subscriptions(user_id) WHERE is_active = true;

-- Provider subscriptions (Pro Provider)
CREATE TABLE provider_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    
    -- Same structure as user subscriptions
    billing_period billing_period NOT NULL,
    stripe_subscription_id VARCHAR(100),
    stripe_customer_id VARCHAR(100),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_provider_subscriptions_provider ON provider_subscriptions(provider_id);
CREATE INDEX idx_provider_subscriptions_active ON provider_subscriptions(provider_id) WHERE is_active = true;

-- ============================================
-- PLATFORM SETTINGS TABLE
-- ============================================

CREATE TABLE platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Insert default settings
INSERT INTO platform_settings (key, value, description) VALUES
    -- User limits
    ('free_tier_monthly_messages', '25', 'Maximum DMs per month for free users'),
    ('event_chat_retention_days', '30', 'Days after event before chat is deleted'),
    ('pro_trial_days', '7', 'Free trial duration for Pro subscription'),
    
    -- Commission rates
    ('listing_fee_cents', '300', 'Fee to list an event (in cents)'),
    ('base_commission_rate', '0.10', 'Default commission rate (10%)'),
    ('tier2_threshold', '100', 'Monthly tickets for tier 2'),
    ('tier2_commission_rate', '0.08', 'Tier 2 commission rate (8%)'),
    ('tier3_threshold', '500', 'Monthly tickets for tier 3'),
    ('tier3_commission_rate', '0.06', 'Tier 3 commission rate (6%)'),
    ('pro_provider_commission_rate', '0.05', 'Pro provider commission rate (5%)'),
    
    -- Subscription pricing (in cents)
    ('user_pro_monthly_cents', '999', 'User Pro monthly price'),
    ('user_pro_annual_cents', '7999', 'User Pro annual price'),
    ('provider_pro_monthly_cents', '4900', 'Provider Pro monthly price'),
    ('provider_pro_annual_cents', '39900', 'Provider Pro annual price'),
    
    -- Regions
    ('active_regions', '["IE"]', 'Currently active country codes'),
    ('supported_currencies', '["EUR"]', 'Supported currencies');

-- ============================================
-- NOTIFICATION TABLES
-- ============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Content
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    
    -- Type and action
    notification_type VARCHAR(50) NOT NULL, -- 'new_message', 'event_reminder', 'ticket_purchased', etc.
    action_url TEXT, -- deep link or web URL
    
    -- Related entities
    related_event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    related_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    related_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = false;

-- Push notification tokens
CREATE TABLE push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Token details
    token TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL, -- 'ios', 'android', 'web'
    
    -- Validity
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_token UNIQUE (token)
);

CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_active ON push_tokens(user_id) WHERE is_active = true;

-- ============================================
-- ACTIVITY TRACKING
-- ============================================

-- User activity (for free tier limits)
CREATE TABLE user_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Period
    month_year CHAR(7) NOT NULL, -- '2024-04'
    
    -- Counts
    messages_sent INTEGER DEFAULT 0,
    events_attended INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_month UNIQUE (user_id, month_year)
);

CREATE INDEX idx_user_activity_user_month ON user_activity(user_id, month_year);

-- Provider activity (for commission tiers)
CREATE TABLE provider_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    
    -- Period
    month_year CHAR(7) NOT NULL, -- '2024-04'
    
    -- Counts
    tickets_sold INTEGER DEFAULT 0,
    events_created INTEGER DEFAULT 0,
    revenue_cents INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_provider_month UNIQUE (provider_id, month_year)
);

CREATE INDEX idx_provider_activity_provider_month ON provider_activity(provider_id, month_year);

-- ============================================
-- AUDIT LOG (for admin actions)
-- ============================================

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Who
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_email VARCHAR(255), -- preserved even if user deleted
    
    -- What
    action VARCHAR(100) NOT NULL, -- 'provider_approved', 'event_cancelled', 'user_banned', etc.
    resource_type VARCHAR(50) NOT NULL, -- 'provider', 'event', 'user', 'ticket'
    resource_id UUID,
    
    -- Details
    details JSONB,
    
    -- When
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- ============================================
-- FULL-TEXT SEARCH SUPPORT
-- ============================================

-- Search vector for events (updated via trigger)
ALTER TABLE events ADD COLUMN search_vector tsvector;

CREATE INDEX idx_events_search ON events USING GIN(search_vector);

-- Function to update search vector
CREATE OR REPLACE FUNCTION events_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.activity_type, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.short_description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_search_vector_trigger
    BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION events_search_vector_update();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if two users can message each other
CREATE OR REPLACE FUNCTION can_users_message(user1_id UUID, user2_id UUID) 
RETURNS BOOLEAN AS $$
DECLARE
    is_blocked BOOLEAN;
    shared_event BOOLEAN;
BEGIN
    -- Check if either user has blocked the other
    SELECT EXISTS (
        SELECT 1 FROM blocks 
        WHERE (blocker_id = user1_id AND blocked_id = user2_id)
           OR (blocker_id = user2_id AND blocked_id = user1_id)
    ) INTO is_blocked;
    
    IF is_blocked THEN
        RETURN FALSE;
    END IF;
    
    -- Check if they share an event (both have tickets)
    SELECT EXISTS (
        SELECT 1 FROM tickets t1
        JOIN tickets t2 ON t1.event_id = t2.event_id
        WHERE t1.user_id = user1_id 
          AND t2.user_id = user2_id
          AND t1.status IN ('active', 'used')
          AND t2.status IN ('active', 'used')
    ) INTO shared_event;
    
    RETURN shared_event;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate provider commission rate
CREATE OR REPLACE FUNCTION get_provider_commission_rate(p_provider_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    provider_record RECORD;
    tickets_this_month INTEGER;
    base_rate DECIMAL;
    tier2_threshold INTEGER;
    tier2_rate DECIMAL;
    tier3_threshold INTEGER;
    tier3_rate DECIMAL;
    pro_rate DECIMAL;
BEGIN
    -- Get provider info
    SELECT * INTO provider_record FROM providers WHERE id = p_provider_id;
    
    -- If they have a custom rate, use it
    IF provider_record.custom_commission_rate IS NOT NULL THEN
        RETURN provider_record.custom_commission_rate;
    END IF;
    
    -- If they're pro, use pro rate
    IF provider_record.is_pro_provider THEN
        SELECT (value::DECIMAL) INTO pro_rate FROM platform_settings WHERE key = 'pro_provider_commission_rate';
        RETURN pro_rate;
    END IF;
    
    -- Get their ticket count this month
    SELECT COALESCE(tickets_sold, 0) INTO tickets_this_month
    FROM provider_activity 
    WHERE provider_id = p_provider_id 
      AND month_year = TO_CHAR(NOW(), 'YYYY-MM');
    
    -- Get rate tiers from settings
    SELECT (value::INTEGER) INTO tier2_threshold FROM platform_settings WHERE key = 'tier2_threshold';
    SELECT (value::DECIMAL) INTO tier2_rate FROM platform_settings WHERE key = 'tier2_commission_rate';
    SELECT (value::INTEGER) INTO tier3_threshold FROM platform_settings WHERE key = 'tier3_threshold';
    SELECT (value::DECIMAL) INTO tier3_rate FROM platform_settings WHERE key = 'tier3_commission_rate';
    SELECT (value::DECIMAL) INTO base_rate FROM platform_settings WHERE key = 'base_commission_rate';
    
    -- Return appropriate rate
    IF tickets_this_month >= tier3_threshold THEN
        RETURN tier3_rate;
    ELSIF tickets_this_month >= tier2_threshold THEN
        RETURN tier2_rate;
    ELSE
        RETURN base_rate;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON venues FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_provider_subscriptions_updated_at BEFORE UPDATE ON provider_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_user_activity_updated_at BEFORE UPDATE ON user_activity FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_provider_activity_updated_at BEFORE UPDATE ON provider_activity FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE users IS 'Core user accounts - both attendees and providers';
COMMENT ON TABLE providers IS 'Extended profile for event organisers, linked to users';
COMMENT ON TABLE venues IS 'Physical locations where events take place';
COMMENT ON TABLE events IS 'Main event records with capacity, pricing, and configuration';
COMMENT ON TABLE event_sessions IS 'Individual date/time slots within a multi-session event';
COMMENT ON TABLE tickets IS 'Purchased tickets linking users to events';
COMMENT ON TABLE payments IS 'All payment transactions (tickets, subscriptions, fees)';
COMMENT ON TABLE connections IS 'Bidirectional connections between users from shared events';
COMMENT ON TABLE blocks IS 'One-directional blocks between users';
COMMENT ON TABLE conversations IS 'DM conversation threads between two users';
COMMENT ON TABLE messages IS 'All messages (DMs and event chat)';
COMMENT ON TABLE platform_settings IS 'Admin-configurable platform settings';

COMMENT ON COLUMN events.gender_mode IS 'mixed: male+female pools, same_gender: single pool for LGBT, open: no gender tracking';
COMMENT ON COLUMN events.price_cents IS 'All prices stored in cents to avoid floating point issues';
COMMENT ON COLUMN tickets.qr_code_data IS 'Signed/encrypted data for generating QR codes';
COMMENT ON COLUMN connections.user_a_id IS 'Always the lower UUID to prevent duplicate connections';
