# ActiMeet

**Connect through activities. Find your spark.**

ActiMeet is a social discovery platform that brings people together through shared activity experiences — dance classes, sports sessions, hobby workshops, and more.

## 🎯 Vision

Unlike traditional dating apps, ActiMeet facilitates organic connections by bringing people together at real-world events where interaction is built into the experience. Attend a salsa class, join a tennis mixer, try rock climbing — and meet people who share your interests along the way.

## 🏗️ Project Structure

```
actimeet/
├── apps/
│   ├── web/                 # Next.js web app (coming soon)
│   ├── mobile/              # React Native app (coming soon)
│   └── provider-dashboard/  # Provider management (coming soon)
├── packages/
│   ├── database/            # PostgreSQL schema & migrations ✅
│   ├── api/                 # tRPC backend (coming soon)
│   └── shared/              # Shared types & utils (coming soon)
├── docs/                    # Documentation
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Git

### Setup

```bash
# Clone the repository
git clone git@github.com:YOUR_USERNAME/actimeet.git
cd actimeet

# Set up the database
cd packages/database
chmod +x setup.sh
./setup.sh reset

# Verify it's working
./setup.sh status
```

## 📦 Packages

### `packages/database`

PostgreSQL schema with:
- User accounts and profiles
- Event management with multi-session support
- Gender-balanced ticketing
- Messaging (DMs + event chat)
- Connection tracking
- Admin-configurable settings

[→ Database README](./packages/database/README.md)

## 🛠️ Development

### Database

```bash
cd packages/database

# Reset database (drop, create, migrate, seed)
./setup.sh reset

# Run migrations only
./setup.sh migrate

# Seed development data
./setup.sh seed

# Connect to database
./setup.sh connect
```

## 📋 Features (Planned)

### For Attendees
- [x] Database schema
- [ ] User registration & profiles
- [ ] Event discovery (list, map, filters)
- [ ] Ticket purchase with Stripe
- [ ] QR code tickets
- [ ] Event group chat
- [ ] Direct messaging
- [ ] Pro subscription

### For Providers
- [x] Database schema
- [ ] Event creation & management
- [ ] Venue management
- [ ] Attendee check-in (QR scanning)
- [ ] Payout dashboard
- [ ] Analytics

### For Admins
- [x] Database schema
- [ ] Provider approval workflow
- [ ] Platform settings management
- [ ] Moderation tools

## 🗓️ Roadmap

| Phase | Timeline | Focus |
|-------|----------|-------|
| 1 | Weeks 1-2 | Foundation (database, auth, project setup) |
| 2 | Weeks 3-5 | Core backend (events, tickets, payments) |
| 3 | Weeks 4-7 | Web app (discovery, checkout, profiles) |
| 4 | Weeks 6-9 | Mobile apps (iOS, Android) |
| 5 | Weeks 8-10 | Provider dashboard |
| 6 | Weeks 10-12 | Polish, QA, soft launch |

## 🌍 Geographic Focus

**Phase 1:** Ireland 🇮🇪
**Phase 2:** United Kingdom 🇬🇧
**Phase 3:** USA 🇺🇸, Canada 🇨🇦, Australia 🇦🇺

## 📄 License

Proprietary. All rights reserved.

---

Built with ❤️ in Ireland
