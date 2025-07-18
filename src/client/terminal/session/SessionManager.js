const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Session Manager for SpaceCommand Terminal Client
 * 
 * Handles user session persistence, configuration management, and authentication state.
 * Stores session data securely in user's home directory.
 */
class SessionManager {
    constructor() {
        this.configDir = path.join(os.homedir(), '.spacecommand');
        this.configFile = path.join(this.configDir, 'config.json');
        this.sessionFile = path.join(this.configDir, 'session.json');
        
        this.config = {
            server: 'http://localhost:3000',
            theme: 'classic',
            notifications: true,
            autoRefresh: 30,
            aliases: {
                's': 'status',
                'f': 'fleets',
                'q': 'quit',
                'h': 'help',
                'l': 'login'
            }
        };
        
        this.session = {
            token: null,
            user: null,
            lastLogin: null,
            expiresAt: null
        };
    }

    /**
     * Initialize session manager, create config directory and load existing data
     */
    async initialize() {
        try {
            await this.ensureConfigDirectory();
            await this.loadConfig();
            await this.loadSession();
        } catch (error) {
            throw new SessionError('Failed to initialize session manager', error);
        }
    }

    /**
     * Ensure configuration directory exists
     */
    async ensureConfigDirectory() {
        try {
            await fs.access(this.configDir);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await fs.mkdir(this.configDir, { mode: 0o700 });
            } else {
                throw error;
            }
        }
    }

    /**
     * Load configuration from file
     */
    async loadConfig() {
        try {
            const data = await fs.readFile(this.configFile, 'utf8');
            const savedConfig = JSON.parse(data);
            this.config = { ...this.config, ...savedConfig };
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw new SessionError('Failed to load configuration', error);
            }
            // File doesn't exist, will be created on save
        }
    }

    /**
     * Save configuration to file
     */
    async saveConfig() {
        try {
            const data = JSON.stringify(this.config, null, 2);
            await fs.writeFile(this.configFile, data, { mode: 0o600 });
        } catch (error) {
            throw new SessionError('Failed to save configuration', error);
        }
    }

    /**
     * Load session data from file
     */
    async loadSession() {
        try {
            const data = await fs.readFile(this.sessionFile, 'utf8');
            const savedSession = JSON.parse(data);
            
            // Check if session is expired
            if (savedSession.expiresAt && new Date(savedSession.expiresAt) < new Date()) {
                await this.clearSession();
                return;
            }
            
            this.session = { ...this.session, ...savedSession };
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw new SessionError('Failed to load session', error);
            }
            // File doesn't exist, will be created on save
        }
    }

    /**
     * Save session data to file
     */
    async saveSession() {
        try {
            const data = JSON.stringify(this.session, null, 2);
            await fs.writeFile(this.sessionFile, data, { mode: 0o600 });
        } catch (error) {
            throw new SessionError('Failed to save session', error);
        }
    }

    /**
     * Clear session data
     */
    async clearSession() {
        this.session = {
            token: null,
            user: null,
            lastLogin: null,
            expiresAt: null
        };
        
        try {
            await fs.unlink(this.sessionFile);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw new SessionError('Failed to clear session file', error);
            }
        }
    }

    /**
     * Set authentication token with expiration
     * @param {string} token - JWT authentication token
     * @param {number} expiresIn - Token expiration time in seconds (default: 24 hours)
     */
    setToken(token, expiresIn = 86400) {
        this.session.token = token;
        this.session.lastLogin = new Date().toISOString();
        this.session.expiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString();
    }

    /**
     * Get current authentication token
     * @returns {string|null} Current token or null if not authenticated
     */
    getToken() {
        if (this.session.expiresAt && new Date(this.session.expiresAt) < new Date()) {
            this.clearToken();
            return null;
        }
        return this.session.token;
    }

    /**
     * Clear authentication token
     */
    clearToken() {
        this.session.token = null;
        this.session.expiresAt = null;
    }

    /**
     * Check if user has valid authentication token
     * @returns {boolean} True if user is authenticated
     */
    hasValidToken() {
        return !!this.getToken();
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} True if user is authenticated
     */
    isAuthenticated() {
        return this.hasValidToken() && !!this.session.user;
    }

    /**
     * Set current user information
     * @param {Object} user - User data object
     */
    setCurrentUser(user) {
        this.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            empire: user.empire || null,
            lastActive: new Date().toISOString()
        };
    }

    /**
     * Get current user information
     * @returns {Object|null} Current user data or null
     */
    getCurrentUser() {
        return this.session.user;
    }

    /**
     * Get server URL
     * @returns {string} Configured server URL
     */
    getServerUrl() {
        return this.config.server;
    }

    /**
     * Set server URL
     * @param {string} url - Server URL
     */
    setServerUrl(url) {
        this.config.server = url;
    }

    /**
     * Get configuration value
     * @param {string} key - Configuration key
     * @returns {*} Configuration value
     */
    getConfig(key) {
        return key.split('.').reduce((obj, k) => obj?.[k], this.config);
    }

    /**
     * Set configuration value
     * @param {string} key - Configuration key (supports dot notation)
     * @param {*} value - Configuration value
     */
    setConfig(key, value) {
        const keys = key.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, k) => {
            if (!obj[k]) obj[k] = {};
            return obj[k];
        }, this.config);
        
        target[lastKey] = value;
    }

    /**
     * Get command aliases
     * @returns {Object} Command aliases mapping
     */
    getAliases() {
        return { ...this.config.aliases };
    }

    /**
     * Add command alias
     * @param {string} alias - Alias name
     * @param {string} command - Full command name
     */
    addAlias(alias, command) {
        this.config.aliases[alias] = command;
    }

    /**
     * Remove command alias
     * @param {string} alias - Alias to remove
     */
    removeAlias(alias) {
        delete this.config.aliases[alias];
    }

    /**
     * Get session statistics
     * @returns {Object} Session statistics
     */
    getSessionStats() {
        const stats = {
            authenticated: this.isAuthenticated(),
            username: this.session.user?.username || null,
            lastLogin: this.session.lastLogin,
            tokenExpires: this.session.expiresAt,
            serverUrl: this.config.server,
            configDir: this.configDir
        };

        if (stats.tokenExpires) {
            const expiresAt = new Date(stats.tokenExpires);
            const now = new Date();
            stats.timeUntilExpiry = Math.max(0, Math.floor((expiresAt - now) / 1000));
        }

        return stats;
    }

    /**
     * Save all data (config and session)
     */
    async save() {
        await Promise.all([
            this.saveConfig(),
            this.saveSession()
        ]);
    }

    /**
     * Reset all configuration to defaults
     */
    async reset() {
        this.config = {
            server: 'http://localhost:3000',
            theme: 'classic',
            notifications: true,
            autoRefresh: 30,
            aliases: {
                's': 'status',
                'f': 'fleets',
                'q': 'quit',
                'h': 'help',
                'l': 'login'
            }
        };

        await this.clearSession();
        await this.saveConfig();
    }

    /**
     * Export configuration and session data
     * @returns {Object} Exportable data
     */
    exportData() {
        return {
            config: { ...this.config },
            session: {
                user: this.session.user,
                lastLogin: this.session.lastLogin
                // Exclude sensitive token data
            }
        };
    }

    /**
     * Import configuration data
     * @param {Object} data - Configuration data to import
     */
    async importData(data) {
        if (data.config) {
            this.config = { ...this.config, ...data.config };
            await this.saveConfig();
        }
        
        if (data.session?.user) {
            this.session.user = data.session.user;
            this.session.lastLogin = data.session.lastLogin;
            await this.saveSession();
        }
    }
}

/**
 * Custom session error class
 */
class SessionError extends Error {
    constructor(message, originalError = null) {
        super(message);
        this.name = 'SessionError';
        this.originalError = originalError;
    }
}

module.exports = SessionManager;