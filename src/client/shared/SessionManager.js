/**
 * Session Manager for SpaceCommand Web Client
 * 
 * Browser-compatible version using localStorage for persistence.
 * Handles user session persistence, configuration management, and authentication state.
 */
export class SessionManager {
    constructor() {
        this.storagePrefix = 'spacecommand_';
        
        this.defaultConfig = {
            server: window.location.origin,
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
        
        this.defaultSession = {
            token: null,
            user: null,
            lastLogin: null,
            expiresAt: null
        };

        this.config = { ...this.defaultConfig };
        this.session = { ...this.defaultSession };
    }

    /**
     * Initialize session manager and load existing data
     */
    async initialize() {
        try {
            this.loadConfig();
            this.loadSession();
        } catch (error) {
            throw new SessionError('Failed to initialize session manager', error);
        }
    }

    /**
     * Load configuration from localStorage
     */
    loadConfig() {
        try {
            const configData = localStorage.getItem(this.storagePrefix + 'config');
            if (configData) {
                const savedConfig = JSON.parse(configData);
                this.config = { ...this.defaultConfig, ...savedConfig };
            }
        } catch (error) {
            console.warn('Failed to load configuration from localStorage:', error);
            this.config = { ...this.defaultConfig };
        }
    }

    /**
     * Save configuration to localStorage
     */
    saveConfig() {
        try {
            const data = JSON.stringify(this.config);
            localStorage.setItem(this.storagePrefix + 'config', data);
        } catch (error) {
            throw new SessionError('Failed to save configuration', error);
        }
    }

    /**
     * Load session data from localStorage
     */
    loadSession() {
        try {
            const sessionData = localStorage.getItem(this.storagePrefix + 'session');
            if (sessionData) {
                const savedSession = JSON.parse(sessionData);
                
                // Check if session is expired
                if (savedSession.expiresAt && new Date(savedSession.expiresAt) < new Date()) {
                    this.clearSession();
                    return;
                }
                
                this.session = { ...this.defaultSession, ...savedSession };
            }
        } catch (error) {
            console.warn('Failed to load session from localStorage:', error);
            this.session = { ...this.defaultSession };
        }
    }

    /**
     * Save session data to localStorage
     */
    saveSession() {
        try {
            const data = JSON.stringify(this.session);
            localStorage.setItem(this.storagePrefix + 'session', data);
        } catch (error) {
            throw new SessionError('Failed to save session', error);
        }
    }

    /**
     * Clear session data
     */
    clearSession() {
        this.session = { ...this.defaultSession };
        
        try {
            localStorage.removeItem(this.storagePrefix + 'session');
        } catch (error) {
            console.warn('Failed to clear session from localStorage:', error);
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
        this.saveSession();
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
        this.saveSession();
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
        this.saveSession();
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
        this.saveConfig();
    }

    /**
     * Get configuration value
     * @param {string} key - Configuration key (supports dot notation)
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
        this.saveConfig();
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
        this.saveConfig();
    }

    /**
     * Remove command alias
     * @param {string} alias - Alias to remove
     */
    removeAlias(alias) {
        delete this.config.aliases[alias];
        this.saveConfig();
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
            storageSupported: this.isStorageSupported()
        };

        if (stats.tokenExpires) {
            const expiresAt = new Date(stats.tokenExpires);
            const now = new Date();
            stats.timeUntilExpiry = Math.max(0, Math.floor((expiresAt - now) / 1000));
        }

        return stats;
    }

    /**
     * Check if localStorage is supported and available
     * @returns {boolean} True if storage is available
     */
    isStorageSupported() {
        try {
            const testKey = this.storagePrefix + 'test';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Save all data (config and session)
     */
    async save() {
        this.saveConfig();
        this.saveSession();
    }

    /**
     * Reset all configuration to defaults
     */
    async reset() {
        this.config = { ...this.defaultConfig };
        this.clearSession();
        this.saveConfig();
    }

    /**
     * Export configuration and session data (without sensitive info)
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
            this.config = { ...this.defaultConfig, ...data.config };
            this.saveConfig();
        }
        
        if (data.session?.user) {
            this.session.user = data.session.user;
            this.session.lastLogin = data.session.lastLogin;
            this.saveSession();
        }
    }

    /**
     * Clear all stored data (for logout or reset)
     */
    clearAllData() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.storagePrefix)) {
                    localStorage.removeItem(key);
                }
            });
            
            this.config = { ...this.defaultConfig };
            this.session = { ...this.defaultSession };
        } catch (error) {
            console.warn('Failed to clear all data:', error);
        }
    }

    /**
     * Get storage usage information
     * @returns {Object} Storage usage data
     */
    getStorageInfo() {
        try {
            const configSize = localStorage.getItem(this.storagePrefix + 'config')?.length || 0;
            const sessionSize = localStorage.getItem(this.storagePrefix + 'session')?.length || 0;
            
            return {
                configSize,
                sessionSize,
                totalSize: configSize + sessionSize,
                supported: this.isStorageSupported()
            };
        } catch (error) {
            return {
                configSize: 0,
                sessionSize: 0,
                totalSize: 0,
                supported: false,
                error: error.message
            };
        }
    }
}

/**
 * Custom session error class
 */
export class SessionError extends Error {
    constructor(message, originalError = null) {
        super(message);
        this.name = 'SessionError';
        this.originalError = originalError;
    }
}