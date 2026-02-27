import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { getOne, query, runSync } from '../config/db.js';
import { pterodactyl } from '../services/pterodactyl.js';

const router = Router();

// Get all backups for a server
router.get('/:serverId/backups', requireAuth, async (req, res, next) => {
  try {
    const { serverId } = req.params;
    
    // Verify server ownership
    const server = await getOne(
      'SELECT id, user_id, pterodactyl_server_id, plan_type, plan_id FROM servers WHERE id = ? AND user_id = ?',
      [serverId, req.user.id]
    );
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Get backup limit from plan
    const plan = await getOne(
      `SELECT backup_count FROM ${server.plan_type === 'coin' ? 'plans_coin' : 'plans_real'} WHERE id = ?`,
      [server.plan_id]
    );
    
    const backupLimit = plan?.backup_count || 0;
    
    // Get backups from Pterodactyl
    const pteroBackups = await pterodactyl.getBackups(server.pterodactyl_server_id);
    
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
      'SELECT id, user_id, pterodactyl_server_id, plan_type, plan_id FROM servers WHERE id = ? AND user_id = ?',
      [serverId, req.user.id]
    );
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
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
    
    // Check current backup count
    const currentBackups = await query(
      'SELECT COUNT(*) as count FROM server_backups WHERE server_id = ?',
      [serverId]
    );
    
    const currentCount = currentBackups[0]?.count || 0;
    
    if (currentCount >= backupLimit) {
      return res.status(403).json({ 
        error: `Backup limit reached (${backupLimit}). Please delete old backups first.` 
      });
    }
    
    // Create backup in Pterodactyl
    const backupName = name || `manual-backup-${new Date().toISOString().split('T')[0]}`;
    const backupUuid = await pterodactyl.createBackup(server.pterodactyl_server_id, backupName);
    
    // Track in our database
    await runSync(
      'INSERT INTO server_backups (server_id, pterodactyl_backup_uuid) VALUES (?, ?)',
      [serverId, backupUuid]
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
    
    // Verify server ownership
    const server = await getOne(
      'SELECT id, user_id, pterodactyl_server_id FROM servers WHERE id = ? AND user_id = ?',
      [serverId, req.user.id]
    );
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Delete from Pterodactyl
    await pterodactyl.deleteBackup(server.pterodactyl_server_id, backupUuid);
    
    // Delete from our database
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
    
    // Verify server ownership
    const server = await getOne(
      'SELECT id, user_id, pterodactyl_server_id FROM servers WHERE id = ? AND user_id = ?',
      [serverId, req.user.id]
    );
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Restore backup in Pterodactyl
    await pterodactyl.restoreBackup(server.pterodactyl_server_id, backupUuid);
    
    res.json({ message: 'Backup restore initiated successfully' });
  } catch (error) {
    next(error);
  }
});

// Get backup download URL
router.get('/:serverId/backups/:backupUuid/download', requireAuth, async (req, res, next) => {
  try {
    const { serverId, backupUuid } = req.params;
    
    // Verify server ownership
    const server = await getOne(
      'SELECT id, user_id, pterodactyl_server_id FROM servers WHERE id = ? AND user_id = ?',
      [serverId, req.user.id]
    );
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Get download URL from Pterodactyl
    const downloadUrl = await pterodactyl.getBackupDownloadUrl(server.pterodactyl_server_id, backupUuid);
    
    res.json({ url: downloadUrl });
  } catch (error) {
    next(error);
  }
});

export default router;
