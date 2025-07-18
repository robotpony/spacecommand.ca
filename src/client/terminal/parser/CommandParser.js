/**
 * Command Parser for SpaceCommand Terminal Client
 * 
 * Parses user input into structured command objects with validation.
 * Supports commands, arguments, flags, and aliases.
 */
class CommandParser {
    constructor() {
        this.aliases = {
            's': 'status',
            'f': 'fleets',
            'q': 'quit',
            'h': 'help',
            'l': 'login',
            'logout': 'logout',
            'who': 'whoami'
        };
    }

    /**
     * Parse user input into command structure
     * @param {string} input - Raw user input
     * @returns {Object} Parsed command object
     * @throws {ParseError} If command cannot be parsed
     */
    parse(input) {
        if (!input || typeof input !== 'string') {
            throw new ParseError('Empty command');
        }

        const tokens = this.tokenize(input.trim());
        if (tokens.length === 0) {
            throw new ParseError('Empty command');
        }

        const command = {
            name: this.resolveAlias(tokens[0].toLowerCase()),
            args: [],
            flags: {}
        };

        // Parse arguments and flags
        for (let i = 1; i < tokens.length; i++) {
            const token = tokens[i];
            
            if (token.startsWith('--')) {
                // Long flag (--flag or --flag=value)
                this.parseLongFlag(token, command.flags);
            } else if (token.startsWith('-') && token.length > 1) {
                // Short flag (-f or -abc)
                this.parseShortFlag(token, command.flags);
            } else {
                // Regular argument
                command.args.push(token);
            }
        }

        this.validateCommand(command);
        return command;
    }

    /**
     * Tokenize input string into array of tokens
     * @param {string} input - Input string to tokenize
     * @returns {Array} Array of tokens
     */
    tokenize(input) {
        const tokens = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';

        for (let i = 0; i < input.length; i++) {
            const char = input[i];
            
            if ((char === '"' || char === "'") && !inQuotes) {
                inQuotes = true;
                quoteChar = char;
            } else if (char === quoteChar && inQuotes) {
                inQuotes = false;
                quoteChar = '';
            } else if (char === ' ' && !inQuotes) {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
            } else {
                current += char;
            }
        }

        if (current) {
            tokens.push(current);
        }

        if (inQuotes) {
            throw new ParseError('Unclosed quote in command');
        }

        return tokens;
    }

    /**
     * Parse long flag (--flag or --flag=value)
     * @param {string} token - Flag token
     * @param {Object} flags - Flags object to modify
     */
    parseLongFlag(token, flags) {
        const flagName = token.substring(2);
        
        if (flagName.includes('=')) {
            const [name, value] = flagName.split('=', 2);
            flags[name] = this.parseValue(value);
        } else {
            flags[flagName] = true;
        }
    }

    /**
     * Parse short flag (-f or -abc)
     * @param {string} token - Flag token
     * @param {Object} flags - Flags object to modify
     */
    parseShortFlag(token, flags) {
        const flagChars = token.substring(1);
        
        for (const char of flagChars) {
            flags[char] = true;
        }
    }

    /**
     * Parse string value to appropriate type
     * @param {string} value - String value to parse
     * @returns {*} Parsed value
     */
    parseValue(value) {
        // Try to parse as number
        if (/^\d+$/.test(value)) {
            return parseInt(value, 10);
        }
        
        if (/^\d*\.\d+$/.test(value)) {
            return parseFloat(value);
        }
        
        // Try to parse as boolean
        if (value === 'true') return true;
        if (value === 'false') return false;
        
        // Return as string
        return value;
    }

    /**
     * Resolve command alias to full command name
     * @param {string} command - Command name or alias
     * @returns {string} Full command name
     */
    resolveAlias(command) {
        return this.aliases[command] || command;
    }

    /**
     * Validate parsed command structure
     * @param {Object} command - Parsed command object
     * @throws {ParseError} If command is invalid
     */
    validateCommand(command) {
        if (!command.name) {
            throw new ParseError('Missing command name');
        }

        // Validate command name format
        if (!/^[a-z][a-z0-9-]*$/.test(command.name)) {
            throw new ParseError(`Invalid command name: ${command.name}`);
        }

        // Check for known commands (basic validation)
        const knownCommands = [
            'help', 'quit', 'exit', 'clear', 'history',
            'login', 'logout', 'register', 'whoami',
            'status', 'empire', 'planets', 'resources', 'buildings',
            'fleets', 'fleet', 'create-fleet', 'move', 'merge', 'disband',
            'attack', 'raid', 'bombard', 'combat-log', 'retreat',
            'diplomacy', 'propose', 'respond', 'message', 'relations',
            'scan', 'explore', 'colonize', 'trade-route', 'map',
            'turn', 'events', 'leaderboard', 'stats', 'config'
        ];

        if (!knownCommands.includes(command.name)) {
            throw new ParseError(`Unknown command: ${command.name}`);
        }
    }

    /**
     * Add or update command alias
     * @param {string} alias - Alias name
     * @param {string} command - Full command name
     */
    addAlias(alias, command) {
        this.aliases[alias] = command;
    }

    /**
     * Remove command alias
     * @param {string} alias - Alias to remove
     */
    removeAlias(alias) {
        delete this.aliases[alias];
    }

    /**
     * Get all current aliases
     * @returns {Object} Current aliases mapping
     */
    getAliases() {
        return { ...this.aliases };
    }
}

/**
 * Custom error class for command parsing errors
 */
class ParseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ParseError';
    }
}

module.exports = CommandParser;