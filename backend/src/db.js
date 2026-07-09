const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const DB_FILE_PATH = path.join(__dirname, '../data/database.json');
let useLocalFallback = false;

// Ensure local database file exists if fallback is used
function initLocalDb() {
  const dir = path.dirname(DB_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE_PATH)) {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify({ users: [], videos: [], sheets: [] }, null, 2));
  } else {
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE_PATH, 'utf8'));
      if (!data.sheets) {
        data.sheets = [];
        fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2));
      }
    } catch (e) {}
  }
}

// Connect to MongoDB or fallback
async function connectDb() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.log('⚠️ No MONGO_URI configured in .env. Falling back to local JSON database.');
    useLocalFallback = true;
    initLocalDb();
    return;
  }

  try {
    // Attempt connecting with a short timeout to prevent hanging the server on launch
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000
    });
    console.log('✅ MongoDB connected successfully.');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('⚠️ Falling back to local JSON database.');
    useLocalFallback = true;
    initLocalDb();
  }
}

// Local File Helper Functions
function readLocalDb() {
  let retries = 5;
  while (retries > 0) {
    try {
      initLocalDb();
      const data = fs.readFileSync(DB_FILE_PATH, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      if (e.code === 'EBUSY' && retries > 1) {
        retries--;
        const limit = Date.now() + 50;
        while (Date.now() < limit) {}
        continue;
      }
      console.error('Error reading local DB:', e);
      return { users: [], videos: [], sheets: [] };
    }
  }
}

function writeLocalDb(data) {
  let retries = 5;
  while (retries > 0) {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2));
      return;
    } catch (e) {
      if (e.code === 'EBUSY' && retries > 1) {
        retries--;
        const limit = Date.now() + 50;
        while (Date.now() < limit) {}
        continue;
      }
      console.error('Error writing to local DB:', e);
      return;
    }
  }
}

// User Repository
const UserRepo = {
  async findByEmail(email) {
    if (!useLocalFallback) {
      const User = require('./models/User');
      return await User.findOne({ email: email.toLowerCase() });
    } else {
      const db = readLocalDb();
      return db.users.find(u => u.email === email.toLowerCase()) || null;
    }
  },

  async findById(id) {
    if (!useLocalFallback) {
      const User = require('./models/User');
      return await User.findById(id);
    } else {
      const db = readLocalDb();
      return db.users.find(u => u._id === id) || null;
    }
  },

  async create(userData) {
    if (!useLocalFallback) {
      const User = require('./models/User');
      const user = new User({
        ...userData,
        email: userData.email.toLowerCase()
      });
      return await user.save();
    } else {
      const db = readLocalDb();
      const newUser = {
        _id: 'u_' + Math.random().toString(36).substr(2, 9),
        email: userData.email.toLowerCase(),
        password: userData.password,
        createdAt: new Date()
      };
      db.users.push(newUser);
      writeLocalDb(db);
      return newUser;
    }
  }
};

