# IdentityForge - Quick Start Guide

## ✅ Setup Complete!

Your app has been fixed and is ready to run locally. Here's what was fixed:

### Issues Resolved:
1. ✅ Node version corrected (was v25, now using v20)
2. ✅ PostgreSQL service restarted and running
3. ✅ Database `identityforge` verified
4. ✅ Prisma client generated
5. ✅ Database schema synced

---

## 🚀 Running the App

### Option 1: Using the helper script (Recommended)

```bash
cd /Users/cloud/Programming/IdentityForge

# Run both web and mobile
./run.sh npm run dev

# Run web only (recommended to start with)
./run.sh npm run web

# Run mobile only
./run.sh npm run mobile
```

### Option 2: Manual (if helper script doesn't work)

```bash
cd /Users/cloud/Programming/IdentityForge

# Set Node 20 in PATH
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"

# Verify Node version
node -v  # Should show v20.20.0

# Run web app
npm run web

# Or run both web and mobile
npm run dev
```

---

## 🌐 Accessing the App

- **Web App**: http://localhost:3001
- **Mobile App**: Scan QR code in terminal with Expo Go app

---

## 🔧 Troubleshooting

### If PostgreSQL is not running:
```bash
brew services restart postgresql@15
```

### If you get Prisma errors:
```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
npm run db:generate
npm run db:push
```

### If you get Node version errors:
```bash
# Make sure you're using Node 20
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
node -v  # Should show v20.20.0
```

### If dependencies are missing:
```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
npm install
```

---

## 💡 Making Node 20 Permanent

To avoid having to set PATH every time, add this to your `~/.zshrc`:

```bash
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Note**: This will make Node 20 your default Node version system-wide.

Alternatively, if you have `direnv` installed, the `.envrc` file in the project will automatically use Node 20 when you `cd` into the project directory.

---

## 📝 Development Commands

```bash
# Generate Prisma client
npm run db:generate

# Push database schema changes
npm run db:push

# Lint code
npm run lint

# Run web tests
npm --workspace apps/web run test

# Build web app
npm run build:web

# Run smoke tests
npm run smoke:web-local
```

---

## 🎯 Next Steps

1. Start the web app: `./run.sh npm run web`
2. Open http://localhost:3001 in your browser
3. Sign up with any email/password (local auth mode is enabled)
4. Start building!

---

## 📚 Additional Info

- **Database**: PostgreSQL running locally on port 5432
- **Auth Mode**: Local (no Supabase required)
- **AI Provider**: OpenRouter (API key already configured)
- **Node Version**: 20.20.0 (required: >=18.18.0 <23)
