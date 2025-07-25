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
            setTimeout(playNextBeep, 1000);
          }).catch(e => {
            console.error("Audio play error for beep:", e);
            beepCount++;
            setTimeout(playNextBeep, 1000);
          });
        } catch (e) {
          console.error("Beep sound failed:", e);
          beepCount++;
          setTimeout(playNextBeep, 1000);
        }
      } else {
        // Step 3: Wait random 2-3 seconds after last beep
        const randomFinalDelay = Math.floor(Math.random() * 1000) + 2000; // Random delay between 2000-3000ms (2-3 seconds)
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
        // No end condition in practice mode
      } else {
        // Normal countdown mode
        if (secondsLeft > 0) {
          secondsLeft--;
          updateTimerDisplay();
          checkTimeMarks();
        } else if (secondsLeft <= 0) {
          clearInterval(timerInterval);
          isRunning = false;
          updateBackgroundColor();
          disableButtons();
          displayFlagCounts();
        }
      }
    }
  }, 1000);
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

  // Check for minute marks (play specific minute audio when seconds hit 0)
  if (currentMinute !== lastMinutePlayed && currentSecond === 0 && currentMinute > 0) {
    lastMinutePlayed = currentMinute;
    return `${currentMinute}-minute`;
  }

  // Check for 30-second mark
  if (secondsLeft === 30 && !hasPlayed30Seconds) {
    hasPlayed30Seconds = true;
    return '30-seconds';
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
  return isRedFlag ? 'redOnSound' : 'redOffSound';
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
      const audioId = toggleYellowFlag();
      playAudio(audioId, audioId === 'yellowOnSound' ? 'Yellow Flag Thrown' : 'Yellow Flag Cleared', 2000);
    });
    console.log("Yellow Flag button listener attached");
  } else {
    console.error("Yellow Flag button not found in DOM");
  }

  if (redFlagBtn) {
    redFlagBtn.addEventListener('click', () => {
      const audioId = toggleRedFlag();
      playAudio(audioId, audioId === 'redOnSound' ? 'Red Flag Thrown' : 'Red Flag Cleared', 2000);
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
