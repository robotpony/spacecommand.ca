/**
 * Port Management Utility
 * 
 * Provides robust port selection, conflict detection, and process management
 * for reliable server startup.
 */

const net = require('net');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Check if a port is available for use
 * @param {number} port - Port number to check
 * @returns {Promise<boolean>} True if port is free, false if occupied
 */
async function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    
    server.on('error', () => resolve(false));
  });
}

/**
 * Find the next available port starting from a given port
 * @param {number} startPort - Starting port number (default: 3000)
 * @param {number} maxTries - Maximum number of ports to try (default: 10)
 * @returns {Promise<number>} Available port number
 * @throws {Error} If no available port found in range
 */
async function findAvailablePort(startPort = 3000, maxTries = 10) {
  for (let port = startPort; port < startPort + maxTries; port++) {
    if (await isPortFree(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found in range ${startPort}-${startPort + maxTries - 1}`);
}

/**
 * Check if a process is running by PID
 * @param {number} pid - Process ID to check
 * @returns {boolean} True if process is running
 */
function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the port number that a process is listening on
 * @param {number} pid - Process ID
 * @returns {Promise<number|null>} Port number or null if not found
 */
async function getPortForPid(pid) {
  try {
    const { stdout } = await execAsync(`lsof -Pan -p ${pid} -i`);
    const lines = stdout.split('\n');
    
    for (const line of lines) {
      const match = line.match(/:(\d+)\s+\(LISTEN\)/);
      if (match) {
        return parseInt(match[1]);
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Check for existing SpaceCommand server instances
 * @param {string} pidFilePath - Path to PID file
 * @returns {Promise<object>} Instance information
 */
async function checkExistingInstances(pidFilePath) {
  const result = {
    running: false,
    pid: null,
    port: null,
    pidFile: pidFilePath
  };

  if (fs.existsSync(pidFilePath)) {
    try {
      const pidContent = fs.readFileSync(pidFilePath, 'utf8').trim();
      const pid = parseInt(pidContent);
      
      if (!isNaN(pid) && isProcessRunning(pid)) {
        const port = await getPortForPid(pid);
        result.running = true;
        result.pid = pid;
        result.port = port;
      } else {
        // Clean up stale PID file
        fs.unlinkSync(pidFilePath);
      }
    } catch (error) {
      // Clean up corrupted PID file
      try {
        fs.unlinkSync(pidFilePath);
      } catch (unlinkError) {
        // Ignore unlink errors
      }
    }
  }

  return result;
}

/**
 * Write PID to file for process tracking
 * @param {string} pidFilePath - Path to PID file
 * @param {number} pid - Process ID to write
 */
function writePidFile(pidFilePath, pid) {
  try {
    fs.writeFileSync(pidFilePath, pid.toString());
  } catch (error) {
    console.warn(`Warning: Could not write PID file: ${error.message}`);
  }
}

/**
 * Remove PID file
 * @param {string} pidFilePath - Path to PID file
 */
function removePidFile(pidFilePath) {
  try {
    if (fs.existsSync(pidFilePath)) {
      fs.unlinkSync(pidFilePath);
    }
  } catch (error) {
    console.warn(`Warning: Could not remove PID file: ${error.message}`);
  }
}

/**
 * Terminate an existing SpaceCommand process
 * @param {number} pid - Process ID to terminate
 * @returns {Promise<boolean>} True if successfully terminated
 */
async function terminateProcess(pid) {
  try {
    process.kill(pid, 'SIGTERM');
    
    // Wait up to 5 seconds for graceful shutdown
    for (let i = 0; i < 50; i++) {
      if (!isProcessRunning(pid)) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Force kill if still running
    process.kill(pid, 'SIGKILL');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return !isProcessRunning(pid);
  } catch (error) {
    return false;
  }
}

module.exports = {
  isPortFree,
  findAvailablePort,
  isProcessRunning,
  getPortForPid,
  checkExistingInstances,
  writePidFile,
  removePidFile,
  terminateProcess
};