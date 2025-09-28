#!/bin/bash

# Run UI Testing for Chat Application
# This script installs Playwright and runs the UI tests

# Set color codes for output formatting
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Create logs directory
mkdir -p logs

# Log file setup
LOG_FILE="logs/ui-test-$(date +%Y%m%d-%H%M%S).log"

# Print with timestamp to console and log file
log() {
  local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
  echo -e "${timestamp} - $1" | tee -a "${LOG_FILE}"
}

log "${GREEN}Starting UI Testing Setup and Execution${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  log "${RED}Node.js is not installed. Please install Node.js before running this script.${NC}"
  exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
  log "${RED}npm is not installed. Please install npm before running this script.${NC}"
  exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v)
log "Detected Node.js version: ${NODE_VERSION}"

# Install dependencies if needed
log "${YELLOW}Checking for required dependencies...${NC}"
if ! npm list playwright &> /dev/null; then
  log "${YELLOW}Installing Playwright and dependencies...${NC}"
  npm install @playwright/test --save-dev
  
  # Install Playwright browsers
  log "${YELLOW}Installing Playwright browsers...${NC}"
  npx playwright install --with-deps chromium
else
  log "${GREEN}Playwright is already installed${NC}"
fi

# Create the tests directory if it doesn't exist
if [ ! -d "tests" ]; then
  log "${YELLOW}Creating tests directory...${NC}"
  mkdir -p tests
fi

# Ensure reports directory exists
mkdir -p tests/reports

# Check if the application is running
log "${YELLOW}Checking if the application is running at http://localhost:3000...${NC}"
if curl -s http://localhost:3000 > /dev/null; then
  log "${GREEN}Application is running${NC}"
else
  log "${RED}WARNING: Application does not seem to be running at http://localhost:3000.${NC}"
  log "${YELLOW}Starting development server...${NC}"
  
  # Try to start the development server
  # This is done in the background and will be stopped when the script exits
  npm run dev > logs/dev-server.log 2>&1 &
  DEV_SERVER_PID=$!
  
  # Wait for the server to start
  log "${YELLOW}Waiting for development server to start (30s timeout)...${NC}"
  for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null; then
      log "${GREEN}Development server started successfully${NC}"
      break
    fi
    
    if [ $i -eq 30 ]; then
      log "${RED}Development server did not start in time. Please start it manually.${NC}"
      kill $DEV_SERVER_PID 2>/dev/null
      exit 1
    fi
    
    sleep 1
  done
fi

# Run the tests
log "${GREEN}Running Playwright tests...${NC}"
npx playwright test tests/ui-issues.test.js --reporter=html,list

# Check if test succeeded
if [ $? -eq 0 ]; then
  log "${GREEN}UI Tests completed successfully${NC}"
else
  log "${RED}UI Tests encountered issues${NC}"
fi

# Open the report
log "${YELLOW}Opening test report...${NC}"
npx playwright show-report

# Cleanup dev server if we started it
if [ ! -z "$DEV_SERVER_PID" ]; then
  log "${YELLOW}Stopping development server...${NC}"
  kill $DEV_SERVER_PID 2>/dev/null
fi

log "${GREEN}UI Testing process completed${NC}"
log "${YELLOW}Check the report and screenshots in 'tests/reports' directory${NC}"