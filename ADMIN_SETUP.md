# Admin Setup Guide

Since authentication is now OAuth-only (Google & Discord), you need to manually promote the first admin user.

## Steps to Create Your First Admin

1. **Login with OAuth**
   - Go to your application's login page
   - Sign in using Google or Discord OAuth
   - This creates your user account in the database

2. **Promote to Admin**
   - Run the admin promotion script with your email:
   ```bash
   cd backend
   node scripts/setAdmin.js your-email@example.com
   ```
   
   Example:
   ```bash
   node scripts/setAdmin.js kaizenv12@hotmail.com
   ```

3. **Verify Admin Access**
   - Log out and log back in
   - You should now see the Admin Panel in the navigation
   - Access the admin panel to manage users, plans, servers, etc.

## Promoting Additional Admins

Once you have admin access, you can promote other users directly from the admin panel:

1. Navigate to **Admin Panel**
2. Find the user in the **Users** section
3. Click the **"Promote"** button next to their name
4. Confirm the promotion in the dialog

## Demoting Admins

To remove admin privileges from a user:

1. Go to **Admin Panel** → **Users**
2. Find the admin user
3. Click the **"Demote"** button
4. Confirm the demotion

**Note:** You cannot change your own role to prevent accidental lockout.

## Script Usage

### Set Admin
```bash
node scripts/setAdmin.js <email>
```

The script will:
- ✅ Look up the user by email
- ✅ Check current role
- ✅ Update role to 'admin'
- ✅ Display confirmation

### Example Output
```
🔍 Looking up user: admin@example.com

✅ Successfully promoted admin@example.com to admin!

User Details:
  ID: 5
  Email: admin@example.com
  Old Role: user
  New Role: admin
```

## Troubleshooting

**User not found:**
- Make sure the user has logged in at least once via OAuth
- Check the email spelling (case-insensitive)
- Verify the database path in your `.env` file

**Already an admin:**
- The script will notify you if the user already has admin role
- No changes will be made

**Cannot access admin panel after promotion:**
- Clear your browser cache and localStorage
- Log out and log back in
- Check browser console for errors
