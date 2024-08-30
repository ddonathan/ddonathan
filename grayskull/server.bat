@echo off
:loop
echo Starting the server...
start /B node server.js

echo Press 'q' to stop the server and exit, or Enter to restart the server...
set /p input=Input: 

if /i "%input%"=="q" (
    echo Stopping the server...
    taskkill /F /IM node.exe
    exit
) else (
    echo Stopping the server...
    taskkill /F /IM node.exe
    echo Restarting the server...
    goto loop
)