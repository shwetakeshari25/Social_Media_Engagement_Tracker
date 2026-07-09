const { GoogleSheetRepo } = require('../db');
const { performSheetSync } = require('./sheets');

let schedulerInterval = null;

function parseFrequencyToMs(frequency) {
  switch (frequency) {
    case '10m':
      return 10 * 60 * 1000;
    case '1h':
      return 60 * 60 * 1000;
    case '5h':
      return 5 * 60 * 60 * 1000;
    case '24h':
      return 24 * 60 * 60 * 1000;
    default:
      return 0; // Manual or invalid
  }
}

function startSheetsScheduler(checkIntervalMin = 1) {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  console.log(`⏰ Starting background Google Sheets scheduler... checking every ${checkIntervalMin} minute(s).`);

  schedulerInterval = setInterval(async () => {
    try {
      // Find all connected sheets that are not errored
      const allActiveSheets = await GoogleSheetRepo.findAllActive();
      const now = new Date();

      for (const sheet of allActiveSheets) {
        const freq = sheet.syncFrequency || '1h';
        if (freq === 'manual') continue;

        const intervalMs = parseFrequencyToMs(freq);
        if (intervalMs <= 0) continue;

        // If sheet is currently syncing, skip it
        if (sheet.status === 'syncing') continue;

        const lastSynced = sheet.lastSynced ? new Date(sheet.lastSynced) : new Date(sheet.createdAt || now);
        const nextSyncTime = new Date(lastSynced.getTime() + intervalMs);

        if (now >= nextSyncTime) {
          console.log(`[Scheduler] Sheet ${sheet.spreadsheetId} is due for sync (last sync: ${lastSynced.toLocaleString()}). Starting sync...`);
          
          // Trigger sync in background (non-blocking)
          performSheetSync(sheet._id || sheet.id, (msg) => {
            console.log(`[Scheduler-Sync][${sheet.spreadsheetId}] ${msg}`);
          }).catch(err => {
            console.error(`[Scheduler-Sync-Error][${sheet.spreadsheetId}] Sync failed:`, err);
          });
        }
      }
    } catch (error) {
      console.error('Error in Google Sheets scheduler loop:', error);
    }
  }, checkIntervalMin * 60 * 1000);
}

module.exports = {
  startSheetsScheduler
};
