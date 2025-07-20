#!/usr/bin/env node

const readline = require('readline');
const chalk = require('chalk');
const CommandParser = require('./parser/CommandParser');
const Terminal = require('./display/Terminal');
const SessionManager = require('./session/SessionManager');
const ApiClient = require('./api/ApiClient');

/**
 * SpaceCommand Terminal REPL Client
 * 
 * Provides a command-line interface for playing SpaceCommand with retro terminal aesthetics.
 * Handles user input, command parsing, API communication, and response formatting.
 */
class SpaceCommandREPL {
    constructor() {
        this.terminal = new Terminal();
        this.parser = new CommandParser();
        this.session = new SessionManager();
        this.api = new ApiClient();
        this.rl = null;
        this.running = false;
        this.commandHistory = [];
        this.historyIndex = 0;
    }

    /**
     * Initialize and start the REPL interface
     */
    async start() {
        this.terminal.showWelcomeBanner();
        
        try {
            await this.session.initialize();
            await this.api.initialize(this.session.getServerUrl());
            
            if (this.session.hasValidToken()) {
                await this.attemptAutoLogin();
            }
        } catch (error) {
            this.terminal.showError('Failed to initialize client', error.message);
        }

        this.setupReadline();
        this.running = true;
        this.showPrompt();
    }

    /**
     * Attempt automatic login using stored session token
     */
    async attemptAutoLogin() {
        try {
            const userInfo = await this.api.validateToken(this.session.getToken());
            this.session.setCurrentUser(userInfo);
            this.terminal.showSuccess(`Welcome back, ${userInfo.username}!`);
        } catch (error) {
            this.session.clearToken();
            this.terminal.showWarning('Session expired, please login again');
        }
    }

