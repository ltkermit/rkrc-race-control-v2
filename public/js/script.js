// script.js - Main entry point for race control application

// Import modular components
import { initializeRaceLogic, startRace, toggleYellowFlag, toggleRedFlag, restartRace, checkTimeMarks } from './raceLogic.js';
import { initializeAudioManager, playAudio, preloadCriticalAudio } from './audioManager.js';
import { showCountdown, disableButtonsDuringDelay, reEnableButtonsAfterDelay, getRandomDelay, isNoStewardPage } from './uiController.js';

// Initialize NoSleep to keep screen awake on mobile devices
const noSleep = new NoSleep();

// Initialize application
function initializeApp() {
  // Initialize race logic event listeners
  initializeRaceLogic(noSleep);

  // Initialize audio management
  initializeAudioManager();

  // Set up start race sequence with audio and countdown
  setupStartRaceSequence();

  // Set up flag toggle with audio and delays
  setupFlagToggles();

  // Set up restart with audio
  setupRestart();
}

// Setup start race sequence with audio and countdown
function setupStartRaceSequence() {
  const originalStartRaceBtn = document.getElementById('startRace');
  if (originalStartRaceBtn) {
    originalStartRaceBtn.addEventListener('click', () => {
      startRace();
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
            const randomFinalDelay = Math.floor(Math.random() * 1000) + 2000;
            setTimeout(() => {
              // Step 4: Play start-beep.mp3, show "GO!" and start the timer
              try {
                console.log("Playing start-beep and starting timer");
                showCountdown('GO!', true);
                playAudio('startBeepSound', 'GO!').catch(e => {
                  console.error("Audio play error for start-beep:", e);
                  setTimeout(() => {
                    console.log("Retrying start-beep playback");
                    playAudio('startBeepSound').catch(retryError => console.error("Retry failed for start-beep:", retryError));
                  }, 500);
                });
              } catch (e) {
                console.error("Start-beep sound failed:", e);
              }
            }, randomFinalDelay);
          }
        };
        playNextBeep();
      }, 3000);
    });
  }
}

// Setup flag toggle with audio and delays
function setupFlagToggles() {
  const yellowFlagBtn = document.getElementById('yellowFlag');
  if (yellowFlagBtn) {
    yellowFlagBtn.addEventListener('click', () => {
      const audioId = toggleYellowFlag();
      playAudio(audioId, audioId === 'yellowOnSound' ? 'Yellow Flag Thrown' : 'Yellow Flag Cleared', 2000);

      if (!audioId.includes('On') && isNoStewardPage) {
        playAudio('getReadySound', 'Get Ready for Green Flag', 2000);
        disableButtonsDuringDelay();
        const delay = getRandomDelay();
        console.log(`Applying random delay of ${delay}ms for Yellow Flag clear on nosteward.html`);
        setTimeout(() => {
          reEnableButtonsAfterDelay();
        }, delay);
      }
    });
  }

  const redFlagBtn = document.getElementById('redFlag');
  if (redFlagBtn) {
    redFlagBtn.addEventListener('click', () => {
      const audioId = toggleRedFlag();
      playAudio(audioId, audioId === 'redOnSound' ? 'Red Flag Thrown' : 'Red Flag Cleared', 2000);

      if (!audioId.includes('On') && isNoStewardPage) {
        playAudio('getReadySound', 'Get Ready for Green Flag', 2000);
        disableButtonsDuringDelay();
        const delay = getRandomDelay();
        console.log(`Applying random delay of ${delay}ms for Red Flag clear on nosteward.html`);
        setTimeout(() => {
          reEnableButtonsAfterDelay();
        }, delay);
      }
    });
  }
}

// Setup restart with audio
function setupRestart() {
  const restartBtn = document.getElementById('restart');
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      restartRace();
      playAudio('restartSound', 'Race Restarted', 2000);
    });
  }
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

// Initialize the application when the DOM is loaded
globalThis.addEventListener('load', initializeApp);

// Setup timer checks for audio cues
setupTimerChecks();
