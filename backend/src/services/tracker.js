const { VideoRepo } = require('../db');
const https = require('https');
const http = require('http');

// Helper to detect platform from URL
function detectPlatform(url) {
  const lowercaseUrl = url.toLowerCase();
  if (lowercaseUrl.includes('youtube.com') || lowercaseUrl.includes('youtu.be')) {
    return 'YouTube';
  } else if (lowercaseUrl.includes('instagram.com')) {
    return 'Instagram';
  } else if (lowercaseUrl.includes('linkedin.com')) {
    return 'LinkedIn';
  } else if (lowercaseUrl.includes('tiktok.com')) {
    return 'TikTok';
  } else if (lowercaseUrl.includes('facebook.com')) {
    return 'Facebook';
  }
  return 'Other';
}

// Extract YouTube Video ID from URL (including watch, embed, shorts, youtu.be)
function extractYouTubeId(url) {
  const regExp = /^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]{11}).*/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

// Fetch public HTML of a page using standard browser user agent headers
function fetchHtml(urlStr, platform) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const client = url.protocol === 'https:' ? https : http;
      
      let userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      if (platform === 'Instagram' || urlStr.toLowerCase().includes('instagram.com') ||
          platform === 'LinkedIn' || urlStr.toLowerCase().includes('linkedin.com')) {
        userAgent = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
      }
      
      const options = {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cookie': 'CONSENT=YES+cb.20220301-11-p0.en+FX+999; SOCS=CAESEwgDEgk0ODE3NzkzOTQaAmVuIAEaBgiA_eWbBg',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 15000 // 15 second timeout
      };

      const req = client.get(urlStr, options, (res) => {
        // Handle redirect
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let redirectUrl = res.headers.location;
          if (!redirectUrl.startsWith('http')) {
            redirectUrl = url.protocol + '//' + url.host + redirectUrl;
          }
          return fetchHtml(redirectUrl, platform).then(resolve).catch(reject);
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP status code ${res.statusCode}`));
        }

        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve(data));
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    } catch (e) {
      reject(e);
    }
  });
}

// Convert string numbers like "12.3k" or "2,450" to integers
function parseNumberString(str) {
  if (!str) return null;
  let val = str.toLowerCase().replace(/,/g, '').trim();
  if (val.includes('k')) {
    return Math.round(parseFloat(val.replace('k', '')) * 1000);
  }
  if (val.includes('m')) {
    return Math.round(parseFloat(val.replace('m', '')) * 1000000);
  }
  return parseInt(val, 10);
}

// YouTube Scraper using regex on raw public watch HTML
function parseYouTubeHtml(html) {
  let views = null;
  let likes = null;
  let comments = null;

  // 1. Try to find viewCount in JSON payload or structured description
  const viewMatch = html.match(/"viewCount":"(\d+)"/) || 
                    html.match(/"viewCount":\s*(\d+)/) ||
                    html.match(/"views":\s*\{\s*"simpleText":\s*"([^"]+)"/) ||
                    html.match(/"viewCountFactoidRenderer":\s*\{\s*"factoid":\s*\{\s*"value":\s*\{\s*"simpleText":\s*"([^"]+)"/);
                    
  if (viewMatch) {
    if (/^\d+$/.test(viewMatch[1])) {
      views = parseInt(viewMatch[1], 10);
    } else {
      const valStr = viewMatch[1] || viewMatch[2];
      views = parseNumberString(valStr.replace(/views/i, '').trim());
    }
  }

  // 2. Try to find likeCount
  const likeMatch = html.match(/"likeCount":"(\d+)"/) || 
                    html.match(/"likeCount":\s*(\d+)/) ||
                    html.match(/"factoidRenderer":\s*\{\s*"value":\s*\{\s*"simpleText":\s*"([^"]+)"\},\s*"label":\s*\{\s*"simpleText":\s*"Likes"/i) ||
                    html.match(/"accessibilityData":\s*\{\s*"label":\s*"([\d,]+)\s+likes"/i);
                    
  if (likeMatch) {
    if (/^\d+$/.test(likeMatch[1])) {
      likes = parseInt(likeMatch[1], 10);
    } else {
      const valStr = likeMatch[1] || likeMatch[2];
      if (valStr !== 'N/A') {
        likes = parseNumberString(valStr);
      }
    }
  }

  // 3. Try to find commentCount in engagementPanelTitleHeaderRenderer
  const commentMatch = html.match(/"engagementPanelTitleHeaderRenderer"[\s\S]*?"contextualInfo"\s*:\s*\{\s*"runs"\s*:\s*\[\s*\{\s*"text"\s*:\s*"([^"]+)"/i);
  if (commentMatch) {
    comments = parseNumberString(commentMatch[1].replace(/comments/i, '').trim());
  }

  return { views, likes, comments };
}

// Instagram Scraper using public OpenGraph description tags
function parseInstagramHtml(html) {
  let likes = null;
  let comments = null;
  let views = null;

  // Instagram embeds likes and comments counts inside metadata tag description
  const metaDescMatch = html.match(/<meta[^>]*?name="description"[^>]*?content="([^"]*)"/i) ||
                        html.match(/<meta[^>]*?property="og:description"[^>]*?content="([^"]*)"/i);
  
  if (metaDescMatch) {
    const content = metaDescMatch[1];
    
    // Parse Likes (e.g., "12.3k Likes", "1,245 likes")
    const likesMatch = content.match(/([\d\.,]+[kKmM]?)\s+Likes/i);
    if (likesMatch) {
      likes = parseNumberString(likesMatch[1]);
    }

    // Parse Comments (e.g., "450 Comments", "23 comments")
    const commentsMatch = content.match(/([\d\.,]+[kKmM]?)\s+Comments/i);
    if (commentsMatch) {
      comments = parseNumberString(commentsMatch[1]);
    }

    // Parse Views (if present)
    const viewsMatch = content.match(/([\d\.,]+[kKmM]?)\s+Views/i);
    if (viewsMatch) {
      views = parseNumberString(viewsMatch[1]);
    }
  }

  return { views, likes, comments };
}

// LinkedIn Scraper using JSON-LD script tags
function parseLinkedInHtml(html) {
  const stats = { views: null, likes: null, comments: null };
  try {
    const scriptRegex = /<script[^>]*?type="application\/ld\+json"[^>]*?>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
      try {
        const data = JSON.parse(match[1].trim());
        if (data.commentCount !== undefined) {
          stats.comments = parseInt(data.commentCount, 10) || stats.comments;
        }
        if (Array.isArray(data.interactionStatistic)) {
          for (const item of data.interactionStatistic) {
            if (item.interactionType === 'http://schema.org/LikeAction' && item.userInteractionCount !== undefined) {
              stats.likes = parseInt(item.userInteractionCount, 10) || stats.likes;
            }
          }
        }
      } catch (e) {
        // Skip invalid script tags
      }
    }
  } catch (err) {
    console.error('LinkedIn parse error:', err);
  }
  return stats;
}

// Fallback details generator when scraper gets blocked
function generateMockData(platform) {
  let views = 0, likes = 0, comments = 0, shares = 0;

  switch (platform) {
    case 'YouTube':
      views = Math.floor(Math.random() * 450000) + 50000;
      likes = Math.floor(views * (Math.random() * 0.05 + 0.03));
      comments = Math.floor(likes * (Math.random() * 0.08 + 0.02));
      shares = Math.floor(views * (Math.random() * 0.008 + 0.002));
      break;
    case 'Instagram':
      views = Math.floor(Math.random() * 250000) + 10000;
      likes = Math.floor(views * (Math.random() * 0.08 + 0.04));
      comments = Math.floor(likes * (Math.random() * 0.04 + 0.01));
      shares = Math.floor(views * (Math.random() * 0.015 + 0.005));
      break;
    case 'LinkedIn':
      views = Math.floor(Math.random() * 40000) + 2000;
      likes = Math.floor(views * (Math.random() * 0.04 + 0.02));
      comments = Math.floor(likes * (Math.random() * 0.15 + 0.05));
      shares = Math.floor(views * (Math.random() * 0.03 + 0.01));
      break;
    case 'TikTok':
      views = Math.floor(Math.random() * 900000) + 100000;
      likes = Math.floor(views * (Math.random() * 0.12 + 0.08));
      comments = Math.floor(likes * (Math.random() * 0.05 + 0.01));
      shares = Math.floor(views * (Math.random() * 0.04 + 0.01));
      break;
    default:
      views = Math.floor(Math.random() * 10000) + 500;
      likes = Math.floor(views * 0.05);
      comments = Math.floor(likes * 0.05);
      shares = Math.floor(views * 0.01);
  }

  return { views, likes, comments, shares };
}

// Fetch YouTube details using Google YouTube Data API v3
function fetchYouTubeFromApi(videoId, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${apiKey}`;
    const req = https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`YouTube API returned HTTP ${res.statusCode}`));
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed.items || parsed.items.length === 0) {
            return reject(new Error('Video not found or private in YouTube Data API'));
          }
          const item = parsed.items[0];
          const title = item.snippet.title;
          const thumbnailUrl = item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.high?.url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
          const views = parseInt(item.statistics.viewCount || 0, 10);
          const likes = parseInt(item.statistics.likeCount || 0, 10);
          const comments = parseInt(item.statistics.commentCount || 0, 10);
          const shares = Math.floor(views * 0.005); // Estimate shares

          resolve({
            platform: 'YouTube',
            title,
            thumbnailUrl,
            views,
            likes,
            comments,
            shares
          });
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('YouTube API Request timeout'));
    });
    req.setTimeout(10000);
  });
}

