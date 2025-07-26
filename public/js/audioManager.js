// audioManager.js - Manages audio playback and voice selection

// DOM elements
const voiceSelect = document.getElementById('voiceSelect');

// Audio context for better control on Safari
let audioContext = null;

// Detect if running on Apple device or Safari for audio debugging
const isAppleDevice = /iPhone|iPad|iPod/.test(navigator.userAgent);
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
if (isAppleDevice || isSafari) {
  console.log("Running on Apple device or Safari. Audio playback may require user interaction.");
}

// Initialize Web Audio Context
try {
  const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (AudioContext) {
    audioContext = new AudioContext();
    if (audioContext.state === 'suspended') {
      console.log("AudioContext is suspended. Will resume on user interaction.");
    }
  } else {
    console.warn("Web Audio API not supported in this browser.");
  }
} catch (e) {
  console.error("Error initializing AudioContext:", e);
}

// List of audio IDs that need voice updates (excluding beep sounds)
const voiceAudioIds = [
  'startEnginesSound',
  'yellowOnSound',
  'yellowOffSound',
  'redOnSound',
  'redOffSound',
  'endSound',
  'restartSound',
  '30-seconds',
  '1-minute',
  '2-minute',
  '3-minute',
  '4-minute',
  '5-minute',
  '6-minute',
  '7-minute',
  '8-minute',
  '9-minute',
  'getReadySound',
];

// Update audio sources based on selected voice
function updateAudioSources() {
  const selectedVoice = voiceSelect.value;
  console.log(`Updating audio sources to voice: ${selectedVoice}`);

  voiceAudioIds.forEach(audioId => {
    const audioElement = document.getElementById(audioId);
    if (audioElement) {
      let basePath = './audio/';
      let prefix = '';

      if (selectedVoice === 'america') {
        basePath += 'america/';
      } else if (selectedVoice === 'europe') {
        basePath += 'europe/';
        prefix = 'e-';
      } else if (selectedVoice === 'merica') {
        basePath += 'merica/';
        prefix = 'n-';
      }
      console.log(`Base path for audio set to: ${basePath}`);

      // Extract the base filename from the current src or a default
      let baseName = audioId.replace('Sound', '').toLowerCase();
      if (baseName.includes('-')) {
        baseName = baseName.replace('-', '-');
      } else if (audioId === '30-seconds') {
        baseName = '30-seconds';
      } else if (audioId.includes('minute')) {
        baseName = audioId.replace('-', '-');
      }

      const newSrc = `${basePath}${prefix}${baseName}.mp3`;
      console.log(`Updating ${audioId} src to: ${newSrc}`);
      audioElement.src = newSrc;

      // Force reload of the audio file without playing
      try {
        audioElement.load();
        console.log(`Loaded audio for ${audioId}`);
      } catch (e) {
        console.error(`Error loading audio for ${audioId}:`, e);
      }
    } else {
      console.warn(`Audio element not found for ID: ${audioId}`);
    }
  });
}

// Utility function to play audio with retry mechanism
function playAudioWithRetry(audioId, retries = 2, delayMs = 500) {
  // Check and resume Audio Context before playback attempt
  if (audioContext && audioContext.state === 'suspended') {
    try {
      audioContext.resume().then(() => {
        console.log("AudioContext resumed before playing audio");
      }).catch(e => {
        console.error("Failed to resume AudioContext before playing audio:", e);
      });
    } catch (e) {
      console.error("Error resuming AudioContext before playing audio:", e);
    }
  }

  const audio = document.getElementById(audioId);
  if (!audio) {
    console.warn(`Audio element not found for ID: ${audioId}`);
    return Promise.reject(new Error(`Audio element ${audioId} not found`));
  }

  console.log(`Attempting to play audio: ${audioId}`);
  return audio.play().then(() => {
    console.log(`Successfully played audio: ${audioId}`);
  }).catch(error => {
    console.error(`Failed to play audio ${audioId}:`, error);
    if (retries > 0) {
      console.log(`Retrying playback for ${audioId}. Retries left: ${retries}`);
      return new Promise(resolve => setTimeout(resolve, delayMs))
        .then(() => playAudioWithRetry(audioId, retries - 1, delayMs));
    } else {
      console.error(`All retries failed for ${audioId}`);
      throw error;
    }
  });
}

// Show visual notification as fallback for audio
function showVisualNotification(message, durationMs = 3000) {
  const notificationContainer = document.getElementById('visualNotificationContainer');
  if (notificationContainer) {
    const notification = document.createElement('div');
    notification.className = 'visual-notification';
    notification.textContent = message;
    notification.style.cssText = `
      background-color: #fff;
      border: 2px solid #007bff;
      border-radius: 5px;
      padding: 10px 20px;
      font-size: 18px;
      font-weight: bold;
      color: #333;
      box-shadow: 0 0 10px rgba(0,0,0,0.3);
      margin: 10px auto;
      text-align: center;
      max-width: 300px;
      animation: fadeInOut ${durationMs/1000}s forwards;
    `;
    notificationContainer.appendChild(notification);
    console.log(`Showing visual notification: ${message}`);
    setTimeout(() => {
      notification.remove();
    }, durationMs);
  } else {
    console.warn("Visual notification container not found, using console log as fallback");
    console.log(`[Visual Notification]: ${message}`);
  }
}

