const express = require('express');
const router = express.Router();
const { GoogleSheetRepo, VideoRepo } = require('../db');
const { extractSpreadsheetId, getSheetsClient, getSpreadsheetUrls, updateSpreadsheetAnalytics, performSheetSync } = require('../services/sheets');
const { fetchVideoDetails } = require('../services/tracker');
const { authenticateToken } = require('./auth');

// CONNECT GOOGLE SHEET
router.post('/connect', authenticateToken, async (req, res) => {
  const logs = [];
  const addLog = (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    logs.push(`[${timestamp}] ${msg}`);
    console.log(`[GoogleSheet Connect] ${msg}`);
  };

  try {
    const { spreadsheetUrl, sheetName, serviceAccountJson } = req.body;

    if (!spreadsheetUrl) {
      return res.status(400).json({ error: 'Google Sheet URL is required' });
    }

    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'Invalid Google Sheet URL format' });
    }

    const targetSheetName = sheetName || 'Sheet1';
    addLog(`Initiating Google Sheet connection...`);
    addLog(`Spreadsheet ID extracted: ${spreadsheetId}`);

    // Verify sheets API access
    addLog('Verifying Google API credentials & sheet permissions...');
    let sheets;
    let isDemoMode = false;
    try {
      sheets = getSheetsClient(serviceAccountJson);
    } catch (authError) {
      addLog(`Google Service Account credentials not provided: ${authError.message}`);
      addLog(`[demo] Falling back to Demo/Simulation Mode (No credentials required).`);
      isDemoMode = true;
    }

    let foundUrls = [];
    if (!isDemoMode) {
      addLog(`Connecting to spreadsheet tab: "${targetSheetName}"...`);
      try {
        const sheetData = await getSpreadsheetUrls(sheets, spreadsheetId, targetSheetName);
        foundUrls = sheetData.urls;
      } catch (apiError) {
        addLog(`API Access Error: Make sure your sheet is shared with the Service Account email.`);
        return res.status(400).json({ 
          error: `Could not access spreadsheet. Verify spreadsheet sharing permissions: ${apiError.message}`, 
          logs 
        });
      }
    } else {
      addLog(`[demo] Simulating connection to Google Sheet tab "${targetSheetName}"...`);
      foundUrls = [
        { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', rowIndex: 2 },
        { url: 'https://www.instagram.com/p/CXYZ12345/', rowIndex: 3 },
        { url: 'https://www.linkedin.com/in/posts/sample-video-link', rowIndex: 4 }
      ];
      addLog(`[demo] Successfully connected! Found ${foundUrls.length} video URL(s) inside sheet.`);
    }

    // Create database sheet entry
    const sheetRecord = await GoogleSheetRepo.create({
      user: req.user.id,
      spreadsheetId,
      spreadsheetUrl,
      sheetName: targetSheetName,
      serviceAccountJson: isDemoMode ? 'DEMO_MODE' : (serviceAccountJson || ''),
      lastSynced: new Date(),
      status: 'connected',
      syncFrequency: req.body.syncFrequency || '1h'
    });

    addLog('Storing spreadsheet connection details in database.');

    // Process URLs one-by-one
    let importedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < foundUrls.length; i++) {
      const { url, rowIndex } = foundUrls[i];
      addLog(`[${i + 1}/${foundUrls.length}] Processing URL: ${url} (Row ${rowIndex})`);

      // Check if video link is already tracked by this user
      const existingVideos = await VideoRepo.findByUser(req.user.id);
      const isAlreadyTracked = existingVideos.some(v => v.url.trim().toLowerCase() === url.toLowerCase());

      if (isAlreadyTracked) {
        addLog(`-> Link is already tracked in dashboard. Linking to Google Sheet and skipping duplicate fetch.`);
        // Update reference if needed
        const existingVideo = existingVideos.find(v => v.url.trim().toLowerCase() === url.toLowerCase());
        await VideoRepo.update(existingVideo._id || existingVideo.id, {
          googleSheetId: sheetRecord._id || sheetRecord.id,
          googleSheetRow: rowIndex
        });
        skippedCount++;
        continue;
      }

      // Fetch new analytics details
      try {
        addLog(`-> Fetching details from original platform (views/likes)...`);
        const details = await fetchVideoDetails(url);
        
        const initialMetrics = {
          views: details.views || 0,
          likes: details.likes || 0,
          comments: details.comments || 0,
          shares: details.shares || 0
        };

        await VideoRepo.create({
          user: req.user.id,
          url,
          title: details.title,
          thumbnailUrl: details.thumbnailUrl,
          platform: details.platform,
          initialMetrics,
          updatedMetrics: { ...initialMetrics },
          googleSheetId: sheetRecord._id || sheetRecord.id,
          googleSheetRow: rowIndex,
          history: [{
            ...initialMetrics,
            timestamp: new Date()
          }],
          status: 'active'
        });

        addLog(`-> Success: Captured "${details.title}" (${details.platform})`);
        importedCount++;
      } catch (fetchError) {
        addLog(`-> Warning: Failed to import details: ${fetchError.message}. Adding with empty stats.`);
        await VideoRepo.create({
          user: req.user.id,
          url,
          title: 'Imported Video',
          platform: 'Other',
          initialMetrics: { views: 0, likes: 0, comments: 0, shares: 0 },
          updatedMetrics: { views: 0, likes: 0, comments: 0, shares: 0 },
          googleSheetId: sheetRecord._id || sheetRecord.id,
          googleSheetRow: rowIndex,
          status: 'active'
        });
        importedCount++;
      }
    }

    addLog(`Database update finished. Imported: ${importedCount}, Linked existing: ${skippedCount}.`);

    // Fetch all videos associated with this sheet
    const linkedVideos = (await VideoRepo.findByUser(req.user.id))
      .filter(v => String(v.googleSheetId) === String(sheetRecord._id || sheetRecord.id));

    // Update cells back in spreadsheet
    if (sheetRecord.serviceAccountJson !== 'DEMO_MODE') {
      addLog('Writing captured analytics back to the Google Sheet cells...');
      try {
        const updateRes = await updateSpreadsheetAnalytics(sheets, spreadsheetId, targetSheetName, linkedVideos);
        addLog(`Sheet successfully updated. Cell columns created and populated.`);
      } catch (writeError) {
        addLog(`Warning: Failed to write back analytics to sheet: ${writeError.message}`);
      }
    } else {
      addLog('[demo] Writing captured analytics back to Google Sheet cells (Simulated)...');
      addLog('[demo] Sheet cells successfully updated with metrics columns (Simulated).');
    }

    // Finalize sheet sync status
    const finalSheet = await GoogleSheetRepo.update(sheetRecord._id || sheetRecord.id, {
      lastSynced: new Date(),
      status: 'connected'
    });

    addLog('Google Sheet sync cycle completed successfully!');
    res.status(201).json({
      message: 'Sheet connected and synced successfully',
      sheet: finalSheet,
      logs,
      summary: {
        totalFound: foundUrls.length,
        imported: importedCount,
        skipped: skippedCount
      }
    });

  } catch (error) {
    addLog(`Fatal Error: ${error.message}`);
    res.status(500).json({ error: 'Failed to connect Google Sheet', logs });
  }
});

