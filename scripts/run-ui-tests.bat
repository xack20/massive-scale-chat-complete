@echo off
setlocal enabledelayedexpansion

:: Run UI Testing for Chat Application
:: This script installs Playwright and runs the UI tests

:: Create logs directory
if not exist logs mkdir logs

:: Log file setup
set TIMESTAMP=%date:~10,4%%date:~4,2%%date:~7,2%-%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=!TIMESTAMP: =0!
set LOG_FILE=logs\ui-test-!TIMESTAMP!.log

:: Print with timestamp to console and log file
echo [%date% %time%] Starting UI Testing Setup and Execution | tee -a !LOG_FILE!

:: Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo [%date% %time%] Node.js is not installed. Please install Node.js before running this script. | tee -a !LOG_FILE!
  exit /b 1
)

:: Check if npm is installed
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo [%date% %time%] npm is not installed. Please install npm before running this script. | tee -a !LOG_FILE!
  exit /b 1
)

:: Check Node.js version
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [%date% %time%] Detected Node.js version: !NODE_VERSION! | tee -a !LOG_FILE!

:: Install dependencies if needed
echo [%date% %time%] Checking for required dependencies... | tee -a !LOG_FILE!

:: Check if Playwright is installed
call npm list playwright >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo [%date% %time%] Installing Playwright and dependencies... | tee -a !LOG_FILE!
  call npm install @playwright/test --save-dev
  
  :: Install Playwright browsers
  echo [%date% %time%] Installing Playwright browsers... | tee -a !LOG_FILE!
  call npx playwright install --with-deps chromium
) else (
  echo [%date% %time%] Playwright is already installed | tee -a !LOG_FILE!
)

:: Create the tests directory if it doesn't exist
if not exist tests (
  echo [%date% %time%] Creating tests directory... | tee -a !LOG_FILE!
  mkdir tests
)

:: Ensure reports directory exists
if not exist tests\reports mkdir tests\reports

:: Check if the application is running
echo [%date% %time%] Checking if the application is running at http://localhost:3000... | tee -a !LOG_FILE!
curl -s http://localhost:3000 >nul 2>&1
if %ERRORLEVEL% equ 0 (
  echo [%date% %time%] Application is running | tee -a !LOG_FILE!
) else (
  echo [%date% %time%] WARNING: Application does not seem to be running at http://localhost:3000. | tee -a !LOG_FILE!
  echo [%date% %time%] Starting development server... | tee -a !LOG_FILE!
  
  :: Try to start the development server in the background
  start /b cmd /c "npm run dev > logs\dev-server.log 2>&1"
  set DEV_SERVER_STARTED=1
  
  :: Wait for the server to start
  echo [%date% %time%] Waiting for development server to start (30s timeout)... | tee -a !LOG_FILE!
  set SERVER_STARTED=0
  
  for /l %%i in (1, 1, 30) do (
    timeout /t 1 >nul
    curl -s http://localhost:3000 >nul 2>&1
    if !ERRORLEVEL! equ 0 (
      echo [%date% %time%] Development server started successfully | tee -a !LOG_FILE!
      set SERVER_STARTED=1
      goto :server_check_complete
    )
  )
  
  :server_check_complete
  if !SERVER_STARTED! equ 0 (
    echo [%date% %time%] Development server did not start in time. Please start it manually. | tee -a !LOG_FILE!
    exit /b 1
  )
)

:: Run the tests
echo [%date% %time%] Running Playwright tests... | tee -a !LOG_FILE!
call npx playwright test tests/ui-issues.test.js --reporter=html,list

:: Check if test succeeded
if %ERRORLEVEL% equ 0 (
  echo [%date% %time%] UI Tests completed successfully | tee -a !LOG_FILE!
) else (
  echo [%date% %time%] UI Tests encountered issues | tee -a !LOG_FILE!
)

:: Open the report
echo [%date% %time%] Opening test report... | tee -a !LOG_FILE!
call npx playwright show-report

:: Clean up
if defined DEV_SERVER_STARTED (
  echo [%date% %time%] Note: A development server was started and may still be running. | tee -a !LOG_FILE!
  echo [%date% %time%] You may need to close it manually when finished. | tee -a !LOG_FILE!
)

echo [%date% %time%] UI Testing process completed | tee -a !LOG_FILE!
echo [%date% %time%] Check the report and screenshots in 'tests\reports' directory | tee -a !LOG_FILE!

endlocal