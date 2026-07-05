const express = require('express');
const router = express.Router();
const { VideoRepo } = require('../db');
const { fetchVideoDetails } = require('../services/tracker');
const { authenticateToken } = require('./auth');

// GET SUMMARY METRICS
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const videos = await VideoRepo.findByUser(req.user.id);
    
    let totalLinks = videos.length;
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;

    videos.forEach(v => {
      // Use updated metrics if available, else initial
      const currentViews = v.updatedMetrics && v.updatedMetrics.views > 0 ? v.updatedMetrics.views : v.initialMetrics.views;
      const currentLikes = v.updatedMetrics && v.updatedMetrics.likes > 0 ? v.updatedMetrics.likes : v.initialMetrics.likes;
      const currentComments = v.updatedMetrics && v.updatedMetrics.comments > 0 ? v.updatedMetrics.comments : v.initialMetrics.comments;
      const currentShares = v.updatedMetrics && v.updatedMetrics.shares > 0 ? v.updatedMetrics.shares : v.initialMetrics.shares;

      totalViews += (currentViews || 0);
      totalLikes += (currentLikes || 0);
      totalComments += (currentComments || 0);
      totalShares += (currentShares || 0);
    });

    res.json({
      totalLinks,
      totalViews,
      totalLikes,
      totalComments,
      totalShares
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Internal server error fetching summary metrics' });
  }
});

// GET LIST OF VIDEOS
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const videos = await VideoRepo.findByUser(req.user.id);
    res.json(videos);
  } catch (error) {
    console.error('Error listing videos:', error);
    res.status(500).json({ error: 'Internal server error listing videos' });
  }
});

// ADD NEW VIDEO LINK (Steps 3, 4, 5)
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const { url, platform, manualMetrics } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    // Call service to fetch details (includes a 2s delay simulation)
    const videoDetails = await fetchVideoDetails(url, platform);

    const initialMetrics = {
      views: videoDetails.views,
      likes: videoDetails.likes,
      comments: videoDetails.comments,
      shares: videoDetails.shares
    };

    // If manual metrics were provided by the user, override the fetched/mock metrics
    if (manualMetrics) {
      if (manualMetrics.views !== undefined && manualMetrics.views !== '') initialMetrics.views = parseInt(manualMetrics.views, 10) || 0;
      if (manualMetrics.likes !== undefined && manualMetrics.likes !== '') initialMetrics.likes = parseInt(manualMetrics.likes, 10) || 0;
      if (manualMetrics.comments !== undefined && manualMetrics.comments !== '') initialMetrics.comments = parseInt(manualMetrics.comments, 10) || 0;
      if (manualMetrics.shares !== undefined && manualMetrics.shares !== '') initialMetrics.shares = parseInt(manualMetrics.shares, 10) || 0;
    }

    // Updated metrics are initially same as initial metrics
    const updatedMetrics = { ...initialMetrics };

    const newVideo = await VideoRepo.create({
      user: req.user.id,
      url,
      title: videoDetails.title,
      thumbnailUrl: videoDetails.thumbnailUrl,
      platform: videoDetails.platform,
      initialMetrics,
      updatedMetrics,
      history: [{
        views: initialMetrics.views,
        likes: initialMetrics.likes,
        comments: initialMetrics.comments,
        shares: initialMetrics.shares,
        timestamp: new Date()
      }],
      status: 'active',
      lastUpdated: new Date()
    });

    res.status(201).json(newVideo);
  } catch (error) {
    console.error('Error adding video:', error);
    res.status(500).json({ error: 'Failed to add video link' });
  }
});

// REFRESH VIDEO METRICS (manual update trigger)
router.post('/refresh/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const video = await VideoRepo.findById(id);

    if (!video) {
      return res.status(404).json({ error: 'Tracked video not found' });
    }

    // Double check ownership
    if (String(video.user) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Unauthorized to access this video data' });
    }

    // Fetch new details
    const updatedDetails = await fetchVideoDetails(video.url, video.platform);

    if (updatedDetails.scraped === false) {
      return res.status(400).json({ error: `Could not automatically fetch real metrics from ${video.platform}. Please update them manually using the Edit button.` });
    }

    const currentMetrics = {
      views: updatedDetails.views,
      likes: updatedDetails.likes,
      comments: updatedDetails.comments,
      shares: updatedDetails.shares
    };

    let history = video.history || [];
    history.push({
      ...currentMetrics,
      timestamp: new Date()
    });

    if (history.length > 20) history.shift();

    const updatedVideo = await VideoRepo.update(id, {
      updatedMetrics: currentMetrics,
      history,
      lastUpdated: new Date()
    });

    res.json(updatedVideo);
  } catch (error) {
    console.error('Error refreshing video:', error);
    res.status(500).json({ error: 'Failed to refresh video statistics' });
  }
});

