const axios = require('axios');

/**
 * HTTP API Client for SpaceCommand Terminal
 * 
 * Handles all HTTP communication with the SpaceCommand server including
 * authentication, request retries, error handling, and response formatting.
 */
class ApiClient {
    constructor() {
        this.client = null;
        this.baseURL = null;
        this.authToken = null;
        this.retryCount = 3;
        this.timeout = 30000;
    }

    /**
     * Initialize the API client with server configuration
     * @param {string} baseURL - Server base URL
     */
    async initialize(baseURL = 'http://localhost:3000') {
        this.baseURL = baseURL;
        this.client = axios.create({
            baseURL: `${baseURL}/api`,
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'SpaceCommand-Terminal/1.0'
            }
        });

        this.setupInterceptors();
        await this.testConnection();
    }

    /**
     * Setup request and response interceptors
     */
    setupInterceptors() {
        // Request interceptor for authentication
        this.client.interceptors.request.use(
            (config) => {
                if (this.authToken) {
                    config.headers.Authorization = `Bearer ${this.authToken}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;

                // Handle 401 errors
                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;
                    this.authToken = null;
                    return Promise.reject(new ApiError('Authentication expired', 401));
                }

                // Handle network errors with retry
                if (!error.response && originalRequest._retryCount < this.retryCount) {
                    originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
                    
                    // Exponential backoff
                    const delay = Math.pow(2, originalRequest._retryCount) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                    
                    return this.client.request(originalRequest);
                }

                return Promise.reject(this.formatError(error));
            }
        );
    }

    /**
     * Test connection to the server
     */
    async testConnection() {
        try {
            await this.client.get('/health');
        } catch (error) {
            throw new ApiError('Cannot connect to SpaceCommand server', 0, error);
        }
    }

    /**
     * Set authentication token
     * @param {string} token - JWT authentication token
     */
    setAuthToken(token) {
        this.authToken = token;
    }

    /**
     * Clear authentication token
     */
    clearAuthToken() {
        this.authToken = null;
    }

    /**
     * Authenticate user with username and password
     * @param {string} username - User's username
     * @param {string} password - User's password
     * @returns {Object} Authentication response with token and user data
     */
    async login(username, password) {
        try {
            const response = await this.client.post('/auth/login', {
                username,
                password
            });

            this.authToken = response.data.token;
            return response.data;
        } catch (error) {
            throw this.formatError(error);
        }
    }

    /**
     * Register new user account
     * @param {string} username - Desired username
     * @param {string} email - User's email address
     * @param {string} password - User's password
     * @returns {Object} Registration response
     */
    async register(username, email, password) {
        try {
            const response = await this.client.post('/auth/register', {
                username,
                email,
                password
            });

            return response.data;
        } catch (error) {
            throw this.formatError(error);
        }
    }

    /**
     * Logout current user
     * @returns {Object} Logout response
     */
    async logout() {
        try {
            const response = await this.client.post('/auth/logout');
            this.authToken = null;
            return response.data;
        } catch (error) {
            throw this.formatError(error);
        }
    }

    /**
     * Validate authentication token
     * @param {string} token - Token to validate
     * @returns {Object} User information if token is valid
     */
    async validateToken(token) {
        try {
            this.authToken = token;
            const response = await this.client.get('/auth/profile');
            return response.data;
        } catch (error) {
            this.authToken = null;
            throw this.formatError(error);
        }
    }

    /**
     * Get empire status and overview
     * @returns {Object} Empire status data
     */
    async getEmpireStatus() {
        try {
            const response = await this.client.get('/empire');
            return response.data;
        } catch (error) {
            throw this.formatError(error);
        }
    }

    /**
     * Get detailed empire information
     * @returns {Object} Detailed empire data
     */
    async getEmpireDetails() {
        try {
            const response = await this.client.get('/empire/details');
            return response.data;
        } catch (error) {
            throw this.formatError(error);
        }
    }

    /**
     * Get empire resources
     * @returns {Object} Resource data
     */
    async getResources() {
        try {
            const response = await this.client.get('/empire/resources');
            return response.data;
        } catch (error) {
            throw this.formatError(error);
        }
    }

    /**
     * Get empire planets
     * @returns {Array} List of empire planets
     */
    async getPlanets() {
        try {
            const response = await this.client.get('/empire/planets');
            return response.data;
        } catch (error) {
            throw this.formatError(error);
        }
    }

    /**
     * Get empire fleets
     * @returns {Array} List of empire fleets
     */
    async getFleets() {
        try {
            const response = await this.client.get('/fleets');
            return response.data;
        } catch (error) {
            throw this.formatError(error);
        }
    }

    /**
     * Get detailed fleet information
     * @param {string} fleetId - Fleet ID
     * @returns {Object} Fleet details
     */
    async getFleet(fleetId) {
        try {
            const response = await this.client.get(`/fleets/${fleetId}`);
            return response.data;
        } catch (error) {
            throw this.formatError(error);
        }
    }

    /**
     * Create new fleet
     * @param {string} planetId - Source planet ID
     * @param {Object} shipComposition - Ships to include in fleet
     * @returns {Object} Created fleet data
     */
    async createFleet(planetId, shipComposition) {
        try {
            const response = await this.client.post('/fleets', {
                planetId,
                ships: shipComposition
            });
            return response.data;
        } catch (error) {
            throw this.formatError(error);
        }
    }

    /**
     * Move fleet to destination
     * @param {string} fleetId - Fleet ID
     * @param {string} destination - Destination coordinates or planet ID
     * @returns {Object} Movement response
     */
    async moveFleet(fleetId, destination) {
        try {
            const response = await this.client.post(`/fleets/${fleetId}/move`, {
                destination
            });
            return response.data;
        } catch (error) {
            throw this.formatError(error);
        }
    }

    /**
     * Get current game turn information
     * @returns {Object} Turn data
     */
    async getTurnStatus() {
        try {
            const response = await this.client.get('/game/status');
            return response.data;
        } catch (error) {
            throw this.formatError(error);
        }
    }

    /**
     * Get recent game events
     * @param {number} limit - Number of events to retrieve
     * @returns {Array} Recent events
     */
    async getEvents(limit = 10) {
        try {
            const response = await this.client.get(`/game/events?limit=${limit}`);
            return response.data;
        } catch (error) {
            throw this.formatError(error);
        }
    }

    /**
     * Get player leaderboard
     * @returns {Array} Leaderboard data
     */
    async getLeaderboard() {
        try {
            const response = await this.client.get('/game/leaderboard');
            return response.data;
        } catch (error) {
            throw this.formatError(error);
        }
    }

    /**
     * Scan sector for planets and fleets
     * @param {string} sector - Sector coordinates (optional)
     * @returns {Object} Scan results
     */
    async scanSector(sector = null) {
        try {
            const url = sector ? `/territory/scan/${sector}` : '/territory/scan';
            const response = await this.client.get(url);
            return response.data;
        } catch (error) {
            throw this.formatError(error);
        }
    }

    /**
     * Format error for consistent error handling
     * @param {Error} error - Raw error object
     * @returns {ApiError} Formatted API error
     */
    formatError(error) {
        if (error instanceof ApiError) {
            return error;
        }

        if (error.response) {
            // Server responded with error status
            const { status, data } = error.response;
            const message = data?.message || data?.error || 'Server error';
            return new ApiError(message, status, error);
        } else if (error.request) {
            // Request made but no response received
            return new ApiError('Network error - no response from server', 0, error);
        } else {
            // Something else happened
            return new ApiError(error.message || 'Unknown error', 0, error);
        }
    }

    /**
     * Check if client is authenticated
     * @returns {boolean} True if authenticated
     */
    isAuthenticated() {
        return !!this.authToken;
    }

    /**
     * Get current authentication token
     * @returns {string|null} Current token or null
     */
    getAuthToken() {
        return this.authToken;
    }
}

/**
 * Custom API Error class
 */
class ApiError extends Error {
    constructor(message, status = 0, originalError = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.originalError = originalError;
        this.response = originalError?.response || null;
    }
}

module.exports = ApiClient;