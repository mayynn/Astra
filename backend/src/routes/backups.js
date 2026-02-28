import { Router } from 'express';
import { randomUUID } from 'crypto';
import { requireAuth } from '../middlewares/auth.js';
import { getOne, query, runSync } from '../config/db.js';
import { pteroManage } from '../services/pteroManage.js';

const router = Router();

/**
 * Resolve Pterodactyl server details (uuid + node) for backup operations.
 * Uses pteroManage (Application API + Wings) — no Client API key required.
 */
async function resolveServerForBackup(req, res) {
  const serverId = Number(req.params.serverId);
  if (!serverId || isNaN(serverId)) {
    res.status(400).json({ error: 'Invalid server ID' });
    return null;
  }

  const server = await getOne(
    'SELECT id, user_id, pterodactyl_server_id, plan_type, plan_id FROM servers WHERE id = ? AND user_id = ? AND status != ?',
    [serverId, req.user.id, 'deleted']
  );
  if (!server) {
    res.status(404).json({ error: 'Server not found' });
    return null;
  }

  try {
    const details = await pteroManage.getServerDetails(server.pterodactyl_server_id);
    return { server, ptero: details };
  } catch {
    res.status(502).json({ error: 'Failed to reach server panel' });
    return null;
  }
}

// Get all backups for a server
router.get('/:serverId/backups', requireAuth, async (req, res, next) => {
  try {
    const ctx = await resolveServerForBackup(req, res);
    if (!ctx) return;
    const { server } = ctx;

    // Get backup limit from plan
    const plan = await getOne(
      `SELECT backup_count FROM ${server.plan_type === 'coin' ? 'plans_coin' : 'plans_real'} WHERE id = ?`,
      [server.plan_id]
    );
    const backupLimit = plan?.backup_count || 0;

    // Get backups tracked in our database (source of truth for metadata)
    const dbBackups = await query(
      'SELECT id, pterodactyl_backup_uuid as uuid, name, created_at FROM server_backups WHERE server_id = ? ORDER BY created_at DESC',
      [server.id]
    );

    const backups = dbBackups.map(b => ({
      uuid: b.uuid,
      name: b.name,
      created_at: b.created_at,
      is_successful: true,
      tracked: true
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
    const ctx = await resolveServerForBackup(req, res);
    if (!ctx) return;
    const { server, ptero } = ctx;
    const { name } = req.body;

    // Get backup limit from plan
    const plan = await getOne(
      `SELECT backup_count FROM ${server.plan_type === 'coin' ? 'plans_coin' : 'plans_real'} WHERE id = ?`,
      [server.plan_id]
    );
    const backupLimit = plan?.backup_count || 0;

    if (backupLimit === 0) {
      return res.status(403).json({ error: 'Your plan does not include backups' });
    }

    // Check current backup count from our DB
    const currentBackups = await query(
      'SELECT id FROM server_backups WHERE server_id = ?',
      [server.id]
    );
    if (currentBackups.length >= backupLimit) {
      return res.status(403).json({
        error: `Backup limit reached (${backupLimit}). Please delete old backups first.`
      });
    }

    // Generate a UUID for the backup and create it via Wings
    const backupUuid = randomUUID();
    const backupName = name || `backup-${new Date().toISOString().split('T')[0]}`;

    await pteroManage.createBackup(ptero.uuid, ptero.node, backupUuid);

    // Track in our database
    await runSync(
      'INSERT OR IGNORE INTO server_backups (server_id, pterodactyl_backup_uuid, name) VALUES (?, ?, ?)',
      [server.id, backupUuid, backupName]
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
    const ctx = await resolveServerForBackup(req, res);
    if (!ctx) return;
    const { server, ptero } = ctx;
    const { backupUuid } = req.params;

    // Delete from Wings
    await pteroManage.deleteBackup(ptero.uuid, ptero.node, backupUuid);

    // Remove from our database
    await runSync(
      'DELETE FROM server_backups WHERE server_id = ? AND pterodactyl_backup_uuid = ?',
      [server.id, backupUuid]
    );

    res.json({ message: 'Backup deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Restore a backup
router.post('/:serverId/backups/:backupUuid/restore', requireAuth, async (req, res, next) => {
  try {
    const ctx = await resolveServerForBackup(req, res);
    if (!ctx) return;
    const { ptero } = ctx;
    const { backupUuid } = req.params;

    await pteroManage.restoreBackup(ptero.uuid, ptero.node, backupUuid);
    res.json({ message: 'Backup restore initiated successfully' });
  } catch (error) {
    next(error);
  }
});

// Get backup download URL
router.get('/:serverId/backups/:backupUuid/download', requireAuth, async (req, res, next) => {
  try {
    const ctx = await resolveServerForBackup(req, res);
    if (!ctx) return;
    const { ptero } = ctx;
    const { backupUuid } = req.params;

    const downloadUrl = await pteroManage.getBackupDownloadUrl(ptero.uuid, ptero.node, backupUuid);
    res.json({ url: downloadUrl });
  } catch (error) {
    next(error);
  }
});

export default router;
