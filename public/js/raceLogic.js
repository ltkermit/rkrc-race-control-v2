// raceLogic.js - Manages race state, timing, and flag logic

// Race state variables
let totalSeconds = 0;
let secondsLeft = 0;
let timerInterval = null;
let isRunning = false;
let isYellowFlag = false;
let isRedFlag = false;
let lastMinutePlayed = -1;
let hasPlayed30Seconds = false;
let yellowFlagCount = 0;
let redFlagCount = 0;
let isPracticeMode = false;

// DOM elements
const raceTimeSelect = document.getElementById('raceTime');
const practiceModeCheckbox = document.getElementById('practiceMode');
const timerDisplay = document.getElementById('timer');
const startRaceBtn = document.getElementById('startRace');
const yellowFlagBtn = document.getElementById('yellowFlag');
const redFlagBtn = document.getElementById('redFlag');
const restartBtn = document.getElementById('restart');

// Function to start the race
function startRace() {
  // Set up timing based on mode
  if (isPracticeMode) {
    totalSeconds = 0; // Start from 0 for practice mode
    secondsLeft = 0;
    timerDisplay.textContent = '00:00'; // Show elapsed time starting from 0
  } else {
    totalSeconds = parseInt(raceTimeSelect.value) * 60;
    secondsLeft = totalSeconds;
    updateTimerDisplay();
  }

  // Disable controls
  raceTimeSelect.disabled = true;
  practiceModeCheckbox.disabled = true;
  startRaceBtn.disabled = true;
  yellowFlagBtn.disabled = false;
  redFlagBtn.disabled = false;
  restartBtn.disabled = false;
  resetFlagCounts();
}

// Function to handle the start sequence with audio and countdown
function startRaceSequence(playAudio, showCountdown, preloadCriticalAudio) {
  playAudio('startEnginesSound', 'Start Your Engines!');
  preloadCriticalAudio();

  // Step 1: Wait 3 seconds before starting the beep sequence
  setTimeout(() => {
    // Step 2: Play beep.mp3 every 1.5 seconds for 4 times with countdown
    let beepCount = 0;
    const playNextBeep = () => {
      if (beepCount < 4) {
        try {
          console.log(`Playing beep ${beepCount + 1}/4`);
          showCountdown(4 - beepCount);
          playAudio('beepSound').then(() => {
            beepCount++;
            setTimeout(playNextBeep, 1500);
          }).catch(e => {
            console.error("Audio play error for beep:", e);
            beepCount++;
            setTimeout(playNextBeep, 1500);
          });
        } catch (e) {
          console.error("Beep sound failed:", e);
          beepCount++;
          setTimeout(playNextBeep, 1500);
        }
      } else {
        // Step 3: Wait random 2-3 seconds after last beep
        const randomFinalDelay = Math.floor(Math.random() * 1000) + 3000; // Random delay between 2000-3000ms (2-3 seconds)
        setTimeout(() => {
          // Step 4: Play start-beep.mp3, show "GO!" and start the timer
          try {
            console.log("Playing start-beep and starting timer");
            showCountdown('GO!', true);
            playAudio('startBeepSound', 'GO!').catch(e => {
              console.error("Audio play error for start-beep:", e);
              // Retry once if it fails
              setTimeout(() => {
                console.log("Retrying start-beep playback");
                playAudio('startBeepSound').catch(retryError => console.error("Retry failed for start-beep:", retryError));
              }, 500);
            });
          } catch (e) {
            console.error("Start-beep sound failed:", e);
          }
          isRunning = true;
          updateBackgroundColor(); // Update background when race starts
          startTimer();
        }, randomFinalDelay);
      }
    };
    playNextBeep(); // Start the beep sequence
  }, 3000); // Initial 3-second delay
}

