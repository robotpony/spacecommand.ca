// SpaceCommand Web Terminal Application
// Complete web-based terminal interface for SpaceCommand game

const { useState, useEffect } = React;

// WebTerminal component will be loaded via ES6 modules
function WebTerminal() {
    // Use the globally available WebTerminal component
    if (window.SpaceCommand && window.SpaceCommand.WebTerminal) {
        return React.createElement(window.SpaceCommand.WebTerminal);
    } else {
        return React.createElement('div', {
            style: {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                color: '#ffff00'
            }
        }, 'Loading SpaceCommand modules...');
    }
}

function App() {
    const [isTerminalMode, setIsTerminalMode] = useState(true);
    const [connectionStatus, setConnectionStatus] = useState('connecting');

    useEffect(() => {
        // Test connection to server
        fetch('/api/health')
            .then(response => response.json())
            .then(data => {
                setConnectionStatus('connected');
                // Auto-switch to terminal mode once connected
                setTimeout(() => setIsTerminalMode(true), 500);
            })
            .catch(() => {
                setConnectionStatus('failed');
            });
    }, []);

    if (isTerminalMode && connectionStatus === 'connected') {
        // Load the web terminal
        return React.createElement('div', {
            id: 'terminal-container',
            style: { height: '100vh', margin: 0, padding: 0 }
        }, React.createElement(WebTerminal));
    }

    // Landing page while connecting or if connection fails
    return React.createElement('div', {
        style: {
            padding: '20px',
            fontFamily: 'Courier New, monospace',
            backgroundColor: '#000',
            color: '#00ff00',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
        }
    }, [
        React.createElement('pre', {
            key: 'banner',
            style: {
                color: '#00ffff',
                textAlign: 'center',
                fontSize: '12px',
                lineHeight: '1.2',
                marginBottom: '20px'
            }
        }, `
╔═══════════════════════════════════════════════════════════════╗
║                      SPACECOMMAND.CA                          ║
║                   Web Terminal Interface                      ║
╚═══════════════════════════════════════════════════════════════╝
        `),
        React.createElement('div', {
            key: 'status',
            style: {
                fontSize: '16px',
                marginBottom: '10px',
                color: connectionStatus === 'connected' ? '#00ff00' :
                       connectionStatus === 'failed' ? '#ff0000' : '#ffff00'
            }
        }, getStatusMessage(connectionStatus)),
        connectionStatus === 'failed' && React.createElement('div', {
            key: 'retry',
            style: { marginTop: '20px' }
        }, [
            React.createElement('button', {
                key: 'retry-btn',
                onClick: () => window.location.reload(),
                style: {
                    background: '#333',
                    border: '1px solid #00ff00',
                    color: '#00ff00',
                    padding: '10px 20px',
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                }
            }, 'Retry Connection'),
            React.createElement('p', {
                key: 'help',
                style: { color: '#aaa', fontSize: '12px', marginTop: '10px' }
            }, 'Make sure the SpaceCommand server is running on the configured port.')
        ])
    ]);
}

function getStatusMessage(status) {
    switch (status) {
        case 'connecting':
            return 'Connecting to SpaceCommand server...';
        case 'connected':
            return 'Connected! Initializing terminal...';
        case 'failed':
            return 'Connection failed - unable to reach server';
        default:
            return 'Unknown status';
    }
}

// Render the app
ReactDOM.render(React.createElement(App), document.getElementById('root'));