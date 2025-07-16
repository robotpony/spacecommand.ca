class Player {
  constructor(data = {}) {
    this.id = data.id || null;
    this.username = data.username || '';
    this.email = data.email || '';
    this.passwordHash = data.passwordHash || '';
    this.empireId = data.empireId || null;
    this.sessionToken = data.sessionToken || null;
    this.sessionExpiry = data.sessionExpiry || null;
    this.isActive = data.isActive || true;
    this.isOnline = data.isOnline || false;
    this.lastLogin = data.lastLogin || null;
    this.profile = {
      displayName: data.profile?.displayName || data.username,
      avatar: data.profile?.avatar || null,
      bio: data.profile?.bio || '',
      joinDate: data.profile?.joinDate || new Date(),
      gamesPlayed: data.profile?.gamesPlayed || 0,
      gamesWon: data.profile?.gamesWon || 0,
      totalScore: data.profile?.totalScore || 0,
      achievements: data.profile?.achievements || []
    };
    this.settings = {
      notifications: data.settings?.notifications || true,
      soundEnabled: data.settings?.soundEnabled || true,
      theme: data.settings?.theme || 'dark',
      language: data.settings?.language || 'en',
      autoSave: data.settings?.autoSave || true,
      turnNotifications: data.settings?.turnNotifications || true
    };
    this.permissions = {
      canCreateGames: data.permissions?.canCreateGames || true,
      canJoinGames: data.permissions?.canJoinGames || true,
      canChat: data.permissions?.canChat || true,
      isModerator: data.permissions?.isModerator || false,
      isAdmin: data.permissions?.isAdmin || false
    };
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static generateSessionToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 64; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  static hashPassword(password) {
    const crypto = require('crypto');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  static verifyPassword(password, hash) {
    const crypto = require('crypto');
    const [salt, storedHash] = hash.split(':');
    const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return testHash === storedHash;
  }

  setPassword(password) {
    this.passwordHash = Player.hashPassword(password);
    this.updatedAt = new Date();
  }

  verifyPassword(password) {
    return Player.verifyPassword(password, this.passwordHash);
  }

  createSession() {
    this.sessionToken = Player.generateSessionToken();
    this.sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    this.lastLogin = new Date();
    this.isOnline = true;
    this.updatedAt = new Date();
    return this.sessionToken;
  }

  validateSession() {
    if (!this.sessionToken || !this.sessionExpiry) {
      return false;
    }
    
    if (new Date() > this.sessionExpiry) {
      this.clearSession();
      return false;
    }
    
    return true;
  }

  clearSession() {
    this.sessionToken = null;
    this.sessionExpiry = null;
    this.isOnline = false;
    this.updatedAt = new Date();
  }

  extendSession() {
    if (this.sessionToken) {
      this.sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      this.updatedAt = new Date();
    }
  }

  updateProfile(updates) {
    const allowedFields = ['displayName', 'avatar', 'bio'];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        this.profile[field] = updates[field];
      }
    }
    
    this.updatedAt = new Date();
  }

  updateSettings(updates) {
    const allowedFields = ['notifications', 'soundEnabled', 'theme', 'language', 'autoSave', 'turnNotifications'];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        this.settings[field] = updates[field];
      }
    }
    
    this.updatedAt = new Date();
  }

  recordGameResult(won, score) {
    this.profile.gamesPlayed++;
    this.profile.totalScore += score;
    
    if (won) {
      this.profile.gamesWon++;
    }
    
    this.updatedAt = new Date();
  }

  addAchievement(achievement) {
    if (!this.profile.achievements.includes(achievement)) {
      this.profile.achievements.push(achievement);
      this.updatedAt = new Date();
    }
  }

  hasPermission(permission) {
    return this.permissions[permission] === true;
  }

  grantPermission(permission) {
    if (this.permissions.hasOwnProperty(permission)) {
      this.permissions[permission] = true;
      this.updatedAt = new Date();
    }
  }

  revokePermission(permission) {
    if (this.permissions.hasOwnProperty(permission)) {
      this.permissions[permission] = false;
      this.updatedAt = new Date();
    }
  }

  deactivate() {
    this.isActive = false;
    this.clearSession();
    this.updatedAt = new Date();
  }

  activate() {
    this.isActive = true;
    this.updatedAt = new Date();
  }

  getWinRate() {
    if (this.profile.gamesPlayed === 0) return 0;
    return Math.round((this.profile.gamesWon / this.profile.gamesPlayed) * 100);
  }

  getAverageScore() {
    if (this.profile.gamesPlayed === 0) return 0;
    return Math.round(this.profile.totalScore / this.profile.gamesPlayed);
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      empireId: this.empireId,
      isActive: this.isActive,
      isOnline: this.isOnline,
      lastLogin: this.lastLogin,
      profile: this.profile,
      settings: this.settings,
      permissions: this.permissions,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  toSecureJSON() {
    const json = this.toJSON();
    delete json.email;
    delete json.permissions;
    return json;
  }
}

module.exports = Player;