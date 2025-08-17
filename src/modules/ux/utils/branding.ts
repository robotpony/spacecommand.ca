/**
 * Branding assets and utilities for the SpaceCommand game
 * Contains logos, ASCII art, and other brand elements
 */

/**
 * Default ASCII logo for SpaceCommand
 * @returns {string[]} Array of logo lines
 */
function getDefaultLogo() {
  return [
    '███████╗██████╗  █████╗  ██████╗███████╗',
    '██╔════╝██╔══██╗██╔══██╗██╔════╝██╔════╝',
    '███████╗██████╔╝███████║██║     █████╗  ',
    '╚════██║██╔═══╝ ██╔══██║██║     ██╔══╝  ',
    '███████║██║     ██║  ██║╚██████╗███████╗',
    '╚══════╝╚═╝     ╚═╝  ╚═╝ ╚═════╝╚══════╝',
    '                                        ',
    '   ██████╗ ██████╗ ███╗   ███╗███╗   ███╗ █████╗ ███╗   ██╗██████╗ ',
    '  ██╔════╝██╔═══██╗████╗ ████║████╗ ████║██╔══██╗████╗  ██║██╔══██╗',
    '  ██║     ██║   ██║██╔████╔██║██╔████╔██║███████║██╔██╗ ██║██║  ██║',
    '  ██║     ██║   ██║██║╚██╔╝██║██║╚██╔╝██║██╔══██║██║╚██╗██║██║  ██║',
    '  ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║ ╚═╝ ██║██║  ██║██║ ╚████║██████╔╝',
    '   ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝ '
  ];
}

/**
 * Compact version of the logo for smaller spaces
 * @returns {string[]} Array of compact logo lines
 */
function getCompactLogo() {
  return [
    'SPACE COMMAND',
    '═════════════'
  ];
}

/**
 * Sample menu items for demos and examples
 * @returns {Array<Object>} Array of menu item objects
 */
function getSampleMenuItems() {
  return [
    { key: '1', label: 'Trade Center', description: 'Buy and sell goods across the galaxy' },
    { key: '2', label: 'Fleet Command', description: 'Manage your ships and crew' },
    { key: '3', label: 'Diplomacy', description: 'Alliances, treaties, and negotiations' },
    { key: '4', label: 'Intelligence', description: 'Market data and faction reports' },
    { key: '5', label: 'Research Lab', description: 'Develop new technologies' },
    { key: '6', label: 'Communications', description: 'Messages and galactic news' },
    { key: '7', label: 'Personal Quarters', description: 'Settings and character info' },
    { key: 'Q', label: 'Quit Game', description: 'Exit to terminal' }
  ];
}

/**
 * Sample player status for demos
 * @returns {Object} Player status object
 */
function getSamplePlayerStatus() {
  return {
    name: 'Captain Reynolds',
    faction: 'Independent Trader',
    credits: 45750,
    reputation: 'Neutral',
    ships: 3,
    turn: 47,
    timeLeft: '2h 15m'
  };
}

module.exports = {
  getDefaultLogo,
  getCompactLogo,
  getSampleMenuItems,
  getSamplePlayerStatus
};