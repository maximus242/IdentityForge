# IdentityForge - Self-Actualization App

A 10x better self-actualization app that helps people with depression/ADHD reconnect with their values and identity.

## Tech Stack

- **Mobile**: React Native (Expo)
- **Web**: Next.js
- **Backend**: Next.js API routes
- **Database**: PostgreSQL with Prisma
- **Auth**: Supabase
- **AI**: Anthropic API (Claude)

## Getting Started

### Prerequisites

- Node.js 20.x (recommended; see `.nvmrc`)
- npm or yarn
- Expo CLI
- PostgreSQL database (local or hosted)
- Supabase project (optional if using local auth mode)
- OpenRouter API key (optional if you are not testing AI responses)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   cd IdentityForge
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. Initialize database:
   ```bash
   npm run db:generate
   npm run db:push
   ```

5. Start development:
   ```bash
   # Mobile (Expo)
   npm run mobile

   # Web (Next.js)
   npm run web
   ```

If the app does not load at all, verify your Node runtime:

```bash
node -v
```

Use Node 20 if needed:

```bash
nvm use
# or: nvm install 20 && nvm use 20
```

### Local Auth Mode (No Supabase Required)

Set `NEXT_PUBLIC_LOCAL_AUTH="true"` in `.env` to force local auth mode.
Local auth mode is also enabled automatically when Supabase public env vars are missing.

- Sign up/sign in uses a local DB-backed auth endpoint (`/api/auth/local`)
- Session token is the local user id and is stored in browser localStorage
- API auth checks continue to work because routes already use Bearer token user ids

If login shows `Local auth request failed`, verify local DB first:

```bash
npm run db:push
```

If this fails, PostgreSQL is not reachable from your `DATABASE_URL`.

### Local End-to-End Smoke Test

After starting web app locally, run:

```bash
npm run smoke:web-local
```

This verifies:
- local signup (`/api/auth/local`)
- conversation creation (`/api/conversations`)
- message round-trip (`/api/conversations/:id/messages`)

If your web app runs on a different URL:

```bash
BASE_URL="http://127.0.0.1:4173" npm run smoke:web-local
```

## Project Structure

```
/src
  /components     - Reusable UI components
  /screens        - Mobile screens (React Native)
  /pages          - Web pages (Next.js)
  /hooks          - Custom React hooks
  /lib            - Utilities
  /api            - Backend API routes
  /ai             - AI prompt engineering, conversation logic
  /store          - State management
  /types          - TypeScript types
/prisma           - Database schema
/prompts          - AI conversation prompts
```

## Core Features

### Phase 1: Foundation
- Values Discovery Engine (conversational AI)
- Identity Crafting
- Basic Account System

### Phase 2: Daily Integration
- Values-Aligned Daily Choices
- Daily Entry System
- AI Coaching Conversations

### Phase 3: Pattern Recognition
- Insight Engine
- Adaptive Pathways
- Progress Visualization

### Phase 4: Deep Work
- Limiting Belief Work
- Somatic Integration
- Ambient Reinforcement

## License

MIT
