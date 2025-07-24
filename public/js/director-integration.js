// Director mode WebSocket integration
(function() {
    // Initialize WebSocket connection
    const directorName = prompt('Enter your name (optional):') || 'Race Director';
    raceWebSocket.connect(true, directorName);
    
    // Connection status handlers
    function updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        const textElement = document.getElementById('connectionText');
        
        if (statusElement && textElement) {
            if (connected) {
                statusElement.style.color = '#2ecc71';
                textElement.textContent = 'Connected';
            } else {
                statusElement.style.color = '#e74c3c';
                textElement.textContent = 'Disconnected';
            }
        }
    }
    
    // WebSocket event handlers
    raceWebSocket.onConnected = function() {
        updateConnectionStatus(true);
        startRaceBtn.disabled = false;
    };
    
    raceWebSocket.onDisconnected = function() {
        updateConnectionStatus(false);
        showVisualNotification('Connection Lost - Attempting to Reconnect', 3000);
    };
    
    raceWebSocket.onInitialState = function(state, clientCount) {
        document.getElementById('clientCount').textContent = `${clientCount} device${clientCount !== 1 ? 's' : ''}`;
    };
    
    raceWebSocket.onClientUpdate = function(clientCount, clients) {
        document.getElementById('clientCount').textContent = `${clientCount} device${clientCount !== 1 ? 's' : ''}`;
        
        // Update connected clients list
        const clientsList = document.getElementById('clientsList');
        const connectedClientsDiv = document.getElementById('connectedClients');
        
        if (clientsList && clients.length > 0) {
            connectedClientsDiv.style.display = 'block';
            clientsList.innerHTML = clients.map(client => `
                <div class="client-item">
                    <span class="${client.isDirector ? 'director-badge' : 'spectator-badge'}">
                        ${client.isDirector ? '👑' : '👁️'}
                    </span>
                    ${client.name} ${client.id === raceWebSocket.clientId ? '(You)' : ''}
                </div>
            `).join('');
        }
    };
    
    // Override start race to broadcast
    const originalStartRaceHandler = startRaceBtn.onclick || startRaceBtn.addEventListener('click', () => {});
    startRaceBtn.addEventListener('click', function() {
        // Wait for the race to actually start (after countdown)
        setTimeout(() => {
            if (isRunning) {
                raceWebSocket.send({
                    type: 'start-race',
                    state: {
                        isRunning: true,
                        isPracticeMode: isPracticeMode,
                        totalSeconds: totalSeconds,
                        secondsLeft: secondsLeft,
                        voice: voiceSelect.value,
                        raceTimeMinutes: parseInt(raceTimeSelect.value),
                        yellowFlagCount: 0,
                        redFlagCount: 0,
                        isYellowFlag: false,
                        isRedFlag: false
                    }
                });
            }
        }, 8000); // Approximate time after countdown
    });
    
    // Timer sync - send updates every second when running
    let lastSyncedSecond = -1;
    const originalUpdateTimer = updateTimerDisplay;
    window.updateTimerDisplay = function() {
        originalUpdateTimer();
        
        // Sync timer every second
        if (isRunning && secondsLeft !== lastSyncedSecond) {
            lastSyncedSecond = secondsLeft;
            raceWebSocket.send({
                type: 'timer-update',
                secondsLeft: secondsLeft
            });
        }
    };
    
    // Flag controls broadcasting
    const originalYellowHandler = yellowFlagBtn.onclick;
    yellowFlagBtn.addEventListener('click', function() {
        // Wait for flag state to update
        setTimeout(() => {
            raceWebSocket.send({
                type: 'flag-change',
                flag: 'yellow',
                active: isYellowFlag
            });
        }, 100);
    });
    
    const originalRedHandler = redFlagBtn.onclick;
    redFlagBtn.addEventListener('click', function() {
        // Wait for flag state to update
        setTimeout(() => {
            raceWebSocket.send({
                type: 'flag-change',
                flag: 'red',
                active: isRedFlag,
                isRunning: isRunning
            });
        }, 100);
    });
    
    // Voice change broadcasting
    voiceSelect.addEventListener('change', function() {
        raceWebSocket.send({
            type: 'voice-change',
            voice: voiceSelect.value
        });
    });
    
    // Race end broadcasting
    const originalCheckTimeMarks = checkTimeMarks;
    window.checkTimeMarks = function() {
        originalCheckTimeMarks();
        
        // Check if race just ended
        if (secondsLeft === 0 && !isPracticeMode) {
            raceWebSocket.send({
                type: 'race-end',
                state: {
                    yellowFlagCount: yellowFlagCount,
                    redFlagCount: redFlagCount
                }
            });
        }
    };
    
    // Restart broadcasting
    restartBtn.addEventListener('click', function() {
        setTimeout(() => {
            raceWebSocket.send({
                type: 'race-restart',
                state: {
                    isRunning: false,
                    secondsLeft: totalSeconds,
                    isYellowFlag: false,
                    isRedFlag: false,
                    yellowFlagCount: 0,
                    redFlagCount: 0
                }
            });
        }, 100);
    });
})();