// Initialize audio unlock modal for Safari/Apple devices
function initializeAudioUnlockModal() {
  const unlockModal = document.getElementById('audioUnlockModal');
  const unlockButton = document.getElementById('unlockAudioButton');

  if (unlockModal && unlockButton && (isAppleDevice || isSafari)) {
    console.log("Showing audio unlock modal for Safari/Apple device users");
    unlockModal.style.display = 'flex';
    unlockButton.focus();

    unlockButton.addEventListener('click', () => {
      console.log("User clicked to unlock audio");
      // Resume Audio Context if suspended
      if (audioContext && audioContext.state === 'suspended') {
        try {
          audioContext.resume().then(() => {
            console.log("AudioContext resumed successfully");
          }).catch(e => {
            console.error("Failed to resume AudioContext:", e);
          });
        } catch (e) {
          console.error("Error resuming AudioContext:", e);
        }
      }

      // Play a short audio to unlock permissions
      try {
        const startSound = document.getElementById('startEnginesSound') || document.getElementById('beepSound');
        if (startSound) {
          startSound.play().then(() => {
            console.log("Audio permissions unlocked with initial sound");
            startSound.pause();
            startSound.currentTime = 0;
          }).catch(e => {
            console.error("Failed to unlock audio permissions with initial sound:", e);
          });
        } else {
          console.warn("No audio element found for unlocking permissions");
        }
      } catch (e) {
        console.error("Error unlocking audio permissions:", e);
      }

      // Hide the modal after click
      unlockModal.style.display = 'none';
    });
  } else if (unlockModal) {
    console.log("Not on Safari/Apple device, hiding audio unlock modal");
    unlockModal.style.display = 'none';
  }
}

// Initialize Firefox recommendation dismissal
function initializeFirefoxRecommendationDismissal() {
  const dismissButton = document.getElementById('dismissRecommendation');
  const firefoxRecommendation = document.getElementById('firefoxRecommendation');

  if (dismissButton && firefoxRecommendation) {
    dismissButton.addEventListener('click', () => {
      firefoxRecommendation.style.display = 'none';
      console.log("Firefox recommendation dismissed by user");
    });
  }
}

// Show Firefox recommendation on iOS Safari
if (isAppleDevice && isSafari) {
  console.log("Running on iOS device with Safari. Recommending Firefox for best audio experience.");
  globalThis.addEventListener('load', () => {
    const firefoxRecommendation = document.getElementById('firefoxRecommendation');
    if (firefoxRecommendation) {
      firefoxRecommendation.style.display = 'block';
      console.log("Firefox recommendation message displayed for iOS Safari users");
    } else {
      console.warn("Firefox recommendation element not found, using alert as fallback");
      alert("For the best audio experience on iOS, we recommend using Firefox. Download it from the App Store for full race sound support.");
    }
  });
} else if (isAppleDevice) {
  console.log("Running on iOS device but not Safari. No Firefox recommendation needed.");
} else {
  console.log("Not on iOS device, no Firefox recommendation needed.");
}

// Preload critical audio files
function preloadCriticalAudio() {
  const criticalAudioIds = ['beepSound', 'startBeepSound', 'yellowOnSound', 'redOnSound', 'getReadySound'];
  criticalAudioIds.forEach(id => {
    const audio = document.getElementById(id);
    if (audio) {
      try {
        audio.load();
        console.log(`Preloaded audio: ${id}`);
      } catch (e) {
        console.error(`Error preloading audio ${id}:`, e);
      }
    }
  });
}

// Initialize audio-related event listeners and functionality
function initializeAudioManager() {
  if (voiceSelect) {
    voiceSelect.addEventListener('change', updateAudioSources);
    updateAudioSources(); // Initialize on load
  }

  globalThis.addEventListener('load', initializeAudioUnlockModal);
  globalThis.addEventListener('load', initializeFirefoxRecommendationDismissal);
}

// Play audio with fallback to visual notification
function playAudio(audioId, notificationMessage = null, durationMs = 3000) {
  console.log(`playAudio called with audioId: ${audioId}`);
  return playAudioWithRetry(audioId).catch(e => {
    console.error(`Failed to play ${audioId} after retries:`, e);
    if (notificationMessage) {
      showVisualNotification(notificationMessage, durationMs);
    }
  });
}

// Export functions for use in other modules
export {
  initializeAudioManager,
  playAudio,
  preloadCriticalAudio,
  showVisualNotification,
  updateAudioSources
};
