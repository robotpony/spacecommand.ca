# Web Terminal Testing Guide

**Document**: Web Terminal Testing Instructions  
**Version**: 1.0  
**Created**: 2025-07-18  
**Purpose**: Comprehensive testing procedures for the SpaceCommand web terminal client

## Overview

This document provides step-by-step testing instructions for the SpaceCommand web terminal client implemented in Phase 3. The web terminal provides browser-based access to the SpaceCommand game with feature parity to the Node.js terminal client.

## Prerequisites

### System Requirements
- Node.js 16+ installed
- Modern web browser with ES6 module support:
  - Chrome 61+
  - Firefox 60+
  - Safari 10.1+
  - Edge 16+
- Git (for cloning/updating repository)

### Server Setup
- SpaceCommand server codebase
- PostgreSQL database (for full testing) OR
- Test server script (for basic functionality testing)

## Testing Scenarios

### Scenario 1: Basic Web Client Testing (No Database Required)

This scenario tests the web client interface and basic functionality using mock API responses.

#### Step 1: Start Test Server
```bash
# Navigate to project directory
cd /path/to/spacecommand.ca

# Start the test server with mock APIs
node test-web-client.js
```

Expected output:
```
🚀 Test web client server running at http://localhost:3000
📁 Serving static files from: src/client
🔧 Mock API endpoints available
🌐 Open your browser to test the web terminal
```

#### Step 2: Access Web Terminal
1. Open browser and navigate to `http://localhost:3000`
2. Verify the terminal loads with:
   - Black background with green text
   - SpaceCommand banner display
   - Connection status showing "Connected"
   - Command prompt: `[guest@spacecommand]$`

#### Step 3: Test Basic Commands
Execute each command and verify expected output:

**Help System:**
```
help
```
Expected: List of available commands with descriptions

```
help login
```
Expected: Detailed help for login command

**Authentication Flow:**
```
login testuser testpass
```
Expected: 
- Success message: "Welcome, testuser!"
- Empire info: "Empire: Test Empire"
- Prompt changes to: `[testuser@spacecommand]$`

```
whoami
```
Expected: Display user information

```
logout
```
Expected: 
- Success message: "Logged out successfully"
- Prompt reverts to: `[guest@spacecommand]$`

**Terminal Features:**
```
history
```
Expected: Show recent command history

```
clear
```
Expected: Clear terminal screen, show banner again

#### Step 4: Test Game Commands (After Login)
```
login testuser testpass
status
```
Expected: Empire status with power, planets, fleets

```
empire
```
Expected: Detailed empire information

```
fleets
```
Expected: List of fleets with IDs and ship counts

```
planets
```
Expected: List of planets with types and populations

```
resources
```
Expected: Resource levels (minerals, energy, food, research)

#### Step 5: Test Error Handling
```
invalidcommand
```
Expected: Error message about unknown command

```
login
```
Expected: Usage error for missing parameters

```
fleet
```
Expected: Usage error for missing fleet ID

#### Step 6: Test Browser Features

**Command History Navigation:**
1. Execute several commands
2. Press ↑ arrow key
3. Verify previous commands appear
4. Press ↓ arrow key to navigate forward

**Mobile Responsiveness:**
1. Resize browser window to mobile size (320px width)
2. Verify terminal remains usable
3. Test touch input on mobile device if available

**Accessibility:**
1. Tab through interface elements
2. Verify keyboard navigation works
3. Test with screen reader if available

#### Step 7: Clean Up
```bash
# Stop test server
pkill -f "node test-web-client.js"
```

### Scenario 2: Full Integration Testing (Database Required)

This scenario tests the web client against the full SpaceCommand server with database.

#### Step 1: Setup Database
```bash
# Start PostgreSQL service
# Create spacecommand database
# Configure environment variables in .env file
```

#### Step 2: Start Full Server
```bash
npm start
```

Expected output:
```
📡 Initializing database connection...
✓ Database connected successfully
✓ SessionManager initialized
✓ All services initialized successfully
🚀 SpaceCommand server running on port 3000
```

#### Step 3: Test Real Authentication
1. Navigate to `http://localhost:3000`
2. Register new account:
   ```
   register testuser test@example.com testpass123
   ```
3. Login with real credentials:
   ```
   login testuser testpass123
   ```
4. Verify session persistence by refreshing page

#### Step 4: Test Game Functionality
Execute comprehensive game command tests:

**Empire Management:**
```
status
empire
planets
resources
build 1 mine
research list
research 1
```

**Fleet Operations:**
```
fleets
create-fleet 1 fighter 5 cruiser 2
move 1 2,3
scan
retreat 1
```

**Advanced Features:**
```
turn
events 5
leaderboard
diplomacy relations
explore 5,5 1
```