// Fetch Video Details - checks real HTML scraping first, falls back to mock stats if blocked
async function fetchVideoDetails(url, userSelectedPlatform) {
  const platform = userSelectedPlatform || detectPlatform(url);
  
  // 1. Force a 1.5s network delay to show the "Fetching data" loader UI
  await new Promise(resolve => setTimeout(resolve, 1500));

  // 2. Try official YouTube Data API if URL is YouTube and API Key is configured
  if (platform === 'YouTube' && process.env.YOUTUBE_API_KEY) {
    const ytId = extractYouTubeId(url);
    if (ytId) {
      try {
        console.log(`🌐 Fetching YouTube video details via API for ID: ${ytId}`);
        const apiStats = await fetchYouTubeFromApi(ytId, process.env.YOUTUBE_API_KEY);
        console.log(`✅ YouTube API Success: Views=${apiStats.views}, Likes=${apiStats.likes}, Comments=${apiStats.comments}`);
        return apiStats;
      } catch (apiError) {
        console.warn(`⚠️ YouTube API call failed (${apiError.message}). Falling back to scraping.`);
      }
    }
  }

  try {
    console.log(`🌐 Scraping public HTML for: ${url} (${platform})`);
    let html = await fetchHtml(url, platform);
    
    // Unescape hex/unicode sequences (crucial for YouTube/Shorts script tags)
    if (platform === 'YouTube') {
      html = html
        .replace(/\\x([0-9A-Fa-f]{2})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/\\u([0-9A-Fa-f]{4})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
    }
    
    let parsedStats = { views: null, likes: null, comments: null };

    if (platform === 'YouTube') {
      parsedStats = parseYouTubeHtml(html);
    } else if (platform === 'Instagram') {
      parsedStats = parseInstagramHtml(html);
    } else if (platform === 'LinkedIn') {
      parsedStats = parseLinkedInHtml(html);
    }

    // Extract Title from HTML
    let title = 'Social Media Video';
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
      title = title.replace(/\s*-\s*YouTube$/i, '');
      title = title.replace(/\s*on\s*Instagram\s*:.*$/i, '');
    }

    // Extract Thumbnail from HTML
    let thumbnailUrl = '';
    if (platform === 'YouTube') {
      const ytId = extractYouTubeId(url);
      if (ytId) {
        thumbnailUrl = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
      }
    } else if (platform === 'Instagram') {
      const ogImageMatch = html.match(/<meta[^>]*?property="og:image"[^>]*?content="([^"]*)"/i) ||
                           html.match(/<meta[^>]*?name="twitter:image"[^>]*?content="([^"]*)"/i);
      if (ogImageMatch) {
        thumbnailUrl = ogImageMatch[1].replace(/&amp;/g, '&');
      }
    }

    if (!thumbnailUrl) {
      // Platform visual placeholders (Clean Unsplash pictures)
      if (platform === 'YouTube') thumbnailUrl = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300&q=80';
      else if (platform === 'Instagram') thumbnailUrl = 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=300&q=80';
      else if (platform === 'LinkedIn') thumbnailUrl = 'https://images.unsplash.com/photo-1611944212129-29977ae1398c?w=300&q=80';
      else if (platform === 'TikTok') thumbnailUrl = 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=300&q=80';
      else thumbnailUrl = 'https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=300&q=80';
    }

    // Apply scraped numbers or fill missing elements intelligently
    let scraped = true;
    if (parsedStats.views === null && parsedStats.likes === null && parsedStats.comments === null) {
      scraped = false;
    }

    let views = parsedStats.views || 0;
    let likes = parsedStats.likes || 0;
    let comments = parsedStats.comments || 0;
    let shares = 0;

    if (platform === 'Instagram') {
      views = likes * 15;
      shares = comments * 2;
    } else if (platform === 'LinkedIn') {
      views = likes * 20;
      shares = Math.floor(likes * 0.1);
    }

    console.log(`✅ Scrape finished: Views=${views}, Likes=${likes}, Comments=${comments}, Scraped=${scraped}`);

    return {
      platform,
      title,
      thumbnailUrl,
      views,
      likes,
      comments,
      shares,
      scraped
    };
  } catch (error) {
    console.warn(`⚠️ Public scrape failed for ${platform} (${error.message}). Returning empty stats.`);
    
    // Set fallback title & default unsplash photo
    const title = `${platform} Video`;
    let thumbnailUrl = '';
    if (platform === 'YouTube') {
      const ytId = extractYouTubeId(url);
      if (ytId) thumbnailUrl = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
      else thumbnailUrl = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300&q=80';
    }
    else if (platform === 'Instagram') thumbnailUrl = 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=300&q=80';
    else if (platform === 'LinkedIn') thumbnailUrl = 'https://images.unsplash.com/photo-1611944212129-29977ae1398c?w=300&q=80';
    else if (platform === 'TikTok') thumbnailUrl = 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=300&q=80';
    else thumbnailUrl = 'https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=300&q=80';

    return { 
      platform, 
      title,
      thumbnailUrl,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      scraped: false
    };
  }
}


