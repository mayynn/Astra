import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { env } from './env.js';
import { getOne, runSync } from './db.js';
import { pterodactyl } from '../services/pterodactyl.js';
import { randomBytes } from 'crypto';

// Serialize user to session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await getOne(
      'SELECT id, email, role, coins, balance FROM users WHERE id = ?',
      [id]
    );
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${env.OAUTH_CALLBACK_URL}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) {
            return done(new Error('No email provided by Google'), null);
          }

          // Check if user exists
          let user = await getOne(
            'SELECT id, email, role, coins, balance, oauth_provider, oauth_id FROM users WHERE email = ?',
            [email]
          );

          if (user) {
            // Update OAuth info if not set
            if (!user.oauth_provider || !user.oauth_id) {
              await runSync(
                'UPDATE users SET oauth_provider = ?, oauth_id = ? WHERE id = ?',
                ['google', profile.id, user.id]
              );
            }
          } else {
            // Create new user
            const username = email.split('@')[0].replace(/[^a-zA-Z0-9-]/g, '').slice(0, 20) || `user${Date.now()}`;
            const pteroPassword = randomBytes(24).toString('base64url');
            
            let pteroId;
            try {
              // Check if pterodactyl user already exists
              pteroId = await pterodactyl.getUserByEmail(email);
              
              // If not, create new pterodactyl user
              if (!pteroId) {
                pteroId = await pterodactyl.createUser({
                  email,
                  username,
                  firstName: profile.name?.givenName || username,
                  lastName: profile.name?.familyName || 'User',
                  password: pteroPassword,
                });
              }
            } catch (pteroErr) {
              console.error('[AUTH] Pterodactyl user creation failed:', pteroErr.message);
              return done(new Error('Account provisioning failed'), null);
            }

            const info = await runSync(
              'INSERT INTO users (email, oauth_provider, oauth_id, pterodactyl_user_id, ip_address, email_verified) VALUES (?, ?, ?, ?, ?, ?)',
              [email, 'google', profile.id, pteroId, '0.0.0.0', 1]
            );

            user = await getOne(
              'SELECT id, email, role, coins, balance FROM users WHERE id = ?',
              [info.lastID]
            );
          }

          return done(null, user);
        } catch (error) {
          console.error('[AUTH] Google OAuth error:', error);
          return done(error, null);
        }
      }
    )
  );
}

// Discord OAuth Strategy
if (env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET) {
  passport.use(
    new DiscordStrategy(
      {
        clientID: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
        callbackURL: `${env.OAUTH_CALLBACK_URL}/api/auth/discord/callback`,
        scope: ['identify', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.email?.toLowerCase();
          if (!email) {
            return done(new Error('No email provided by Discord'), null);
          }

          // Check if user exists
          let user = await getOne(
            'SELECT id, email, role, coins, balance, oauth_provider, oauth_id FROM users WHERE email = ?',
            [email]
          );

          if (user) {
            // Update OAuth info if not set
            if (!user.oauth_provider || !user.oauth_id) {
              await runSync(
                'UPDATE users SET oauth_provider = ?, oauth_id = ? WHERE id = ?',
                ['discord', profile.id, user.id]
              );
            }
          } else {
            // Create new user
            const username = (profile.username || email.split('@')[0]).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 20) || `user${Date.now()}`;
            const pteroPassword = randomBytes(24).toString('base64url');
            
            let pteroId;
            try {
              // Check if pterodactyl user already exists
              pteroId = await pterodactyl.getUserByEmail(email);
              
              // If not, create new pterodactyl user
              if (!pteroId) {
                pteroId = await pterodactyl.createUser({
                  email,
                  username,
                  firstName: profile.username || username,
                  lastName: 'User',
                  password: pteroPassword,
                });
              }
            } catch (pteroErr) {
              console.error('[AUTH] Pterodactyl user creation failed:', pteroErr.message);
              return done(new Error('Account provisioning failed'), null);
            }

            const info = await runSync(
              'INSERT INTO users (email, oauth_provider, oauth_id, pterodactyl_user_id, ip_address, email_verified) VALUES (?, ?, ?, ?, ?, ?)',
              [email, 'discord', profile.id, pteroId, '0.0.0.0', 1]
            );

            user = await getOne(
              'SELECT id, email, role, coins, balance FROM users WHERE id = ?',
              [info.lastID]
            );
          }

          return done(null, user);
        } catch (error) {
          console.error('[AUTH] Discord OAuth error:', error);
          return done(error, null);
        }
      }
    )
  );
}

export default passport;
