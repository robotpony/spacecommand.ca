const chalk = require('chalk');
const readline = require('readline');

/**
 * Terminal Display Manager for SpaceCommand Client
 * 
 * Handles all terminal output formatting, colors, and user interface elements.
 * Provides methods for displaying game data, status information, and user prompts.
 */
class Terminal {
    constructor() {
        this.colorScheme = {
            primary: chalk.cyan,
            success: chalk.green,
            warning: chalk.yellow,
            error: chalk.red,
            info: chalk.blue,
            highlight: chalk.white.bold,
            dim: chalk.gray,
            resource: {
                metal: chalk.gray,
                energy: chalk.yellow,
                research: chalk.blue,
                food: chalk.green
            }
        };
    }

    /**
     * Display welcome banner on startup
     */
    showWelcomeBanner() {
        const banner = `
╔═══════════════════════════════════════════════════════════════════════╗
║                           SPACECOMMAND                                ║
║                    Terminal Command Interface                         ║
║                                                                       ║
║  Welcome, Commander. Your empire awaits your orders.                 ║
║  Type "help" for available commands or "login" to begin.             ║
╚═══════════════════════════════════════════════════════════════════════╝
`;
        console.log(this.colorScheme.primary(banner));
    }

    /**
     * Display success message with checkmark
     * @param {string} title - Success title
     * @param {string} message - Optional detailed message
     */
    showSuccess(title, message = '') {
        const icon = this.colorScheme.success('✓');
        const text = this.colorScheme.success(title);
        console.log(`${icon} ${text}${message ? ': ' + message : ''}`);
    }

    /**
     * Display error message with X mark
     * @param {string} title - Error title
     * @param {string} message - Optional detailed message
     */
    showError(title, message = '') {
        const icon = this.colorScheme.error('✗');
        const text = this.colorScheme.error(title);
        console.log(`${icon} ${text}${message ? ': ' + message : ''}`);
    }

    /**
     * Display warning message with warning symbol
     * @param {string} title - Warning title
     * @param {string} message - Optional detailed message
     */
    showWarning(title, message = '') {
        const icon = this.colorScheme.warning('⚠');
        const text = this.colorScheme.warning(title);
        console.log(`${icon} ${text}${message ? ': ' + message : ''}`);
    }

    /**
     * Display info message with info symbol
     * @param {string} title - Info title
     * @param {string} message - Optional detailed message
     */
    showInfo(title, message = '') {
        const icon = this.colorScheme.info('ℹ');
        const text = this.colorScheme.info(title);
        console.log(`${icon} ${text}${message ? ': ' + message : ''}`);
    }

    /**
     * Display empire status information
     * @param {Object} status - Empire status data
     */
    displayEmpireStatus(status) {
        console.log(this.colorScheme.highlight('\n=== EMPIRE STATUS ==='));
        
        // Basic empire info
        console.log(`Empire: ${this.colorScheme.primary(status.empire.name)}`);
        console.log(`Ruler: ${status.empire.ruler}`);
        console.log(`Turn: ${this.colorScheme.highlight(status.turn)} (${status.timeRemaining})`);
        console.log(`Action Points: ${this.colorScheme.highlight(status.actionPoints)}/10`);
        
        // Resources
        console.log(this.colorScheme.highlight('\n--- RESOURCES ---'));
        const resources = status.resources;
        console.log(`Metal:    ${this.colorScheme.resource.metal(resources.metal.toLocaleString())}`);
        console.log(`Energy:   ${this.colorScheme.resource.energy(resources.energy.toLocaleString())}`);
        console.log(`Research: ${this.colorScheme.resource.research(resources.research.toLocaleString())}`);
        console.log(`Food:     ${this.colorScheme.resource.food(resources.food.toLocaleString())}`);
        
        // Fleet summary
        if (status.fleets && status.fleets.length > 0) {
            console.log(this.colorScheme.highlight('\n--- FLEETS ---'));
            console.log(`Active Fleets: ${status.fleets.length}`);
            console.log(`Total Ships: ${status.fleets.reduce((sum, f) => sum + f.totalShips, 0)}`);
        }
        
        // Planet summary
        if (status.planets && status.planets.length > 0) {
            console.log(this.colorScheme.highlight('\n--- PLANETS ---'));
            console.log(`Controlled Planets: ${status.planets.length}`);
            console.log(`Total Population: ${status.planets.reduce((sum, p) => sum + p.population, 0).toLocaleString()}`);
        }
        
        console.log(); // Empty line for spacing
    }

    /**
     * Display command history
     * @param {Array} history - Array of recent commands
     */
    showHistory(history) {
        console.log(this.colorScheme.highlight('\n=== COMMAND HISTORY ==='));
        
        if (history.length === 0) {
            console.log(this.colorScheme.dim('No commands in history'));
            return;
        }
        
        history.forEach((cmd, index) => {
            const num = this.colorScheme.dim(`${index + 1}.`.padStart(3));
            console.log(`${num} ${cmd}`);
        });
        
        console.log();
    }