// UPDATE STATUS (PAUSE/RESUME)
router.post('/update-status/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'paused', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const video = await VideoRepo.findById(id);
    if (!video) {
      return res.status(404).json({ error: 'Tracked video not found' });
    }

    if (String(video.user) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updatedVideo = await VideoRepo.update(id, { status });
    res.json(updatedVideo);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update video tracking status' });
  }
});

// DELETE VIDEO
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const video = await VideoRepo.findById(id);

    if (!video) {
      return res.status(404).json({ error: 'Tracked video not found' });
    }

    if (String(video.user) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await VideoRepo.delete(id);
    res.json({ message: 'Video removed from tracker successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: 'Failed to delete video link' });
  }
});

// EXPORT TO CSV (EXCEL)
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const videos = await VideoRepo.findByUser(req.user.id);
    
    // Header Row matching user requirements
    const headers = [
      'Serial No.',
      'Video Link',
      'Platform',
      'Initial Likes',
      'Initial Shares',
      'Initial Comments',
      'Initial Views',
      'Updated Likes',
      'Updated Shares',
      'Updated Comments',
      'Updated Views',
      'Last Updated Time'
    ];

    let csvContent = headers.join(',') + '\r\n';

    videos.forEach((v, index) => {
      // Escape URL commas
      const escapedUrl = `"${v.url.replace(/"/g, '""')}"`;
      
      const row = [
        index + 1,
        escapedUrl,
        v.platform,
        v.initialMetrics.likes || 0,
        v.initialMetrics.shares || 0,
        v.initialMetrics.comments || 0,
        v.initialMetrics.views || 0,
        v.updatedMetrics.likes || 0,
        v.updatedMetrics.shares || 0,
        v.updatedMetrics.comments || 0,
        v.updatedMetrics.views || 0,
        v.lastUpdated ? new Date(v.lastUpdated).toLocaleString() : 'N/A'
      ];
      
      csvContent += row.join(',') + '\r\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=Social_Media_Video_Analytics.csv');
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export video tracking data' });
  }
});

// EDIT VIDEO METRICS MANUALLY (PUT /api/tracker/:id)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, initialMetrics, updatedMetrics } = req.body;

    const video = await VideoRepo.findById(id);
    if (!video) {
      return res.status(404).json({ error: 'Tracked video not found' });
    }

    // Double check ownership
    if (String(video.user) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Unauthorized to edit this video data' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    
    if (initialMetrics) {
      updateData.initialMetrics = {
        views: parseInt(initialMetrics.views, 10) || 0,
        likes: parseInt(initialMetrics.likes, 10) || 0,
        comments: parseInt(initialMetrics.comments, 10) || 0,
        shares: parseInt(initialMetrics.shares, 10) || 0
      };
    }

    if (updatedMetrics) {
      updateData.updatedMetrics = {
        views: parseInt(updatedMetrics.views, 10) || 0,
        likes: parseInt(updatedMetrics.likes, 10) || 0,
        comments: parseInt(updatedMetrics.comments, 10) || 0,
        shares: parseInt(updatedMetrics.shares, 10) || 0
      };

      // Add a history record for the updated stats if changed
      let history = video.history || [];
      history.push({
        views: parseInt(updatedMetrics.views, 10) || 0,
        likes: parseInt(updatedMetrics.likes, 10) || 0,
        comments: parseInt(updatedMetrics.comments, 10) || 0,
        shares: parseInt(updatedMetrics.shares, 10) || 0,
        timestamp: new Date()
      });
      if (history.length > 20) history.shift();
      updateData.history = history;
    }

    const updatedVideo = await VideoRepo.update(id, {
      ...updateData,
      lastUpdated: new Date()
    });

    res.json(updatedVideo);
  } catch (error) {
    console.error('Error editing video:', error);
    res.status(500).json({ error: 'Failed to update video metrics manually' });
  }
});

module.exports = router;
