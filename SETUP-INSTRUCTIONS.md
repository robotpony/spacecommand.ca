# SpaceCommand Setup Instructions

## Prerequisites

Before starting the game server, you need to set up the required database infrastructure.

## Database Setup

### 1. Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
Download and install from https://www.postgresql.org/download/windows/

### 2. Install Redis

**macOS (using Homebrew):**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**Windows:**
Download and install from https://redis.io/download

### 3. Create Database and User

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE spacecommand;

# Create user (if needed)
CREATE USER postgres WITH PASSWORD 'password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE spacecommand TO postgres;

# Exit PostgreSQL
\q
```

### 4. Environment Configuration

Create a `.env` file in the project root with the following content:

```env
# Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_NAME=spacecommand
DB_PASSWORD=password
DB_PORT=5432

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Application Configuration
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 5. Run Database Migrations

```bash
# Install dependencies
npm install

# Run migrations to create tables
node src/server/config/migration-runner.js

# Seed the database with initial data
node src/server/config/seed-runner.js
```

## Starting the Application

### 1. Start the Server
```bash
npm start
```

The server will start on http://localhost:3000

### 2. Access the Web Client
Open your browser and navigate to:
```
http://localhost:3000
```

### 3. Start the Terminal Client
In a separate terminal window:
```bash
npm run terminal
```

## Quick Test Commands

Once you have a client running, try these commands to test the system:

```bash
# Register a new player
register testplayer password123

# Login
login testplayer password123

# Check your empire status
status

# View available commands
help

# Check turn information
turn

# Explore nearby space
scan

# View your resources
empire
```

## Troubleshooting

### PostgreSQL Connection Issues
- Ensure PostgreSQL is running: `brew services list | grep postgresql`
- Check if database exists: `psql -l`
- Verify user permissions: `psql spacecommand -c "\du"`

### Redis Connection Issues
- Ensure Redis is running: `brew services list | grep redis`
- Test Redis connection: `redis-cli ping`

### Server Startup Issues
- Check logs for specific error messages
- Verify all environment variables are set correctly
- Ensure all dependencies are installed: `npm install`

### Migration Issues
- Ensure database exists and is accessible
- Check database permissions for the user
- Run migrations manually if needed: `node src/server/config/migration-runner.js`

## Development Environment

For development, you may want to:

1. **Enable detailed logging:**
   ```env
   NODE_ENV=development
   ```

2. **Use development database:**
   ```env
   DB_NAME=spacecommand_dev
   ```

3. **Auto-restart server on changes:**
   ```bash
   npm install -g nodemon
   nodemon bin/server.js
   ```

## Next Steps

After successful setup:

1. **Phase 4 Testing**: Follow the testing plan in `design/PHASE-4-TESTING-PLAN.md`
2. **Game Tutorial**: Try the in-game tutorial system with `help tutorial`
3. **Multi-player Testing**: Set up multiple player accounts for interaction testing
4. **Performance Testing**: Monitor system performance with multiple concurrent connections

## Support

- Check the comprehensive help system: `help`
- Review game mechanics: `design/GAME-MECHANICS.md`
- Architecture documentation: `design/ARCHITECTURE.md`
- Current status: `tasks/CURRENT-STATUS.md`