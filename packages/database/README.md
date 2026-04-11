# ActiMeet Database

This package contains the PostgreSQL database schema, migrations, and seed data for ActiMeet.

## Prerequisites

- PostgreSQL 15+ installed locally
- PostGIS extension (for geospatial queries)
- `psql` command-line tool

### Installing PostgreSQL on Ubuntu/WSL

```bash
# Update package list
sudo apt update

# Install PostgreSQL and PostGIS
sudo apt install postgresql postgresql-contrib postgis

# Start PostgreSQL
sudo service postgresql start

# Verify it's running
pg_isready
```

## Quick Start

```bash
# Make the setup script executable
chmod +x setup.sh

# Create database, run migrations, and seed data
./setup.sh reset

# Check status
./setup.sh status

# Connect to database
./setup.sh connect
```

## Available Commands

| Command | Description |
|---------|-------------|
| `./setup.sh create` | Create database and user |
| `./setup.sh drop` | Drop the database |
| `./setup.sh migrate` | Run schema migrations |
| `./setup.sh seed` | Load development seed data |
| `./setup.sh reset` | Full reset (drop, create, migrate, seed) |
| `./setup.sh status` | Show database status and table counts |
| `./setup.sh connect` | Open psql connection |
| `./setup.sh url` | Print connection string |

## Environment Variables

You can override the default configuration:

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=actimeet_dev
export DB_USER=actimeet
export DB_PASSWORD=actimeet_dev_password
```

## Database Structure

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts (attendees, providers, admins) |
| `providers` | Extended profiles for event organisers |
| `venues` | Physical locations for events |
| `events` | Event records with pricing, capacity, settings |
| `event_sessions` | Individual dates/times within events |
| `tickets` | Purchased tickets |
| `payments` | Payment transactions |

### Social Tables

| Table | Description |
|-------|-------------|
| `connections` | Bidirectional user connections from shared events |
| `blocks` | One-directional user blocks |
| `conversations` | DM conversation threads |
| `messages` | All messages (DMs and event chat) |
| `reports` | User/content reports for moderation |

### Config Tables

| Table | Description |
|-------|-------------|
| `platform_settings` | Admin-configurable settings |
| `user_subscriptions` | User Pro subscriptions |
| `provider_subscriptions` | Provider Pro subscriptions |

## Schema Files

```
schema/
└── 001_initial_schema.sql    # Complete initial schema

seeds/
└── development.sql           # Test data for development
```

## Adding Migrations

For future schema changes, create new numbered files:

```
schema/
├── 001_initial_schema.sql
├── 002_add_payment_methods.sql
└── 003_add_user_preferences.sql
```

Migrations run in filename order.

## Connection String

For use in application code:

```
postgresql://actimeet:actimeet_dev_password@localhost:5432/actimeet_dev
```

Or get it programmatically:

```bash
./setup.sh url
```

## Useful Queries

### Check event availability

```sql
SELECT 
    e.title,
    e.gender_mode,
    CASE WHEN e.gender_mode = 'mixed' THEN
        e.male_capacity - e.male_tickets_sold
    ELSE
        e.total_capacity - e.total_tickets_sold
    END AS available_slots
FROM events e
WHERE e.is_published = true;
```

### Find users who can message each other

```sql
SELECT can_users_message(
    '10000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid
);
```

### Get provider commission rate

```sql
SELECT get_provider_commission_rate('40000000-0000-0000-0000-000000000001'::uuid);
```

### Search events

```sql
SELECT title, short_description
FROM events
WHERE search_vector @@ plainto_tsquery('english', 'salsa beginner')
  AND is_published = true;
```

### Find nearby events

```sql
SELECT e.title, v.name as venue, v.city,
    ST_Distance(v.location, ST_MakePoint(-6.2603, 53.3498)::geography) / 1000 AS distance_km
FROM events e
JOIN venues v ON e.venue_id = v.id
WHERE ST_DWithin(v.location, ST_MakePoint(-6.2603, 53.3498)::geography, 10000) -- within 10km
ORDER BY distance_km;
```

## Troubleshooting

### "PostgreSQL is not running"

```bash
sudo service postgresql start
```

### "Permission denied" on setup.sh

```bash
chmod +x setup.sh
```

### "extension postgis is not available"

```bash
sudo apt install postgis postgresql-15-postgis-3
```

### Reset everything

```bash
./setup.sh reset
```
