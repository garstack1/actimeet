#!/bin/bash

# ActiMeet Database Setup Script
# Usage: ./setup.sh [command]
# Commands: create, drop, migrate, seed, reset, status

set -e

# Configuration (override with environment variables)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-actimeet_dev}"
DB_USER="${DB_USER:-actimeet}"
DB_PASSWORD="${DB_PASSWORD:-actimeet_dev_password}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if PostgreSQL is running
check_postgres() {
    if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
        log_error "PostgreSQL is not running on $DB_HOST:$DB_PORT"
        echo "Start PostgreSQL with: sudo service postgresql start"
        exit 1
    fi
    log_info "PostgreSQL is running"
}

# Create the database and user
create_db() {
    log_info "Creating database and user..."
    
    # Connect as postgres superuser to create DB and user
    sudo -u postgres psql << EOF
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
        CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
EOF

    # Enable extensions (requires superuser)
    sudo -u postgres psql -d $DB_NAME << EOF
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
EOF

    log_info "Database '$DB_NAME' created successfully"
}

# Drop the database
drop_db() {
    log_warn "This will delete all data in '$DB_NAME'. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log_info "Dropping database..."
        sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;"
        log_info "Database dropped"
    else
        log_info "Aborted"
    fi
}

# Run migrations (schema files)
migrate() {
    log_info "Running migrations..."
    
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    SCHEMA_DIR="$SCRIPT_DIR/schema"
    
    # Run each .sql file in order
    for file in "$SCHEMA_DIR"/*.sql; do
        if [ -f "$file" ]; then
            log_info "Applying $(basename "$file")..."
            PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$file"
        fi
    done
    
    log_info "Migrations complete"
}

# Run seed data
seed() {
    log_info "Seeding database..."
    
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    SEED_FILE="$SCRIPT_DIR/seeds/development.sql"
    
    if [ -f "$SEED_FILE" ]; then
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$SEED_FILE"
        log_info "Seed data loaded"
    else
        log_warn "No seed file found at $SEED_FILE"
    fi
}

# Reset database (drop, create, migrate, seed)
reset() {
    log_warn "This will completely reset the database. Continue? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log_info "Resetting database..."
        sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
        create_db
        migrate
        seed
        log_info "Database reset complete"
    else
        log_info "Aborted"
    fi
}

# Show database status
status() {
    log_info "Database Status"
    echo "----------------------------------------"
    echo "Host: $DB_HOST:$DB_PORT"
    echo "Database: $DB_NAME"
    echo "User: $DB_USER"
    echo ""
    
    # Check if database exists
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
        echo -e "Status: ${GREEN}EXISTS${NC}"
        
        # Show table counts
        echo ""
        echo "Table row counts:"
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
SELECT 
    schemaname || '.' || relname AS table,
    n_live_tup AS row_count
FROM pg_stat_user_tables 
WHERE n_live_tup > 0
ORDER BY n_live_tup DESC;
EOF
    else
        echo -e "Status: ${RED}NOT FOUND${NC}"
        echo "Run: ./setup.sh create"
    fi
}

# Connect to database
connect() {
    log_info "Connecting to $DB_NAME..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME
}

# Generate connection string
connection_string() {
    echo "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
}

# Show help
show_help() {
    echo "ActiMeet Database Setup"
    echo ""
    echo "Usage: ./setup.sh [command]"
    echo ""
    echo "Commands:"
    echo "  create    Create the database and user"
    echo "  drop      Drop the database"
    echo "  migrate   Run schema migrations"
    echo "  seed      Load development seed data"
    echo "  reset     Drop, create, migrate, and seed"
    echo "  status    Show database status"
    echo "  connect   Open psql connection"
    echo "  url       Print connection string"
    echo "  help      Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  DB_HOST     Database host (default: localhost)"
    echo "  DB_PORT     Database port (default: 5432)"
    echo "  DB_NAME     Database name (default: actimeet_dev)"
    echo "  DB_USER     Database user (default: actimeet)"
    echo "  DB_PASSWORD Database password (default: actimeet_dev_password)"
}

# Main
check_postgres

case "${1:-help}" in
    create)
        create_db
        ;;
    drop)
        drop_db
        ;;
    migrate)
        migrate
        ;;
    seed)
        seed
        ;;
    reset)
        reset
        ;;
    status)
        status
        ;;
    connect)
        connect
        ;;
    url)
        connection_string
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
