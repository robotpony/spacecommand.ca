// Basic React application structure
// Note: This is a basic setup. In production, you'd use a bundler like Webpack or Vite

const { useState, useEffect } = React;

function App() {
    const [status, setStatus] = useState('Connecting...');

    useEffect(() => {
        // Test connection to server
        fetch('/health')
            .then(response => response.json())
            .then(data => setStatus(`Connected - ${data.status}`))
            .catch(() => setStatus('Connection failed'));
    }, []);

    return React.createElement('div', { style: { padding: '20px', fontFamily: 'Arial, sans-serif' } }, [
        React.createElement('h1', { key: 'title' }, 'SpaceCommand.ca'),
        React.createElement('p', { key: 'status' }, `Status: ${status}`),
        React.createElement('p', { key: 'description' }, 'Game simulation runner - Ready for development')
    ]);
}

// Render the app
ReactDOM.render(React.createElement(App), document.getElementById('root'));