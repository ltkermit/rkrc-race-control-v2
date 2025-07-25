// script.js - Main entry point for race control application

// Import modular components
import { initializeRaceLogic, startRace as _startRace, toggleYellowFlag as _toggleYellowFlag, toggleRedFlag as _toggleRedFlag, restartRace as _restartRace, checkTimeMarks } from './raceLogic.js';
import { initializeAudioManager, playAudio, preloadCriticalAudio } from './audioManager.js';
import { showCountdown, disableButtonsDuringDelay as _disableButtonsDuringDelay, reEnableButtonsAfterDelay as _reEnableButtonsAfterDelay, getRandomDelay as _getRandomDelay, isNoStewardPage as _isNoStewardPage } from './uiController.js';

// Initialize NoSleep to keep screen awake on mobile devices
const noSleep = new NoSleep();

// Initialize application
function initializeApp() {
  // Initialize audio management
  initializeAudioManager();

  // Initialize race logic event listeners with dependencies from other modules
  initializeRaceLogic(noSleep, playAudio, showCountdown, preloadCriticalAudio);
}

// Timer check for audio cues
function setupTimerChecks() {
  const _interval = setInterval(() => {
    const audioId = checkTimeMarks();
    if (audioId) {
      const message = audioId === '30-seconds' ? '30 Seconds Left' : `${audioId.split('-')[0]} Minute(s) Left`;
      playAudio(audioId, message, 3000);
    }
  }, 1000);
}

// Initialize the application when the DOM is fully loaded
globalThis.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded, initializing app");
  initializeApp();
  setupTimerChecks();
});
