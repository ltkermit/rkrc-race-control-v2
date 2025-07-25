// Director mode WebSocket integration with authentication
(function() {
    let directorName = 'Race Director';
    
    // Show password modal first
    const passwordModal = document.getElementById('passwordModal');
    const passwordForm = document.getElementById('passwordForm');
    const passwordInput = document.getElementById('passwordInput');
    const authError = document.getElementById('authError');
    
    // Disable all controls initially
    function disableAllControls() {
        startRaceBtn.disabled = true;
        yellowFlagBtn.disabled = true;
        redFlagBtn.disabled = true;
        restartBtn.disabled = true;
        raceTimeSelect.disabled = true;
        if (practiceModeCheckbox) practiceModeCheckbox.disabled = true;
        voiceSelect.disabled = true;
    }
    
    // Enable controls after authentication
    function enableControls() {
        startRaceBtn.disabled = false;
        raceTimeSelect.disabled = false;
        if (practiceModeCheckbox) practiceModeCheckbox.disabled = false;
        voiceSelect.disabled = false;
        // Flag buttons remain disabled until race starts
    }
    
    disableAllControls();
    
    // Authentication handlers
    raceWebSocket.onAuthRequired = function() {
        passwordModal.style.display = 'flex';
        passwordInput.focus();
    };
    
    raceWebSocket.onAuthSuccess = function() {
        passwordModal.style.display = 'none';
        passwordForm.reset();
        authError.style.display = 'none';
        enableControls();
        showVisualNotification('Authentication Successful', 2000);
    };
    
    raceWebSocket.onAuthFailed = function(message) {
        authError.textContent = message || 'Invalid password';
        authError.style.display = 'block';
        passwordInput.classList.add('shake');
        passwordInput.focus();
        passwordInput.select();
        
        // Remove shake animation after completion
        setTimeout(() => {
            passwordInput.classList.remove('shake');
        }, 500);
    };
    
    // Handle password form submission
    passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const password = passwordInput.value;
        
        if (password) {
            authError.style.display = 'none';
            raceWebSocket.authenticate(password);
        }
    });
    
    // Initialize WebSocket connection
    raceWebSocket.connect(true, directorName);
    
    // Connection status handlers
    function updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        const textElement = document.getElementById('connectionText');
        
        if (statusElement && textElement) {
            if (connected && raceWebSocket.isAuthenticated) {
                statusElement.style.color = '#2ecc71';
                textElement.textContent = 'Connected & Authenticated';
            } else if (connected) {
                statusElement.style.color = '#f39c12';
                textElement.textContent = 'Connected - Auth Required';
            } else {
                statusElement.style.color = '#e74c3c';
                textElement.textContent = 'Disconnected';
            }
        }
    }
    
    // WebSocket event handlers
    raceWebSocket.onConnected = function() {
        updateConnectionStatus(true);
    };
    
    raceWebSocket.onDisconnected = function() {
        updateConnectionStatus(false);
        showVisualNotification('Connection Lost - Attempting to Reconnect', 3000);
        disableAllControls();
    };
    
    raceWebSocket.onReconnectFailed = function() {
        showVisualNotification('Failed to reconnect. Please refresh the page.', 5000);
        // Show password modal again for re-authentication
        passwordModal.style.display = 'flex';
    };
    
    raceWebSocket.onInitialState = function(state, clientCount) {
        document.getElementById('clientCount').textContent = `${clientCount} device${clientCount !== 1 ? 's' : ''}`;
        updateConnectionStatus(true);
        
        // Sync with current state if rejoining
        if (state.isRunning) {
            // Update UI to match current race state
            secondsLeft = state.secondsLeft;
            totalSeconds = state.totalSeconds;
            isRunning = state.isRunning;
            isPracticeMode = state.isPracticeMode;
            isYellowFlag = state.isYellowFlag;
            isRedFlag = state.isRedFlag;
            yellowFlagCount = state.yellowFlagCount;
            redFlagCount = state.redFlagCount;
            
            // Update display
            updateTimerDisplay();
            updateBackgroundColor();
            
            // Update button states
            startRaceBtn.disabled = true;
            yellowFlagBtn.disabled = false;
            redFlagBtn.disabled = false;
            restartBtn.disabled = false;
            
            // Update flag button text
            yellowFlagBtn.textContent = isYellowFlag ? 'Clear Yellow Flag' : 'Yellow Flag';
            redFlagBtn.textContent = isRedFlag ? 'Clear Red Flag' : 'Red Flag';
            
            // Start timer if race is running
            if (isRunning) {
                startTimer();
            }
        }
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
        } else if (connectedClientsDiv) {
            connectedClientsDiv.style.display = 'none';
        }
    };
    
    // Override start race to broadcast
    const originalStartRaceClick = startRaceBtn.onclick;
    startRaceBtn.addEventListener('click', function() {
        // Wait for the race to actually start (after countdown)
        const checkRaceStart = setInterval(() => {
            if (isRunning && raceWebSocket.isReady()) {
                clearInterval(checkRaceStart);
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
        }, 100);
    });
    
    // Timer sync - send updates every second when running
    let lastSyncedSecond = -1;
    const originalUpdateTimer = updateTimerDisplay;
    window.updateTimerDisplay = function() {
        originalUpdateTimer();
        
        // Sync timer every second
        if (isRunning && secondsLeft !== lastSyncedSecond && raceWebSocket.isReady()) {
            lastSyncedSecond = secondsLeft;
            raceWebSocket.send({
                type: 'timer-update',
                secondsLeft: secondsLeft
            });
        }
    };
    
    // Flag controls broadcasting
    yellowFlagBtn.addEventListener('click', function() {
        // Wait for flag state to update
        setTimeout(() => {
            if (raceWebSocket.isReady()) {
                raceWebSocket.send({
                    type: 'flag-change',
                    flag: 'yellow',
                    active: isYellowFlag
                });
            }
        }, 100);
    });
    
    redFlagBtn.addEventListener('click', function() {
        // Wait for flag state to update
        setTimeout(() => {
            if (raceWebSocket.isReady()) {
                raceWebSocket.send({
                    type: 'flag-change',
                    flag: 'red',
                    active: isRedFlag,
                    isRunning: isRunning
                });
            }
        }, 100);
    });
    
    // Voice change broadcasting
    voiceSelect.addEventListener('change', function() {
        if (raceWebSocket.isReady()) {
            raceWebSocket.send({
                type: 'voice-change',
                voice: voiceSelect.value
            });
        }
    });
    
    // Race end broadcasting
    const originalCheckTimeMarks = checkTimeMarks;
    window.checkTimeMarks = function() {
        originalCheckTimeMarks();
        
        // Check if race just ended
        if (secondsLeft === 0 && !isPracticeMode && raceWebSocket.isReady()) {
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
            if (raceWebSocket.isReady()) {
                raceWebSocket.send({
                    type: 'race-restart',
                    state: {
                        isRunning: false,
                        secondsLeft: isPracticeMode ? 0 : totalSeconds,
                        isYellowFlag: false,
                        isRedFlag: false,
                        yellowFlagCount: 0,
                        redFlagCount: 0,
                        isPracticeMode: isPracticeMode,
                        totalSeconds: totalSeconds,
                        voice: voiceSelect.value,
                        raceTimeMinutes: parseInt(raceTimeSelect.value)
                    }
                });
            }
        }, 100);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape key handling
        if (e.key === 'Escape') {
            if (passwordModal.style.display === 'flex') {
                window.location.href = 'index.html';
            }
        }
        
        // Enter key in password field
        if (e.key === 'Enter' && document.activeElement === passwordInput) {
            e.preventDefault();
            passwordForm.dispatchEvent(new Event('submit'));
        }
    });
    
    // Prevent closing the page accidentally during a race
    window.addEventListener('beforeunload', (e) => {
        if (isRunning && raceWebSocket.isAuthenticated) {
            e.preventDefault();
            e.returnValue = 'A race is currently in progress. Are you sure you want to leave?';
        }
    });
    
    // Clean up on page unload
    window.addEventListener('unload', () => {
        raceWebSocket.disconnect();
    });
})();