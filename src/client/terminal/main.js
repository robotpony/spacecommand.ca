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
            historySize: 100
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