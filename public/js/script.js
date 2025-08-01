// script.js - Main entry point for race control application

// Import modular components
import { initializeRaceLogic, startRace as _startRace, toggleYellowFlag as _toggleYellowFlag, toggleRedFlag as _toggleRedFlag, restartRace as _restartRace, checkTimeMarks } from './raceLogic.js';
import { initializeAudioManager, playAudio, preloadCriticalAudio } from './audioManager.js';
import { showCountdown, disableButtonsDuringDelay as _disableButtonsDuringDelay, reEnableButtonsAfterDelay as _reEnableButtonsAfterDelay, getRandomDelay as _getRandomDelay, isNoStewardPage as _isNoStewardPage } from './uiController.js';

// Initialize NoSleep to keep screen awake on mobile devices
const _noSleep = new NoSleep();

// Initialize application
function initializeApp() {
  // Initialize audio management
  initializeAudioManager();

  // Expose functions to global scope for fallback
  globalThis._noSleep = _noSleep;
  globalThis.startRace = startRace;
  globalThis.startRaceSequence = startRaceSequence;
  globalThis.playAudio = playAudio;
  globalThis.showCountdown = showCountdown;
  globalThis.preloadCriticalAudio = preloadCriticalAudio;
  console.log("Global functions exposed for fallback");

  // Initialize race logic event listeners with dependencies from other modules
  initializeRaceLogic(globalThis._noSleep, playAudio, showCountdown, preloadCriticalAudio);
}

// Function reference for startRaceSequence to be exposed globally
function startRaceSequence(_playAudio, _showCountdown, _preloadCriticalAudio) {
  console.log("startRaceSequence called");
  // This function will be called from raceLogic.js
  // Implementation is in raceLogic.js, this is just a placeholder for global access
}

// Timer check for audio cues
function setupTimerChecks() {
  // This function is no longer needed as checkTimeMarks is called within startTimer in raceLogic.js
  console.log("setupTimerChecks is deprecated as checkTimeMarks is handled in raceLogic.js");
  // Kept for potential future use or debugging
}

// Initialize the application when the DOM is fully loaded
globalThis.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded, initializing app");
  initializeApp();
  setupTimerChecks();
});
