# OAuth Troubleshooting Guide

## Problem
OAuth login (Google/Discord) is not creating users or promoting admins properly.

## Diagnosis

Run this command on your VPS to check your setup:

```bash
cd /path/to/your/app/backend
npm run check-oauth
```

This will show you:
- ✅ Which database columns exist (or are missing)
- ✅ Which OAuth environment variables are configured
- ✅ List of existing users in the database
- ✅ Which users are admins
- 💡 Specific recommendations to fix issues

## Common Issues & Solutions

### Issue 1: "password_hash is NOT NULL"

**Symptom:** OAuth login fails with error about password_hash constraint

**Solution:**
```bash
cd backend
node scripts/fixPasswordHash.js
pm2 restart astranodes-api
```

This makes the password_hash column nullable so OAuth users (who don't have passwords) can be created.

---

### Issue 2: "OAuth columns are missing"

**Symptom:** OAuth login fails, users not created, or database errors

**Solution:**
```bash
cd backend
npm run migrate-oauth
pm2 restart astranodes-api
```

This adds the required OAuth columns: `oauth_provider`, `oauth_id`, `email_verified`, `verification_token`, `verification_token_expires`

---

### Issue 3: "Users not appearing in database"

**Symptom:** Login seems to work but no user record is created

**Check backend logs:**
```bash
pm2 logs astranodes-api --lines 50
```

Look for:
- `[AUTH] Google OAuth login attempt: your-email@gmail.com`
- `[AUTH] Creating new user in database`
- `[AUTH] User created with ID: X`
- Any error messages

**Common causes:**
1. **Database schema issue** - Run `npm run check-oauth` to diagnose
2. **Pterodactyl API error** - Check if panel is accessible and API key is valid
3. **Missing OAuth columns** - Run `npm run migrate-oauth`

---

### Issue 4: "Cannot promote to admin"

**Symptom:** `npm run set-admin email@example.com` says "User not found"

**Solution:**

1. **First, verify user exists:**
   ```bash
   npm run check-oauth
   ```
   This will list all users in the database.

2. **If no users exist:**
   - Login via Google or Discord OAuth first
   - Check backend logs for any errors
   - Run `npm run check-oauth` again to confirm user was created

3. **If user exists but email doesn't match:**
   - OAuth stores emails in lowercase
   - Use the exact email shown in `check-oauth` output
   - Example: `npm run set-admin user@gmail.com` (not User@Gmail.com)

4. **Promote to admin:**
   ```bash
   npm run set-admin your-email@gmail.com
   ```

5. **Verify promotion:**
   ```bash
   npm run check-oauth
   ```
   Should show your user with "Role: admin"

6. **Refresh browser:**
   - Log out completely
   - Clear browser cache/localStorage
   - Log back in with OAuth
   - You should now see Admin Panel in navigation

---

## Step-by-Step First-Time Setup

### On VPS (After deployment):

```bash
cd /path/to/your/app/backend

# 1. Check current status
npm run check-oauth

# 2. If OAuth columns missing:
npm run migrate-oauth

# 3. If password_hash is NOT NULL:
node scripts/fixPasswordHash.js

# 4. Restart backend
pm2 restart astranodes-api

# 5. Verify setup
npm run check-oauth
```

### In Browser:

```
1. Visit https://your-domain.com
2. Click "Continue with Google" or "Continue with Discord"
3. Complete OAuth authorization
4. You should be redirected to dashboard
```

### Back on VPS:

```bash
# 6. Check if user was created
npm run check-oauth

# 7. Promote yourself to admin (use YOUR email from OAuth)
npm run set-admin your-email@gmail.com

# 8. Verify you're now admin
npm run check-oauth
```

### Back in Browser:

```
1. Log out
2. Log back in with OAuth
3. You should see "Admin Panel" in navigation
4. Go to Admin Panel → Users section
5. You can now promote other users from the UI
```

---

## Environment Variables Checklist

Make sure these are set in `backend/.env`:

```bash
# OAuth - Google
GOOGLE_CLIENT_ID=your-client-id-from-google-console.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-from-google

# OAuth - Discord
DISCORD_CLIENT_ID=your-discord-app-id
DISCORD_CLIENT_SECRET=your-discord-secret

# OAuth Callback
OAUTH_CALLBACK_URL=https://your-domain.com  # or https://api.your-domain.com

# Session
SESSION_SECRET=some-random-32-char-string
```

**Important:** 
- The callback URLs in your OAuth console (Google/Discord) must exactly match:
  - Google: `https://your-domain.com/api/auth/google/callback`
  - Discord: `https://your-domain.com/api/auth/discord/callback`

---

## Viewing Backend Logs

To see what's happening during OAuth:

```bash
# Follow logs in real-time
pm2 logs astranodes-api

# View last 100 lines
pm2 logs astranodes-api --lines 100

# View only errors
pm2 logs astranodes-api --err
```

Look for these log messages:
- ✅ `[AUTH] Google OAuth login attempt: email@example.com`
- ✅ `[AUTH] Existing user found:` or `[AUTH] Creating new user`
- ✅ `[AUTH] User created with ID: X`
- ❌ `[AUTH] Google OAuth error:` - indicates a problem

---

## Quick Reference Commands

```bash
# Diagnose OAuth setup
npm run check-oauth

# Run OAuth migration
npm run migrate-oauth

# Fix password_hash column
node scripts/fixPasswordHash.js

# Promote user to admin
npm run set-admin email@example.com

# View logs
pm2 logs astranodes-api

# Restart after changes
pm2 restart astranodes-api
```

---

## Still Having Issues?

1. Run `npm run check-oauth` and share the output
2. Check `pm2 logs astranodes-api` during OAuth login
3. Verify OAuth credentials are correct in `.env`
4. Ensure OAuth callback URLs match in Google/Discord consoles
5. Check Pterodactyl panel is accessible and API key is valid
