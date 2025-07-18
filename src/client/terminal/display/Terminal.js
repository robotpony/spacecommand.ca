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
  build <planet> <building>       - Construct buildings
  research <tech-id> | list       - Research technologies

${this.colorScheme.primary('FLEET OPERATIONS:')}
  fleets                          - List all fleets
  fleet <id>                      - Detailed fleet information
  create-fleet <planet> <ships>   - Create new fleet
  move <fleet> <destination>      - Move fleet
  merge <source> <target>         - Merge two fleets
  disband <fleet>                 - Disband fleet

${this.colorScheme.primary('COMBAT OPERATIONS:')}
  attack <fleet> <target> [type]  - Attack target (assault/raid/bombard)
  retreat <fleet>                 - Retreat from combat
  scan [sector]                   - Scan for enemies and planets

${this.colorScheme.primary('EXPLORATION & EXPANSION:')}
  explore <coords> <fleet>        - Explore new sector
  colonize <planet> <fleet>       - Colonize planet
  scan [sector]                   - Scan sector for objects

${this.colorScheme.primary('DIPLOMACY:')}
  diplomacy relations             - Show diplomatic relations
  diplomacy propose <empire> <type> - Send diplomatic proposal
  diplomacy respond <id> <reply>  - Respond to proposal
  diplomacy message <empire> <msg> - Send diplomatic message

