import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { getOne, query, runSync } from '../config/db.js';
import { pterodactyl } from '../services/pterodactyl.js';

const router = Router();

/**
 * Resolve the Pterodactyl server identifier (8-char string) for a server.
 * Uses the cached value from DB if available; falls back to an API call.
 */
async function resolveIdentifier(server) {
  if (server.identifier) return server.identifier
  // Identifier wasn't cached at creation time — fetch it now and cache it
  try {
    const details = await pterodactyl.getServerDetails(server.pterodactyl_server_id)
    if (details?.identifier) {
      await runSync('UPDATE servers SET identifier = ? WHERE id = ?', [details.identifier, server.id])
      return details.identifier
    }
  } catch (err) {
    console.error('[BACKUPS] Could not resolve identifier:', err.message)
  }
  return null
}

// Get all backups for a server
router.get('/:serverId/backups', requireAuth, async (req, res, next) => {
  try {
    const { serverId } = req.params;
    
    // Verify server ownership
    const server = await getOne(
      'SELECT id, user_id, pterodactyl_server_id, identifier, plan_type, plan_id FROM servers WHERE id = ? AND user_id = ?',
      [serverId, req.user.id]
    );
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const identifier = await resolveIdentifier(server);
    if (!identifier) {
      return res.status(502).json({ error: 'Could not resolve server identifier. Try again shortly.' });
    }
    
    // Get backup limit from plan
    const plan = await getOne(
      `SELECT backup_count FROM ${server.plan_type === 'coin' ? 'plans_coin' : 'plans_real'} WHERE id = ?`,
      [server.plan_id]
    );
    
    const backupLimit = plan?.backup_count || 0;
    
    // Get backups from Pterodactyl (uses Client API)
    const pteroBackups = await pterodactyl.getBackups(identifier);
    
    // Get our tracked backups
    const ourBackups = await query(
      'SELECT pterodactyl_backup_uuid, created_at FROM server_backups WHERE server_id = ?',
      [serverId]
    );
    
    const ourBackupUuids = new Set(ourBackups.map(b => b.pterodactyl_backup_uuid));
    
    // Merge data
    const backups = pteroBackups.map(backup => ({
      ...backup,
      tracked: ourBackupUuids.has(backup.uuid)
    }));
    
    res.json({ 
      backups, 
      limit: backupLimit,
      used: backups.length 
    });
  } catch (error) {
    next(error);
  }
});

// Create a new backup
router.post('/:serverId/backups', requireAuth, async (req, res, next) => {
  try {
    const { serverId } = req.params;
    const { name } = req.body;
    
    // Verify server ownership
    const server = await getOne(
      'SELECT id, user_id, pterodactyl_server_id, identifier, plan_type, plan_id FROM servers WHERE id = ? AND user_id = ?',
      [serverId, req.user.id]
    );
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const identifier = await resolveIdentifier(server);
    if (!identifier) {
      return res.status(502).json({ error: 'Could not resolve server identifier. Try again shortly.' });
    }
    
    // Get backup limit from plan
    const plan = await getOne(
      `SELECT backup_count FROM ${server.plan_type === 'coin' ? 'plans_coin' : 'plans_real'} WHERE id = ?`,
      [server.plan_id]
    );
    
    const backupLimit = plan?.backup_count || 0;
    
    if (backupLimit === 0) {
      return res.status(403).json({ error: 'Your plan does not include backups' });
    }
    
    // Use live count from Pterodactyl (single source of truth)
    const pteroBackups = await pterodactyl.getBackups(identifier);
    if (pteroBackups.length >= backupLimit) {
      return res.status(403).json({ 
        error: `Backup limit reached (${backupLimit}). Please delete old backups first.` 
      });
    }
    
    // Create backup in Pterodactyl
    const backupName = name || `backup-${new Date().toISOString().split('T')[0]}`;
    const backupUuid = await pterodactyl.createBackup(identifier, backupName);
    
    // Track in our database
    await runSync(
      'INSERT OR IGNORE INTO server_backups (server_id, pterodactyl_backup_uuid, name) VALUES (?, ?, ?)',
      [serverId, backupUuid, backupName]
    );
    
    res.status(201).json({ 
      message: 'Backup created successfully',
      uuid: backupUuid 
    });
  } catch (error) {
    next(error);
  }
});

// Delete a backup
router.delete('/:serverId/backups/:backupUuid', requireAuth, async (req, res, next) => {
  try {
    const { serverId, backupUuid } = req.params;
    
    const server = await getOne(
      'SELECT id, user_id, pterodactyl_server_id, identifier FROM servers WHERE id = ? AND user_id = ?',
      [serverId, req.user.id]
    );
    if (!server) return res.status(404).json({ error: 'Server not found' });

    const identifier = await resolveIdentifier(server);
    if (!identifier) return res.status(502).json({ error: 'Could not resolve server identifier.' });
    
    await pterodactyl.deleteBackup(identifier, backupUuid);
    await runSync(
      'DELETE FROM server_backups WHERE server_id = ? AND pterodactyl_backup_uuid = ?',
      [serverId, backupUuid]
    );
    
    res.json({ message: 'Backup deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Restore a backup
router.post('/:serverId/backups/:backupUuid/restore', requireAuth, async (req, res, next) => {
  try {
    const { serverId, backupUuid } = req.params;
    
    const server = await getOne(
      'SELECT id, user_id, pterodactyl_server_id, identifier FROM servers WHERE id = ? AND user_id = ?',
      [serverId, req.user.id]
    );
    if (!server) return res.status(404).json({ error: 'Server not found' });

    const identifier = await resolveIdentifier(server);
    if (!identifier) return res.status(502).json({ error: 'Could not resolve server identifier.' });
    
    await pterodactyl.restoreBackup(identifier, backupUuid);
    res.json({ message: 'Backup restore initiated successfully' });
  } catch (error) {
    next(error);
  }
});

// Get backup download URL
router.get('/:serverId/backups/:backupUuid/download', requireAuth, async (req, res, next) => {
  try {
    const { serverId, backupUuid } = req.params;
    
    const server = await getOne(
      'SELECT id, user_id, pterodactyl_server_id, identifier FROM servers WHERE id = ? AND user_id = ?',
      [serverId, req.user.id]
    );
    if (!server) return res.status(404).json({ error: 'Server not found' });

    const identifier = await resolveIdentifier(server);
    if (!identifier) return res.status(502).json({ error: 'Could not resolve server identifier.' });
    
    const downloadUrl = await pterodactyl.getBackupDownloadUrl(identifier, backupUuid);
    res.json({ url: downloadUrl });
  } catch (error) {
    next(error);
  }
});

export default router;
