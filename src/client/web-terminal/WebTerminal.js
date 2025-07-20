/**
 * Web Terminal Component for SpaceCommand Web Client
 * 
 * Main terminal component that handles display, input, and game interaction.
 * Provides a browser-based terminal interface with React components.
 */

import { CommandParser, ParseError } from '../shared/CommandParser.js';
import { ApiClient, ApiError } from '../shared/ApiClient.js';
import { SessionManager } from '../shared/SessionManager.js';

const { useState, useEffect, useRef, useCallback } = React;

export function WebTerminal() {
    // State management
    const [isInitialized, setIsInitialized] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [commandHistory, setCommandHistory] = useState([]);
    const [outputHistory, setOutputHistory] = useState([]);
    const [currentInput, setCurrentInput] = useState('');
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('connecting');

    // Refs
    const inputRef = useRef(null);
    const outputRef = useRef(null);
    const parserRef = useRef(null);
    const apiRef = useRef(null);
    const sessionRef = useRef(null);

    // Initialize terminal
    useEffect(() => {
        initializeTerminal();
    }, []);

    // Auto-scroll to bottom when output changes
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [outputHistory]);

    // Global key capture and focus management
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            // Don't intercept if user is typing in another input/textarea
            if (e.target.tagName === 'INPUT' && e.target !== inputRef.current) return;
            if (e.target.tagName === 'TEXTAREA') return;
            
            // Don't intercept if a modifier key is held (for browser shortcuts)
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            
            // Focus input for printable characters
            if (e.key.length === 1 || e.key === 'Backspace') {
                if (inputRef.current && document.activeElement !== inputRef.current) {
                    inputRef.current.focus();
                    // For printable characters, let the event propagate to input
                    if (e.key.length === 1) {
                        return;
                    }
                }
            }
            
            // Handle special keys globally when input is not focused
            if (document.activeElement !== inputRef.current) {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (inputRef.current) {
                        inputRef.current.focus();
                        // Manually trigger the key event on the input
                        const keyEvent = new KeyboardEvent('keydown', {
                            key: e.key,
                            code: e.code,
                            keyCode: e.keyCode,
                            which: e.which,
                            shiftKey: e.shiftKey,
                            ctrlKey: e.ctrlKey,
                            altKey: e.altKey,
                            metaKey: e.metaKey
                        });
                        inputRef.current.dispatchEvent(keyEvent);
                    }
                }
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (inputRef.current) {
                        inputRef.current.focus();
                        // Trigger form submission
                        const form = inputRef.current.closest('form');
                        if (form) {
                            form.requestSubmit();
                        }
                    }
                }
            }
        };

        const handleClick = () => {
            if (inputRef.current) {
                inputRef.current.focus();
            }
        };

        document.addEventListener('keydown', handleGlobalKeyDown, true);
        document.addEventListener('click', handleClick);
        
        return () => {
            document.removeEventListener('keydown', handleGlobalKeyDown, true);
            document.removeEventListener('click', handleClick);
        };
    }, []);

    // Ensure input is focused after initialization
    useEffect(() => {
        if (isInitialized && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isInitialized]);

    const initializeTerminal = async () => {
        try {
            // Initialize core components
            parserRef.current = new CommandParser();
            apiRef.current = new ApiClient();
            sessionRef.current = new SessionManager();

            // Initialize session and API
            await sessionRef.current.initialize();
            await apiRef.current.initialize(sessionRef.current.getServerUrl());

            // Attempt auto-login if token exists
            if (sessionRef.current.hasValidToken()) {
                try {
                    const userInfo = await apiRef.current.validateToken(sessionRef.current.getToken());
                    sessionRef.current.setCurrentUser(userInfo);
                    setCurrentUser(userInfo);
                    apiRef.current.setAuthToken(sessionRef.current.getToken());
                    
                    addOutput({
                        type: 'success',
                        content: `Welcome back, ${userInfo.username}!`,
                        timestamp: new Date()
                    });
                } catch (error) {
                    sessionRef.current.clearToken();
                    addOutput({
                        type: 'warning',
                        content: 'Session expired, please login again',
                        timestamp: new Date()
                    });
                }
            }

            setConnectionStatus('connected');
            setIsInitialized(true);
            
            // Show welcome banner
            showWelcomeBanner();

        } catch (error) {
            setConnectionStatus('error');
            addOutput({
                type: 'error',
                content: `Failed to initialize terminal: ${error.message}`,
                timestamp: new Date()
            });
        }
    };

    const showWelcomeBanner = () => {
        const spaceStationArt = `
     * . . * . . . * . . *
   .   ╔═══════════════╗   .
 *     ║ SPACE COMMAND ║     *
   .   ║   STATION     ║   .
     * ╚═══════════════╝ *
   [████████████████████]
     * . . * . . . * . . *
        `;

        const welcomeMessage = `
Welcome, Commander. You are now connected to SPACE COMMAND STATION.
As Fleet Commander, you control an interstellar empire across the galaxy.
Your mission: Expand territory, command fleets, and forge your destiny among the stars.
        `;

        // Display space station art
        addOutput({
            type: 'banner',
            content: spaceStationArt.trim(),
            timestamp: new Date()
        });

        // Add spacing after banner
        addOutput({
            type: 'info',
            content: '',
            timestamp: new Date()
        });

        // Display welcome message
        addOutput({
            type: 'info',
            content: welcomeMessage.trim(),
            timestamp: new Date()
        });

        // Add spacing before authentication guidance
        addOutput({
            type: 'info',
            content: '',
            timestamp: new Date()
        });

        // Show authentication-specific guidance
        showAuthenticationGuidance();

        // Add spacing before commands
        addOutput({
            type: 'info',
            content: '',
            timestamp: new Date()
        });

        // Show essential commands
        showEssentialCommands();
    };

    const showAuthenticationGuidance = () => {
        const authState = getAuthenticationState();
        
        switch (authState.type) {
            case 'authenticated':
                // User is already logged in
                addOutput({
                    type: 'success',
                    content: `Access Granted - Welcome back, Commander ${authState.username}!`,
                    timestamp: new Date()
                });
                break;

            case 'session_expired':
                // User had a session but token expired
                addOutput({
                    type: 'warning',
                    content: 'Your command access has expired. Please re-authenticate to resume operations.',
                    timestamp: new Date()
                });
                addOutput({
                    type: 'info', 
                    content: `💡 Quick Login: login ${authState.lastUsername}`,
                    timestamp: new Date()
                });
                break;

            case 'returning_user':
                // User has used the system before but not currently logged in
                addOutput({
                    type: 'info',
                    content: 'Authentication required for command access.',
                    timestamp: new Date()
                });
                addOutput({
                    type: 'info',
                    content: `💡 Welcome back! Try: login ${authState.lastUsername}`,
                    timestamp: new Date()
                });
                addOutput({
                    type: 'info',
                    content: '🔐 Forgot password? Try: reset-password <username> <email>',
                    timestamp: new Date()
                });
                break;

            case 'new_user':
            default:
                // First time user or no previous session
                addOutput({
                    type: 'info',
                    content: '🌌 WELCOME TO THE GALAXY - Multiple access modes available',
                    timestamp: new Date()
                });
                addOutput({
                    type: 'info',
                    content: '👁️  GUEST VIEWING: spectate leaderboard | about | view-status',
                    timestamp: new Date()
                });
                addOutput({
                    type: 'info',
                    content: '🆕 NEW COMMANDER: register <username> <email>',
                    timestamp: new Date()
                });
                addOutput({
                    type: 'info',
                    content: '🔑 RETURNING COMMANDER: login <username>',
                    timestamp: new Date()
                });
                break;
        }
    };

    const getAuthenticationState = () => {
        // Check current authentication
        if (currentUser) {
            return {
                type: 'authenticated',
                username: currentUser.username
            };
        }

        // Check session manager for previous user data
        const sessionStats = sessionRef.current?.getSessionStats();
        
        if (sessionStats) {
            // Check if token just expired
            if (sessionStats.lastLogin && sessionStats.tokenExpires) {
                const expiredRecently = new Date() - new Date(sessionStats.tokenExpires) < 24 * 60 * 60 * 1000; // Within 24 hours
                if (expiredRecently && sessionStats.username) {
                    return {
                        type: 'session_expired',
                        lastUsername: sessionStats.username,
                        lastLogin: sessionStats.lastLogin
                    };
                }
            }

            // Check for previous user without recent session
            if (sessionStats.username && sessionStats.lastLogin) {
                return {
                    type: 'returning_user',
                    lastUsername: sessionStats.username,
                    lastLogin: sessionStats.lastLogin
                };
            }
        }

        // No previous session found
        return {
            type: 'new_user'
        };
    };

    const showEssentialCommands = () => {
        const authState = getAuthenticationState();
        
        if (authState.type === 'authenticated') {
            // Show full command set for authenticated users
            showAuthenticatedMenu();
        } else {
            // Show guest viewing and authentication commands for unauthenticated users
            showGuestMenu();
        }
    };

    const showGuestMenu = () => {
        addOutput({
            type: 'help',
            content: '═══════════════════ QUICK ACCESS MENU ═══════════════════',
            timestamp: new Date()
        });

        addOutput({
            type: 'data',
            content: '🌌 GUEST VIEWING (No Account Required)',
            timestamp: new Date()
        });

        const guestOptions = `   1. about                 - Game information and features
   2. leaderboard           - View empire rankings
   3. spectate battles      - Recent galactic conflicts  
   4. spectate map          - Galaxy overview
   5. view-status           - Public galaxy statistics`;

        addOutput({
            type: 'help',
            content: guestOptions,
            timestamp: new Date()
        });

        addOutput({
            type: 'data',
            content: '🚀 AUTHENTICATION OPTIONS',
            timestamp: new Date()
        });

        const authOptions = `   6. register <username> <email>     - Create new account
   7. login <username>                 - Access your empire
   8. reset-password <username> <email> - Reset forgotten password`;

        addOutput({
            type: 'help',
            content: authOptions,
            timestamp: new Date()
        });

        addOutput({
            type: 'data',
            content: '💡 USAGE: Type a number (1-8) or the full command',
            timestamp: new Date()
        });

        addOutput({
            type: 'info',
            content: 'Examples: "1" or "about" | "2" or "leaderboard" | "6" or "register alice alice@email.com"',
            timestamp: new Date()
        });
    };

    const showAuthenticatedMenu = () => {
        addOutput({
            type: 'help',
            content: '═══════════════ FLEET COMMAND OPERATIONS ═══════════════',
            timestamp: new Date()
        });

        addOutput({
            type: 'data',
            content: '📊 EMPIRE MANAGEMENT',
            timestamp: new Date()
        });

        const empireOptions = `   1. status               - Your empire status
   2. empire               - Empire details  
   3. resources            - Resource levels
   4. planets              - Your planets`;

        addOutput({
            type: 'help',
            content: empireOptions,
            timestamp: new Date()
        });

        addOutput({
            type: 'data',
            content: '🚀 FLEET OPERATIONS',
            timestamp: new Date()
        });

        const fleetOptions = `   5. fleets               - List your fleets
   6. fleet <id>           - Fleet details
   7. move <fleet> <dest>  - Move fleet
   8. scan [sector]        - Sector scan`;

        addOutput({
            type: 'help',
            content: fleetOptions,
            timestamp: new Date()
        });

        addOutput({
            type: 'data',
            content: '⚔️ COMBAT & DIPLOMACY',
            timestamp: new Date()
        });

        const combatOptions = `   9. attack <fleet> <target>    - Initiate combat
  10. diplomacy relations       - Diplomatic status
  11. leaderboard               - Empire rankings`;

        addOutput({
            type: 'help',
            content: combatOptions,
            timestamp: new Date()
        });

        addOutput({
            type: 'data',
            content: '💡 USAGE: Type a number (1-11) or the full command',
            timestamp: new Date()
        });

        addOutput({
            type: 'info',
            content: 'Examples: "1" or "status" | "5" or "fleets" | "7 fleet1 sector-5"',
            timestamp: new Date()
        });
    };

    const parseMenuNumber = (input) => {
        // Check if input is just a number
        const number = parseInt(input);
        if (isNaN(number)) return null;

        const authState = getAuthenticationState();
        
        if (authState.type === 'authenticated') {
            // Authenticated user menu mapping
            const authenticatedMenuMap = {
                1: 'status',
                2: 'empire', 
                3: 'resources',
                4: 'planets',
                5: 'fleets',
                6: 'fleet', // Note: will need ID parameter
                7: 'move',  // Note: will need fleet and destination parameters
                8: 'scan',
                9: 'attack', // Note: will need fleet and target parameters
                10: 'diplomacy relations',
                11: 'leaderboard'
            };
            const command = authenticatedMenuMap[number];
            if (!command && number >= 1 && number <= 20) {
                // User entered a number but it's not in our menu range
                return 'invalid-menu-number';
            }
            return command;
        } else {
            // Guest user menu mapping
            const guestMenuMap = {
                1: 'about',
                2: 'leaderboard',
                3: 'spectate battles',
                4: 'spectate map',
                5: 'view-status',
                6: 'register', // Note: will need username and email parameters
                7: 'login',    // Note: will need username parameter
                8: 'reset-password' // Note: will need username and email parameters
            };
            const command = guestMenuMap[number];
            if (!command && number >= 1 && number <= 20) {
                // User entered a number but it's not in our menu range
                return 'invalid-menu-number';
            }
            return command;
        }
    };

    const handleParameterRequiredCommands = (originalInput, menuCommand) => {
        const number = parseInt(originalInput);
        const authState = getAuthenticationState();
        
        if (authState.type === 'authenticated') {
            // Handle authenticated user commands that need parameters
            switch (number) {
                case 6: // fleet command
                    addOutput({
                        type: 'info',
                        content: 'Fleet details require a fleet ID. Usage: fleet <fleet-id>',
                        timestamp: new Date()
                    });
                    addOutput({
                        type: 'info',
                        content: 'Example: "fleet alpha-1" or try "5" to list all your fleets first',
                        timestamp: new Date()
                    });
                    return true;
                    
                case 7: // move command
                    addOutput({
                        type: 'info',
                        content: 'Fleet movement requires fleet ID and destination. Usage: move <fleet-id> <destination>',
                        timestamp: new Date()
                    });
                    addOutput({
                        type: 'info',
                        content: 'Example: "move alpha-1 sector-42" or "move fleet2 planet-earth"',
                        timestamp: new Date()
                    });
                    return true;
                    
                case 9: // attack command
                    addOutput({
                        type: 'info',
                        content: 'Combat requires fleet ID and target. Usage: attack <fleet-id> <target-id>',
                        timestamp: new Date()
                    });
                    addOutput({
                        type: 'info',
                        content: 'Example: "attack alpha-1 enemy-fleet-beta" or "attack fleet2 hostile-planet"',
                        timestamp: new Date()
                    });
                    return true;
            }
        } else {
            // Handle guest user commands that need parameters
            switch (number) {
                case 6: // register command
                    addOutput({
                        type: 'info',
                        content: 'Account creation requires username and email. Usage: register <username> <email>',
                        timestamp: new Date()
                    });
                    addOutput({
                        type: 'info',
                        content: 'Example: "register commander123 commander@email.com"',
                        timestamp: new Date()
                    });
                    return true;
                    
                case 7: // login command
                    addOutput({
                        type: 'info',
                        content: 'Login requires username. Usage: login <username>',
                        timestamp: new Date()
                    });
                    addOutput({
                        type: 'info',
                        content: 'Example: "login commander123" (password will be prompted)',
                        timestamp: new Date()
                    });
                    return true;
                    
                case 8: // reset-password command
                    addOutput({
                        type: 'info',
                        content: 'Password reset requires username and email. Usage: reset-password <username> <email>',
                        timestamp: new Date()
                    });
                    addOutput({
                        type: 'info',
                        content: 'Example: "reset-password commander123 commander@email.com"',
                        timestamp: new Date()
                    });
                    return true;
            }
        }
        
        return false; // No special handling needed, proceed with command
    };

    const addOutput = (outputEntry) => {
        setOutputHistory(prev => [...prev, outputEntry]);
    };

    const handleInputSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        if (!currentInput.trim() || isProcessing) return;

        const input = currentInput.trim();
        setCurrentInput('');
        setIsProcessing(true);

        // Add command to history
        setCommandHistory(prev => {
            const newHistory = [...prev, input];
            return newHistory.slice(-100); // Keep last 100 commands
        });
        setHistoryIndex(-1);

        // Show command in output
        addOutput({
            type: 'command',
            content: `${getPrompt()} ${input}`,
            timestamp: new Date()
        });

        try {
            await executeCommand(input);
        } catch (error) {
            addOutput({
                type: 'error',
                content: error.message,
                timestamp: new Date()
            });
        } finally {
            setIsProcessing(false);
        }
    }, [currentInput, isProcessing, currentUser]);

    const executeCommand = async (input) => {
        try {
            // Check if input is a menu number first
            const menuCommand = parseMenuNumber(input.trim());
            if (menuCommand) {
                if (menuCommand === 'invalid-menu-number') {
                    const authState = getAuthenticationState();
                    const maxNumber = authState.type === 'authenticated' ? 11 : 8;
                    addOutput({
                        type: 'error',
                        content: `Invalid menu option. Please select a number between 1-${maxNumber} or type the full command.`,
                        timestamp: new Date()
                    });
                    return;
                }
                // Handle commands that need parameters
                if (handleParameterRequiredCommands(input.trim(), menuCommand)) {
                    return;
                }
                input = menuCommand;
            }

            const command = parserRef.current.parse(input);
            
            // Handle local commands
            switch (command.name) {
                case 'help':
                    showHelp(command.args[0]);
                    return;
                    
                case 'clear':
                    setOutputHistory([]);
                    showWelcomeBanner();
                    return;
                    
                case 'history':
                    showHistory(parseInt(command.args[0]) || 10);
                    return;
                    
                case 'quit':
                case 'exit':
                    if (confirm('Are you sure you want to leave SpaceCommand?')) {
                        window.close();
                    }
                    return;
            }

            // Handle authentication commands and guest viewing commands
            const guestAllowedCommands = ['login', 'register', 'reset-password', 'leaderboard', 'about', 'spectate', 'view-status'];
            if (!sessionRef.current.isAuthenticated() && !guestAllowedCommands.includes(command.name)) {
                addOutput({
                    type: 'error',
                    content: 'Authentication required. Please login first.',
                    timestamp: new Date()
                });
                addOutput({
                    type: 'info',
                    content: '💡 Guest viewing: Try "leaderboard" or "about" to see game information',
                    timestamp: new Date()
                });
                return;
            }

            // Execute API commands
            await executeApiCommand(command);

        } catch (error) {
            if (error instanceof ParseError) {
                addOutput({
                    type: 'error',
                    content: `Parse error: ${error.message}`,
                    timestamp: new Date()
                });
            } else {
                throw error;
            }
        }
    };

    const executeApiCommand = async (command) => {
        const { name, args, flags } = command;

        try {
            let result;

            switch (name) {
                case 'login':
                    result = await handleLogin(args);
                    break;
                case 'logout':
                    result = await handleLogout();
                    break;
                case 'register':
                    result = await handleRegister(args);
                    break;
                case 'reset-password':
                    result = await handleResetPassword(args);
                    break;
                case 'whoami':
                    result = await handleWhoami();
                    break;
                case 'status':
                    result = await handleStatus();
                    break;
                case 'empire':
                    result = await handleEmpire();
                    break;
                case 'fleets':
                    result = await handleFleets();
                    break;
                case 'planets':
                    result = await handlePlanets();
                    break;
                case 'resources':
                    result = await handleResources();
                    break;
                case 'fleet':
                    result = await handleFleetDetails(args);
                    break;
                case 'create-fleet':
                    result = await handleCreateFleet(args);
                    break;
                case 'move':
                    result = await handleMoveFleet(args);
                    break;
                case 'scan':
                    result = await handleScan(args);
                    break;
                case 'turn':
                    result = await handleTurnStatus();
                    break;
                case 'events':
                    result = await handleEvents(args);
                    break;
                case 'leaderboard':
                    result = await handleLeaderboard();
                    break;
                case 'attack':
                    result = await handleAttack(args);
                    break;
                case 'retreat':
                    result = await handleRetreat(args);
                    break;
                case 'merge':
                    result = await handleMergeFleets(args);
                    break;
                case 'disband':
                    result = await handleDisbandFleet(args);
                    break;
                case 'diplomacy':
                    result = await handleDiplomacy(args);
                    break;
                case 'explore':
                    result = await handleExplore(args);
                    break;
                case 'colonize':
                    result = await handleColonize(args);
                    break;
                case 'build':
                    result = await handleBuild(args);
                    break;
                case 'research':
                    result = await handleResearch(args);
                    break;
                case 'about':
                    result = await handleAbout();
                    break;
                case 'spectate':
                    result = await handleSpectate(args);
                    break;
                case 'view-status':
                    result = await handleViewStatus();
                    break;
                default:
                    addOutput({
                        type: 'error',
                        content: `Unknown command: "${name}". Type "help" for available commands.`,
                        timestamp: new Date()
                    });
            }
        } catch (error) {
            handleApiError(error);
        }
    };

    const handleLogin = async (args) => {
        if (args.length === 0) {
            addOutput({
                type: 'error',
                content: 'Usage: login <username> [password]',
                timestamp: new Date()
            });
            return;
        }

        const username = args[0];
        let password = args[1];

        if (!password) {
            password = prompt('Password:');
            if (!password) return;
        }

        const response = await apiRef.current.login(username, password);
        sessionRef.current.setToken(response.token);
        sessionRef.current.setCurrentUser(response.user);
        setCurrentUser(response.user);

        addOutput({
            type: 'success',
            content: `Welcome, ${response.user.username}!`,
            timestamp: new Date()
        });

        if (response.user.empire) {
            addOutput({
                type: 'info',
                content: `Empire: ${response.user.empire.name}`,
                timestamp: new Date()
            });
        }
    };

    const handleLogout = async () => {
        try {
            await apiRef.current.logout();
        } catch (error) {
            // Ignore logout errors
        }
        
        sessionRef.current.clearToken();
        setCurrentUser(null);
        
        addOutput({
            type: 'success',
            content: 'Logged out successfully',
            timestamp: new Date()
        });
    };

    const handleRegister = async (args) => {
        if (args.length < 2) {
            addOutput({
                type: 'error',
                content: 'Usage: register <username> <email> [password]',
                timestamp: new Date()
            });
            return;
        }

        const username = args[0];
        const email = args[1];
        let password = args[2];

        if (!password) {
            password = prompt('Password:');
            if (!password) return;
        }

        await apiRef.current.register(username, email, password);
        
        addOutput({
            type: 'success',
            content: 'Registration successful! You can now login.',
            timestamp: new Date()
        });
    };

    const handleResetPassword = async (args) => {
        if (args.length < 2) {
            addOutput({
                type: 'error',
                content: 'Usage: reset-password <username> <email>',
                timestamp: new Date()
            });
            addOutput({
                type: 'info',
                content: 'A password reset link will be sent to your registered email address.',
                timestamp: new Date()
            });
            return;
        }

        const username = args[0];
        const email = args[1];

        try {
            // Note: This would typically call an API endpoint for password reset
            // For now, show a helpful message since the backend may not have this endpoint
            addOutput({
                type: 'info',
                content: `Password reset requested for user: ${username}`,
                timestamp: new Date()
            });
            addOutput({
                type: 'warning',
                content: 'Password reset functionality is currently limited in this demo.',
                timestamp: new Date()
            });
            addOutput({
                type: 'info',
                content: 'For account recovery, contact your system administrator or try common passwords.',
                timestamp: new Date()
            });
        } catch (error) {
            addOutput({
                type: 'error',
                content: `Password reset failed: ${error.message}`,
                timestamp: new Date()
            });
        }
    };

    // Guest viewing commands (no authentication required)
    const handleAbout = async () => {
        try {
            const aboutText = `
================================================================
                     SPACECOMMAND.CA                          
                  Galactic Strategy Game                      
================================================================

ABOUT THIS GAME:
SpaceCommand is a turn-based strategic space empire simulation where 
players command fleets, colonize planets, and engage in diplomacy 
across the galaxy.

GAME FEATURES:
* Real-time fleet combat with multiple ship classes
* Economic resource management and planetary development  
* Diplomatic relations between empires
* Technology research and advancement
* 24-hour turn cycles for strategic planning

CURRENT GAME STATUS:
* Phase 4: Balance testing and optimization
* Active player empires competing for galactic dominance
* Regular tournaments and seasonal events

Want to join the fight for the galaxy? Type 'register <username> <email>'
            `;

            addOutput({
                type: 'banner',
                content: aboutText.trim(),
                timestamp: new Date()
            });
            
            // Add a confirmation message
            addOutput({
                type: 'info',
                content: '💡 About information displayed successfully. Try "2" for leaderboard or "register" to join!',
                timestamp: new Date()
            });
            
        } catch (error) {
            console.error('ERROR in handleAbout:', error);
            addOutput({
                type: 'error',
                content: 'Error displaying about information. Please try again.',
                timestamp: new Date()
            });
        }
    };

    const handleSpectate = async (args) => {
        if (args.length === 0) {
            addOutput({
                type: 'info',
                content: 'SPECTATOR MODE - View ongoing galactic activities',
                timestamp: new Date()
            });
            addOutput({
                type: 'help',
                content: 'Available spectate options:\n  spectate leaderboard    - View empire rankings\n  spectate battles        - View recent combat\n  spectate map           - View galaxy overview',
                timestamp: new Date()
            });
            return;
        }

        const spectateType = args[0];
        switch (spectateType) {
            case 'leaderboard':
                await handleLeaderboard();
                break;
            case 'battles':
                await handleViewRecentBattles();
                break;
            case 'map':
                await handleViewGalaxyMap();
                break;
            default:
                addOutput({
                    type: 'error',
                    content: `Unknown spectate option: ${spectateType}`,
                    timestamp: new Date()
                });
        }
    };

    const handleViewStatus = async () => {
        try {
            // Try to get public game statistics
            addOutput({
                type: 'info',
                content: 'GALACTIC STATUS OVERVIEW (Public View)',
                timestamp: new Date()
            });
            
            addOutput({
                type: 'data',
                content: `Active Empires: Loading...
Turn Cycle: 24 hours
Current Phase: Balance Testing
Galaxy Size: 1000x1000 sectors
Technology Era: Advanced Space Age`,
                timestamp: new Date()
            });

            addOutput({
                type: 'info',
                content: '💡 For detailed empire information, please login to your account',
                timestamp: new Date()
            });
        } catch (error) {
            addOutput({
                type: 'error',
                content: `Failed to load public status: ${error.message}`,
                timestamp: new Date()
            });
        }
    };

    const handleViewRecentBattles = async () => {
        addOutput({
            type: 'info',
            content: 'RECENT GALACTIC CONFLICTS (Last 24 Hours)',
            timestamp: new Date()
        });
        
        addOutput({
            type: 'data',
            content: `Recent Combat Activity:
• Imperial Fleet vs Rebel Squadron - Sector 45,67 - Imperial Victory
• Trade Route Raid - Sector 12,89 - Ongoing
• Planetary Defense - NewEarth - Defenders Victorious
• Border Skirmish - Neutral Zone - Stalemate

💡 Full battle reports available to authenticated commanders`,
            timestamp: new Date()
        });
    };

    const handleViewGalaxyMap = async () => {
        addOutput({
            type: 'info',
            content: 'GALAXY OVERVIEW MAP (Public Sectors)',
            timestamp: new Date()
        });
        
        const mapArt = `
    . * . * . * . * . * . * . * . * . * .
   [█] Trading Hub     [▲] Contested Zone
  . * . [◊] Neutral   . * . [●] Empire Core . *
 [█] Mining Station  . * . [▲] Battle Zone  . *
. * . * . [◊] Colony . * . * . [●] Capitol . * .
   [█] Starbase     . * . [▲] Fleet Movement
    . * . * . * . * . * . * . * . * . * .

Legend: [█] Economic  [◊] Civilian  [●] Military  [▲] Conflict
        `;

        addOutput({
            type: 'banner',
            content: mapArt.trim(),
            timestamp: new Date()
        });
        
        addOutput({
            type: 'info',
            content: '💡 Detailed sector scans available to fleet commanders',
            timestamp: new Date()
        });
    };

    const handleWhoami = async () => {
        const user = sessionRef.current.getCurrentUser();
        if (!user) {
            addOutput({
                type: 'error',
                content: 'Not authenticated',
                timestamp: new Date()
            });
            return;
        }

        addOutput({
            type: 'info',
            content: `Username: ${user.username}\nEmail: ${user.email}${user.empire ? `\nEmpire: ${user.empire.name}` : ''}`,
            timestamp: new Date()
        });
    };

    const handleStatus = async () => {
        const response = await apiRef.current.getEmpireStatus();
        displayEmpireStatus(response);
    };

    const handleEmpire = async () => {
        const response = await apiRef.current.getEmpireDetails();
        displayEmpireDetails(response);
    };

    const handleFleets = async () => {
        const fleets = await apiRef.current.getFleets();
        displayFleets(fleets);
    };

    const handlePlanets = async () => {
        const planets = await apiRef.current.getPlanets();
        displayPlanets(planets);
    };

    const handleResources = async () => {
        const resources = await apiRef.current.getResources();
        displayResources(resources);
    };

    const displayEmpireStatus = (status) => {
        const content = `
Empire Status:
  Name: ${status.name || 'Unknown'}
  Power: ${status.power || 0}
  Planets: ${status.planetCount || 0}
  Fleets: ${status.fleetCount || 0}
        `.trim();

        addOutput({
            type: 'data',
            content,
            timestamp: new Date()
        });
    };

    const displayEmpireDetails = (empire) => {
        const content = `
Empire Details:
  Name: ${empire.name || 'Unknown'}
  Founded: ${empire.founded || 'Unknown'}
  Population: ${empire.population || 0}
  Technology Level: ${empire.techLevel || 0}
        `.trim();

        addOutput({
            type: 'data',
            content,
            timestamp: new Date()
        });
    };

    const displayFleets = (fleets) => {
        if (!fleets || fleets.length === 0) {
            addOutput({
                type: 'info',
                content: 'No fleets found',
                timestamp: new Date()
            });
            return;
        }

        let content = 'Fleets:\n';
        fleets.forEach(fleet => {
            content += `  ${fleet.id}: ${fleet.name} (${fleet.shipCount} ships) - ${fleet.location}\n`;
        });

        addOutput({
            type: 'data',
            content: content.trim(),
            timestamp: new Date()
        });
    };

    const displayPlanets = (planets) => {
        if (!planets || planets.length === 0) {
            addOutput({
                type: 'info',
                content: 'No planets found',
                timestamp: new Date()
            });
            return;
        }

        let content = 'Planets:\n';
        planets.forEach(planet => {
            content += `  ${planet.id}: ${planet.name} (${planet.type}) - Pop: ${planet.population}\n`;
        });

        addOutput({
            type: 'data',
            content: content.trim(),
            timestamp: new Date()
        });
    };

    const displayResources = (resources) => {
        let content = 'Resources:\n';
        Object.entries(resources).forEach(([resource, amount]) => {
            content += `  ${resource}: ${amount}\n`;
        });

        addOutput({
            type: 'data',
            content: content.trim(),
            timestamp: new Date()
        });
    };

    const handleFleetDetails = async (args) => {
        if (args.length === 0) {
            addOutput({
                type: 'error',
                content: 'Usage: fleet <fleet-id>',
                timestamp: new Date()
            });
            return;
        }

        const fleetId = args[0];
        const fleet = await apiRef.current.getFleet(fleetId);
        displayFleetDetails(fleet);
    };

    const displayFleetDetails = (fleet) => {
        const content = `
Fleet Details (ID: ${fleet.id}):
  Name: ${fleet.name || 'Unnamed'}
  Location: ${fleet.location || 'Unknown'}
  Ships: ${fleet.shipCount || 0}
  Status: ${fleet.status || 'Unknown'}
  Health: ${fleet.health || 100}%
        `.trim();

        addOutput({
            type: 'data',
            content,
            timestamp: new Date()
        });
    };

    const handleCreateFleet = async (args) => {
        if (args.length < 3) {
            addOutput({
                type: 'error',
                content: 'Usage: create-fleet <planet-id> <ship-type> <count> [ship-type count ...]',
                timestamp: new Date()
            });
            addOutput({
                type: 'info',
                content: 'Ship types: fighter, cruiser, battleship, dreadnought, carrier, support, scout',
                timestamp: new Date()
            });
            return;
        }

        const planetId = args[0];
        const shipComposition = {};

        // Parse ship type and count pairs
        for (let i = 1; i < args.length; i += 2) {
            const shipType = args[i];
            const count = parseInt(args[i + 1]);

            if (isNaN(count) || count <= 0) {
                addOutput({
                    type: 'error',
                    content: `Invalid ship count: "${args[i + 1]}" is not a valid number`,
                    timestamp: new Date()
                });
                return;
            }

            shipComposition[shipType] = count;
        }

        const response = await apiRef.current.createFleet(planetId, shipComposition);
        addOutput({
            type: 'success',
            content: `Fleet created with ID: ${response.id}`,
            timestamp: new Date()
        });
        displayFleetDetails(response);
    };

    const handleMoveFleet = async (args) => {
        if (args.length < 2) {
            addOutput({
                type: 'error',
                content: 'Usage: move <fleet-id> <destination>',
                timestamp: new Date()
            });
            addOutput({
                type: 'info',
                content: 'Destination can be coordinates (x,y) or planet ID',
                timestamp: new Date()
            });
            return;
        }

        const fleetId = args[0];
        const destination = args[1];

        const response = await apiRef.current.moveFleet(fleetId, destination);
        addOutput({
            type: 'success',
            content: `Fleet ${fleetId} is moving to ${destination}`,
            timestamp: new Date()
        });
        if (response.eta) {
            addOutput({
                type: 'info',
                content: `Estimated arrival: ${response.eta}`,
                timestamp: new Date()
            });
        }
    };

    const handleScan = async (args) => {
        const sector = args[0] || null;
        const response = await apiRef.current.scanSector(sector);
        displayScanResults(response);
    };

    const displayScanResults = (results) => {
        let content = 'Scan Results:\n';
        if (results.planets && results.planets.length > 0) {
            content += '\nPlanets:\n';
            results.planets.forEach(planet => {
                content += `  ${planet.id}: ${planet.name} (${planet.type}) - ${planet.owner || 'Unclaimed'}\n`;
            });
        }
        if (results.fleets && results.fleets.length > 0) {
            content += '\nFleets:\n';
            results.fleets.forEach(fleet => {
                content += `  ${fleet.id}: ${fleet.owner} fleet (${fleet.shipCount} ships)\n`;
            });
        }
        if (!results.planets?.length && !results.fleets?.length) {
            content += 'No objects detected in this sector.';
        }

        addOutput({
            type: 'data',
            content: content.trim(),
            timestamp: new Date()
        });
    };

    const handleTurnStatus = async () => {
        const response = await apiRef.current.getTurnStatus();
        displayTurnStatus(response);
    };

    const displayTurnStatus = (turnData) => {
        const content = `
Turn Status:
  Current Turn: ${turnData.currentTurn || 0}
  Turn Duration: ${turnData.duration || 'Unknown'}
  Time Remaining: ${turnData.timeRemaining || 'Unknown'}
  Next Turn: ${turnData.nextTurn || 'Unknown'}
        `.trim();

        addOutput({
            type: 'data',
            content,
            timestamp: new Date()
        });
    };

    const handleEvents = async (args) => {
        const limit = parseInt(args[0]) || 10;
        const events = await apiRef.current.getEvents(limit);
        displayEvents(events);
    };

    const displayEvents = (events) => {
        if (!events || events.length === 0) {
            addOutput({
                type: 'info',
                content: 'No recent events found',
                timestamp: new Date()
            });
            return;
        }

        let content = 'Recent Events:\n';
        events.forEach((event, index) => {
            content += `  ${index + 1}. ${event.type}: ${event.message} (${event.timestamp})\n`;
        });

        addOutput({
            type: 'data',
            content: content.trim(),
            timestamp: new Date()
        });
    };

    const handleLeaderboard = async () => {
        const response = await apiRef.current.getLeaderboard();
        displayLeaderboard(response);
    };

    const displayLeaderboard = (response) => {
        if (!response || !response.rankings || response.rankings.length === 0) {
            addOutput({
                type: 'info',
                content: 'Leaderboard not available',
                timestamp: new Date()
            });
            return;
        }

        const { rankings, category, lastUpdated } = response;
        
        // Create multi-line format to show all metrics
        let content = `${category.toUpperCase()} LEADERBOARD\n\n`;
        
        rankings.forEach((entry) => {
            const rank = entry.rank;
            const commander = entry.player.alias || 'Unknown Commander';
            const empire = entry.empire.name;
            const score = entry.score.toLocaleString();
            const planets = entry.totalPlanets || 0;
            const units = entry.totalUnits || 0;
            const population = (entry.totalPopulation || 0).toLocaleString();
            const resources = (entry.totalResources || 0).toLocaleString();
            const combat = entry.fleetCombatPower || 0;
            const tech = entry.technologyLevel || 0;
            const marker = entry.isCurrentUser ? ' ★' : '';
            
            // Calculate content with exact 77-character width for border alignment
            const borderWidth = 77;
            
            // Line 1: Rank + Commander + Empire + Marker
            const line1Content = `${rank.toString().padStart(2)}. ${commander.substring(0, 25).padEnd(25)} (${empire.substring(0, 20).padEnd(20)})${marker.padStart(3)}`;
            const line1 = ` ${line1Content}`.padEnd(borderWidth);
            
            // Line 2: Score + Planets + Units
            const line2Content = `Score: ${score.padEnd(10)} Planets: ${planets.toString().padEnd(4)} Units: ${units.toString().padEnd(8)}`;
            const line2 = ` ${line2Content}`.padEnd(borderWidth);
            
            // Line 3: Population + Resources + Combat + Tech
            const line3Content = `Pop: ${population.padEnd(8)} Resources: ${resources.padEnd(8)} Combat: ${combat.toString().padEnd(6)} Tech: ${tech.toString().padEnd(3)}`;
            const line3 = ` ${line3Content}`.padEnd(borderWidth);
            
            content += `┌─────────────────────────────────────────────────────────────────────────────┐\n`;
            content += `│${line1}│\n`;
            content += `├─────────────────────────────────────────────────────────────────────────────┤\n`;
            content += `│${line2}│\n`;
            content += `│${line3}│\n`;
            content += `└─────────────────────────────────────────────────────────────────────────────┘\n`;
            content += '\n';
        });
        content += `\nLast updated: ${new Date(lastUpdated).toLocaleTimeString()}`;

        addOutput({
            type: 'data',
            content: content,
            timestamp: new Date()
        });
    };

    const handleAttack = async (args) => {
        if (args.length < 2) {
            addOutput({
                type: 'error',
                content: 'Usage: attack <fleet-id> <target-id> [attack-type]',
                timestamp: new Date()
            });
            addOutput({
                type: 'info',
                content: 'Attack types: assault (default), raid, bombard',
                timestamp: new Date()
            });
            return;
        }

        const fleetId = args[0];
        const targetId = args[1];
        const attackType = args[2] || 'assault';

        const response = await apiRef.current.attackTarget(fleetId, targetId, attackType);
        addOutput({
            type: 'success',
            content: `${attackType.charAt(0).toUpperCase() + attackType.slice(1)} initiated!`,
            timestamp: new Date()
        });
        
        if (response.combatId) {
            addOutput({
                type: 'info',
                content: `Combat ID: ${response.combatId}`,
                timestamp: new Date()
            });
        }
    };

    const handleRetreat = async (args) => {
        if (args.length === 0) {
            addOutput({
                type: 'error',
                content: 'Usage: retreat <fleet-id>',
                timestamp: new Date()
            });
            return;
        }

        const fleetId = args[0];
        const response = await apiRef.current.retreatFleet(fleetId);
        addOutput({
            type: 'success',
            content: `Fleet ${fleetId} is retreating`,
            timestamp: new Date()
        });
        
        if (response.destination) {
            addOutput({
                type: 'info',
                content: `Retreating to: ${response.destination}`,
                timestamp: new Date()
            });
        }
    };

    const handleMergeFleets = async (args) => {
        if (args.length < 2) {
            addOutput({
                type: 'error',
                content: 'Usage: merge <source-fleet-id> <target-fleet-id>',
                timestamp: new Date()
            });
            return;
        }

        const sourceFleetId = args[0];
        const targetFleetId = args[1];

        const response = await apiRef.current.mergeFleets(sourceFleetId, targetFleetId);
        addOutput({
            type: 'success',
            content: `Fleet ${sourceFleetId} merged into Fleet ${targetFleetId}`,
            timestamp: new Date()
        });
        displayFleetDetails(response);
    };

    const handleDisbandFleet = async (args) => {
        if (args.length === 0) {
            addOutput({
                type: 'error',
                content: 'Usage: disband <fleet-id>',
                timestamp: new Date()
            });
            return;
        }

        const fleetId = args[0];
        await apiRef.current.disbandFleet(fleetId);
        addOutput({
            type: 'success',
            content: `Fleet ${fleetId} disbanded successfully`,
            timestamp: new Date()
        });
    };

    const handleDiplomacy = async (args) => {
        if (args.length === 0) {
            addOutput({
                type: 'error',
                content: 'Usage: diplomacy <action> [params...]',
                timestamp: new Date()
            });
            addOutput({
                type: 'info',
                content: 'Actions: relations, propose, respond, message',
                timestamp: new Date()
            });
            return;
        }

        const action = args[0];
        const params = args.slice(1);

        switch (action) {
            case 'relations':
                const relations = await apiRef.current.getDiplomaticRelations();
                displayDiplomaticRelations(relations);
                break;

            case 'propose':
                if (params.length < 2) {
                    addOutput({
                        type: 'error',
                        content: 'Usage: diplomacy propose <empire-id> <proposal-type> [terms...]',
                        timestamp: new Date()
                    });
                    return;
                }
                const targetEmpireId = params[0];
                const proposalType = params[1];
                const terms = params.slice(2);
                
                await apiRef.current.sendDiplomaticProposal(targetEmpireId, proposalType, { terms });
                addOutput({
                    type: 'success',
                    content: 'Diplomatic proposal sent',
                    timestamp: new Date()
                });
                break;

            case 'respond':
                if (params.length < 2) {
                    addOutput({
                        type: 'error',
                        content: 'Usage: diplomacy respond <proposal-id> <response>',
                        timestamp: new Date()
                    });
                    addOutput({
                        type: 'info',
                        content: 'Response: accept, reject, counter',
                        timestamp: new Date()
                    });
                    return;
                }
                const proposalId = params[0];
                const response = params[1];
                
                await apiRef.current.respondToDiplomaticProposal(proposalId, response);
                addOutput({
                    type: 'success',
                    content: `Responded "${response}" to proposal ${proposalId}`,
                    timestamp: new Date()
                });
                break;

            case 'message':
                if (params.length < 2) {
                    addOutput({
                        type: 'error',
                        content: 'Usage: diplomacy message <empire-id> <message>',
                        timestamp: new Date()
                    });
                    return;
                }
                const messageTargetId = params[0];
                const message = params.slice(1).join(' ');
                
                await apiRef.current.sendDiplomaticMessage(messageTargetId, message);
                addOutput({
                    type: 'success',
                    content: 'Diplomatic message sent',
                    timestamp: new Date()
                });
                break;

            default:
                addOutput({
                    type: 'error',
                    content: `Unknown diplomacy action: "${action}"`,
                    timestamp: new Date()
                });
        }
    };

    const displayDiplomaticRelations = (relations) => {
        if (!relations || relations.length === 0) {
            addOutput({
                type: 'info',
                content: 'No diplomatic relations found',
                timestamp: new Date()
            });
            return;
        }

        let content = 'Diplomatic Relations:\n';
        relations.forEach(relation => {
            content += `  ${relation.empire}: ${relation.status} (${relation.since})\n`;
        });

        addOutput({
            type: 'data',
            content: content.trim(),
            timestamp: new Date()
        });
    };

    const handleExplore = async (args) => {
        if (args.length < 2) {
            addOutput({
                type: 'error',
                content: 'Usage: explore <coordinates> <fleet-id>',
                timestamp: new Date()
            });
            addOutput({
                type: 'info',
                content: 'Coordinates format: x,y (e.g., 5,10)',
                timestamp: new Date()
            });
            return;
        }

        const coordinates = args[0];
        const fleetId = args[1];

        const response = await apiRef.current.exploreSector(coordinates, fleetId);
        addOutput({
            type: 'success',
            content: `Fleet ${fleetId} exploring sector ${coordinates}`,
            timestamp: new Date()
        });
        displayScanResults(response);
    };

    const handleColonize = async (args) => {
        if (args.length < 2) {
            addOutput({
                type: 'error',
                content: 'Usage: colonize <planet-id> <fleet-id>',
                timestamp: new Date()
            });
            addOutput({
                type: 'info',
                content: 'Fleet must contain colony ships',
                timestamp: new Date()
            });
            return;
        }

        const planetId = args[0];
        const fleetId = args[1];

        const response = await apiRef.current.colonizePlanet(planetId, fleetId);
        addOutput({
            type: 'success',
            content: `Planet ${planetId} colonization initiated`,
            timestamp: new Date()
        });
        
        if (response.eta) {
            addOutput({
                type: 'info',
                content: `Colonization ETA: ${response.eta}`,
                timestamp: new Date()
            });
        }
    };

    const handleBuild = async (args) => {
        if (args.length < 2) {
            addOutput({
                type: 'error',
                content: 'Usage: build <planet-id> <building-type>',
                timestamp: new Date()
            });
            addOutput({
                type: 'info',
                content: 'Building types: mine, factory, lab, farm, shipyard, defense',
                timestamp: new Date()
            });
            return;
        }

        const planetId = args[0];
        const buildingType = args[1];

        const response = await apiRef.current.buildStructure(planetId, buildingType);
        addOutput({
            type: 'success',
            content: `${buildingType} construction started on planet ${planetId}`,
            timestamp: new Date()
        });
        
        if (response.completionTime) {
            addOutput({
                type: 'info',
                content: `Completion: ${response.completionTime}`,
                timestamp: new Date()
            });
        }
    };

    const handleResearch = async (args) => {
        if (args.length === 0) {
            addOutput({
                type: 'error',
                content: 'Usage: research <technology-id> OR research list',
                timestamp: new Date()
            });
            return;
        }

        if (args[0] === 'list') {
            const technologies = await apiRef.current.getAvailableTechnologies();
            displayAvailableTechnologies(technologies);
            return;
        }

        const technologyId = args[0];
        const response = await apiRef.current.researchTechnology(technologyId);
        addOutput({
            type: 'success',
            content: `Research started: ${response.name || technologyId}`,
            timestamp: new Date()
        });
        
        if (response.completionTime) {
            addOutput({
                type: 'info',
                content: `Research completion: ${response.completionTime}`,
                timestamp: new Date()
            });
        }
    };

    const displayAvailableTechnologies = (technologies) => {
        if (!technologies || technologies.length === 0) {
            addOutput({
                type: 'info',
                content: 'No technologies available for research',
                timestamp: new Date()
            });
            return;
        }

        let content = 'Available Technologies:\n';
        technologies.forEach(tech => {
            content += `  ${tech.id}: ${tech.name} - Cost: ${tech.cost}\n`;
        });

        addOutput({
            type: 'data',
            content: content.trim(),
            timestamp: new Date()
        });
    };

    const handleApiError = (error) => {
        if (error instanceof ApiError) {
            if (error.status === 401) {
                sessionRef.current.clearToken();
                setCurrentUser(null);
                addOutput({
                    type: 'error',
                    content: 'Authentication expired. Please login again.',
                    timestamp: new Date()
                });
            } else {
                addOutput({
                    type: 'error',
                    content: `Server error: ${error.message}`,
                    timestamp: new Date()
                });
            }
        } else {
            addOutput({
                type: 'error',
                content: `Network error: ${error.message}`,
                timestamp: new Date()
            });
        }
    };

    const showHelp = (commandName) => {
        const helpText = commandName ? 
            getCommandHelp(commandName) : 
            getGeneralHelp();

        addOutput({
            type: 'help',
            content: helpText,
            timestamp: new Date()
        });
    };

    const getGeneralHelp = () => {
        const isAuthenticated = sessionRef.current?.isAuthenticated();
        
        if (isAuthenticated) {
            return `
Available Commands:

Authentication:
  login <username> [password]      - Login to your account
  logout                           - Logout from your account
  register <username> <email>      - Create new account
  reset-password <username> <email> - Reset forgotten password
  whoami                           - Show current user info

Empire Management:
  status                       - Show empire status
  empire                       - Show empire details
  planets                      - List your planets
  resources                    - Show resource levels
  fleets                       - List your fleets

Utility:
  help [command]               - Show help information
  history [count]              - Show command history
  clear                        - Clear terminal screen
  quit/exit                    - Close terminal

💡 TIP: Use menu numbers (1-11) or full command names
Type 'help <command>' for detailed information about a specific command.
            `.trim();
        } else {
            return `
Available Commands:

Guest Viewing (No Account Required):
  about                        - Game information and features
  leaderboard                  - View empire rankings
  spectate [option]            - Spectate ongoing activities
  view-status                  - Public galaxy status overview

Authentication:
  login <username> [password]      - Login to your account
  register <username> <email>      - Create new account
  reset-password <username> <email> - Reset forgotten password

Utility:
  help [command]               - Show help information
  history [count]              - Show command history
  clear                        - Clear terminal screen
  quit/exit                    - Close terminal

💡 TIP: Use menu numbers (1-8) or full command names
Type 'help <command>' for detailed information about a specific command.
Note: Full fleet command operations available after authentication.
            `.trim();
        }
    };

    const getCommandHelp = (command) => {
        const helpMap = {
            login: 'login <username> [password] - Authenticate with the server',
            logout: 'logout - End your current session',
            register: 'register <username> <email> [password] - Create a new account',
            'reset-password': 'reset-password <username> <email> - Request password reset for account recovery',
            about: 'about - Display game information, features, and current status',
            leaderboard: 'leaderboard - View empire rankings and scores (no authentication required)',
            spectate: 'spectate [option] - Spectate ongoing galactic activities (options: leaderboard, battles, map)',
            'view-status': 'view-status - View public galaxy status and statistics',
            status: 'status - Display your empire status overview',
            fleets: 'fleets - List all your fleets and their status'
        };

        return helpMap[command] || `No help available for command: ${command}`;
    };

    const showHistory = (count) => {
        const recentHistory = commandHistory.slice(-count);
        const content = recentHistory.length > 0 ? 
            recentHistory.map((cmd, i) => `  ${i + 1}: ${cmd}`).join('\n') :
            'No command history available';

        addOutput({
            type: 'info',
            content: content,
            timestamp: new Date()
        });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (commandHistory.length > 0) {
                const newIndex = historyIndex === -1 ? 
                    commandHistory.length - 1 : 
                    Math.max(0, historyIndex - 1);
                setHistoryIndex(newIndex);
                setCurrentInput(commandHistory[newIndex]);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex !== -1) {
                const newIndex = historyIndex + 1;
                if (newIndex >= commandHistory.length) {
                    setHistoryIndex(-1);
                    setCurrentInput('');
                } else {
                    setHistoryIndex(newIndex);
                    setCurrentInput(commandHistory[newIndex]);
                }
            }
        }
    };

    const getPrompt = () => {
        const user = currentUser ? currentUser.username : 'guest';
        const status = connectionStatus === 'connected' ? '$' : '!';
        return `[${user}@spacecommand]${status}`;
    };

    const getStatusColor = () => {
        switch (connectionStatus) {
            case 'connected': return '#00ff00';
            case 'connecting': return '#ffff00';
            case 'error': return '#ff0000';
            default: return '#ffffff';
        }
    };

    const formatOutput = (entry) => {
        const typeColors = {
            command: '#ffffff',
            success: '#00ff00',
            error: '#ff0000',
            warning: '#ffaa00',
            info: '#00aaff',
            data: '#ffff00',
            help: '#aaaaaa',
            banner: '#00ffff'
        };

        return {
            color: typeColors[entry.type] || '#ffffff',
            content: entry.content
        };
    };

    if (!isInitialized) {
        return React.createElement('div', { className: 'terminal-loading' }, 'Initializing terminal...');
    }

    return React.createElement('div', { className: 'web-terminal' }, [
        // Terminal output
        React.createElement('div', {
            key: 'output',
            className: 'terminal-output',
            ref: outputRef
        }, outputHistory.map((entry, index) => {
            const formatted = formatOutput(entry);
            return React.createElement('div', {
                key: index,
                className: `output-line output-${entry.type}`,
                style: { color: formatted.color }
            }, formatted.content);
        })),

        // Terminal input
        React.createElement('form', {
            key: 'input-form',
            className: 'terminal-input-form',
            onSubmit: handleInputSubmit
        }, [
            React.createElement('span', {
                key: 'prompt',
                className: 'terminal-prompt',
                style: { color: getStatusColor() }
            }, getPrompt()),
            React.createElement('input', {
                key: 'input',
                ref: inputRef,
                type: 'text',
                className: 'terminal-input',
                value: currentInput,
                onChange: (e) => setCurrentInput(e.target.value),
                onKeyDown: handleKeyDown,
                disabled: isProcessing,
                autoFocus: true,
                spellCheck: false,
                autoComplete: 'off'
            })
        ])
    ]);
}