// Timer logic
function startTimer() {
  timerInterval = setInterval(() => {
    if (isRunning) {
      if (isPracticeMode) {
        // Count up in practice mode
        secondsLeft++;
        updateTimerDisplay();
        console.log(`Practice mode: secondsLeft incremented to ${secondsLeft}`);
        // No end condition in practice mode
      } else {
        // Normal countdown mode
        if (secondsLeft > 0) {
          secondsLeft--;
          updateTimerDisplay();
          console.log(`Countdown mode: secondsLeft decremented to ${secondsLeft}`);
          const audioId = checkTimeMarks();
          if (audioId) {
            const message = audioId === '30-seconds' ? '30 Seconds Left' : `${audioId.split('-')[0]} Minute(s) Left`;
            console.log(`Attempting to play audio for time mark: ${audioId}`);
            globalThis.playAudio(audioId, message, 3000);
          }
          // Send timer sync to spectators if WebSocket is available
          if (typeof globalThis.raceWebSocket !== 'undefined' && globalThis.raceWebSocket.isReady()) {
            globalThis.raceWebSocket.send({
              type: "timer-sync",
              secondsLeft: secondsLeft
            });
            console.log("Direct timer sync sent to spectators from raceLogic:", secondsLeft);
          }
        } else if (secondsLeft <= 0) {
          clearInterval(timerInterval);
          isRunning = false;
          updateBackgroundColor();
          disableButtons();
          displayFlagCounts();
          console.log('Race ended: timer stopped');
          globalThis.playAudio('endSound', 'Race Ended', 3000);
        }
      }
    } else {
      console.log('Timer interval running but race is not active');
    }
  }, 1000);
  console.log('Timer started');
}

