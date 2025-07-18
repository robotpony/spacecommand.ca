/**
 * HTTP API Client for SpaceCommand Web Client
 * 
 * Browser-compatible version using fetch() API.
 * Handles all HTTP communication with the SpaceCommand server including
 * authentication, request retries, error handling, and response formatting.
 */
export class ApiClient {
    constructor() {
        this.baseURL = null;
        this.authToken = null;
        this.retryCount = 3;
        this.timeout = 30000;
    }

    /**
     * Initialize the API client with server configuration
     * @param {string} baseURL - Server base URL
     */
    async initialize(baseURL = window.location.origin) {
        this.baseURL = baseURL;
        await this.testConnection();
    }

    /**
     * Test connection to the server
     */
    async testConnection() {
        try {
            await this.fetchWithTimeout('/api/health');
        } catch (error) {
            throw new ApiError('Cannot connect to SpaceCommand server', 0, error);
        }
    }

    /**
     * Make HTTP request with timeout and retry logic
     * @param {string} path - API endpoint path
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>} Response object
     */
    async fetchWithTimeout(path, options = {}) {
        const url = path.startsWith('http') ? path : `${this.baseURL}${path}`;
        
        const config = {
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add authentication header if token exists
        if (this.authToken) {
            config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        config.signal = controller.signal;

        try {
            const response = await fetch(url, config);
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new ApiError(
                    errorData.message || errorData.error || 'Request failed',
                    response.status
                );
            }
            
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new ApiError('Request timeout', 0);
            }
            
            if (error instanceof ApiError) {
                throw error;
            }
            
            throw new ApiError('Network error', 0, error);
        }
    }

    /**
     * Make JSON API request
     * @param {string} path - API endpoint path
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
    async request(path, options = {}) {
        let lastError;
        
        for (let attempt = 0; attempt <= this.retryCount; attempt++) {
            try {
                const response = await this.fetchWithTimeout(path, options);
                return await response.json();
            } catch (error) {
                lastError = error;
                
                // Don't retry client errors (4xx)
                if (error.status >= 400 && error.status < 500) {
                    break;
                }
                
                // Don't retry on last attempt
                if (attempt === this.retryCount) {
                    break;
                }
                
                // Exponential backoff
                const delay = Math.pow(2, attempt + 1) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw this.formatError(lastError);
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
        const data = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        this.authToken = data.token;
        return data;
    }

    /**
     * Register new user account
     * @param {string} username - Desired username
     * @param {string} email - User's email address
     * @param {string} password - User's password
     * @returns {Object} Registration response
     */
    async register(username, email, password) {
        return await this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
    }

    /**
     * Logout current user
     * @returns {Object} Logout response
     */
    async logout() {
        try {
            const data = await this.request('/api/auth/logout', { method: 'POST' });
            this.authToken = null;
            return data;
        } catch (error) {
            this.authToken = null;
            throw error;
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
            return await this.request('/api/auth/profile');
        } catch (error) {
            this.authToken = null;
            throw error;
        }
    }

    /**
     * Get empire status and overview
     * @returns {Object} Empire status data
     */
    async getEmpireStatus() {
        return await this.request('/api/empire');
    }

    /**
     * Get detailed empire information
     * @returns {Object} Detailed empire data
     */
    async getEmpireDetails() {
        return await this.request('/api/empire/details');
    }

    /**
     * Get empire resources
     * @returns {Object} Resource data
     */
    async getResources() {
        return await this.request('/api/empire/resources');
    }

    /**
     * Get empire planets
     * @returns {Array} List of empire planets
     */
    async getPlanets() {
        return await this.request('/api/empire/planets');
    }

    /**
     * Get empire fleets
     * @returns {Array} List of empire fleets
     */
    async getFleets() {
        return await this.request('/api/fleets');
    }

    /**
     * Get detailed fleet information
     * @param {string} fleetId - Fleet ID
     * @returns {Object} Fleet details
     */
    async getFleet(fleetId) {
        return await this.request(`/api/fleets/${fleetId}`);
    }

    /**
     * Create new fleet
     * @param {string} planetId - Source planet ID
     * @param {Object} shipComposition - Ships to include in fleet
     * @returns {Object} Created fleet data
     */
    async createFleet(planetId, shipComposition) {
        return await this.request('/api/fleets', {
            method: 'POST',
            body: JSON.stringify({
                planetId,
                ships: shipComposition
            })
        });
    }

    /**
     * Move fleet to destination
     * @param {string} fleetId - Fleet ID
     * @param {string} destination - Destination coordinates or planet ID
     * @returns {Object} Movement response
     */
    async moveFleet(fleetId, destination) {
        return await this.request(`/api/fleets/${fleetId}/move`, {
            method: 'POST',
            body: JSON.stringify({ destination })
        });
    }

    /**
     * Get current game turn information
     * @returns {Object} Turn data
     */
    async getTurnStatus() {
        return await this.request('/api/game/status');
    }

    /**
     * Get recent game events
     * @param {number} limit - Number of events to retrieve
     * @returns {Array} Recent events
     */
    async getEvents(limit = 10) {
        return await this.request(`/api/game/events?limit=${limit}`);
    }