// GET LIST OF CONNECTED SHEETS
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const sheets = await GoogleSheetRepo.findByUser(req.user.id);
    res.json(sheets);
  } catch (error) {
    console.error('List sheets error:', error);
    res.status(500).json({ error: 'Failed to fetch connected Google Sheets' });
  }
});

// SYNC GOOGLE SHEET ON DEMAND
router.post('/sync/:id', authenticateToken, async (req, res) => {
  const logs = [];
  const addLog = (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    logs.push(`[${timestamp}] ${msg}`);
    console.log(`[GoogleSheet Sync] ${msg}`);
  };

  try {
    const { id } = req.params;
    const sheet = await GoogleSheetRepo.findById(id);

    if (!sheet) {
      return res.status(404).json({ error: 'Connected Google Sheet record not found' });
    }

    if (String(sheet.user) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Unauthorized to sync this sheet' });
    }

    const finalSheet = await performSheetSync(id, addLog);

    res.json({
      message: 'Sheet synced successfully',
      sheet: finalSheet,
      logs
    });

  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to sync Google Sheet', logs });
  }
});

// DISCONNECT GOOGLE SHEET
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const sheet = await GoogleSheetRepo.findById(id);

    if (!sheet) {
      return res.status(404).json({ error: 'Connected Google Sheet record not found' });
    }

    if (String(sheet.user) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Unauthorized to disconnect this sheet' });
    }

    // Delete sheet connection
    await GoogleSheetRepo.delete(id);

    // Unlink videos from this sheet (we keep them in dashboard but remove sheet association)
    const userVideos = await VideoRepo.findByUser(req.user.id);
    for (const video of userVideos) {
      if (String(video.googleSheetId) === String(id)) {
        await VideoRepo.update(video._id || video.id, {
          googleSheetId: '',
          googleSheetRow: 0
        });
      }
    }

    res.json({ message: 'Google Sheet disconnected successfully. Video data preserved.' });
  } catch (error) {
    console.error('Delete sheet error:', error);
    res.status(500).json({ error: 'Failed to disconnect Google Sheet' });
  }
});

// UPDATE GOOGLE SHEET SETTINGS
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { syncFrequency, sheetName } = req.body;
    const sheet = await GoogleSheetRepo.findById(id);

    if (!sheet) {
      return res.status(404).json({ error: 'Connected Google Sheet record not found' });
    }

    if (String(sheet.user) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Unauthorized to update this sheet' });
    }

    const updateData = {};
    if (syncFrequency !== undefined) {
      if (!['10m', '1h', '5h', '24h', 'manual'].includes(syncFrequency)) {
        return res.status(400).json({ error: 'Invalid sync frequency' });
      }
      updateData.syncFrequency = syncFrequency;
    }
    if (sheetName !== undefined) {
      updateData.sheetName = sheetName;
    }

    const updatedSheet = await GoogleSheetRepo.update(id, updateData);
    res.json(updatedSheet);
  } catch (error) {
    console.error('Update sheet error:', error);
    res.status(500).json({ error: 'Failed to update Google Sheet settings' });
  }
});

module.exports = router;