// Video Repository
const VideoRepo = {
  async create(videoData) {
    if (!useLocalFallback) {
      const Video = require('./models/Video');
      const video = new Video(videoData);
      return await video.save();
    } else {
      const db = readLocalDb();
      const newVideo = {
        _id: 'v_' + Math.random().toString(36).substr(2, 9),
        ...videoData,
        createdAt: new Date(),
        lastUpdated: new Date()
      };
      db.videos.push(newVideo);
      writeLocalDb(db);
      return newVideo;
    }
  },

  async findByUser(userId) {
    if (!useLocalFallback) {
      const Video = require('./models/Video');
      return await Video.find({ user: userId }).sort({ createdAt: -1 });
    } else {
      const db = readLocalDb();
      return db.videos
        .filter(v => v.user === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  },

  async findById(id) {
    if (!useLocalFallback) {
      const Video = require('./models/Video');
      return await Video.findById(id);
    } else {
      const db = readLocalDb();
      return db.videos.find(v => v._id === id) || null;
    }
  },

  async findAllActive() {
    if (!useLocalFallback) {
      const Video = require('./models/Video');
      return await Video.find({ status: 'active' });
    } else {
      const db = readLocalDb();
      return db.videos.filter(v => v.status === 'active');
    }
  },

  async update(id, updateData) {
    if (!useLocalFallback) {
      const Video = require('./models/Video');
      return await Video.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    } else {
      const db = readLocalDb();
      const idx = db.videos.findIndex(v => v._id === id);
      if (idx !== -1) {
        db.videos[idx] = {
          ...db.videos[idx],
          ...updateData,
          lastUpdated: new Date()
        };
        writeLocalDb(db);
        return db.videos[idx];
      }
      return null;
    }
  },

  async delete(id) {
    if (!useLocalFallback) {
      const Video = require('./models/Video');
      return await Video.findByIdAndDelete(id);
    } else {
      const db = readLocalDb();
      const idx = db.videos.findIndex(v => v._id === id);
      if (idx !== -1) {
        const deleted = db.videos.splice(idx, 1)[0];
        writeLocalDb(db);
        return deleted;
      }
      return null;
    }
  }
};

const GoogleSheetRepo = {
  async create(sheetData) {
    if (!useLocalFallback) {
      const GoogleSheet = require('./models/GoogleSheet');
      const sheet = new GoogleSheet(sheetData);
      return await sheet.save();
    } else {
      const db = readLocalDb();
      const newSheet = {
        _id: 's_' + Math.random().toString(36).substr(2, 9),
        syncFrequency: '1h',
        ...sheetData,
        createdAt: new Date()
      };
      db.sheets.push(newSheet);
      writeLocalDb(db);
      return newSheet;
    }
  },

  async findByUser(userId) {
    if (!useLocalFallback) {
      const GoogleSheet = require('./models/GoogleSheet');
      return await GoogleSheet.find({ user: userId }).sort({ createdAt: -1 });
    } else {
      const db = readLocalDb();
      return db.sheets
        .filter(s => String(s.user) === String(userId))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  },

  async findById(id) {
    if (!useLocalFallback) {
      const GoogleSheet = require('./models/GoogleSheet');
      return await GoogleSheet.findById(id);
    } else {
      const db = readLocalDb();
      return db.sheets.find(s => s._id === id) || null;
    }
  },

  async findAllActive() {
    if (!useLocalFallback) {
      const GoogleSheet = require('./models/GoogleSheet');
      return await GoogleSheet.find({ status: { $ne: 'error' } });
    } else {
      const db = readLocalDb();
      return db.sheets.filter(s => s.status !== 'error');
    }
  },

  async update(id, updateData) {
    if (!useLocalFallback) {
      const GoogleSheet = require('./models/GoogleSheet');
      return await GoogleSheet.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    } else {
      const db = readLocalDb();
      const idx = db.sheets.findIndex(s => s._id === id);
      if (idx !== -1) {
        db.sheets[idx] = {
          ...db.sheets[idx],
          ...updateData,
          lastSynced: updateData.lastSynced || db.sheets[idx].lastSynced
        };
        writeLocalDb(db);
        return db.sheets[idx];
      }
      return null;
    }
  },

  async delete(id) {
    if (!useLocalFallback) {
      const GoogleSheet = require('./models/GoogleSheet');
      return await GoogleSheet.findByIdAndDelete(id);
    } else {
      const db = readLocalDb();
      const idx = db.sheets.findIndex(s => s._id === id);
      if (idx !== -1) {
        const deleted = db.sheets.splice(idx, 1)[0];
        writeLocalDb(db);
        return deleted;
      }
      return null;
    }
  }
};

module.exports = {
  connectDb,
  isFallbackMode: () => useLocalFallback,
  UserRepo,
  VideoRepo,
  GoogleSheetRepo
};