// Update timer display
function updateTimerDisplay() {
  if (isPracticeMode && !isRunning && secondsLeft === 0) {
    timerDisplay.textContent = 'PRACTICE';
  } else {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Check for minute and 30-second marks
function checkTimeMarks() {
  const currentMinute = Math.floor(secondsLeft / 60);
  const currentSecond = secondsLeft % 60;

  console.log(`checkTimeMarks: secondsLeft=${secondsLeft}, currentMinute=${currentMinute}, currentSecond=${currentSecond}, lastMinutePlayed=${lastMinutePlayed}, hasPlayed30Seconds=${hasPlayed30Seconds}, totalSeconds=${totalSeconds}, isRunning=${isRunning}`);

  // Check for minute marks (play specific minute audio when seconds hit 0)
  // Do not play at the start of the race (when secondsLeft equals totalSeconds)
  if (currentMinute !== lastMinutePlayed && currentSecond === 0 && currentMinute > 0 && secondsLeft < totalSeconds) {
    lastMinutePlayed = currentMinute;
    console.log(`Playing minute mark audio: ${currentMinute}-minute`);
    return `${currentMinute}-minute`;
  } else if (currentSecond === 0 && currentMinute > 0) {
    console.log(`Minute mark not played: already played or at start of race`);
  }

  // Check for 30-second mark
  if (secondsLeft === 30 && !hasPlayed30Seconds) {
    hasPlayed30Seconds = true;
    console.log('Playing 30-seconds audio');
    return '30-seconds';
  } else if (secondsLeft === 30) {
    console.log('30-seconds mark already played');
  }
  return null;
}

// Disable control buttons
function disableButtons() {
  yellowFlagBtn.disabled = true;
  redFlagBtn.disabled = true;
  restartBtn.disabled = false;
}

// Reset flag counts
function resetFlagCounts() {
  yellowFlagCount = 0;
  redFlagCount = 0;
  const flagCountDisplay = document.getElementById('flagCountDisplay');
  if (flagCountDisplay) {
    flagCountDisplay.style.display = 'none';
    flagCountDisplay.innerHTML = '';
  }
  console.log("Flag counts reset to zero");
}

// Display flag counts at race end
function displayFlagCounts() {
  const flagCountDisplay = document.getElementById('flagCountDisplay');
  if (flagCountDisplay) {
    flagCountDisplay.style.display = 'block';
    flagCountDisplay.innerHTML = `
      <h3>Race Summary</h3>
      <p>Yellow Flags Thrown: ${yellowFlagCount}</p>
      <p>Red Flags Thrown: ${redFlagCount}</p>
    `;
    console.log(`Race ended. Yellow Flags: ${yellowFlagCount}, Red Flags: ${redFlagCount}`);
  } else {
    alert(`Race Ended!\nYellow Flags Thrown: ${yellowFlagCount}\nRed Flags Thrown: ${redFlagCount}`);
    console.warn("Flag count display element not found, using alert as fallback");
  }
}

// Toggle practice mode
function togglePracticeMode() {
  isPracticeMode = practiceModeCheckbox.checked;

  if (isPracticeMode) {
    // Disable race time selector
    raceTimeSelect.disabled = true;
    document.querySelector('.settings').classList.add('practice-mode');

    // Show practice mode indicator
    if (!document.querySelector('.practice-mode-indicator')) {
      const indicator = document.createElement('div');
      indicator.className = 'practice-mode-indicator';
      indicator.textContent = 'PRACTICE MODE - No Time Limit';
      const practiceModeSection = document.querySelector('.practice-mode-section');
      practiceModeSection.parentNode.insertBefore(indicator, practiceModeSection.nextSibling);
    }

    // Update timer display
    timerDisplay.textContent = 'PRACTICE';
    timerDisplay.classList.add('practice');
  } else {
    // Re-enable race time selector
    raceTimeSelect.disabled = false;
    document.querySelector('.settings').classList.remove('practice-mode');

    // Remove practice mode indicator
    const indicator = document.querySelector('.practice-mode-indicator');
    if (indicator) indicator.remove();

    // Reset timer display
    timerDisplay.classList.remove('practice');
    updateTimerDisplay();
  }
}

// Update background color based on race state
function updateBackgroundColor() {
  document.body.classList.remove('checkerboard');

  if (!isRunning && secondsLeft <= 0 && !isPracticeMode) {
    document.body.classList.add('checkerboard');
  } else if (isRedFlag) {
    document.body.style.backgroundColor = '#e74c3c'; // Red for Red Flag
  } else if (isYellowFlag) {
    document.body.style.backgroundColor = '#f1c40f'; // Yellow for Yellow Flag
  } else if (isRunning) {
    document.body.style.backgroundColor = '#2ecc71'; // Green for Race Running
  } else {
    document.body.style.backgroundColor = '#f0f0f0'; // Default gray when not running
  }
}

// Flag toggle functions
function toggleYellowFlag() {
  isYellowFlag = !isYellowFlag;
  yellowFlagBtn.textContent = isYellowFlag ? 'Clear Yellow Flag' : 'Yellow Flag';
  if (isYellowFlag) {
    yellowFlagCount++;
    console.log(`Yellow Flag thrown. Total count: ${yellowFlagCount}`);
  }
  updateBackgroundColor();
  // Send flag update to spectators if WebSocket is available
  if (typeof globalThis.raceWebSocket !== 'undefined' && globalThis.raceWebSocket.isReady()) {
    globalThis.raceWebSocket.send({
      type: "flag-update",
      flag: "yellow",
      active: isYellowFlag,
      state: {
        isYellowFlag: isYellowFlag,
        isRedFlag: isRedFlag,
        isRunning: isRunning
      }
    });
    console.log("Direct yellow flag update sent to spectators:", isYellowFlag);
  }
  return isYellowFlag ? 'yellowOnSound' : 'yellowOffSound';
}

function toggleRedFlag() {
  isRedFlag = !isRedFlag;
  if (isRedFlag) {
    isRunning = false;
    clearInterval(timerInterval);
    redFlagBtn.textContent = 'Clear Red Flag';
    redFlagCount++;
    console.log(`Red Flag thrown. Total count: ${redFlagCount}`);
  } else {
    isRunning = true;
    startTimer();
    redFlagBtn.textContent = 'Red Flag';
  }
  updateBackgroundColor();
  // Send flag update to spectators if WebSocket is available
  if (typeof globalThis.raceWebSocket !== 'undefined' && globalThis.raceWebSocket.isReady()) {
    globalThis.raceWebSocket.send({
      type: "flag-update",
      flag: "red",
      active: isRedFlag,
      state: {
        isYellowFlag: isYellowFlag,
        isRedFlag: isRedFlag,
        isRunning: isRunning
      }
    });
    console.log("Direct red flag update sent to spectators:", isRedFlag, "Running:", isRunning);
  }
  return isRedFlag ? 'redOnSound' : 'redOffSound';
}

// Function to handle clearing flags with delay and audio for nosteward page
function clearFlagWithDelayAndAudio(flagType, playAudio) {
  const isNoSteward = globalThis.location && globalThis.location.pathname.includes('nosteward.html');
  if (isNoSteward && ((flagType === 'yellow' && isYellowFlag) || (flagType === 'red' && isRedFlag))) {
    console.log(`Clearing ${flagType} flag with delay and audio for nosteward page`);
    // Play getready audio
    playAudio('getReadySound', 'Get Ready', 2000);
    // Disable buttons during delay
    if (typeof globalThis.disableButtonsDuringDelay === 'function') {
      globalThis.disableButtonsDuringDelay();
      console.log("Buttons disabled during delay");
    } else {
      console.warn("disableButtonsDuringDelay function not found");
    }
    // Random delay between 3000-6000ms (3-6 seconds)
    const delay = Math.floor(Math.random() * 3000) + 3000;
    console.log(`Delaying clear of ${flagType} flag by ${delay}ms`);
    setTimeout(() => {
      if (flagType === 'yellow') {
        isYellowFlag = false;
        yellowFlagBtn.textContent = 'Yellow Flag';
      } else if (flagType === 'red') {
        isRedFlag = false;
        isRunning = true;
        redFlagBtn.textContent = 'Red Flag';
        startTimer();
      }
      updateBackgroundColor();
      // Re-enable buttons after delay
      if (typeof globalThis.reEnableButtonsAfterDelay === 'function') {
        globalThis.reEnableButtonsAfterDelay();
        console.log("Buttons re-enabled after delay");
      } else {
        console.warn("reEnableButtonsAfterDelay function not found");
      }
      // Play clear audio after delay
      const clearAudioId = flagType === 'yellow' ? 'yellowOffSound' : 'redOffSound';
      const clearMessage = flagType === 'yellow' ? 'Yellow Flag Cleared' : 'Red Flag Cleared';
      playAudio(clearAudioId, clearMessage, 2000);
      console.log(`${flagType} flag cleared after delay`);
    }, delay);
    return null; // Return null initially as audio is handled separately
  } else {
    console.log(`Standard flag behavior for ${flagType}. Is No Steward: ${isNoSteward}, Flag State: ${flagType === 'yellow' ? isYellowFlag : isRedFlag}`);
    // Standard behavior for other pages or if flag is being set
    return flagType === 'yellow' ? (isYellowFlag ? 'yellowOnSound' : 'yellowOffSound') : (isRedFlag ? 'redOnSound' : 'redOffSound');
  }
}

// Restart race
function restartRace() {
  console.log("Restart button clicked");
  clearInterval(timerInterval);
  isRunning = false;

  // Reset based on mode
  if (isPracticeMode) {
    secondsLeft = 0;
    timerDisplay.textContent = 'PRACTICE';
  } else {
    secondsLeft = totalSeconds;
    updateTimerDisplay();
  }

  isYellowFlag = false;
  isRedFlag = false;
  yellowFlagBtn.textContent = 'Yellow Flag';
  redFlagBtn.textContent = 'Red Flag';
  raceTimeSelect.disabled = false;
  practiceModeCheckbox.disabled = false;
  startRaceBtn.disabled = false;
  yellowFlagBtn.disabled = true;
  redFlagBtn.disabled = true;
  restartBtn.disabled = true;
  lastMinutePlayed = -1;
  hasPlayed30Seconds = false;
  resetFlagCounts();
  updateBackgroundColor();
}

// Initialize event listeners
function initializeRaceLogic(noSleep, playAudio, showCountdown, preloadCriticalAudio) {
  console.log("Initializing race logic event listeners");
  
  // Function to attach start race listener with retry if element not found
  function attachStartRaceListener() {
    if (startRaceBtn) {
      startRaceBtn.addEventListener('click', () => {
        console.log("Start Race button clicked");
        startRace();
        try {
          noSleep.enable();
          console.log("Screen wake lock enabled");
        } catch (e) {
          console.error("Failed to enable screen wake lock:", e);
        }
        startRaceSequence(playAudio, showCountdown, preloadCriticalAudio);
      });
      console.log("Start Race button listener attached");
      return true;
    } else {
      console.error("Start Race button not found in DOM, retrying...");
      return false;
    }
  }

  // Initial attempt to attach listener
  if (!attachStartRaceListener()) {
    // Retry after a short delay if element not found
    setTimeout(() => {
      console.log("Retrying to attach Start Race listener");
      if (!attachStartRaceListener()) {
        console.error("Failed to attach Start Race listener after retry");
      }
    }, 1000);
  }

  if (yellowFlagBtn) {
    yellowFlagBtn.addEventListener('click', () => {
      const isNoSteward = globalThis.location && globalThis.location.pathname.includes('nosteward.html');
      console.log(`Yellow Flag button clicked. Is No Steward Page: ${isNoSteward}, Is Yellow Flag Active: ${isYellowFlag}`);
      if (isNoSteward && isYellowFlag) {
        // Clearing yellow flag on nosteward page
        console.log("Proceeding to clear yellow flag with delay and audio");
        clearFlagWithDelayAndAudio('yellow', playAudio);
      } else {
        console.log("Using standard toggle for yellow flag");
        const audioId = toggleYellowFlag();
        playAudio(audioId, audioId === 'yellowOnSound' ? 'Yellow Flag Thrown' : 'Yellow Flag Cleared', 2000);
      }
    });
    console.log("Yellow Flag button listener attached");
  } else {
    console.error("Yellow Flag button not found in DOM");
  }

  if (redFlagBtn) {
    redFlagBtn.addEventListener('click', () => {
      const isNoSteward = globalThis.location && globalThis.location.pathname.includes('nosteward.html');
      console.log(`Red Flag button clicked. Is No Steward Page: ${isNoSteward}, Is Red Flag Active: ${isRedFlag}`);
      if (isNoSteward && isRedFlag) {
        // Clearing red flag on nosteward page
        console.log("Proceeding to clear red flag with delay and audio");
        clearFlagWithDelayAndAudio('red', playAudio);
      } else {
        console.log("Using standard toggle for red flag");
        const audioId = toggleRedFlag();
        playAudio(audioId, audioId === 'redOnSound' ? 'Red Flag Thrown' : 'Red Flag Cleared', 2000);
      }
    });
    console.log("Red Flag button listener attached");
  } else {
    console.error("Red Flag button not found in DOM");
  }

  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      restartRace();
      try {
        noSleep.disable();
        console.log("Screen wake lock disabled on restart");
      } catch (e) {
        console.error("Failed to disable screen wake lock on restart:", e);
      }
      playAudio('restartSound', 'Race Restarted', 2000);
    });
    console.log("Restart button listener attached");
  } else {
    console.error("Restart button not found in DOM");
  }

  if (practiceModeCheckbox) {
    practiceModeCheckbox.addEventListener('change', togglePracticeMode);
    console.log("Practice Mode checkbox listener attached");
  } else {
    console.error("Practice Mode checkbox not found in DOM");
  }
}

// Export functions and variables for use in other modules
export {
  initializeRaceLogic,
  startRace,
  toggleYellowFlag,
  toggleRedFlag,
  restartRace,
  checkTimeMarks,
  updateBackgroundColor,
  isRunning,
  isPracticeMode,
  secondsLeft,
  totalSeconds,
  isYellowFlag,
  isRedFlag,
  yellowFlagCount,
  redFlagCount
};
