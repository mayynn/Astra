import cron from 'node-cron';
import { query, runSync, getOne } from '../config/db.js';
import { pterodactyl } from '../services/pterodactyl.js';

/**
 * Create backups for all active servers
 */
async function createBackups() {
  console.log('[BACKUP CRON] Starting backup creation for all servers...');
  
  try {
    // Get all active servers
    const servers = await query(
      `SELECT s.id, s.pterodactyl_server_id, s.user_id, s.plan_type, s.plan_id,
              p.backup_count as backup_limit
       FROM servers s
       LEFT JOIN plans_coin p ON s.plan_type = 'coin' AND s.plan_id = p.id
       LEFT JOIN plans_real pr ON s.plan_type = 'real' AND s.plan_id = pr.id
       WHERE s.status = 'active'`,
      []
    );
    
    console.log(`[BACKUP CRON] Found ${servers.length} active servers`);
    
    for (const server of servers) {
      try {
        // Get plan backup limit
        const plan = await getOne(
          `SELECT backup_count FROM ${server.plan_type === 'coin' ? 'plans_coin' : 'plans_real'} WHERE id = ?`,
          [server.plan_id]
        );
        
        const backupLimit = plan?.backup_count || 0;
        
        if (backupLimit === 0) {
          console.log(`[BACKUP CRON] Server ${server.id} (Ptero: ${server.pterodactyl_server_id}) has no backups in plan, skipping`);
          continue;
        }
        
        // Get existing backups from our database
        const existingBackups = await query(
          'SELECT id, pterodactyl_backup_uuid, created_at FROM server_backups WHERE server_id = ? ORDER BY created_at DESC',
          [server.id]
        );
        
        console.log(`[BACKUP CRON] Server ${server.id} has ${existingBackups.length}/${backupLimit} backups`);
        
        // Delete backups older than 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        for (const backup of existingBackups) {
          const backupDate = new Date(backup.created_at);
          if (backupDate < oneDayAgo) {
            try {
              await pterodactyl.deleteBackup(server.pterodactyl_server_id, backup.pterodactyl_backup_uuid);
              await runSync('DELETE FROM server_backups WHERE id = ?', [backup.id]);
              console.log(`[BACKUP CRON] Deleted old backup ${backup.pterodactyl_backup_uuid} for server ${server.id}`);
            } catch (err) {
              console.error(`[BACKUP CRON] Failed to delete backup ${backup.pterodactyl_backup_uuid}:`, err.message);
            }
          }
        }
        
        // Refresh backup count after deletion
        const currentBackups = await query(
          'SELECT COUNT(*) as count FROM server_backups WHERE server_id = ?',
          [server.id]
        );
        
        const currentCount = currentBackups[0]?.count || 0;
        
        // Only create new backup if we're under the limit
        if (currentCount < backupLimit) {
          try {
            const backupName = `auto-backup-${new Date().toISOString().split('T')[0]}`;
            const backupUuid = await pterodactyl.createBackup(server.pterodactyl_server_id, backupName);
            
            await runSync(
              'INSERT INTO server_backups (server_id, pterodactyl_backup_uuid) VALUES (?, ?)',
              [server.id, backupUuid]
            );
            
            console.log(`[BACKUP CRON] Created backup ${backupUuid} for server ${server.id}`);
          } catch (err) {
            console.error(`[BACKUP CRON] Failed to create backup for server ${server.id}:`, err.message);
          }
        } else {
          console.log(`[BACKUP CRON] Server ${server.id} already has ${currentCount} backups (limit: ${backupLimit}), skipping creation`);
        }
      } catch (err) {
        console.error(`[BACKUP CRON] Error processing server ${server.id}:`, err.message);
      }
    }
    
    console.log('[BACKUP CRON] Backup creation completed');
  } catch (error) {
    console.error('[BACKUP CRON] Fatal error:', error);
  }
}

/**
 * Initialize backup cron job
 */
export function initBackupCron() {
  // Run every day at 3 AM
  cron.schedule('0 3 * * *', () => {
    console.log('[BACKUP CRON] Running scheduled backup job...');
    createBackups();
  });
  
  console.log('[BACKUP CRON] Backup cron job initialized (runs daily at 3 AM)');
}
