import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// --- API CONFIGURATION ---
const API_BASE_URL = 'http://localhost:5001/api';

// --- SVG INLINE ICONS ---
const Icons = {
  Dashboard: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
  ),
  AddLink: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
  ),
  Sheet: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
  ),
  Analytics: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  ),
  Export: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
  ),
  Lock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  ),
  Refresh: ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
  ),
  Pause: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg>
  ),
  Play: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
  ),
  CheckCircle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  ),
  Edit: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></svg>
  )
};

// --- CUSTOM LINE CHART COMPONENT USING HTML5 CANVAS ---
function CanvasLineChart({ historyData, metric }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI screens
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    // Clear Canvas
    ctx.clearRect(0, 0, width, height);

    if (!historyData || historyData.length < 2) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = '14px var(--font-family-mono)';
      ctx.textAlign = 'center';
      ctx.fillText('Add links and let simulation run to plot history trends.', width / 2, height / 2);
      return;
    }

    // Chart margins
    const paddingLeft = 60;
    const paddingRight = 30;
    const paddingTop = 30;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Extract values & timestamps
    const values = historyData.map(d => d[metric] || 0);
    const timestamps = historyData.map(d => new Date(d.timestamp));

    const minVal = Math.min(...values) * 0.98; // Buffer below
    const maxVal = Math.max(...values) * 1.02; // Buffer above
    const valRange = maxVal - minVal || 1;

    // Draw Grid Lines & Y-Axis Labels
    const gridLines = 5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px var(--font-family-mono)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= gridLines; i++) {
      const y = paddingTop + (chartHeight / gridLines) * i;
      const val = maxVal - (valRange / gridLines) * i;
      
      // Draw grid line
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      // Format grid values (e.g. 15.2K)
      let formattedVal = Math.round(val);
      if (val >= 1000000) {
        formattedVal = (val / 1000000).toFixed(1) + 'M';
      } else if (val >= 1000) {
        formattedVal = (val / 1000).toFixed(1) + 'K';
      }

      ctx.fillText(formattedVal, paddingLeft - 10, y);
    }

    // Draw X-Axis Labels (Timestamps)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xLabelCount = Math.min(5, historyData.length);
    for (let i = 0; i < xLabelCount; i++) {
      const idx = Math.floor((historyData.length - 1) * (i / (xLabelCount - 1)));
      const x = paddingLeft + (chartWidth / (historyData.length - 1)) * idx;
      
      // Draw small tick
      ctx.beginPath();
      ctx.moveTo(x, height - paddingBottom);
      ctx.lineTo(x, height - paddingBottom + 5);
      ctx.stroke();

      // Print time
      const timeStr = timestamps[idx].toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      ctx.fillText(timeStr, x, height - paddingBottom + 8);
    }

    // Plot Points and Draw Line
    const points = [];
    for (let i = 0; i < historyData.length; i++) {
      const x = paddingLeft + (chartWidth / (historyData.length - 1)) * i;
      const y = height - paddingBottom - (chartHeight * ((values[i] - minVal) / valRange));
      points.push({ x, y });
    }

    // Draw Area Under Curve Gradient
    const areaGrd = ctx.createLinearGradient(0, paddingTop, 0, height - paddingBottom);
    areaGrd.addColorStop(0, 'rgba(6, 182, 212, 0.25)'); // Cyan
    areaGrd.addColorStop(1, 'rgba(7, 11, 19, 0)');
    
    ctx.fillStyle = areaGrd;
    ctx.beginPath();
    ctx.moveTo(points[0].x, height - paddingBottom);
    for (let i = 0; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.lineTo(points[points.length - 1].x, height - paddingBottom);
    ctx.closePath();
    ctx.fill();

    // Draw Smooth Line
    ctx.strokeStyle = 'var(--color-primary)'; // Glowing Cyan
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();

    // Draw Point Circles
    ctx.fillStyle = 'var(--color-primary)';
    ctx.strokeStyle = 'var(--color-bg-primary)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < points.length; i++) {
      ctx.beginPath();
      ctx.arc(points[i].x, points[i].y, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }

  }, [historyData, metric]);

  return (
    <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
  );
}

// --- STOCK MARKET / DATA SCIENCE GRID BACKGROUND ANIMATION ---
function StockMarketBgCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Ticker node data pool
    const pool = [
      '▲ +4.2K', '▼ -0.3%', 'YOUTUBE // SYNC', 'INSTA // LIKES', 'views/sec: 84',
      '▲ +12.8%', '▼ -3.4%', 'shares/min: 19', 'LINKEDIN // OK', '▲ +1.5M',
      'SYSTEM // ONLINE', '▲ +9.2K', '▼ -0.8%', 'comments/sec: 14', 'TIKTOK // LIVE',
      '▲ +18.4K', '▼ -2.1%', '▲ +880', '▲ +45.2K', 'PORT // 5001 // SYNC',
      '▲ +0.5%', '▼ -1.2K', 'METRICS // STABLE', '▲ +150K', '▼ -0.4K'
    ];

    // Create particles
    const particles = [];
    const maxParticles = 35;

    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height + height, // spawn below or staggered
        text: pool[Math.floor(Math.random() * pool.length)],
        speed: 0.4 + Math.random() * 0.6,
        opacity: 0.08 + Math.random() * 0.3,
        color: Math.random() > 0.6 ? '#10B981' : Math.random() > 0.3 ? '#A7F3D0' : '#E2E8F0', // Mint green, Sage green, or Silver grey
        fontSize: 10 + Math.floor(Math.random() * 4)
      });
    }

    // Handle resizing
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Trading Grid System
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.lineWidth = 1;
      const gridSize = 80;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Draw & Move Particles
      particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.font = `${p.fontSize}px var(--font-family-mono)`;
        ctx.fillText(p.text, p.x, p.y);

        // Move upwards
        p.y -= p.speed;

        // If off screen, respawn at the bottom
        if (p.y < -30) {
          p.y = height + 30;
          p.x = Math.random() * width;
          p.text = pool[Math.floor(Math.random() * pool.length)];
          p.color = Math.random() > 0.6 ? '#10B981' : Math.random() > 0.3 ? '#A7F3D0' : '#E2E8F0';
          p.speed = 0.4 + Math.random() * 0.6;
          p.opacity = 0.08 + Math.random() * 0.3;
        }
      });

      ctx.globalAlpha = 1.0; // Reset
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -5,
        pointerEvents: 'none'
      }}
    />
  );
}

