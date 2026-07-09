@echo off
:: Get absolute path to the analytics_updater.py script in the same directory
set "SCRIPT_PATH=%~dp0analytics_updater.py"
echo Registering task to run: python.exe "%SCRIPT_PATH%"

:: Create task using schtasks
schtasks /create /tn "SocialMediaTrackerUpdater" /tr "python.exe \"%%SCRIPT_PATH%%\"" /sc minute /mo 60 /f

if %errorlevel% equ 0 (
    echo [SUCCESS] Scheduled Task 'SocialMediaTrackerUpdater' registered successfully to run every 1 hour (60 minutes).
    echo You can verify the task by running: schtasks /query /tn "SocialMediaTrackerUpdater"
) else (
    echo [ERROR] Failed to register scheduled task. Error code: %errorlevel%
)