    /**
     * Display general help information
     */
    showGeneralHelp() {
        const help = `
${this.colorScheme.highlight('SPACECOMMAND TERMINAL HELP')}

${this.colorScheme.primary('AUTHENTICATION COMMANDS:')}
  login <username> [password]     - Authenticate with server
  logout                          - End current session  
  register <username> <email>     - Create new account
  whoami                          - Show current user info

${this.colorScheme.primary('EMPIRE MANAGEMENT:')}
  status                          - Empire overview with resources
  empire                          - Detailed empire information
  planets                         - List all planets
  resources                       - Resource inventory

${this.colorScheme.primary('FLEET OPERATIONS:')}
  fleets                          - List all fleets
  fleet <id>                      - Detailed fleet information
  create-fleet <planet> <ships>   - Create new fleet
  move <fleet> <destination>      - Move fleet

${this.colorScheme.primary('UTILITY COMMANDS:')}
  help [command]                  - Show help information
  history [limit]                 - Show command history
  clear                           - Clear terminal screen
  quit / exit                     - Exit the client

${this.colorScheme.dim('Use "help <command>" for detailed information about a specific command.')}
${this.colorScheme.dim('Commands can be abbreviated: "s" for status, "f" for fleets, etc.')}
`;
        console.log(help);
    }

    /**
     * Display help for a specific command
     * @param {string} commandName - Command to show help for
     */
    showCommandHelp(commandName) {
        const helpData = {
            login: {
                usage: 'login <username> [password]',
                description: 'Authenticate with the SpaceCommand server',
                examples: ['login admiral_kirk', 'login spock mypassword']
            },
            status: {
                usage: 'status',
                description: 'Display empire overview including resources, fleets, and planets',
                examples: ['status', 's']
            },
            fleets: {
                usage: 'fleets [--verbose]',
                description: 'List all fleets with their current status and location',
                examples: ['fleets', 'f', 'fleets --verbose']
            }
        };

        const help = helpData[commandName];
        if (!help) {
            this.showError('Unknown command', `No help available for "${commandName}"`);
            return;
        }

        console.log(this.colorScheme.highlight(`\nHELP: ${commandName.toUpperCase()}`));
        console.log(`Usage: ${this.colorScheme.primary(help.usage)}`);
        console.log(`\n${help.description}`);
        
        if (help.examples && help.examples.length > 0) {
            console.log(`\n${this.colorScheme.dim('Examples:')}`);
            help.examples.forEach(example => {
                console.log(`  ${this.colorScheme.dim('$')} ${example}`);
            });
        }
        
        console.log();
    }

    /**
     * Format command prompt with current user context
     * @param {Object} user - Current user object
     * @returns {string} Formatted prompt string
     */
    formatPrompt(user) {
        const prefix = this.colorScheme.dim('[SpaceCommand]');
        
        if (user && user.username) {
            const username = this.colorScheme.primary(user.username);
            const arrow = this.colorScheme.dim('>');
            return `${prefix} ${username} ${arrow} `;
        } else {
            const guest = this.colorScheme.dim('Guest');
            const arrow = this.colorScheme.dim('>');
            return `${prefix} ${guest} ${arrow} `;
        }
    }

    /**
     * Prompt user for password input (hidden)
     * @param {string} prompt - Prompt text
     * @returns {Promise<string>} User password input
     */
    promptPassword(prompt) {
        return new Promise((resolve) => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            // Hide input
            rl.stdoutMuted = true;
            rl._writeToOutput = function(stringToWrite) {
                if (rl.stdoutMuted) {
                    rl.output.write('*');
                } else {
                    rl.output.write(stringToWrite);
                }
            };

            rl.question(prompt, (password) => {
                rl.close();
                console.log(); // New line after password input
                resolve(password);
            });
        });
    }

    /**
     * Clear the terminal screen
     */
    clear() {
        console.clear();
    }

    /**
     * Display formatted table
     * @param {Array} headers - Table headers
     * @param {Array} rows - Table data rows
     * @param {Object} options - Formatting options
     */
    displayTable(headers, rows, options = {}) {
        if (!rows || rows.length === 0) {
            console.log(this.colorScheme.dim('No data to display'));
            return;
        }

        // Calculate column widths
        const widths = headers.map((header, index) => {
            const maxWidth = Math.max(
                header.length,
                ...rows.map(row => String(row[index] || '').length)
            );
            return Math.min(maxWidth, options.maxColumnWidth || 30);
        });

        // Display header
        const headerRow = headers.map((header, index) => 
            this.colorScheme.highlight(header.padEnd(widths[index]))
        ).join(' │ ');
        
        const separator = widths.map(width => '─'.repeat(width)).join('─┼─');
        
        console.log(`┌─${separator}─┐`);
        console.log(`│ ${headerRow} │`);
        console.log(`├─${separator}─┤`);
        
        // Display rows
        rows.forEach(row => {
            const formattedRow = row.map((cell, index) => {
                const cellStr = String(cell || '');
                return cellStr.length > widths[index] 
                    ? cellStr.substring(0, widths[index] - 3) + '...'
                    : cellStr.padEnd(widths[index]);
            }).join(' │ ');
            
            console.log(`│ ${formattedRow} │`);
        });
        
        console.log(`└─${separator}─┘`);
    }

    /**
     * Display progress bar
     * @param {number} progress - Progress value (0-1)
     * @param {string} label - Progress label
     * @param {Object} options - Display options
     */
    displayProgress(progress, label, options = {}) {
        const width = options.width || 20;
        const filled = Math.round(progress * width);
        const empty = width - filled;
        
        const bar = '█'.repeat(filled) + '░'.repeat(empty);
        const percentage = Math.round(progress * 100);
        
        const coloredBar = progress > 0.7 
            ? this.colorScheme.success(bar)
            : progress > 0.3 
                ? this.colorScheme.warning(bar) 
                : this.colorScheme.error(bar);
        
        console.log(`${label}: [${coloredBar}] ${percentage}%`);
    }
}

module.exports = Terminal;