    /**
     * Setup readline interface with history and completion
     */
    setupReadline() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '',
            historySize: 100,
            completer: this.getCompletions.bind(this)
        });

        this.rl.on('line', async (input) => {
            await this.handleCommand(input.trim());
            this.showPrompt();
        });

        this.rl.on('close', () => {
            this.shutdown();
        });

        // Handle Ctrl+C gracefully
        process.on('SIGINT', () => {
            this.terminal.showInfo('\nUse "quit" or "exit" to leave SpaceCommand');
            this.showPrompt();
        });
    }

    /**
     * Process user command input
     * @param {string} input - Raw user input
     */
    async handleCommand(input) {
        if (!input) return;

        // Add to history
        this.commandHistory.push(input);
        if (this.commandHistory.length > 100) {
            this.commandHistory.shift();
        }

        try {
            const command = this.parser.parse(input);
            await this.executeCommand(command);
        } catch (error) {
            if (error.name === 'ParseError') {
                this.terminal.showError('Invalid command', error.message);
                this.terminal.showInfo('Type "help" for available commands');
            } else {
                this.terminal.showError('Command failed', error.message);
            }
        }
    }

    /**
     * Execute parsed command
     * @param {Object} command - Parsed command object
     */
    async executeCommand(command) {
        const { name, args, flags } = command;

        // Handle local commands that don't require API calls
        switch (name) {
            case 'help':
                this.showHelp(args[0]);
                return;
            case 'history':
                this.showHistory(parseInt(args[0]) || 10);
                return;
            case 'clear':
                this.terminal.clear();
                return;
            case 'quit':
            case 'exit':
                await this.shutdown();
                return;
        }

        // Handle commands that require authentication
        if (!this.session.isAuthenticated() && !['login', 'register'].includes(name)) {
            this.terminal.showError('Authentication required', 'Please login first');
            return;
        }

        // Execute API commands
        await this.executeApiCommand(command);
    }

    /**
     * Execute commands that interact with the API
     * @param {Object} command - Parsed command object
     */
    async executeApiCommand(command) {
        const { name, args, flags } = command;

        try {
            let result;

            switch (name) {
                case 'login':
                    result = await this.handleLogin(args);
                    break;
                case 'logout':
                    result = await this.handleLogout();
                    break;
                case 'register':
                    result = await this.handleRegister(args);
                    break;
                case 'whoami':
                    result = await this.handleWhoami();
                    break;
                case 'status':
                    result = await this.handleStatus();
                    break;
                case 'empire':
                    result = await this.handleEmpireDetails();
                    break;
                case 'planets':
                    result = await this.handlePlanets();
                    break;
                case 'resources':
                    result = await this.handleResources();
                    break;
                case 'fleets':
                    result = await this.handleFleets();
                    break;
                case 'fleet':
                    result = await this.handleFleetDetails(args);
                    break;
                case 'create-fleet':
                    result = await this.handleCreateFleet(args);
                    break;
                case 'move':
                    result = await this.handleMoveFleet(args);
                    break;
                case 'scan':
                    result = await this.handleScan(args);
                    break;
                case 'turn':
                    result = await this.handleTurnStatus();
                    break;
                case 'events':
                    result = await this.handleEvents(args);
                    break;
                case 'leaderboard':
                    result = await this.handleLeaderboard();
                    break;
                case 'attack':
                    result = await this.handleAttack(args);
                    break;
                case 'retreat':
                    result = await this.handleRetreat(args);
                    break;
                case 'merge':
                    result = await this.handleMergeFleets(args);
                    break;
                case 'disband':
                    result = await this.handleDisbandFleet(args);
                    break;
                case 'diplomacy':
                    result = await this.handleDiplomacy(args);
                    break;
                case 'explore':
                    result = await this.handleExplore(args);
                    break;
                case 'colonize':
                    result = await this.handleColonize(args);
                    break;
                case 'build':
                    result = await this.handleBuild(args);
                    break;
                case 'research':
                    result = await this.handleResearch(args);
                    break;
                default:
                    this.terminal.showError('Unknown command', `"${name}" is not a recognized command`);
                    return;
            }

            if (result && result.success !== false) {
                // Command executed successfully, result already displayed
            }
        } catch (error) {
            this.handleApiError(error);
        }
    }

    /**
     * Handle login command
     * @param {Array} args - Command arguments [username, password]
     */
    async handleLogin(args) {
        if (args.length === 0) {
            this.terminal.showError('Usage', 'login <username> [password]');
            return;
        }

        const username = args[0];
        let password = args[1];

        if (!password) {
            password = await this.terminal.promptPassword('Password: ');
        }

        const response = await this.api.login(username, password);
        this.session.setToken(response.token);
        this.session.setCurrentUser(response.user);
        
        this.terminal.showSuccess(`Welcome, ${response.user.username}!`);
        if (response.user.empire) {
            this.terminal.showInfo(`Empire: ${response.user.empire.name}`);
        }
    }

    /**
     * Handle logout command
     */
    async handleLogout() {
        try {
            await this.api.logout();
        } catch (error) {
            // Ignore logout errors, clear session anyway
        }
        
        this.session.clearToken();
        this.terminal.showSuccess('Logged out successfully');
    }

    /**
     * Handle register command
     * @param {Array} args - Command arguments [username, email, password]
     */
    async handleRegister(args) {
        if (args.length < 2) {
            this.terminal.showError('Usage', 'register <username> <email> [password]');
            return;
        }

        const username = args[0];
        const email = args[1];
        let password = args[2];

        if (!password) {
            password = await this.terminal.promptPassword('Password: ');
            const confirmPassword = await this.terminal.promptPassword('Confirm Password: ');
            
            if (password !== confirmPassword) {
                this.terminal.showError('Password mismatch', 'Passwords do not match');
                return;
            }
        }

        const response = await this.api.register(username, email, password);
        this.terminal.showSuccess('Registration successful!');
        this.terminal.showInfo('You can now login with your credentials');
    }

    /**
     * Handle whoami command
     */
    async handleWhoami() {
        const user = this.session.getCurrentUser();
        if (!user) {
            this.terminal.showError('Not authenticated', 'Please login first');
            return;
        }

        this.terminal.showInfo(`Username: ${user.username}`);
        this.terminal.showInfo(`Email: ${user.email}`);
        if (user.empire) {
            this.terminal.showInfo(`Empire: ${user.empire.name}`);
        }
    }

    /**
     * Handle status command
     */
    async handleStatus() {
        const response = await this.api.getEmpireStatus();
        this.terminal.displayEmpireStatus(response);
    }

    /**
     * Handle empire details command
     */
    async handleEmpireDetails() {
        const response = await this.api.getEmpireDetails();
        this.terminal.displayEmpireDetails(response);
    }

    /**
     * Handle planets command
     */
    async handlePlanets() {
        const planets = await this.api.getPlanets();
        this.terminal.displayPlanets(planets);
    }

    /**
     * Handle resources command
     */
    async handleResources() {
        const resources = await this.api.getResources();
        this.terminal.displayResources(resources);
    }

    /**
     * Handle fleets command
     */
    async handleFleets() {
        const fleets = await this.api.getFleets();
        this.terminal.displayFleets(fleets);
    }

    /**
     * Handle fleet details command
     * @param {Array} args - Command arguments [fleetId]
     */
    async handleFleetDetails(args) {
        if (args.length === 0) {
            this.terminal.showError('Usage', 'fleet <fleet-id>');
            return;
        }

        const fleetId = args[0];
        const fleet = await this.api.getFleet(fleetId);
        this.terminal.displayFleetDetails(fleet);
    }

    /**
     * Handle create fleet command
     * @param {Array} args - Command arguments [planetId, shipType, count, ...]
     */
    async handleCreateFleet(args) {
        if (args.length < 3) {
            this.terminal.showError('Usage', 'create-fleet <planet-id> <ship-type> <count> [ship-type count ...]');
            this.terminal.showInfo('Ship types: fighter, cruiser, battleship, dreadnought, carrier, support, scout');
            return;
        }

        const planetId = args[0];
        const shipComposition = {};

        // Parse ship type and count pairs
        for (let i = 1; i < args.length; i += 2) {
            const shipType = args[i];
            const count = parseInt(args[i + 1]);

            if (isNaN(count) || count <= 0) {
                this.terminal.showError('Invalid ship count', `"${args[i + 1]}" is not a valid number`);
                return;
            }

            shipComposition[shipType] = count;
        }

        const response = await this.api.createFleet(planetId, shipComposition);
        this.terminal.showSuccess(`Fleet created with ID: ${response.id}`);
        this.terminal.displayFleetDetails(response);
    }

    /**
     * Handle move fleet command
     * @param {Array} args - Command arguments [fleetId, destination]
     */
    async handleMoveFleet(args) {
        if (args.length < 2) {
            this.terminal.showError('Usage', 'move <fleet-id> <destination>');
            this.terminal.showInfo('Destination can be coordinates (x,y) or planet ID');
            return;
        }

        const fleetId = args[0];
        const destination = args[1];

        const response = await this.api.moveFleet(fleetId, destination);
        this.terminal.showSuccess(`Fleet ${fleetId} is moving to ${destination}`);
        if (response.eta) {
            this.terminal.showInfo(`Estimated arrival: ${response.eta}`);
        }
    }

    /**
     * Handle scan command
     * @param {Array} args - Command arguments [sector]
     */
    async handleScan(args) {
        const sector = args[0] || null;
        const response = await this.api.scanSector(sector);
        this.terminal.displayScanResults(response);
    }

    /**
     * Handle turn status command
     */
    async handleTurnStatus() {
        const response = await this.api.getTurnStatus();
        this.terminal.displayTurnStatus(response);
    }

    /**
     * Handle events command
     * @param {Array} args - Command arguments [limit]
     */
    async handleEvents(args) {
        const limit = parseInt(args[0]) || 10;
        const events = await this.api.getEvents(limit);
        this.terminal.displayEvents(events);
    }

    /**
     * Handle leaderboard command
     */
    async handleLeaderboard() {
        const response = await this.api.getLeaderboard();
        // Extract rankings array from response and transform to expected format
        const leaderboard = response.rankings ? response.rankings.map(entry => ({
            username: entry.player.alias || 'Unknown Commander',
            empire: { name: entry.empire.name },
            score: entry.score,
            planetCount: entry.breakdown?.planets || 0,
            fleetCount: entry.breakdown?.fleets || 0,
            rank: entry.rank
        })) : [];
        this.terminal.displayLeaderboard(leaderboard);
    }

    /**
     * Handle attack command
     * @param {Array} args - Command arguments [fleetId, targetId, attackType]
     */
    async handleAttack(args) {
        if (args.length < 2) {
            this.terminal.showError('Usage', 'attack <fleet-id> <target-id> [attack-type]');
            this.terminal.showInfo('Attack types: assault (default), raid, bombard');
            return;
        }

        const fleetId = args[0];
        const targetId = args[1];
        const attackType = args[2] || 'assault';

        const response = await this.api.attackTarget(fleetId, targetId, attackType);
        this.terminal.showSuccess(`${attackType.charAt(0).toUpperCase() + attackType.slice(1)} initiated!`);
        
        if (response.combatId) {
            this.terminal.showInfo(`Combat ID: ${response.combatId} - Use "combat-log ${response.combatId}" to view details`);
        }
    }

    /**
     * Handle retreat command
     * @param {Array} args - Command arguments [fleetId]
     */
    async handleRetreat(args) {
        if (args.length === 0) {
            this.terminal.showError('Usage', 'retreat <fleet-id>');
            return;
        }

        const fleetId = args[0];
        const response = await this.api.retreatFleet(fleetId);
        this.terminal.showSuccess(`Fleet ${fleetId} is retreating`);
        
        if (response.destination) {
            this.terminal.showInfo(`Retreating to: ${response.destination}`);
        }
    }

    /**
     * Handle merge fleets command
     * @param {Array} args - Command arguments [sourceFleetId, targetFleetId]
     */
    async handleMergeFleets(args) {
        if (args.length < 2) {
            this.terminal.showError('Usage', 'merge <source-fleet-id> <target-fleet-id>');
            return;
        }

        const sourceFleetId = args[0];
        const targetFleetId = args[1];

        const response = await this.api.mergeFleets(sourceFleetId, targetFleetId);
        this.terminal.showSuccess(`Fleet ${sourceFleetId} merged into Fleet ${targetFleetId}`);
        this.terminal.displayFleetDetails(response);
    }

    /**
     * Handle disband fleet command
     * @param {Array} args - Command arguments [fleetId]
     */
    async handleDisbandFleet(args) {
        if (args.length === 0) {
            this.terminal.showError('Usage', 'disband <fleet-id>');
            return;
        }

        const fleetId = args[0];
        await this.api.disbandFleet(fleetId);
        this.terminal.showSuccess(`Fleet ${fleetId} disbanded successfully`);
    }

    /**
     * Handle diplomacy command
     * @param {Array} args - Command arguments [action, ...params]
     */
    async handleDiplomacy(args) {
        if (args.length === 0) {
            this.terminal.showError('Usage', 'diplomacy <action> [params...]');
            this.terminal.showInfo('Actions: relations, propose, respond, message');
            return;
        }

        const action = args[0];
        const params = args.slice(1);

        switch (action) {
            case 'relations':
                const relations = await this.api.getDiplomaticRelations();
                this.terminal.displayDiplomaticRelations(relations);
                break;

            case 'propose':
                if (params.length < 2) {
                    this.terminal.showError('Usage', 'diplomacy propose <empire-id> <proposal-type> [terms...]');
                    return;
                }
                const targetEmpireId = params[0];
                const proposalType = params[1];
                const terms = params.slice(2);
                
                const proposal = await this.api.sendDiplomaticProposal(targetEmpireId, proposalType, { terms });
                this.terminal.showSuccess('Diplomatic proposal sent');
                break;

            case 'respond':
                if (params.length < 2) {
                    this.terminal.showError('Usage', 'diplomacy respond <proposal-id> <response>');
                    this.terminal.showInfo('Response: accept, reject, counter');
                    return;
                }
                const proposalId = params[0];
                const response = params[1];
                
                await this.api.respondToDiplomaticProposal(proposalId, response);
                this.terminal.showSuccess(`Responded "${response}" to proposal ${proposalId}`);
                break;

            case 'message':
                if (params.length < 2) {
                    this.terminal.showError('Usage', 'diplomacy message <empire-id> <message>');
                    return;
                }
                const messageTargetId = params[0];
                const message = params.slice(1).join(' ');
                
                await this.api.sendDiplomaticMessage(messageTargetId, message);
                this.terminal.showSuccess('Diplomatic message sent');
                break;

            default:
                this.terminal.showError('Unknown diplomacy action', `"${action}" is not recognized`);
        }
    }

    /**
     * Handle explore command
     * @param {Array} args - Command arguments [coordinates, fleetId]
     */
    async handleExplore(args) {
        if (args.length < 2) {
            this.terminal.showError('Usage', 'explore <coordinates> <fleet-id>');
            this.terminal.showInfo('Coordinates format: x,y (e.g., 5,10)');
            return;
        }

        const coordinates = args[0];
        const fleetId = args[1];

        const response = await this.api.exploreSector(coordinates, fleetId);
        this.terminal.showSuccess(`Fleet ${fleetId} exploring sector ${coordinates}`);
        this.terminal.displayScanResults(response);
    }

    /**
     * Handle colonize command
     * @param {Array} args - Command arguments [planetId, fleetId]
     */
    async handleColonize(args) {
        if (args.length < 2) {
            this.terminal.showError('Usage', 'colonize <planet-id> <fleet-id>');
            this.terminal.showInfo('Fleet must contain colony ships');
            return;
        }

        const planetId = args[0];
        const fleetId = args[1];

        const response = await this.api.colonizePlanet(planetId, fleetId);
        this.terminal.showSuccess(`Planet ${planetId} colonization initiated`);
        
        if (response.eta) {
            this.terminal.showInfo(`Colonization ETA: ${response.eta}`);
        }
    }

    /**
     * Handle build command
     * @param {Array} args - Command arguments [planetId, buildingType]
     */
    async handleBuild(args) {
        if (args.length < 2) {
            this.terminal.showError('Usage', 'build <planet-id> <building-type>');
            this.terminal.showInfo('Building types: mine, factory, lab, farm, shipyard, defense');
            return;
        }

        const planetId = args[0];
        const buildingType = args[1];

        const response = await this.api.buildStructure(planetId, buildingType);
        this.terminal.showSuccess(`${buildingType} construction started on planet ${planetId}`);
        
        if (response.completionTime) {
            this.terminal.showInfo(`Completion: ${response.completionTime}`);
        }
    }

    /**
     * Handle research command
     * @param {Array} args - Command arguments [technologyId or 'list']
     */
    async handleResearch(args) {
        if (args.length === 0) {
            this.terminal.showError('Usage', 'research <technology-id> OR research list');
            return;
        }

        if (args[0] === 'list') {
            const technologies = await this.api.getAvailableTechnologies();
            this.terminal.displayAvailableTechnologies(technologies);
            return;
        }

        const technologyId = args[0];
        const response = await this.api.researchTechnology(technologyId);
        this.terminal.showSuccess(`Research started: ${response.name || technologyId}`);
        
        if (response.completionTime) {
            this.terminal.showInfo(`Research completion: ${response.completionTime}`);
        }
    }

    /**
     * Show command help
     * @param {string} commandName - Specific command to show help for
     */
    showHelp(commandName) {
        if (commandName) {
            this.terminal.showCommandHelp(commandName);
        } else {
            this.terminal.showGeneralHelp();
        }
    }

    /**
     * Show command history
     * @param {number} limit - Number of recent commands to show
     */
    showHistory(limit = 10) {
        const recentHistory = this.commandHistory.slice(-limit);
        this.terminal.showHistory(recentHistory);
    }

    /**
     * Handle API errors with user-friendly messages
     * @param {Error} error - API error
     */
    handleApiError(error) {
        if (error.response) {
            const { status, data } = error.response;
            
            switch (status) {
                case 401:
                    this.session.clearToken();
                    this.terminal.showError('Authentication failed', 'Please login again');
                    break;
                case 403:
                    this.terminal.showError('Access denied', data.message || 'Insufficient permissions');
                    break;
                case 404:
                    this.terminal.showError('Not found', data.message || 'Resource not found');
                    break;
                case 429:
                    this.terminal.showError('Rate limited', 'Too many requests, please wait');
                    break;
                default:
                    this.terminal.showError('Server error', data.message || 'Request failed');
            }
        } else if (error.code === 'ECONNREFUSED') {
            this.terminal.showError('Connection failed', 'Cannot connect to server');
        } else {
            this.terminal.showError('Network error', error.message);
        }
    }

    /**
     * Get command completions for autocomplete
     * @param {string} line - Current input line
     * @returns {Array} Array of [completions, line]
     */
    getCompletions(line) {
        const commands = [
            // Authentication commands
            'login', 'logout', 'register', 'whoami',
            // Empire management
            'status', 'empire', 'planets', 'resources', 'build', 'research',
            // Fleet operations  
            'fleets', 'fleet', 'create-fleet', 'move', 'merge', 'disband',
            // Combat operations
            'attack', 'retreat', 'scan',
            // Exploration
            'explore', 'colonize',
            // Diplomacy
            'diplomacy',
            // Game info
            'turn', 'events', 'leaderboard',
            // Utility
            'help', 'history', 'clear', 'quit', 'exit'
        ];

        const hits = commands.filter(cmd => cmd.startsWith(line));
        return [hits.length ? hits : commands, line];
    }

    /**
     * Display the command prompt
     */
    showPrompt() {
        if (!this.running) return;
        
        const user = this.session.getCurrentUser();
        const prompt = this.terminal.formatPrompt(user);
        this.rl.setPrompt(prompt);
        this.rl.prompt();
    }

    /**
     * Shutdown the REPL gracefully
     */
    async shutdown() {
        if (!this.running) return;
        
        this.running = false;
        this.terminal.showInfo('Goodbye, Commander!');
        
        try {
            await this.session.save();
        } catch (error) {
            // Ignore save errors during shutdown
        }
        
        if (this.rl) {
            this.rl.close();
        }
        
        process.exit(0);
    }
}

// Start the REPL if this file is run directly
if (require.main === module) {
    const repl = new SpaceCommandREPL();
    repl.start().catch(error => {
        console.error(chalk.red('Failed to start SpaceCommand client:', error.message));
        process.exit(1);
    });
}

module.exports = SpaceCommandREPL;