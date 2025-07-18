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

    // Focus input when terminal is clicked
    useEffect(() => {
        const handleClick = () => {
            if (inputRef.current) {
                inputRef.current.focus();
            }
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

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
        const bannerText = `
╔═══════════════════════════════════════════════════════════════╗
║                      SPACECOMMAND.CA                          ║
║                   Web Terminal Interface                      ║
║                                                               ║
║  Type 'help' for available commands                          ║
║  Type 'login <username>' to authenticate                     ║
╚═══════════════════════════════════════════════════════════════╝
        `;

        addOutput({
            type: 'banner',
            content: bannerText.trim(),
            timestamp: new Date()
        });
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

            // Handle authentication commands
            if (!sessionRef.current.isAuthenticated() && !['login', 'register'].includes(command.name)) {
                addOutput({
                    type: 'error',
                    content: 'Authentication required. Please login first.',
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
        const leaderboard = await apiRef.current.getLeaderboard();
        displayLeaderboard(leaderboard);
    };

    const displayLeaderboard = (leaderboard) => {
        if (!leaderboard || leaderboard.length === 0) {
            addOutput({
                type: 'info',
                content: 'Leaderboard not available',
                timestamp: new Date()
            });
            return;
        }

        let content = 'Leaderboard:\n';
        leaderboard.forEach((player, index) => {
            content += `  ${index + 1}. ${player.name} - Score: ${player.score}\n`;
        });

        addOutput({
            type: 'data',
            content: content.trim(),
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
        return `
Available Commands:

Authentication:
  login <username> [password]  - Login to your account
  logout                       - Logout from your account
  register <username> <email>  - Create new account
  whoami                       - Show current user info

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

Type 'help <command>' for detailed information about a specific command.
        `.trim();
    };

    const getCommandHelp = (command) => {
        const helpMap = {
            login: 'login <username> [password] - Authenticate with the server',
            logout: 'logout - End your current session',
            register: 'register <username> <email> [password] - Create a new account',
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