// Background simulation engine
let simulationInterval = null;

function startSimulation(intervalSeconds = 30) {
  if (simulationInterval) {
    clearInterval(simulationInterval);
  }

  if (intervalSeconds <= 0) {
    console.log('⏰ Simulation engine is disabled (SIMULATION_INTERVAL_SEC <= 0).');
    return;
  }

  console.log(`⏰ Starting simulation engine... Updates running every ${intervalSeconds} seconds.`);

  simulationInterval = setInterval(async () => {
    try {
      const activeVideos = await VideoRepo.findAllActive();
      if (activeVideos.length === 0) return;

      console.log(`🤖 Simulating updates for ${activeVideos.length} active videos...`);

      for (const video of activeVideos) {
        const platform = video.platform;
        
        // Ensure updatedMetrics initialized
        const currentMetrics = video.updatedMetrics && video.updatedMetrics.views > 0
          ? video.updatedMetrics
          : video.initialMetrics;

        // Generate small realistic increments
        let incViews = 0, incLikes = 0, incComments = 0, incShares = 0;
        
        switch (platform) {
          case 'YouTube':
            incViews = Math.floor(Math.random() * 150) + 10;
            incLikes = Math.floor(incViews * (Math.random() * 0.06));
            incComments = Math.floor(incLikes * (Math.random() * 0.1));
            incShares = Math.floor(incViews * (Math.random() * 0.005));
            break;
          case 'Instagram':
            incViews = Math.floor(Math.random() * 80) + 5;
            incLikes = Math.floor(incViews * (Math.random() * 0.1));
            incComments = Math.floor(incLikes * (Math.random() * 0.05));
            incShares = Math.floor(incViews * (Math.random() * 0.01));
            break;
          case 'LinkedIn':
            incViews = Math.floor(Math.random() * 15) + 1;
            incLikes = Math.floor(incViews * (Math.random() * 0.05));
            incComments = Math.floor(incLikes * (Math.random() * 0.12));
            incShares = Math.floor(incViews * (Math.random() * 0.02));
            break;
          case 'TikTok':
            incViews = Math.floor(Math.random() * 400) + 50;
            incLikes = Math.floor(incViews * (Math.random() * 0.15));
            incComments = Math.floor(incLikes * (Math.random() * 0.06));
            incShares = Math.floor(incViews * (Math.random() * 0.05));
            break;
          default:
            incViews = Math.floor(Math.random() * 5) + 1;
            incLikes = Math.floor(incViews * 0.05);
            incComments = Math.floor(incLikes * 0.05);
            incShares = Math.floor(incViews * 0.01);
        }

        const updatedMetrics = {
          views: (currentMetrics.views || 0) + incViews,
          likes: (currentMetrics.likes || 0) + incLikes,
          comments: (currentMetrics.comments || 0) + incComments,
          shares: (currentMetrics.shares || 0) + incShares
        };

        // Add history log entry (max 20 entries to save space)
        let history = video.history || [];
        
        if (history.length === 0) {
          history.push({
            views: video.initialMetrics.views,
            likes: video.initialMetrics.likes,
            comments: video.initialMetrics.comments,
            shares: video.initialMetrics.shares,
            timestamp: video.createdAt || new Date()
          });
        }

        history.push({
          views: updatedMetrics.views,
          likes: updatedMetrics.likes,
          comments: updatedMetrics.comments,
          shares: updatedMetrics.shares,
          timestamp: new Date()
        });

        if (history.length > 20) {
          history.shift();
        }

        await VideoRepo.update(video._id || video.id, {
          updatedMetrics,
          history,
          lastUpdated: new Date()
        });
      }
    } catch (error) {
      console.error('Error in background simulation loop:', error);
    }
  }, intervalSeconds * 1000);
}

module.exports = {
  detectPlatform,
  fetchVideoDetails,
  startSimulation
};
