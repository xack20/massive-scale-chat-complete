// Analyze UI Test Results
const fs = require('fs');
const path = require('path');

// Configuration
const reportsDir = path.join(__dirname, '..', 'tests', 'reports');
const outputPath = path.join(__dirname, '..', 'tests', 'reports', 'ui-issues-summary.md');

// Helper to read JSON files
function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return null;
  }
}

// List files in the reports directory
const reportFiles = fs.readdirSync(reportsDir);

// Group files by test
const testResults = {};
reportFiles.forEach(file => {
  if (file.endsWith('-console.json') || file.endsWith('-network.json')) {
    const testName = file.split('-console.json')[0] || file.split('-network.json')[0];
    
    if (!testResults[testName]) {
      testResults[testName] = {};
    }
    
    if (file.endsWith('-console.json')) {
      testResults[testName].console = readJsonFile(path.join(reportsDir, file));
    } else if (file.endsWith('-network.json')) {
      testResults[testName].network = readJsonFile(path.join(reportsDir, file));
    }
  }
});

// Analyze results
let reportContent = '# UI Issues Test Results Summary\n\n';
reportContent += `Test run completed at ${new Date().toLocaleString()}\n\n`;

// Overall statistics
const totalTests = Object.keys(testResults).length;
reportContent += `## Overview\n\n`;
reportContent += `- Total Tests: ${totalTests}\n`;
reportContent += `- Server Status: ${
  Object.values(testResults).some(result => 
    result.network && 
    result.network.some(req => req.response && req.response.status === 200)
  ) ? 'Running' : 'Not Running (404 errors)'
}\n`;

// Connection issues
const connectionIssues = [];
Object.entries(testResults).forEach(([testName, data]) => {
  if (testName.includes('connecting') || testName.includes('WebSocket')) {
    if (data.network && 
        !data.network.some(req => req.url.includes('socket.io') || req.url.includes('websocket'))) {
      connectionIssues.push(`- No WebSocket connections detected in "${testName}" test`);
    }
  }
});

if (connectionIssues.length > 0) {
  reportContent += `\n## Connection Issues\n\n`;
  reportContent += connectionIssues.join('\n') + '\n';
}

// UI Element issues
const uiIssues = [];
Object.entries(testResults).forEach(([testName, data]) => {
  if (data.console) {
    data.console.forEach(msg => {
      if (msg.text.includes('Could not find')) {
        uiIssues.push(`- ${msg.text} (in "${testName}" test)`);
      }
    });
  }
});

if (uiIssues.length > 0) {
  reportContent += `\n## UI Element Issues\n\n`;
  reportContent += uiIssues.join('\n') + '\n';
}

// Console errors
const consoleErrors = [];
Object.entries(testResults).forEach(([testName, data]) => {
  if (data.console) {
    data.console.forEach(msg => {
      if (msg.type === 'error' && !msg.text.includes('favicon.ico')) {
        consoleErrors.push(`- ${msg.text} (in "${testName}" test)`);
      }
    });
  }
});

if (consoleErrors.length > 0) {
  reportContent += `\n## Console Errors\n\n`;
  reportContent += consoleErrors.join('\n') + '\n';
}

// Network errors
const networkErrors = [];
Object.entries(testResults).forEach(([testName, data]) => {
  if (data.network) {
    data.network.forEach(req => {
      if (req.response && req.response.status >= 400 && !req.url.includes('favicon.ico')) {
        networkErrors.push(`- ${req.method} ${req.url} - ${req.response.status} ${req.response.statusText} (in "${testName}" test)`);
      }
    });
  }
});

if (networkErrors.length > 0) {
  reportContent += `\n## Network Errors\n\n`;
  reportContent += networkErrors.join('\n') + '\n';
}

// Recommendations
reportContent += `\n## Recommendations\n\n`;
if (networkErrors.some(err => err.includes('404'))) {
  reportContent += `1. Start the application server before running tests. The server appears to be offline (404 errors).\n`;
  reportContent += `   - Run \`npm run dev\` or appropriate start command in the frontend directory\n`;
}

if (connectionIssues.length > 0) {
  reportContent += `2. Check the Socket.IO or WebSocket configuration in the frontend application.\n`;
  reportContent += `   - Verify the WebSocket server is running\n`;
  reportContent += `   - Check that proxy settings in the API Gateway are correctly configured for WebSockets\n`;
}

if (uiIssues.length > 0) {
  reportContent += `3. Review the application's UI components and ensure they are rendered correctly:\n`;
  reportContent += `   - Fix login form elements\n`;
  reportContent += `   - Ensure chat interface components are visible\n`;
}

// Write report to file
fs.writeFileSync(outputPath, reportContent);
console.log(`Test analysis report generated at: ${outputPath}`);