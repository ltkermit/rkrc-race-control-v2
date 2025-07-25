// uiController.js - Manages UI updates and visual feedback

// DOM elements
const startRaceBtn = document.getElementById('startRace');
const yellowFlagBtn = document.getElementById('yellowFlag');
const redFlagBtn = document.getElementById('redFlag');
const restartBtn = document.getElementById('restart');
const raceTimeSelect = document.getElementById('raceTime');
const practiceModeCheckbox = document.getElementById('practiceMode');

// Check if the current page is nosteward.html
const isNoStewardPage = globalThis.location.pathname.includes('nosteward.html');

// Function to show countdown numbers during start sequence
function showCountdown(text, isGo = false) {
  const countdown = document.createElement('div');
  countdown.className = isGo ? 'countdown-display go' : 'countdown-display';
  countdown.textContent = text;
  document.body.appendChild(countdown);

  // Remove after animation completes
  setTimeout(() => countdown.remove(), 1000);
}

// Function to update button states based on race status
function updateButtonStates(isRunning, isRaceEnded) {
  if (isRaceEnded) {
    yellowFlagBtn.disabled = true;
    redFlagBtn.disabled = true;
    restartBtn.disabled = false;
    return;
  }

  if (isRunning) {
    raceTimeSelect.disabled = true;
    practiceModeCheckbox.disabled = true;
    startRaceBtn.disabled = true;
    yellowFlagBtn.disabled = false;
    redFlagBtn.disabled = false;
    restartBtn.disabled = false;
  } else {
    raceTimeSelect.disabled = false;
    practiceModeCheckbox.disabled = false;
    startRaceBtn.disabled = false;
    yellowFlagBtn.disabled = true;
    redFlagBtn.disabled = true;
    restartBtn.disabled = true;
  }
}

// Function to disable buttons during delay (for nosteward.html)
function disableButtonsDuringDelay() {
  if (isNoStewardPage) {
    yellowFlagBtn.disabled = true;
    redFlagBtn.disabled = true;
    console.log("Buttons disabled during delay");
  }
}

// Function to re-enable buttons after delay (for nosteward.html)
function reEnableButtonsAfterDelay() {
  if (isNoStewardPage) {
    yellowFlagBtn.disabled = false;
    redFlagBtn.disabled = false;
    console.log("Buttons re-enabled after delay");
  }
}

// Function to get random delay for flag clearing (for nosteward.html)
function getRandomDelay() {
  return Math.floor(Math.random() * (6000 - 3000 + 1)) + 3000;
}

// Export functions for use in other modules
export {
  showCountdown,
  updateButtonStates,
  disableButtonsDuringDelay,
  reEnableButtonsAfterDelay,
  getRandomDelay,
  isNoStewardPage
};