// --- SCI-FI SCANNING LOADER SPLASH SCREEN COMPONENT ---
function SciFiSplash({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState([
    'STATUS: SUITE HANDSHAKE STARTED',
    '[OK] INITIALIZING DECRYPTED CRYPTO BUFFER...'
  ]);

  useEffect(() => {
    const logTimeline = [
      { t: 300, msg: '[OK] ESTABLISHING VERIFIED API NODE...' },
      { t: 600, msg: '[OK] CONNECTING DEEP HTML SCRAPER SHELL...' },
      { t: 900, msg: '[OK] ACCESSING LOCAL SQLITE DATABASE.JSON BUFFER...' },
      { t: 1200, msg: '[OK] RETRIEVING LIVE CHANNEL METRICS TIMESERIES...' },
      { t: 1600, msg: '[OK] CALCULATING ENGAGEMENT SUMMARY ACCUMULATIONS...' },
      { t: 2000, msg: '[OK] RESOLVING SOCKET DATASTREAM ON PORT 5001...' },
      { t: 2300, msg: '[COMPLETE] SECURITY CHECKS RESOLVED. LAUNCHING CORE WORKSPACE...' }
    ];

    // Progress progress tick
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 4; // Tick up
      });
    }, 100);

    // Logs timeline triggers
    const timers = logTimeline.map(item => {
      return setTimeout(() => {
        setTerminalLogs(prev => [...prev, item.msg]);
      }, item.t);
    });

    // Final trigger to complete splash screen after 2.6 seconds
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2600);

    return () => {
      clearInterval(progressInterval);
      timers.forEach(clearTimeout);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="splash-container">
      <div className="splash-scanner-outer">
        <div className="splash-scanner-ring"></div>
        <div className="splash-scanner-ring-inner"></div>
        <div className="splash-scanner-core">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
      </div>

      <div className="splash-loading-status">
        <h3>TRACKER // SCANNING SYSTEM</h3>
        
        <div className="splash-progress-track">
          <div className="splash-progress-bar" style={{ width: `${progress}%` }}></div>
        </div>

        <div className="splash-terminal-window">
          {terminalLogs.slice(-4).map((log, i) => (
            <div key={i} className="splash-terminal-line">
              <span>&gt;&gt;</span> {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- MAIN APPLICATION COMPONENT ---
export default function App() {
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || '');
  const [showSplash, setShowSplash] = useState(!!localStorage.getItem('token'));
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // App UI state
  const [activeSection, setActiveSection] = useState('dashboard');
  const [toastList, setToastList] = useState([]);
  
  // Dashboard Metrics state
  const [summary, setSummary] = useState({
    totalLinks: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0
  });

  // Tracked Videos List state
  const [videos, setVideos] = useState([]);
  const [flashingRows, setFlashingRows] = useState({});

  // Add Link state
  const [pasteUrl, setPasteUrl] = useState('');
  const [selectPlatform, setSelectPlatform] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isFetchSuccess, setIsFetchSuccess] = useState(false);
  const [lastCapturedVideo, setLastCapturedVideo] = useState(null);

  // Manual metrics inputs state for adding videos
  const [manualViews, setManualViews] = useState('');
  const [manualLikes, setManualLikes] = useState('');
  const [manualComments, setManualComments] = useState('');
  const [manualShares, setManualShares] = useState('');
  const [showManualFields, setShowManualFields] = useState(false);

  // Analytics graph state
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('views'); // 'views', 'likes', 'comments', 'shares'

  // Editing state
  const [editingVideo, setEditingVideo] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editInitialViews, setEditInitialViews] = useState('');
  const [editInitialLikes, setEditInitialLikes] = useState('');
  const [editInitialComments, setEditInitialComments] = useState('');
  const [editInitialShares, setEditInitialShares] = useState('');
  const [editUpdatedViews, setEditUpdatedViews] = useState('');
  const [editUpdatedLikes, setEditUpdatedLikes] = useState('');
  const [editUpdatedComments, setEditUpdatedComments] = useState('');
  const [editUpdatedShares, setEditUpdatedShares] = useState('');

  // Scrollspy references
  const dashboardRef = useRef(null);
  const addVideoRef = useRef(null);
  const trackingSheetRef = useRef(null);
  const googleSheetsRef = useRef(null);
  const analyticsRef = useRef(null);
  const exportRef = useRef(null);

  // Google Sheets state
  const [sheets, setSheets] = useState([]);
  const [sheetUrlInput, setSheetUrlInput] = useState(localStorage.getItem('lastSheetUrl') || '');
  const [sheetNameInput, setSheetNameInput] = useState('Sheet1');
  const [serviceAccountInput, setServiceAccountInput] = useState(localStorage.getItem('lastServiceAccount') || '');
  const [syncFrequencyInput, setSyncFrequencyInput] = useState('1h');
  const [isConnectingSheet, setIsConnectingSheet] = useState(false);
  const [sheetLogs, setSheetLogs] = useState([]);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(false);

  // Helper: Trigger custom toast notifications
  const triggerToast = (title, message, type = 'info') => {
    const id = Date.now() + Math.random().toString();
    setToastList(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToastList(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Check login on startup
  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, []);

  // Fetch data on login status change
  useEffect(() => {
    if (token) {
      fetchSummary();
      fetchSummary();
      fetchVideoList(true); // first load
      fetchSheets();

      // Set polling loop to detect updates from background simulator
      const interval = setInterval(() => {
        fetchVideoList(false); // poll silently
        fetchSummary();
      }, 7000); // Check every 7 seconds

      return () => clearInterval(interval);
    }
  }, [token]);

  // Setup intersection observer for scrollspy active tab highlighters
  useEffect(() => {
    if (!token) return;

    const sections = [
      { id: 'dashboard', ref: dashboardRef },
      { id: 'add-video', ref: addVideoRef },
      { id: 'tracking-sheet', ref: trackingSheetRef },
      { id: 'google-sheets', ref: googleSheetsRef },
      { id: 'analytics', ref: analyticsRef },
      { id: 'export', ref: exportRef }
    ];

    const observerOptions = {
      root: null,
      rootMargin: '-30% 0px -50% 0px', // Trigger when section is in middle viewport
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;
          setActiveSection(sectionId);

          // Add anim active visible
          entry.target.classList.add('active-visible');
        }
      });
    }, observerOptions);

    sections.forEach(s => {
      if (s.ref.current) {
        observer.observe(s.ref.current);
      }
    });

    return () => {
      sections.forEach(s => {
        if (s.ref.current) {
          observer.unobserve(s.ref.current);
        }
      });
    };
  }, [token, videos]);

  // --- API SERVICE METHODS ---

  const verifyToken = async (authToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserEmail(data.user.email);
        localStorage.setItem('userEmail', data.user.email);
      } else {
        handleLogout();
      }
    } catch (e) {
      console.error('Verify token failed:', e);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (!emailInput || !passwordInput) {
      setAuthError('Please fill in all inputs');
      return;
    }

    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput })
      });

      const data = await response.json();
      if (!response.ok) {
        setAuthError(data.error || 'Authentication failed');
        return;
      }

      // Successful Auth
      setToken(data.token);
      setUserEmail(data.email);
      localStorage.setItem('token', data.token);
      localStorage.setItem('userEmail', data.email);
      setShowSplash(true);
      triggerToast('Welcome!', authMode === 'login' ? 'Logged in successfully.' : 'Registered successfully!', 'success');
      
      // Clear inputs
      setEmailInput('');
      setPasswordInput('');
    } catch (err) {
      setAuthError('Cannot reach server backend. Make sure it is running on port 5000.');
    }
  };

  const handleLogout = () => {
    setToken('');
    setUserEmail('');
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    setVideos([]);
    setSummary({ totalLinks: 0, totalViews: 0, totalLikes: 0, totalComments: 0, totalShares: 0 });
    triggerToast('Logged Out', 'You have been safely signed out.', 'info');
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/tracker/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (e) {
      console.error('Fetch summary error:', e);
    }
  };

  const fetchVideoList = async (isFirstLoad = false) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tracker/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        
        // Compare with old lists to detect changes and flash spreadsheet rows
        if (!isFirstLoad && videos.length > 0) {
          data.forEach(updatedVideo => {
            const oldVideo = videos.find(v => (v._id || v.id) === (updatedVideo._id || updatedVideo.id));
            if (oldVideo) {
              const oldViews = oldVideo.updatedMetrics?.views || 0;
              const newViews = updatedVideo.updatedMetrics?.views || 0;
              
              // If likes or views changed, trigger update detection UI alert
              if (newViews > oldViews) {
                const vidId = updatedVideo._id || updatedVideo.id;
                
                // Highlight flashing row
                setFlashingRows(prev => ({ ...prev, [vidId]: true }));
                setTimeout(() => {
                  setFlashingRows(prev => ({ ...prev, [vidId]: false }));
                }, 2500);

                // Notify User
                triggerToast(
                  'Update Detected!', 
                  `New data found on ${updatedVideo.platform} video (${newViews - oldViews} new views).`, 
                  'success'
                );
              }
            }
          });
        }

        setVideos(data);
        
        // Set default selected video for analytics if none selected
        if (data.length > 0 && !selectedVideoId) {
          setSelectedVideoId(data[0]._id || data[0].id);
        }
      }
    } catch (e) {
      console.error('Fetch video list error:', e);
    }
  };

  const handleAddVideo = async (e) => {
    e.preventDefault();
    if (!pasteUrl) {
      triggerToast('Error', 'Please enter a video URL', 'danger');
      return;
    }

    setIsFetching(true);
    setIsFetchSuccess(false);
    setLastCapturedVideo(null);

    const payload = { url: pasteUrl, platform: selectPlatform || undefined };
    if (manualViews !== '' || manualLikes !== '' || manualComments !== '' || manualShares !== '') {
      payload.manualMetrics = {
        views: manualViews,
        likes: manualLikes,
        comments: manualComments,
        shares: manualShares
      };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/tracker/add`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        triggerToast('Error', data.error || 'Failed to add video link', 'danger');
        setIsFetching(false);
        return;
      }

      // Success
      setIsFetching(false);
      setIsFetchSuccess(true);
      setLastCapturedVideo(data);
      setPasteUrl('');
      setSelectPlatform('');
      setManualViews('');
      setManualLikes('');
      setManualComments('');
      setManualShares('');

      // Refresh list & summary
      fetchVideoList(true);
      fetchSummary();

      triggerToast('Link Tracked!', 'Initial metrics captured and added to Excel sheet.', 'success');

    } catch (error) {
      setIsFetching(false);
      triggerToast('Error', 'Server connection failed', 'danger');
    }
  };

  const fetchSheets = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sheets/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSheets(data);
      }
    } catch (e) {
      console.error('Fetch sheets error:', e);
    }
  };

  const handleConnectSheet = async (e) => {
    e.preventDefault();
    if (!sheetUrlInput) {
      triggerToast('Error', 'Please enter a Google Sheet URL', 'danger');
      return;
    }

    setIsConnectingSheet(true);
    setSheetLogs(['[System] Initializing Google Sheets connection...']);

    try {
      const response = await fetch(`${API_BASE_URL}/sheets/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          spreadsheetUrl: sheetUrlInput,
          sheetName: sheetNameInput,
          serviceAccountJson: serviceAccountInput || undefined,
          syncFrequency: syncFrequencyInput
        })
      });

      const data = await response.json();
      
      if (data.logs) {
        setSheetLogs(data.logs);
      } else {
        setSheetLogs(prev => [...prev, `[System] Response status: ${response.status}`]);
      }

      if (!response.ok) {
        triggerToast('Connection Failed', data.error || 'Failed to connect sheet', 'danger');
        setSheetLogs(prev => [...prev, `[System Error] ${data.error || 'Failed to connect sheet'}`]);
        setIsConnectingSheet(false);
        return;
      }

      triggerToast('Connected!', 'Google Sheet URLs successfully imported and tracked!', 'success');
      localStorage.setItem('lastSheetUrl', sheetUrlInput);
      localStorage.setItem('lastServiceAccount', serviceAccountInput);
      setSyncFrequencyInput('1h');
      fetchSheets();
      fetchVideoList(true);
      fetchSummary();
      setIsConnectingSheet(false);
      setShowConnectForm(false);

    } catch (error) {
      setIsConnectingSheet(false);
      triggerToast('Error', 'Failed to reach backend server', 'danger');
      setSheetLogs(prev => [...prev, '[System Error] Connection timeout or server unreachable.']);
    }
  };

  const handleSyncSheet = async (sheetId) => {
    setIsSyncingSheet(true);
    setSheetLogs(['[System] Initiating manual synchronization cycle...']);
    triggerToast('Syncing Sheet...', 'Fetching latest analytics and updating spreadsheet...', 'info');

    try {
      const response = await fetch(`${API_BASE_URL}/sheets/sync/${sheetId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      
      if (data.logs) {
        setSheetLogs(data.logs);
      }

      if (!response.ok) {
        triggerToast('Sync Failed', data.error || 'Failed to synchronize sheet', 'danger');
        setSheetLogs(prev => [...prev, `[System Error] Sync failed: ${data.error || 'Failed to sync sheet'}`]);
        setIsSyncingSheet(false);
        fetchSheets();
        return;
      }

      triggerToast('Synced!', 'Spreadsheet analytics updated successfully.', 'success');
      fetchSheets();
      fetchVideoList(true);
      fetchSummary();
      setIsSyncingSheet(false);

    } catch (e) {
      setIsSyncingSheet(false);
      triggerToast('Error', 'Connection failed during sync', 'danger');
      setSheetLogs(prev => [...prev, '[System Error] Sync connection failed.']);
    }
  };

  const handleUpdateFrequency = async (sheetId, frequency) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sheets/${sheetId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ syncFrequency: frequency })
      });

      const data = await response.json();
      if (!response.ok) {
        triggerToast('Error', data.error || 'Failed to update sync frequency', 'danger');
        return;
      }

      triggerToast('Updated!', `Sync frequency updated successfully.`, 'success');
      fetchSheets();
    } catch (error) {
      triggerToast('Error', 'Failed to update frequency setting', 'danger');
    }
  };

  const handleSyncAllSheets = async () => {
    if (sheets.length === 0) return;
    setIsSyncingSheet(true);
    setSheetLogs(['[System] Initiating batch synchronization cycle for all sheets...']);
    triggerToast('Syncing All Sheets...', 'Refreshing latest analytics for all connected sheets...', 'info');

    let successCount = 0;
    let failCount = 0;

    for (const sheet of sheets) {
      const sheetId = sheet._id || sheet.id;
      setSheetLogs(prev => [...prev, `[System] Syncing sheet ${sheet.spreadsheetId}...`]);
      try {
        const response = await fetch(`${API_BASE_URL}/sheets/sync/${sheetId}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        if (data.logs) {
          setSheetLogs(prev => [...prev, ...data.logs]);
        }

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
          setSheetLogs(prev => [...prev, `[System Error] Failed to sync ${sheet.spreadsheetId}: ${data.error}`]);
        }
      } catch (err) {
        failCount++;
        setSheetLogs(prev => [...prev, `[System Error] Network error syncing ${sheet.spreadsheetId}`]);
      }
    }

    setIsSyncingSheet(false);
    fetchSheets();
    fetchVideoList(true);
    fetchSummary();

    if (failCount === 0) {
      triggerToast('All Synced!', `Successfully synced ${successCount} sheet(s).`, 'success');
    } else {
      triggerToast('Sync Completed', `Synced: ${successCount}, Failed: ${failCount}. Check logs for details.`, 'warning');
    }
  };

  const handleDeleteSheet = async (sheetId) => {
    if (!window.confirm('Are you sure you want to disconnect this Google Sheet? Tracked videos will remain in the dashboard, but will no longer be synchronized with this spreadsheet.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/sheets/${sheetId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        triggerToast('Disconnected', 'Google Sheet connection removed successfully.', 'info');
        fetchSheets();
        fetchVideoList(true);
      } else {
        const data = await response.json();
        triggerToast('Error', data.error || 'Failed to disconnect sheet', 'danger');
      }
    } catch (e) {
      triggerToast('Error', 'Connection failed', 'danger');
    }
  };

  const handleManualRefresh = async (videoId) => {
    triggerToast('Refreshing...', 'Checking original platform for latest statistics...', 'info');
    try {
      const response = await fetch(`${API_BASE_URL}/tracker/refresh/${videoId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (!response.ok) {
        triggerToast('Error', data.error || 'Refresh failed', 'danger');
        return;
      }

      setVideos(prev => prev.map(v => (v._id || v.id) === videoId ? data : v));
      fetchSummary();
      triggerToast('Refreshed!', 'Latest engagement metrics loaded successfully.', 'success');

      // Flash Row
      setFlashingRows(prev => ({ ...prev, [videoId]: true }));
      setTimeout(() => {
        setFlashingRows(prev => ({ ...prev, [videoId]: false }));
      }, 2500);

    } catch (e) {
      triggerToast('Error', 'Server connection failed', 'danger');
    }
  };

  const handleToggleStatus = async (videoId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const response = await fetch(`${API_BASE_URL}/tracker/update-status/${videoId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status: nextStatus })
      });

      const data = await response.json();
      if (!response.ok) {
        triggerToast('Error', data.error || 'Status update failed', 'danger');
        return;
      }

      setVideos(prev => prev.map(v => (v._id || v.id) === videoId ? data : v));
      triggerToast(
        nextStatus === 'active' ? 'Tracking Resumed' : 'Tracking Paused',
        nextStatus === 'active' ? 'Monitoring simulator running.' : 'Updates suspended.',
        'info'
      );
    } catch (e) {
      triggerToast('Error', 'Server connection failed', 'danger');
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm('Are you sure you want to stop tracking and delete this video data?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/tracker/${videoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        triggerToast('Error', data.error || 'Deletion failed', 'danger');
        return;
      }

      setVideos(prev => prev.filter(v => (v._id || v.id) !== videoId));
      fetchSummary();
      triggerToast('Deleted', 'Video link removed from tracking sheet.', 'warning');
      
      if (selectedVideoId === videoId) {
        setSelectedVideoId('');
      }
    } catch (e) {
      triggerToast('Error', 'Server connection failed', 'danger');
    }
  };

  const handleOpenEditModal = (video) => {
    setEditingVideo(video);
    setEditTitle(video.title || '');
    setEditInitialViews(video.initialMetrics?.views ?? 0);
    setEditInitialLikes(video.initialMetrics?.likes ?? 0);
    setEditInitialComments(video.initialMetrics?.comments ?? 0);
    setEditInitialShares(video.initialMetrics?.shares ?? 0);
    setEditUpdatedViews(video.updatedMetrics?.views ?? 0);
    setEditUpdatedLikes(video.updatedMetrics?.likes ?? 0);
    setEditUpdatedComments(video.updatedMetrics?.comments ?? 0);
    setEditUpdatedShares(video.updatedMetrics?.shares ?? 0);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingVideo) return;

    const videoId = editingVideo._id || editingVideo.id;

    try {
      const response = await fetch(`${API_BASE_URL}/tracker/${videoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editTitle,
          initialMetrics: {
            views: Number(editInitialViews) || 0,
            likes: Number(editInitialLikes) || 0,
            comments: Number(editInitialComments) || 0,
            shares: Number(editInitialShares) || 0
          },
          updatedMetrics: {
            views: Number(editUpdatedViews) || 0,
            likes: Number(editUpdatedLikes) || 0,
            comments: Number(editUpdatedComments) || 0,
            shares: Number(editUpdatedShares) || 0
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        triggerToast('Error', data.error || 'Failed to save metrics', 'danger');
        return;
      }

      setVideos(prev => prev.map(v => (v._id || v.id) === videoId ? data : v));
      fetchSummary();
      setEditingVideo(null); // Close modal
      triggerToast('Metrics Updated!', 'Social video engagement details saved.', 'success');

      // Flash Row
      setFlashingRows(prev => ({ ...prev, [videoId]: true }));
      setTimeout(() => {
        setFlashingRows(prev => ({ ...prev, [videoId]: false }));
      }, 2500);
    } catch (err) {
      triggerToast('Error', 'Server connection failed', 'danger');
    }
  };

  const handleExportCsv = () => {
    // Direct link to backend export CSV downloader
    const exportUrl = `${API_BASE_URL}/tracker/export?token=${token}`;
    
    // We can download using native browser anchor request
    const link = document.createElement('a');
    link.href = exportUrl;
    // Set headers
    fetch(exportUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Social_Media_Video_Analytics.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      triggerToast('Excel Exported!', 'Spreadsheet downloaded as CSV file.', 'success');
    })
    .catch(() => {
      triggerToast('Error', 'Failed to download CSV sheet', 'danger');
    });
  };

  // Helper to scroll to viewport smoothly
  const scrollToSection = (sectionId, ref) => {
    setActiveSection(sectionId);
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Format numbers to K / M (e.g. 1.25M)
  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  // Fetch active chart video reference
  const activeChartVideo = videos.find(v => (v._id || v.id) === selectedVideoId);

  // --- RENDERING AUTHENTICATION FORM ---
  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo-area">
            <span className="auth-logo-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            </span>
            <h2>Video Tracker</h2>
            <p>Social Media Engagement Analytics</p>
          </div>

          <form onSubmit={handleAuthSubmit}>
            {authError && (
              <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '1rem', backgroundColor: '#FFF2F0', padding: '10px', borderRadius: '6px', border: '1px solid #F8D3CD' }}>
                {authError}
              </div>
            )}

            <div className="auth-form-group">
              <label htmlFor="email">Email Address</label>
              <input 
                id="email"
                type="email" 
                placeholder="name@example.com" 
                className="auth-input"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
              />
            </div>

            <div className="auth-form-group">
              <label htmlFor="password">Password</label>
              <input 
                id="password"
                type="password" 
                placeholder="Enter password" 
                className="auth-input"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
              />
            </div>

            {authMode === 'login' && (
              <div className="auth-checkbox-row">
                <label className="auth-checkbox-label">
                  <input type="checkbox" /> Remember me
                </label>
                <a href="#forgot" className="auth-link" onClick={(e) => { e.preventDefault(); alert('Demo password reset template'); }}>Forgot Password?</a>
              </div>
            )}

            <button type="submit" className="auth-btn">
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="auth-toggle-mode">
            {authMode === 'login' ? (
              <>
                New to the platform?{' '}
                <a href="#register" className="auth-link" onClick={(e) => { e.preventDefault(); setAuthMode('register'); setAuthError(''); }}>
                  Register here
                </a>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <a href="#login" className="auth-link" onClick={(e) => { e.preventDefault(); setAuthMode('login'); setAuthError(''); }}>
                  Sign in here
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERING SCI-FI SPLASH SCREEN LOADER ---
  if (showSplash) {
    return <SciFiSplash onComplete={() => setShowSplash(false)} />;
  }

  // --- RENDERING SECURE TRACKER WORKSPACE ---
  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      
      {/* Stock Market Digital Grid Background Canvas */}
      <StockMarketBgCanvas />
      
      {/* Dynamic Toast Notifications */}
      <div className="toast-container">
        {toastList.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span style={{ display: 'inline-flex', marginTop: '2px', color: t.type === 'success' ? 'var(--color-success)' : t.type === 'danger' ? 'var(--color-danger)' : 'var(--color-primary)' }}>
              {t.type === 'success' ? <Icons.CheckCircle /> : <Icons.Analytics />}
            </span>
            <div className="toast-content">
              <div className="toast-title">{t.title}</div>
              <div className="toast-message">{t.message}</div>
            </div>
            <button className="toast-close" onClick={() => setToastList(prev => prev.filter(item => item.id !== t.id))}>&times;</button>
          </div>
        ))}
      </div>

      {/* Sticky Premium Header / Scrollspy Navbar */}
      <header className="app-header">
        <div className="app-logo">
          <span className="app-logo-mark">V</span>
          <span>Video Analytics Tracker</span>
        </div>

        {/* Scrollspy tabs listed on top */}
        <nav className="nav-features">
          <button 
            className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
            onClick={() => scrollToSection('dashboard', dashboardRef)}
          >
            Dashboard
          </button>
          <button 
            className={`nav-item ${activeSection === 'add-video' ? 'active' : ''}`}
            onClick={() => scrollToSection('add-video', addVideoRef)}
          >
            Add Video
          </button>
          <button 
            className={`nav-item ${activeSection === 'tracking-sheet' ? 'active' : ''}`}
            onClick={() => scrollToSection('tracking-sheet', trackingSheetRef)}
          >
            Excel Sheet
          </button>
          <button 
            className={`nav-item ${activeSection === 'google-sheets' ? 'active' : ''}`}
            onClick={() => scrollToSection('google-sheets', googleSheetsRef)}
          >
            Google Sheets
          </button>
          <button 
            className={`nav-item ${activeSection === 'analytics' ? 'active' : ''}`}
            onClick={() => scrollToSection('analytics', analyticsRef)}
          >
            Analytics
          </button>
          <button 
            className={`nav-item ${activeSection === 'export' ? 'active' : ''}`}
            onClick={() => scrollToSection('export', exportRef)}
          >
            Export CSV
          </button>
        </nav>

        <div className="user-nav-action">
          {sheets.length > 0 && (
            <button 
              className="sync-header-btn" 
              onClick={handleSyncAllSheets}
              disabled={isSyncingSheet}
            >
              {isSyncingSheet ? 'Syncing...' : 'Sync Sheets'}
            </button>
          )}
          <span className="user-email-tag">{userEmail}</span>
          <button className="logout-btn" onClick={handleLogout}>Log Out</button>
        </div>
      </header>

      {/* Main scrolling section containers */}
      
      {/* 1. DASHBOARD SUMMARY SECTION */}
      <section id="dashboard" ref={dashboardRef} className="scroll-section">
        <div className="section-title-area">
          <div className="section-subtitle">Overview</div>
          <h2>Performance Dashboard</h2>
        </div>

        <div className="dashboard-grid">
          <div className="metric-card">
            <div className="metric-header">
              <span>Total Tracked Links</span>
              <span className="metric-icon-box links"><Icons.AddLink /></span>
            </div>
            <div className="metric-value">{summary.totalLinks}</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-header">
              <span>Aggregate Views</span>
              <span className="metric-icon-box views"><Icons.Analytics /></span>
            </div>
            <div className="metric-value">{formatNumber(summary.totalViews)}</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span>Total Likes</span>
              <span className="metric-icon-box likes">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
              </span>
            </div>
            <div className="metric-value">{formatNumber(summary.totalLikes)}</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span>Total Shares</span>
              <span className="metric-icon-box shares"><Icons.Export /></span>
            </div>
            <div className="metric-value">{formatNumber(summary.totalShares)}</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span>Total Comments</span>
              <span className="metric-icon-box comments">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              </span>
            </div>
            <div className="metric-value">{formatNumber(summary.totalComments)}</div>
          </div>
        </div>
      </section>

      {/* 2. ADD VIDEO LINK SECTION */}
      <section id="add-video" ref={addVideoRef} className="scroll-section">
        <div className="section-title-area" style={{ borderBottomColor: 'rgba(78, 124, 94, 0.15)' }}>
          <div className="section-subtitle">Wizard</div>
          <h2>Add New Video</h2>
        </div>

        <div className="form-card">
          <form onSubmit={handleAddVideo}>
            <div className="form-group">
              <label htmlFor="video-url">Paste Video Link</label>
              <div className="url-input-container">
                <input 
                  id="video-url"
                  type="text" 
                  className="url-input" 
                  placeholder="https://www.youtube.com/watch?v=... or Instagram, LinkedIn links"
                  value={pasteUrl}
                  disabled={isFetching}
                  onChange={e => setPasteUrl(e.target.value)}
                />
                
                <select 
                  className="platform-select"
                  value={selectPlatform}
                  disabled={isFetching}
                  onChange={e => setSelectPlatform(e.target.value)}
                >
                  <option value="">Auto-Detect Platform</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Instagram">Instagram</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="TikTok">TikTok</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <button type="submit" className="track-btn" disabled={isFetching}>
              {isFetching ? 'Processing...' : 'Track Video Metrics'}
            </button>
          </form>

          {/* Steps 4 Loader state */}
          {isFetching && (
            <div className="fetching-loader" style={{ marginTop: '2rem' }}>
              <div className="spinner-ring animate-spin"></div>
              <h3>Fetching Initial Data...</h3>
              <p>Extracting public API statistics from platform. Please wait a few seconds.</p>
            </div>
          )}

          {/* Steps 5 Captured state */}
          {isFetchSuccess && lastCapturedVideo && (
            <div className="capture-success-card" style={{ position: 'relative' }}>
              <button 
                onClick={() => setIsFetchSuccess(false)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#3E8E62',
                  lineHeight: '1',
                  padding: '4px',
                  zIndex: 2
                }}
                title="Dismiss preview"
              >
                &times;
              </button>
              
              <div className="capture-header">
                <Icons.CheckCircle />
                <span>Initial Data Captured Successfully!</span>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {/* Clickable Video Preview Card */}
                <a 
                  href={lastCapturedVideo.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    flex: '0 0 200px',
                    position: 'relative',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid rgba(62, 142, 98, 0.2)',
                    boxShadow: 'var(--box-shadow-sm)',
                    cursor: 'pointer',
                    textDecoration: 'none'
                  }}
                  title="Click to open video in new tab"
                >
                  <img 
                    src={lastCapturedVideo.thumbnailUrl || '/api-placeholder.png'} 
                    alt="Video thumbnail"
                    style={{
                      width: '100%',
                      height: '112px',
                      objectFit: 'cover',
                      display: 'block',
                      transition: 'transform 0.3s ease'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1.0)'}
                  />
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.9,
                    transition: 'opacity 0.2s ease'
                  }}>
                    <span style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      color: 'var(--color-primary-dark)',
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                    }}>
                      <Icons.Play />
                    </span>
                  </div>
                </a>

                {/* Video Info & Metrics List */}
                <div style={{ flex: '1', minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ 
                    fontFamily: 'var(--font-family-serif)', 
                    fontSize: '1.15rem', 
                    color: 'var(--color-primary-dark)', 
                    fontWeight: '600',
                    lineHeight: '1.3',
                    marginBottom: '2px'
                  }}>
                    {lastCapturedVideo.title || 'Social Video'}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className={`platform-tag ${lastCapturedVideo.platform.toLowerCase()}`}>
                      {lastCapturedVideo.platform}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      Click thumbnail to open link
                    </span>
                  </div>
                  
                  <div className="captured-metrics-list">
                    <div className="captured-item">
                      <span className="captured-label">Initial Views</span>
                      <span className="captured-val">{formatNumber(lastCapturedVideo.initialMetrics.views)}</span>
                    </div>
                    <div className="captured-item">
                      <span className="captured-label">Initial Likes</span>
                      <span className="captured-val">{formatNumber(lastCapturedVideo.initialMetrics.likes)}</span>
                    </div>
                    <div className="captured-item">
                      <span className="captured-label">Initial Comments</span>
                      <span className="captured-val">{formatNumber(lastCapturedVideo.initialMetrics.comments)}</span>
                    </div>
                    <div className="captured-item">
                      <span className="captured-label">Initial Shares</span>
                      <span className="captured-val">{formatNumber(lastCapturedVideo.initialMetrics.shares)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. EXCEL SPREADSHEET SHEET SECTION */}
      <section id="tracking-sheet" ref={trackingSheetRef} className="scroll-section">
        <div className="section-title-area">
          <div className="section-subtitle">Spreadsheet</div>
          <h2>Live Tracking Sheet</h2>
        </div>

        <div className="sheet-container">
          <div className="sheet-toolbar">
            <div className="sheet-status-tag">
              <span className="live-pulse-dot"></span>
              <span>Continuous Monitoring Loop active (updates simulated automatically)</span>
            </div>
            
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              Rows flash green when updates are detected from platforms
            </div>
          </div>

          <div className="sheet-scroll-wrapper">
            <table className="excel-table">
              <thead>
                <tr>
                  <th rowSpan="2" style={{ width: '60px' }}>S.No.</th>
                  <th rowSpan="2" style={{ minWidth: '220px' }}>Video Link</th>
                  <th rowSpan="2" style={{ width: '130px' }}>Platform</th>
                  <th colSpan="4" style={{ textAlign: 'center', backgroundColor: 'var(--color-bg-secondary)' }}>Initial Metrics (Added)</th>
                  <th colSpan="4" style={{ textAlign: 'center', backgroundColor: 'var(--color-primary-light)' }}>Updated Metrics (Latest)</th>
                  <th rowSpan="2" style={{ width: '170px' }}>Last Updated Time</th>
                  <th rowSpan="2" style={{ width: '110px', textAlign: 'center' }}>Actions</th>
                </tr>
                <tr>
                  <th>Likes</th>
                  <th>Shares</th>
                  <th>Comments</th>
                  <th>Views</th>
                  <th>Likes</th>
                  <th>Shares</th>
                  <th>Comments</th>
                  <th>Views</th>
                </tr>
              </thead>
              <tbody>
                {videos.length === 0 ? (
                  <tr>
                    <td colSpan="13" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                      No videos currently tracked. Paste a video link above to populate the sheet!
                    </td>
                  </tr>
                ) : (
                  videos.map((video, idx) => {
                    const vidId = video._id || video.id;
                    const isFlashing = flashingRows[vidId];
                    
                    // calculate growth
                    const growthLikes = (video.updatedMetrics.likes || 0) - (video.initialMetrics.likes || 0);
                    const growthViews = (video.updatedMetrics.views || 0) - (video.initialMetrics.views || 0);

                    return (
                      <tr key={vidId} className={isFlashing ? 'flash-update' : ''}>
                        <td className="sno-cell">{idx + 1}</td>
                        <td className="link-cell">
                          <div style={{ display: 'flex', alignItems: 'center', width: '300px' }}>
                            <a 
                              href={video.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              style={{ 
                                display: 'block', 
                                flexShrink: 0, 
                                position: 'relative', 
                                width: '56px', 
                                height: '36px', 
                                borderRadius: '4px', 
                                overflow: 'hidden', 
                                marginRight: '10px', 
                                border: '1px solid var(--color-border)' 
                              }}
                              title="Open video in new tab"
                            >
                              <img src={video.thumbnailUrl || '/api-placeholder.png'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ color: '#fff', fontSize: '0.65rem' }}>▶</span>
                              </div>
                            </a>
                            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                              <a href={video.url} target="_blank" rel="noopener noreferrer" className="video-anchor" style={{ fontWeight: '600', fontSize: '0.85rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '220px' }} title={video.title || video.url}>
                                {video.title || 'Social Video'}
                              </a>
                              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '220px', display: 'block' }} title={video.url}>
                                {video.url}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`platform-tag ${video.platform.toLowerCase()}`}>
                            {video.platform}
                          </span>
                        </td>
                        
                        {/* Initial columns */}
                        <td className="metric-initial-col">{formatNumber(video.initialMetrics.likes)}</td>
                        <td className="metric-initial-col">{formatNumber(video.initialMetrics.shares)}</td>
                        <td className="metric-initial-col">{formatNumber(video.initialMetrics.comments)}</td>
                        <td className="metric-initial-col">{formatNumber(video.initialMetrics.views)}</td>
                        
                        {/* Updated columns */}
                        <td className="metric-updated-col">
                          {formatNumber(video.updatedMetrics.likes)}
                          {growthLikes > 0 && <span className="metric-growth-up">+{formatNumber(growthLikes)}</span>}
                        </td>
                        <td className="metric-updated-col">{formatNumber(video.updatedMetrics.shares)}</td>
                        <td className="metric-updated-col">{formatNumber(video.updatedMetrics.comments)}</td>
                        <td className="metric-updated-col">
                          {formatNumber(video.updatedMetrics.views)}
                          {growthViews > 0 && <span className="metric-growth-up">+{formatNumber(growthViews)}</span>}
                        </td>
                        
                        <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                          {video.lastUpdated ? new Date(video.lastUpdated).toLocaleTimeString() + ' ' + new Date(video.lastUpdated).toLocaleDateString([], {month:'short', day:'numeric'}) : 'N/A'}
                        </td>

                        <td>
                          <div className="row-actions">
                            {/* Manual Edit trigger */}
                            <button 
                              className="action-icon-btn" 
                              title="Edit metrics manually"
                              onClick={() => handleOpenEditModal(video)}
                            >
                              <Icons.Edit />
                            </button>

                            {/* Refresh Manual trigger */}
                            <button 
                              className="action-icon-btn" 
                              title="Force refresh platform stats"
                              disabled={video.status !== 'active'}
                              onClick={() => handleManualRefresh(vidId)}
                            >
                              <Icons.Refresh />
                            </button>

                            {/* Pause/Resume simulator */}
                            <button 
                              className={`action-icon-btn ${video.status === 'paused' ? 'paused' : ''}`}
                              title={video.status === 'active' ? 'Pause monitoring' : 'Resume monitoring'}
                              onClick={() => handleToggleStatus(vidId, video.status)}
                            >
                              {video.status === 'active' ? <Icons.Pause /> : <Icons.Play />}
                            </button>

                            {/* Delete link */}
                            <button 
                              className="action-icon-btn delete" 
                              title="Delete tracked video"
                              onClick={() => handleDeleteVideo(vidId)}
                            >
                              <Icons.Trash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      {/* 3.5 GOOGLE SHEETS SYNC MANAGER SECTION */}
      <section id="google-sheets" ref={googleSheetsRef} className="scroll-section">
        <div className="section-title-area">
          <div className="section-subtitle">Integration</div>
          <h2>Google Sheets Sync Manager</h2>
        </div>

        <div className="google-sheets-container">
          <div className="sheets-grid" style={{ gridTemplateColumns: (sheets.length === 0 || showConnectForm) ? '1fr 1.2fr' : '1fr' }}>
            {/* Left Panel: Connect Form */}
            {(sheets.length === 0 || showConnectForm) && (
              <div className="sheets-card connect-card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3>Connect Google Spreadsheet</h3>
                    <p>Import video URLs and synchronize metrics automatically.</p>
                  </div>
                  {sheets.length > 0 && (
                    <button 
                      type="button" 
                      className="clear-logs-btn" 
                      onClick={() => setShowConnectForm(false)}
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      Close
                    </button>
                  )}
                </div>
                
                <form onSubmit={handleConnectSheet} className="connect-form">
                  <div className="form-group">
                    <label htmlFor="sheetUrl">Google Sheet URL / Spreadsheet ID</label>
                    <input
                      id="sheetUrl"
                      type="url"
                      value={sheetUrlInput}
                      onChange={(e) => setSheetUrlInput(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                      className="form-input"
                      required
                      disabled={isConnectingSheet}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="sheetName">Sheet Name / Tab</label>
                      <input
                        id="sheetName"
                        type="text"
                        value={sheetNameInput}
                        onChange={(e) => setSheetNameInput(e.target.value)}
                        placeholder="Sheet1"
                        className="form-input"
                        required
                        disabled={isConnectingSheet}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="syncFrequency">Sync Frequency</label>
                      <select
                        id="syncFrequency"
                        value={syncFrequencyInput}
                        onChange={(e) => setSyncFrequencyInput(e.target.value)}
                        className="form-input"
                        disabled={isConnectingSheet}
                      >
                        <option value="10m">Every 10 min</option>
                        <option value="1h">Every 1 hour</option>
                        <option value="5h">Every 5 hours</option>
                        <option value="24h">Every 24 hours</option>
                        <option value="manual">Manual only</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="serviceAccount">
                      Google Service Account JSON Key (Optional if globally configured)
                    </label>
                    <textarea
                      id="serviceAccount"
                      value={serviceAccountInput}
                      onChange={(e) => setServiceAccountInput(e.target.value)}
                      placeholder='{ "type": "service_account", "project_id": ... }'
                      className="form-input code-input"
                      rows={4}
                      disabled={isConnectingSheet}
                    />
                    <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: '6px', fontSize: '0.78rem' }}>
                      Note: Share your Google Sheet with your service account email as <strong>Editor</strong>.
                    </small>
                  </div>

                  <button 
                    type="submit" 
                    className={`submit-btn ${isConnectingSheet ? 'loading' : ''}`}
                    disabled={isConnectingSheet}
                  >
                    {isConnectingSheet ? 'Connecting & Importing...' : 'Connect & Import Sheet'}
                  </button>
                </form>
              </div>
            )}

            {/* Right Panel: Connected Sheets list */}
            <div className="sheets-card list-card" style={{ gridColumn: (sheets.length > 0 && !showConnectForm) ? '1 / -1' : 'auto' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3>Connected Sheets</h3>
                  <p>Manage and synchronize your sheet integrations.</p>
                </div>
                {sheets.length > 0 && !showConnectForm && (
                  <button 
                    className="sync-header-btn" 
                    onClick={() => setShowConnectForm(true)}
                    style={{ margin: 0, padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    + Connect Another Sheet
                  </button>
                )}
              </div>

              <div className="connected-sheets-wrapper">
                {sheets.length === 0 ? (
                  <div className="empty-sheets-placeholder">
                    <div className="empty-icon">📂</div>
                    <p>No Google Sheets currently connected.</p>
                    <p className="sub-hint">Connect a sheet on the left to start importing URLs automatically.</p>
                  </div>
                ) : (
                  <div className="sheets-list">
                    {sheets.map((sheet) => {
                      const sheetId = sheet._id || sheet.id;
                      const isError = sheet.status === 'error';
                      return (
                        <div key={sheetId} className={`sheet-item ${sheet.status}`}>
                          <div className="sheet-item-header">
                            <div className="sheet-title-info">
                              <span className="sheet-doc-icon">📊</span>
                              <div style={{ minWidth: 0 }}>
                                <a 
                                  href={sheet.spreadsheetUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="sheet-doc-link"
                                  title="Open sheet in new tab"
                                >
                                  Spreadsheet (Tab: {sheet.sheetName})
                                </a>
                                <div className="sheet-id-tag">ID: {sheet.spreadsheetId}</div>
                              </div>
                            </div>
                            <span className={`status-pill ${sheet.status}`}>
                              {sheet.status === 'connected' && 'Connected'}
                              {sheet.status === 'syncing' && 'Syncing...'}
                              {sheet.status === 'error' && 'Error'}
                            </span>
                          </div>

                          {isError && (
                            <div className="sheet-error-banner">
                              <strong>Error:</strong> {sheet.lastError || 'Could not sync spreadsheet cells.'}
                            </div>
                          )}

                          <div className="sheet-meta-grid">
                            <div className="meta-box">
                              <span className="meta-label">Last Synced</span>
                              <span className="meta-val">
                                {sheet.lastSynced ? new Date(sheet.lastSynced).toLocaleString() : 'Never'}
                              </span>
                            </div>
                            <div className="meta-box">
                              <span className="meta-label">Sync Frequency</span>
                              <select
                                className="frequency-select"
                                value={sheet.syncFrequency || '1h'}
                                onChange={(e) => handleUpdateFrequency(sheet._id || sheet.id, e.target.value)}
                                disabled={isSyncingSheet}
                              >
                                <option value="10m">Every 10 min</option>
                                <option value="1h">Every 1 hour</option>
                                <option value="5h">Every 5 hours</option>
                                <option value="24h">Every 24 hours</option>
                                <option value="manual">Manual only</option>
                              </select>
                            </div>
                          </div>

                          <div className="sheet-actions">
                            <button
                              className="sheet-btn sync-btn"
                              onClick={() => handleSyncSheet(sheetId)}
                              disabled={isSyncingSheet}
                            >
                              {isSyncingSheet ? 'Syncing...' : 'Sync Now'}
                            </button>
                            <button
                              className="sheet-btn delete-btn"
                              onClick={() => handleDeleteSheet(sheetId)}
                            >
                              Disconnect
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Console: Logs Panel */}
          {sheetLogs.length > 0 && (
            <div className="sheets-card logs-card" style={{ marginTop: '24px' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3>Operation Terminal Logs</h3>
                  <p>Real-time import and synchronization activity logs</p>
                </div>
                <button className="clear-logs-btn" onClick={() => setSheetLogs([])}>Clear Console</button>
              </div>
              <div className="terminal-screen">
                <div className="terminal-header">
                  <span className="dot red"></span>
                  <span className="dot yellow"></span>
                  <span className="dot green"></span>
                  <span className="terminal-title">sheets-sync@antigravity: ~</span>
                </div>
                <div className="terminal-body">
                  {sheetLogs.map((log, index) => (
                    <div key={index} className="terminal-line">
                      {log.includes('Error') || log.includes('failed') || log.includes('Access Error') ? (
                        <span className="text-danger">{log}</span>
                      ) : log.includes('Success') || log.includes('Connected') || log.includes('updated') ? (
                        <span className="text-success">{log}</span>
                      ) : (
                        <span>{log}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. ANALYTICS & INSIGHTS SECTION */}
      <section id="analytics" ref={analyticsRef} className="scroll-section">
        <div className="section-title-area" style={{ borderBottomColor: 'rgba(78, 124, 94, 0.15)' }}>
          <div className="section-subtitle">Visuals</div>
          <h2>Analytics & Time-Series</h2>
        </div>

        <div className="analytics-dashboard">
          
          {/* Line Chart Panel */}
          <div className="chart-card">
            <div className="chart-header">
              <div>
                <h4 style={{ fontFamily: 'var(--font-family-serif)', fontSize: '1.25rem', color: 'var(--color-primary-dark)', fontWeight: '600' }}>
                  Video Performance Over Time
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  {activeChartVideo ? `Analyzing URL: ${activeChartVideo.url.substring(0, 50)}...` : 'No video selected'}
                </p>
              </div>

              {/* Chart Metric Selectors */}
              <div className="chart-selector">
                {['views', 'likes', 'comments', 'shares'].map(m => (
                  <button 
                    key={m} 
                    className={`chart-selector-btn ${selectedMetric === m ? 'active' : ''}`}
                    onClick={() => setSelectedMetric(m)}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="canvas-container">
              <CanvasLineChart 
                historyData={activeChartVideo ? activeChartVideo.history : []} 
                metric={selectedMetric} 
              />
            </div>
          </div>

          {/* Video Selector Sidebar */}
          <div className="analytics-sidebar">
            <div className="sidebar-title">Select Tracked Video</div>
            <div className="sidebar-list">
              {videos.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
                  No videos to analyze.
                </div>
              ) : (
                videos.map(v => {
                  const id = v._id || v.id;
                  const latestVal = v.updatedMetrics[selectedMetric] || 0;
                  return (
                    <div 
                      key={id}
                      className={`sidebar-item ${selectedVideoId === id ? 'active' : ''}`}
                      onClick={() => setSelectedVideoId(id)}
                    >
                      <div className="sidebar-item-link" title={v.url}>
                        {v.url}
                      </div>
                      <div className="sidebar-item-meta">
                        <span className={`platform-tag ${v.platform.toLowerCase()}`} style={{ padding: '2px 6px', fontSize: '0.7rem' }}>
                          {v.platform}
                        </span>
                        <span style={{ fontWeight: '600' }}>
                          {formatNumber(latestVal)} {selectedMetric}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </section>

      {/* 5. EXPORT & COMPLETE PROCESS SECTION */}
      <section id="export" ref={exportRef} className="scroll-section">
        <div className="section-title-area">
          <div className="section-subtitle">Actions</div>
          <h2>Data Export & Finalization</h2>
        </div>

        <div className="export-panel-card">
          <div className="export-details">
            <h3>Export Sheet to Excel</h3>
            <p>Download the entire live tracking spreadsheet containing initial vs updated engagement metrics and timestamps in Excel-compatible CSV format.</p>
          </div>
          
          <button className="export-btn" onClick={handleExportCsv}>
            <Icons.Export />
            <span>Export to Excel (.CSV)</span>
          </button>
        </div>

        <footer style={{ marginTop: 'auto', borderTop: '1px solid var(--color-border)', paddingTop: '2rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          <p>© {new Date().getFullYear()} Social Media Video Engagement Tracker. All rights reserved.</p>
        </footer>
      </section>

      {/* 6. EDIT METRICS MODAL DIALOG */}
      {editingVideo && (
        <div className="edit-modal-overlay">
          <div className="edit-modal-card">
            <div className="edit-modal-header">
              <h3>Manual Data Entry / Correction</h3>
              <button className="edit-modal-close" onClick={() => setEditingVideo(null)}>&times;</button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="edit-modal-form">
              <div className="edit-modal-section">
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--color-primary-light)' }}>Video Title</label>
                <input 
                  type="text" 
                  value={editTitle} 
                  onChange={e => setEditTitle(e.target.value)} 
                  className="edit-modal-input full-width" 
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '1.2rem' }}>
                {/* Initial Metrics Grid */}
                <div style={{ flex: '1', minWidth: '200px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <h4 style={{ color: 'var(--color-primary-light)', fontSize: '0.95rem', marginBottom: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>Initial Metrics (Added)</h4>
                  
                  <div className="edit-modal-field-group" style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Views</label>
                    <input 
                      type="number" 
                      value={editInitialViews} 
                      onChange={e => setEditInitialViews(e.target.value)} 
                      className="edit-modal-input" 
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
                      min="0"
                      required
                    />
                  </div>
                  
                  <div className="edit-modal-field-group" style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Likes</label>
                    <input 
                      type="number" 
                      value={editInitialLikes} 
                      onChange={e => setEditInitialLikes(e.target.value)} 
                      className="edit-modal-input" 
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
                      min="0"
                      required
                    />
                  </div>

                  <div className="edit-modal-field-group" style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Comments</label>
                    <input 
                      type="number" 
                      value={editInitialComments} 
                      onChange={e => setEditInitialComments(e.target.value)} 
                      className="edit-modal-input" 
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
                      min="0"
                      required
                    />
                  </div>

                  <div className="edit-modal-field-group">
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Shares</label>
                    <input 
                      type="number" 
                      value={editInitialShares} 
                      onChange={e => setEditInitialShares(e.target.value)} 
                      className="edit-modal-input" 
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
                      min="0"
                      required
                    />
                  </div>
                </div>

                {/* Updated Metrics Grid */}
                <div style={{ flex: '1', minWidth: '200px', backgroundColor: 'rgba(6, 182, 212, 0.03)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
                  <h4 style={{ color: 'var(--color-primary)', fontSize: '0.95rem', marginBottom: '12px', borderBottom: '1px solid rgba(6, 182, 212, 0.15)', paddingBottom: '6px' }}>Updated Metrics (Latest)</h4>
                  
                  <div className="edit-modal-field-group" style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Views</label>
                    <input 
                      type="number" 
                      value={editUpdatedViews} 
                      onChange={e => setEditUpdatedViews(e.target.value)} 
                      className="edit-modal-input" 
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
                      min="0"
                      required
                    />
                  </div>
                  
                  <div className="edit-modal-field-group" style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Likes</label>
                    <input 
                      type="number" 
                      value={editUpdatedLikes} 
                      onChange={e => setEditUpdatedLikes(e.target.value)} 
                      className="edit-modal-input" 
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
                      min="0"
                      required
                    />
                  </div>

                  <div className="edit-modal-field-group" style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Comments</label>
                    <input 
                      type="number" 
                      value={editUpdatedComments} 
                      onChange={e => setEditUpdatedComments(e.target.value)} 
                      className="edit-modal-input" 
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
                      min="0"
                      required
                    />
                  </div>

                  <div className="edit-modal-field-group">
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Shares</label>
                    <input 
                      type="number" 
                      value={editUpdatedShares} 
                      onChange={e => setEditUpdatedShares(e.target.value)} 
                      className="edit-modal-input" 
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
                      min="0"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="edit-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <button type="button" className="edit-modal-btn cancel" onClick={() => setEditingVideo(null)} style={{ padding: '8px 16px', border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'transparent', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" className="edit-modal-btn save" style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', backgroundColor: 'var(--color-primary)', color: '#030712', fontWeight: '600', cursor: 'pointer' }}>
                  Save Corrected Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