${this.colorScheme.primary('GAME INFO:')}
  turn                            - Show turn status
  events [limit]                  - Show recent events
  leaderboard                     - Show player rankings

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

    /**
     * Display detailed empire information
     * @param {Object} empire - Empire details data
     */
    displayEmpireDetails(empire) {
        console.log(this.colorScheme.highlight('\n=== EMPIRE DETAILS ==='));
        
        console.log(`Name: ${this.colorScheme.primary(empire.name)}`);
        console.log(`Ruler: ${empire.ruler}`);
        console.log(`Founded: ${new Date(empire.created).toLocaleDateString()}`);
        console.log(`Government: ${empire.government || 'Democracy'}`);
        
        if (empire.description) {
            console.log(`\nDescription: ${empire.description}`);
        }
        
        console.log(this.colorScheme.highlight('\n--- STATISTICS ---'));
        console.log(`Total Planets: ${empire.totalPlanets || 0}`);
        console.log(`Total Population: ${(empire.totalPopulation || 0).toLocaleString()}`);
        console.log(`Fleet Strength: ${empire.fleetStrength || 0}`);
        console.log(`Research Level: ${empire.researchLevel || 1}`);
        
        console.log();
    }

    /**
     * Display planets list
     * @param {Array} planets - Array of planet objects
     */
    displayPlanets(planets) {
        console.log(this.colorScheme.highlight('\n=== PLANETS ==='));
        
        if (!planets || planets.length === 0) {
            console.log(this.colorScheme.dim('No planets found'));
            return;
        }

        const headers = ['ID', 'Name', 'Type', 'Population', 'Buildings', 'Defenses'];
        const rows = planets.map(planet => [
            planet.id,
            planet.name,
            planet.type || 'Balanced',
            (planet.population || 0).toLocaleString(),
            Object.keys(planet.buildings || {}).length,
            planet.defenses || 0
        ]);

        this.displayTable(headers, rows);
        console.log();
    }

    /**
     * Display resource information
     * @param {Object} resources - Resource data
     */
    displayResources(resources) {
        console.log(this.colorScheme.highlight('\n=== RESOURCES ==='));
        
        // Current resources
        console.log(this.colorScheme.highlight('\n--- CURRENT INVENTORY ---'));
        console.log(`Metal:    ${this.colorScheme.resource.metal(resources.current.metal.toLocaleString())}`);
        console.log(`Energy:   ${this.colorScheme.resource.energy(resources.current.energy.toLocaleString())}`);
        console.log(`Research: ${this.colorScheme.resource.research(resources.current.research.toLocaleString())}`);
        console.log(`Food:     ${this.colorScheme.resource.food(resources.current.food.toLocaleString())}`);
        
        // Production rates
        if (resources.production) {
            console.log(this.colorScheme.highlight('\n--- PRODUCTION PER TURN ---'));
            console.log(`Metal:    ${this.colorScheme.resource.metal('+' + resources.production.metal.toLocaleString())}`);
            console.log(`Energy:   ${this.colorScheme.resource.energy('+' + resources.production.energy.toLocaleString())}`);
            console.log(`Research: ${this.colorScheme.resource.research('+' + resources.production.research.toLocaleString())}`);
            console.log(`Food:     ${this.colorScheme.resource.food('+' + resources.production.food.toLocaleString())}`);
        }
        
        // Consumption rates
        if (resources.consumption) {
            console.log(this.colorScheme.highlight('\n--- CONSUMPTION PER TURN ---'));
            console.log(`Metal:    ${this.colorScheme.dim('-' + resources.consumption.metal.toLocaleString())}`);
            console.log(`Energy:   ${this.colorScheme.dim('-' + resources.consumption.energy.toLocaleString())}`);
            console.log(`Research: ${this.colorScheme.dim('-' + resources.consumption.research.toLocaleString())}`);
            console.log(`Food:     ${this.colorScheme.dim('-' + resources.consumption.food.toLocaleString())}`);
        }
        
        console.log();
    }

    /**
     * Display fleets list
     * @param {Array} fleets - Array of fleet objects
     */
    displayFleets(fleets) {
        console.log(this.colorScheme.highlight('\n=== FLEETS ==='));
        
        if (!fleets || fleets.length === 0) {
            console.log(this.colorScheme.dim('No fleets found'));
            return;
        }

        const headers = ['ID', 'Name', 'Location', 'Ships', 'Status', 'ETA'];
        const rows = fleets.map(fleet => [
            fleet.id,
            fleet.name || `Fleet ${fleet.id}`,
            fleet.location || fleet.coordinates || 'Unknown',
            fleet.totalShips || 0,
            fleet.status || 'Stationed',
            fleet.eta || '-'
        ]);

        this.displayTable(headers, rows);
        console.log();
    }

    /**
     * Display detailed fleet information
     * @param {Object} fleet - Fleet details
     */
    displayFleetDetails(fleet) {
        console.log(this.colorScheme.highlight(`\n=== FLEET ${fleet.id} DETAILS ===`));
        
        console.log(`Name: ${fleet.name || `Fleet ${fleet.id}`}`);
        console.log(`Location: ${fleet.location || fleet.coordinates || 'Unknown'}`);
        console.log(`Status: ${fleet.status || 'Stationed'}`);
        
        if (fleet.destination) {
            console.log(`Destination: ${fleet.destination}`);
            if (fleet.eta) {
                console.log(`ETA: ${fleet.eta}`);
            }
        }
        
        console.log(this.colorScheme.highlight('\n--- SHIP COMPOSITION ---'));
        if (fleet.ships && Object.keys(fleet.ships).length > 0) {
            const headers = ['Ship Type', 'Count', 'Combat Power'];
            const rows = Object.entries(fleet.ships).map(([type, data]) => [
                type.charAt(0).toUpperCase() + type.slice(1),
                typeof data === 'number' ? data : data.count || 0,
                typeof data === 'object' ? data.combatPower || 0 : 0
            ]);
            
            this.displayTable(headers, rows);
            
            const totalShips = Object.values(fleet.ships).reduce((sum, data) => 
                sum + (typeof data === 'number' ? data : data.count || 0), 0);
            console.log(`\nTotal Ships: ${this.colorScheme.highlight(totalShips)}`);
        } else {
            console.log(this.colorScheme.dim('No ships in fleet'));
        }
        
        console.log();
    }

    /**
     * Display scan results
     * @param {Object} scanData - Scan results
     */
    displayScanResults(scanData) {
        console.log(this.colorScheme.highlight('\n=== SECTOR SCAN ==='));
        
        if (scanData.sector) {
            console.log(`Sector: ${scanData.sector}`);
        }
        
        // Display planets found
        if (scanData.planets && scanData.planets.length > 0) {
            console.log(this.colorScheme.highlight('\n--- PLANETS DETECTED ---'));
            const headers = ['ID', 'Name', 'Type', 'Owner', 'Population'];
            const rows = scanData.planets.map(planet => [
                planet.id,
                planet.name || 'Unknown',
                planet.type || 'Unknown',
                planet.owner || 'Uncolonized',
                planet.population ? planet.population.toLocaleString() : '0'
            ]);
            
            this.displayTable(headers, rows);
        }
        
        // Display fleets found
        if (scanData.fleets && scanData.fleets.length > 0) {
            console.log(this.colorScheme.highlight('\n--- FLEETS DETECTED ---'));
            const headers = ['Owner', 'Ships', 'Type', 'Distance'];
            const rows = scanData.fleets.map(fleet => [
                fleet.owner || 'Unknown',
                fleet.shipCount || '?',
                fleet.type || 'Mixed',
                fleet.distance || 'Unknown'
            ]);
            
            this.displayTable(headers, rows);
        }
        
        if ((!scanData.planets || scanData.planets.length === 0) && 
            (!scanData.fleets || scanData.fleets.length === 0)) {
            console.log(this.colorScheme.dim('No objects detected in sector'));
        }
        
        console.log();
    }

    /**
     * Display turn status information
     * @param {Object} turnData - Turn status data
     */
    displayTurnStatus(turnData) {
        console.log(this.colorScheme.highlight('\n=== TURN STATUS ==='));
        
        console.log(`Current Turn: ${this.colorScheme.highlight(turnData.currentTurn)}`);
        console.log(`Phase: ${turnData.phase || 'Action'}`);
        
        if (turnData.timeRemaining) {
            console.log(`Time Remaining: ${turnData.timeRemaining}`);
        }
        
        if (turnData.nextTurnAt) {
            console.log(`Next Turn: ${new Date(turnData.nextTurnAt).toLocaleString()}`);
        }
        
        console.log(`Action Points: ${this.colorScheme.highlight(turnData.actionPoints || 0)}/10`);
        
        if (turnData.notifications && turnData.notifications.length > 0) {
            console.log(this.colorScheme.highlight('\n--- TURN NOTIFICATIONS ---'));
            turnData.notifications.forEach(notification => {
                console.log(`• ${notification}`);
            });
        }
        
        console.log();
    }

    /**
     * Display recent events
     * @param {Array} events - Array of event objects
     */
    displayEvents(events) {
        console.log(this.colorScheme.highlight('\n=== RECENT EVENTS ==='));
        
        if (!events || events.length === 0) {
            console.log(this.colorScheme.dim('No recent events'));
            return;
        }

        events.forEach(event => {
            const timestamp = new Date(event.timestamp).toLocaleString();
            const typeColor = event.type === 'combat' ? this.colorScheme.error :
                             event.type === 'diplomacy' ? this.colorScheme.info :
                             event.type === 'construction' ? this.colorScheme.success :
                             this.colorScheme.primary;
            
            console.log(`[${this.colorScheme.dim(timestamp)}] ${typeColor(event.type.toUpperCase())}: ${event.message}`);
        });
        
        console.log();
    }

    /**
     * Display leaderboard
     * @param {Array} leaderboard - Array of player rankings
     */
    displayLeaderboard(leaderboard) {
        console.log(this.colorScheme.highlight('\n=== LEADERBOARD ==='));
        
        if (!leaderboard || leaderboard.length === 0) {
            console.log(this.colorScheme.dim('No players ranked'));
            return;
        }

        const headers = ['Rank', 'Player', 'Empire', 'Score', 'Planets', 'Fleets'];
        const rows = leaderboard.map((player, index) => [
            (index + 1).toString(),
            player.username,
            player.empire?.name || 'Unknown',
            player.score || 0,
            player.planetCount || 0,
            player.fleetCount || 0
        ]);

        this.displayTable(headers, rows);
        console.log();
    }

    /**
     * Display diplomatic relations
     * @param {Array} relations - Array of diplomatic relations
     */
    displayDiplomaticRelations(relations) {
        console.log(this.colorScheme.highlight('\n=== DIPLOMATIC RELATIONS ==='));
        
        if (!relations || relations.length === 0) {
            console.log(this.colorScheme.dim('No diplomatic relations established'));
            return;
        }

        const headers = ['Empire', 'Status', 'Trust Level', 'Trade', 'Messages'];
        const rows = relations.map(relation => [
            relation.empireName || 'Unknown',
            relation.status || 'Neutral',
            relation.trustLevel || 0,
            relation.hasTradeAgreement ? 'Yes' : 'No',
            relation.unreadMessages || 0
        ]);

        this.displayTable(headers, rows);
        console.log();
    }

    /**
     * Display available technologies for research
     * @param {Array} technologies - Array of available technologies
     */
    displayAvailableTechnologies(technologies) {
        console.log(this.colorScheme.highlight('\n=== AVAILABLE TECHNOLOGIES ==='));
        
        if (!technologies || technologies.length === 0) {
            console.log(this.colorScheme.dim('No technologies available for research'));
            return;
        }

        const headers = ['ID', 'Name', 'Category', 'Cost', 'Prerequisites', 'Time'];
        const rows = technologies.map(tech => [
            tech.id,
            tech.name,
            tech.category || 'General',
            tech.cost || 0,
            tech.prerequisites ? tech.prerequisites.join(', ') : 'None',
            tech.researchTime || 'Unknown'
        ]);

        this.displayTable(headers, rows);
        console.log();
    }
}

module.exports = Terminal;