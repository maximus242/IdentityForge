# Database package for IdentityForge

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit with your database URL
   ```

3. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

4. Push schema to database:
   ```bash
   npx prisma db push
   ```

## Prisma Schema

The database schema includes:
- User accounts
- Values (user-defined values with depth)
- Identity Archetypes
- Daily Entries
- Conversations
- Patterns
