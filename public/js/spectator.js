// Spectator mode functionality
let isRunning = false;
let secondsLeft = 0;
let timerInterval = null;
let audioEnabled = true;
let currentVoice = 'america';
let lastMinutePlayed = -1;
let hasPlayed30Seconds = false;

// Audio control
const audioCheckbox = document.getElementById('audioEnabled');
audioCheckbox.addEventListener('change', (e) => {
    audioEnabled = e.target.checked;
});

// Visual notification function
function showVisualNotification(message, duration = 3000) {
    const container = document.getElementById('visualNotificationContainer');
    const notification = document.createElement('div');
    notification.className = 'visual-notification';
    notification.textContent = message;
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, duration);
}

// Update connection status
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

// Timer display
function updateTimerDisplay() {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    document.getElementById('timer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Play audio if enabled
function playAudio(audioId) {
    if (audioEnabled) {
        const audio = document.getElementById(audioId);
        if (audio) {
            audio.play().catch(e => {
                console.error(`Failed to play ${audioId}:`, e);
            });
        }
    }
}

// Update voice sources
function updateVoiceSources(voice) {
    currentVoice = voice;
    const voiceAudioIds = [
        'yellowOnSound', 'yellowOffSound', 'redOnSound', 
        'redOffSound', 'endSound', '30-seconds',
        '1-minute', '2-minute', '3-minute', '4-minute', '5-minute'
    ];
    
    voiceAudioIds.forEach(audioId => {
        const audioElement = document.getElementById(audioId);
        if (audioElement) {
            let basePath = 'audio/';
            let prefix = '';
            
            if (voice === 'america') {
                basePath += 'america/';
            } else if (voice === 'europe') {
                basePath += 'europe/';
                prefix = 'e-';
            } else if (voice === 'merica') {
                basePath += 'merica/';
                prefix = 'n-';
            }
            
            let baseName = audioId.replace('Sound', '').toLowerCase();
            audioElement.src = `${basePath}${prefix}${baseName}.mp3`;
            audioElement.load();
        }
    });
}

// Timer functions
function startTimer() {
    timerInterval = setInterval(() => {
        if (isRunning && secondsLeft > 0) {
            secondsLeft--;
            updateTimerDisplay();
            checkTimeMarks();
        }
    }, 1000);
}

function checkTimeMarks() {
    const currentMinute = Math.floor(secondsLeft / 60);
    const currentSecond = secondsLeft % 60;
    
    // Check for minute marks
    if (currentMinute !== lastMinutePlayed && currentSecond === 0 && currentMinute > 0) {
        const audioId = `${currentMinute}-minute`;
        playAudio(audioId);
        lastMinutePlayed = currentMinute;
    }
    
    // Check for 30-second mark
    if (secondsLeft === 30 && !hasPlayed30Seconds) {
        playAudio('30-seconds');
        hasPlayed30Seconds = true;
    }
}

// Initialize WebSocket connection
const spectatorName = prompt('Enter your name (optional):') || 'Spectator';
raceWebSocket.connect(false, spectatorName);

// WebSocket event handlers
raceWebSocket.onConnected = function() {
    updateConnectionStatus(true);
    showVisualNotification('Connected to Race Server', 2000);
};

raceWebSocket.onDisconnected = function() {
    updateConnectionStatus(false);
    showVisualNotification('Connection Lost', 3000);
    
    // Stop timer if disconnected
    if (timerInterval) {
        clearInterval(timerInterval);
    }
};

raceWebSocket.onInitialState = function(state, clientCount) {
    document.getElementById('clientCount').textContent = 
        `${clientCount} device${clientCount !== 1 ? 's' : ''}`;
    
    // Sync with current race state
    if (state.isRunning) {
        isRunning = true;
        secondsLeft = state.secondsLeft;
        updateTimerDisplay();
        startTimer();
        document.getElementById('raceStatus').textContent = 
            state.isPracticeMode ? 'Practice Mode - In Progress' : 'Race In Progress';
        document.body.style.backgroundColor = '#2ecc71';
    }
    
    // Update voice
    updateVoiceSources(state.voice);
    
    // Update flags
    if (state.isYellowFlag) {
        document.getElementById('yellowIndicator').classList.add('active');
        document.body.style.backgroundColor = '#f1c40f';
    }
    if (state.isRedFlag) {
        document.getElementById('redIndicator').classList.add('active');
        document.body.style.backgroundColor = '#e74c3c';
    }
};

raceWebSocket.onClientUpdate = function(clientCount, clients) {
    document.getElementById('clientCount').textContent = 
        `${clientCount} device${clientCount !== 1 ? 's' : ''}`;
};

raceWebSocket.onRaceStarted = function(state) {
    isRunning = true;
    secondsLeft = state.totalSeconds;
    lastMinutePlayed = -1;
    hasPlayed30Seconds = false;
    
    document.getElementById('raceStatus').textContent = 
        state.isPracticeMode ? 'Practice Mode - In Progress' : 'Race In Progress';
    
    updateTimerDisplay();
    startTimer();
    
    document.body.style.backgroundColor = '#2ecc71';
    showVisualNotification('Race Started!', 3000);
    playAudio('beepSound');
};

raceWebSocket.onTimerSync = function(newSecondsLeft) {
    secondsLeft = newSecondsLeft;
    updateTimerDisplay();
};

raceWebSocket.onFlagUpdate = function(flag, active, state) {
    if (flag === 'yellow') {
        const indicator = document.getElementById('yellowIndicator');
        if (active) {
            indicator.classList.add('active');
            document.body.style.backgroundColor = '#f1c40f';
            showVisualNotification('Yellow Flag!', 2000);
            playAudio('yellowOnSound');
        } else {
            indicator.classList.remove('active');
            document.body.style.backgroundColor = '#2ecc71';
            showVisualNotification('Green Flag!', 2000);
            playAudio('yellowOffSound');
        }
    } else if (flag === 'red') {
        const indicator = document.getElementById('redIndicator');
        if (active) {
            indicator.classList.add('active');
            document.body.style.backgroundColor = '#e74c3c';
            showVisualNotification('Red Flag!', 2000);
            playAudio('redOnSound');
            isRunning = false;
            clearInterval(timerInterval);
        } else {
            indicator.classList.remove('active');
            if (!state.isYellowFlag) {
                document.body.style.backgroundColor = '#2ecc71';
            }
            showVisualNotification('Red Flag Cleared!', 2000);
            playAudio('redOffSound');
            isRunning = true;
            startTimer();
        }
    }
};

raceWebSocket.onRaceEnded = function(state) {
    isRunning = false;
    clearInterval(timerInterval);
    
    document.body.classList.add('checkerboard');
    document.getElementById('raceStatus').textContent = 'Race Finished!';
    
    // Display flag counts
    const flagCountDisplay = document.getElementById('flagCountDisplay');
    flagCountDisplay.style.display = 'block';
    flagCountDisplay.innerHTML = `
        <h3>Race Summary</h3>
        <p>Yellow Flags: ${state.yellowFlagCount}</p>
        <p>Red Flags: ${state.redFlagCount}</p>
    `;
    
    showVisualNotification('Race Finished!', 5000);
    playAudio('endSound');
};

raceWebSocket.onRaceRestarted = function(state) {
    // Reset everything
    isRunning = false;
    clearInterval(timerInterval);
    secondsLeft = 0;
    lastMinutePlayed = -1;
    hasPlayed30Seconds = false;
    
    document.body.classList.remove('checkerboard');
    document.body.style.backgroundColor = '#f0f0f0';
    document.getElementById('raceStatus').textContent = 'Waiting for race to start...';
    document.getElementById('yellowIndicator').classList.remove('active');
    document.getElementById('redIndicator').classList.remove('active');
    document.getElementById('flagCountDisplay').style.display = 'none';
    
    updateTimerDisplay();
    showVisualNotification('Race Reset', 2000);
};

raceWebSocket.onVoiceChanged = function(voice) {
    updateVoiceSources(voice);
    showVisualNotification(`Voice changed to ${voice}`, 2000);
};

raceWebSocket.onDirectorDisconnected = function() {
    showVisualNotification('Race Director Disconnected!', 5000);
    document.getElementById('raceStatus').textContent = 
        'Race Director Disconnected - Waiting for Director...';
};