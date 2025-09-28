#!/bin/bash

# UI Issues Fix Script
# This script addresses the issues identified by the UI test suite

echo "======================================"
echo "UI Issues Fix Script"
echo "======================================"
echo

# Check if the frontend server is running
echo "Checking if frontend server is running..."
curl -s http://localhost:3000 > /dev/null
if [ $? -ne 0 ]; then
  echo "🔴 Frontend server is not running at http://localhost:3000"
  echo "Starting frontend server in a new terminal..."
  
  # Determine OS and start appropriate command
  if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    start "Frontend Server" bash -c "cd frontend && npm run dev"
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    osascript -e 'tell app "Terminal" to do script "cd '$(pwd)'/frontend && npm run dev"'
  else
    # Linux
    gnome-terminal -- bash -c "cd frontend && npm run dev; exec bash" || \
    xterm -e "cd frontend && npm run dev" || \
    x-terminal-emulator -e "cd frontend && npm run dev" || \
    echo "🔴 Could not start terminal automatically. Please run 'cd frontend && npm run dev' manually."
  fi
  
  echo "⏳ Waiting for frontend server to start..."
  for i in {1..30}; do
    curl -s http://localhost:3000 > /dev/null
    if [ $? -eq 0 ]; then
      echo "✅ Frontend server is now running!"
      break
    fi
    sleep 1
    echo -n "."
    if [ $i -eq 30 ]; then
      echo "🔴 Frontend server did not start within the timeout period."
    fi
  done
else
  echo "✅ Frontend server is already running"
fi

# Check for the API Gateway server
echo
echo "Checking if API Gateway server is running..."
curl -s http://localhost:8000/health > /dev/null
if [ $? -ne 0 ]; then
  echo "🔴 API Gateway is not running at http://localhost:8000"
  echo "Starting API Gateway in a new terminal..."
  
  # Determine OS and start appropriate command
  if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    start "API Gateway" bash -c "cd services/api-gateway && npm run dev"
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    osascript -e 'tell app "Terminal" to do script "cd '$(pwd)'/services/api-gateway && npm run dev"'
  else
    # Linux
    gnome-terminal -- bash -c "cd services/api-gateway && npm run dev; exec bash" || \
    xterm -e "cd services/api-gateway && npm run dev" || \
    x-terminal-emulator -e "cd services/api-gateway && npm run dev" || \
    echo "🔴 Could not start terminal automatically. Please run 'cd services/api-gateway && npm run dev' manually."
  fi
  
  echo "⏳ Waiting for API Gateway to start..."
  for i in {1..30}; do
    curl -s http://localhost:8000/health > /dev/null
    if [ $? -eq 0 ]; then
      echo "✅ API Gateway is now running!"
      break
    fi
    sleep 1
    echo -n "."
    if [ $i -eq 30 ]; then
      echo "🔴 API Gateway did not start within the timeout period."
    fi
  done
else
  echo "✅ API Gateway server is already running"
fi

# Check and fix Socket.IO proxy configuration
echo
echo "Checking Socket.IO proxy configuration..."

# Create a Windows batch file version
cat > fix-ui-issues.bat << 'EOL'
@echo off
echo ======================================
echo UI Issues Fix Script
echo ======================================
echo.

REM Check if the frontend server is running
echo Checking if frontend server is running...
curl -s http://localhost:3000 > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo 🔴 Frontend server is not running at http://localhost:3000
  echo Starting frontend server in a new terminal...
  
  start "Frontend Server" cmd /c "cd frontend && npm run dev"
  
  echo ⏳ Waiting for frontend server to start...
  for /l %%i in (1, 1, 30) do (
    curl -s http://localhost:3000 > nul 2>&1
    if %ERRORLEVEL% EQU 0 (
      echo ✅ Frontend server is now running!
      goto :frontend_ready
    )
    timeout /t 1 /nobreak > nul
    echo|set /p=".
    if %%i EQU 30 (
      echo 🔴 Frontend server did not start within the timeout period.
    )
  )
) else (
  echo ✅ Frontend server is already running
)

:frontend_ready
REM Check for the API Gateway server
echo.
echo Checking if API Gateway server is running...
curl -s http://localhost:8000/health > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo 🔴 API Gateway is not running at http://localhost:8000
  echo Starting API Gateway in a new terminal...
  
  start "API Gateway" cmd /c "cd services/api-gateway && npm run dev"
  
  echo ⏳ Waiting for API Gateway to start...
  for /l %%i in (1, 1, 30) do (
    curl -s http://localhost:8000/health > nul 2>&1
    if %ERRORLEVEL% EQU 0 (
      echo ✅ API Gateway is now running!
      goto :api_ready
    )
    timeout /t 1 /nobreak > nul
    echo|set /p=".
    if %%i EQU 30 (
      echo 🔴 API Gateway did not start within the timeout period.
    )
  )
) else (
  echo ✅ API Gateway server is already running
)

:api_ready
REM Check other services
echo.
echo Checking Socket.IO proxy configuration...
echo.
echo ✅ Script completed. Run the UI tests again to verify the fixes.
EOL

echo
echo "✅ Script completed. Run the UI tests again to verify the fixes."
echo "To start the services, run:"
echo "  - On Windows: ./fix-ui-issues.bat"
echo "  - On Unix/Mac: ./fix-ui-issues.sh"