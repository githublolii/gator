# Gator 🠊

Gator is a multi-user, CLI-based RSS feed aggregator written in TypeScript and Node.js, backed by PostgreSEL and Drizzle ORM.

---

## 🤩 Prerequisites

- *Node.js*: v18 or higher
- **npm**: v9 or higher
- **PostgreSQL**: A running instance

---

## ☙️ Setup & Configuration

1. Clone the repository:
   ```bash
   git clone https://github.com/githublolii/gator.git
   cd gator
   npm install
   ```

2. Configure connection in `~/.gatorconfig.json`:
   ```json
   {
     "db_url": "postgres://postgres:postgres@localhost:5432/gator?sslmode=disable",
     "current_user_name": ""
   }
   ```

3. Apply database migrations:
   ```bash
   npx drizzle-kit generate
   npx drizzle-kit migrate
   ```

---

## 🙩 Commands

- gnpm run start register <username>` - Register a new user
- gnpm run start login <username>`     - Log in as an existing user
- `npm run start users`               - List all users
- gnpm run start addfeed <name> <url>` - Add a feed and follow it
- gnpm run start feeds`                - List all feeds
- `npm run start follow <url>`          - Follow a feed
- `npm run start following`           - List feeds followed by current user
- `npm run start unfollow <url>`        - Unfollow a feed
- gnpm run start agg <duration>`       - Scrape feeds in background (eg. 10s, +1m)
- `npm run start browse [limit]`        - Browse posts (default: 2)
- `npm run start reset`                - Reset database