    /**
     * Get player leaderboard
     * @returns {Array} Leaderboard data
     */
    async getLeaderboard() {
        return await this.request('/api/game/leaderboard');
    }

    /**
     * Scan sector for planets and fleets
     * @param {string} sector - Sector coordinates (optional)
     * @returns {Object} Scan results
     */
    async scanSector(sector = null) {
        const url = sector ? `/api/territory/scan/${sector}` : '/api/territory/scan';
        return await this.request(url);
    }

    /**
     * Attack another fleet or planet
     * @param {string} fleetId - Attacking fleet ID
     * @param {string} targetId - Target fleet or planet ID
     * @param {string} attackType - Type of attack (assault, raid, bombard)
     * @returns {Object} Attack response
     */
    async attackTarget(fleetId, targetId, attackType = 'assault') {
        return await this.request(`/api/combat/${attackType}`, {
            method: 'POST',
            body: JSON.stringify({ fleetId, targetId })
        });
    }

    /**
     * Retreat fleet from combat
     * @param {string} fleetId - Fleet ID
     * @returns {Object} Retreat response
     */
    async retreatFleet(fleetId) {
        return await this.request(`/api/fleets/${fleetId}/retreat`, {
            method: 'POST'
        });
    }

    /**
     * Merge fleets together
     * @param {string} sourceFleetId - Source fleet ID
     * @param {string} targetFleetId - Target fleet ID
     * @returns {Object} Merge response
     */
    async mergeFleets(sourceFleetId, targetFleetId) {
        return await this.request(`/api/fleets/${targetFleetId}/merge`, {
            method: 'POST',
            body: JSON.stringify({ sourceFleetId })
        });
    }

    /**
     * Disband a fleet
     * @param {string} fleetId - Fleet ID to disband
     * @returns {Object} Disband response
     */
    async disbandFleet(fleetId) {
        return await this.request(`/api/fleets/${fleetId}`, {
            method: 'DELETE'
        });
    }

    /**
     * Get diplomatic relations
     * @returns {Array} Diplomatic relations
     */
    async getDiplomaticRelations() {
        return await this.request('/api/diplomacy/relations');
    }

    /**
     * Send diplomatic proposal
     * @param {string} targetEmpireId - Target empire ID
     * @param {string} proposalType - Type of proposal
     * @param {Object} terms - Proposal terms
     * @returns {Object} Proposal response
     */
    async sendDiplomaticProposal(targetEmpireId, proposalType, terms) {
        return await this.request('/api/diplomacy/proposals', {
            method: 'POST',
            body: JSON.stringify({ targetEmpireId, proposalType, terms })
        });
    }

    /**
     * Respond to diplomatic proposal
     * @param {string} proposalId - Proposal ID
     * @param {string} response - Response (accept, reject, counter)
     * @param {Object} counterTerms - Counter-proposal terms
     * @returns {Object} Response result
     */
    async respondToDiplomaticProposal(proposalId, response, counterTerms = null) {
        const payload = { response };
        if (counterTerms) {
            payload.counterTerms = counterTerms;
        }
        
        return await this.request(`/api/diplomacy/proposals/${proposalId}/respond`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    /**
     * Send diplomatic message
     * @param {string} targetEmpireId - Target empire ID
     * @param {string} message - Message content
     * @returns {Object} Message response
     */
    async sendDiplomaticMessage(targetEmpireId, message) {
        return await this.request('/api/diplomacy/messages', {
            method: 'POST',
            body: JSON.stringify({ targetEmpireId, message })
        });
    }

    /**
     * Explore new sector
     * @param {string} coordinates - Sector coordinates to explore
     * @param {string} fleetId - Fleet ID for exploration
     * @returns {Object} Exploration results
     */
    async exploreSector(coordinates, fleetId) {
        return await this.request('/api/territory/explore', {
            method: 'POST',
            body: JSON.stringify({ coordinates, fleetId })
        });
    }

    /**
     * Colonize planet
     * @param {string} planetId - Planet ID to colonize
     * @param {string} fleetId - Fleet ID with colony ships
     * @returns {Object} Colonization response
     */
    async colonizePlanet(planetId, fleetId) {
        return await this.request(`/api/territory/colonize/${planetId}`, {
            method: 'POST',
            body: JSON.stringify({ fleetId })
        });
    }

    /**
     * Build structure on planet
     * @param {string} planetId - Planet ID
     * @param {string} buildingType - Type of building to construct
     * @returns {Object} Construction response
     */
    async buildStructure(planetId, buildingType) {
        return await this.request(`/api/empire/planets/${planetId}/build`, {
            method: 'POST',
            body: JSON.stringify({ buildingType })
        });
    }

    /**
     * Research technology
     * @param {string} technologyId - Technology ID to research
     * @returns {Object} Research response
     */
    async researchTechnology(technologyId) {
        return await this.request('/api/empire/research', {
            method: 'POST',
            body: JSON.stringify({ technologyId })
        });
    }

    /**
     * Get available technologies for research
     * @returns {Array} Available technologies
     */
    async getAvailableTechnologies() {
        return await this.request('/api/empire/research/available');
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
        
        return new ApiError(error.message || 'Unknown error', 0, error);
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
export class ApiError extends Error {
    constructor(message, status = 0, originalError = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.originalError = originalError;
    }
}