#### Step 5: Test Error Scenarios
1. Invalid authentication tokens
2. Network disconnection simulation
3. Server timeout scenarios
4. Invalid command parameters

#### Step 6: Performance Testing
1. Execute rapid command sequences
2. Test with large data responses
3. Monitor memory usage in browser dev tools
4. Test concurrent users (multiple browser tabs)

## Automated Testing

### Unit Tests
```bash
# Run command parser tests
npm test -- --grep "CommandParser"

# Run API client tests
npm test -- --grep "ApiClient"

# Run session manager tests
npm test -- --grep "SessionManager"
```

### Browser Automation Tests
```bash
# Install testing dependencies
npm install --save-dev puppeteer

# Run browser automation tests
npm run test:browser
```

## Expected Results

### Functional Requirements ✅
- [ ] All terminal client commands work in browser
- [ ] Authentication flow completes successfully
- [ ] Session persistence across page refreshes
- [ ] Real-time command execution and response
- [ ] Error handling displays user-friendly messages
- [ ] Command history and navigation functions

### Performance Requirements ✅
- [ ] Page loads in < 3 seconds
- [ ] Commands execute in < 1 second
- [ ] Smooth scrolling with large outputs
- [ ] No memory leaks during extended use
- [ ] Responsive on mobile devices

### UI/UX Requirements ✅
- [ ] Retro terminal aesthetic maintained
- [ ] Readable text on all screen sizes
- [ ] Intuitive command interface
- [ ] Clear visual feedback for actions
- [ ] Accessible keyboard navigation

### Browser Compatibility ✅
- [ ] Chrome (latest 2 versions)
- [ ] Firefox (latest 2 versions)
- [ ] Safari (latest 2 versions)
- [ ] Edge (latest 2 versions)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### Common Issues

**Module Loading Errors:**
- Verify ES6 module support in browser
- Check browser console for specific errors
- Ensure MIME types are set correctly on server

**API Connection Failures:**
- Verify server is running and accessible
- Check CORS configuration
- Test API endpoints directly with curl

**Authentication Problems:**
- Clear localStorage and try again
- Verify JWT token format and expiration
- Check server authentication endpoints

**Display Issues:**
- Test in different browsers
- Clear browser cache
- Verify CSS files are loading

**Performance Problems:**
- Monitor network requests in dev tools
- Check for memory leaks
- Verify efficient React re-rendering

### Debug Mode

Enable debug mode for detailed logging:

1. Open browser dev tools (F12)
2. Set localStorage flag:
   ```javascript
   localStorage.setItem('spacecommand_debug', 'true');
   ```
3. Refresh page to see detailed logs

### Logging

Check logs in multiple locations:
- Browser console (F12 → Console)
- Network tab for API requests
- Server logs for backend issues
- Terminal output for server errors

## Test Reports

### Test Execution Checklist

| Test Category | Test Case | Status | Notes |
|---------------|-----------|--------|-------|
| **Basic Interface** | Page loads correctly | ⬜ | |
| | Terminal displays banner | ⬜ | |
| | Command prompt appears | ⬜ | |
| **Authentication** | Login with valid credentials | ⬜ | |
| | Login with invalid credentials | ⬜ | |
| | Session persistence | ⬜ | |
| | Logout functionality | ⬜ | |
| **Commands** | Help system | ⬜ | |
| | Empire management | ⬜ | |
| | Fleet operations | ⬜ | |
| | Game information | ⬜ | |
| **Error Handling** | Invalid commands | ⬜ | |
| | Network errors | ⬜ | |
| | Authentication errors | ⬜ | |
| **Browser Features** | Command history | ⬜ | |
| | Mobile responsiveness | ⬜ | |
| | Keyboard navigation | ⬜ | |
| **Performance** | Load time | ⬜ | |
| | Command execution speed | ⬜ | |
| | Memory usage | ⬜ | |

### Bug Report Template

```
Bug ID: WEB-XXX
Date: YYYY-MM-DD
Tester: [Name]
Browser: [Browser/Version]
OS: [Operating System]

Description:
[Clear description of the issue]

Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Expected Result:
[What should happen]

Actual Result:
[What actually happens]

Severity: [Low/Medium/High/Critical]
Priority: [Low/Medium/High]

Additional Notes:
[Any other relevant information]
```

## Sign-off

### Test Completion Criteria

The web terminal testing is considered complete when:

1. ✅ All functional requirements pass
2. ✅ Performance requirements are met
3. ✅ Cross-browser compatibility confirmed
4. ✅ No critical or high-priority bugs remain
5. ✅ Documentation is accurate and complete

### Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Developer** | | | |
| **Tester** | | | |
| **Project Lead** | | | |

---

**Document Control:**
- Review frequency: Before each release
- Last updated: 2025-07-18
- Next review: Before Phase 4 start