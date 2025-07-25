const raceTimeSelect = document.getElementById("raceTime");
const startRaceBtn = document.getElementById("startRace");
const timerDisplay = document.getElementById("timer");
const yellowFlagBtn = document.getElementById("yellowFlag");
const redFlagBtn = document.getElementById("redFlag");
const restartBtn = document.getElementById("restart");
const voiceSelect = document.getElementById("voiceSelect");
let totalSeconds = 0;
let secondsLeft = 0;
let timerInterval = null;
let isRunning = false;
let isYellowFlag = false;
let isRedFlag = false;
let lastMinutePlayed = -1;
let hasPlayed30Seconds = false; // Track if 30-second sound has been played
// Flag count variables
let yellowFlagCount = 0;
let redFlagCount = 0;
// Initialize NoSleep to keep screen awake on mobile devices
const noSleep = new NoSleep();

// Practice mode variables
const practiceModeCheckbox = document.getElementById("practiceMode");
let isPracticeMode = false;

// Explicitly enable start button and time selector on page load
startRaceBtn.disabled = false;
raceTimeSelect.disabled = false; // Ensure time selector is enabled on load
console.log("Script loaded, start button and time selector enabled!");

// Function to generate a random delay between 3000ms (3s) and 6000ms (6s)
function getRandomDelay() {
  return Math.floor(Math.random() * (6000 - 3000 + 1)) + 3000;
}

// Detect if running on Apple device or Safari for audio debugging
const isAppleDevice = /iPhone|iPad|iPod/.test(navigator.userAgent); // Focus on iOS devices
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
if (isAppleDevice || isSafari) {
  console.log(
    "Running on Apple device or Safari. Audio playback may require user interaction.",
  );
}

// Initialize Web Audio Context for better control on Safari
let audioContext = null;
try {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (AudioContext) {
    audioContext = new AudioContext();
    if (audioContext.state === "suspended") {
      console.log(
        "AudioContext is suspended. Will resume on user interaction.",
      );
    }
  } else {
    console.warn("Web Audio API not supported in this browser.");
  }
} catch (e) {
  console.error("Error initializing AudioContext:", e);
}

// Voice selector logic (for any page with voiceSelect element)
// List of audio IDs that need voice updates (excluding beep sounds)
const voiceAudioIds = [
  "startEnginesSound",
  "yellowOnSound",
  "yellowOffSound",
  "redOnSound",
  "redOffSound",
  "endSound",
  "restartSound",
  "30-seconds",
  "1-minute",
  "2-minute",
  "3-minute",
  "4-minute",
  "5-minute",
  "6-minute",
  "7-minute",
  "8-minute",
  "9-minute",
  "10-minute",
  "getReadySound", // Added for the "Get Ready" sound played before clearing flags
  // Add any other minute or specific audio IDs present in your HTML
];

// Function to update audio sources based on selected voice
function updateAudioSources() {
  const selectedVoice = voiceSelect.value;
  console.log(`Updating audio sources to voice: ${selectedVoice}`);

  voiceAudioIds.forEach((audioId) => {
    const audioElement = document.getElementById(audioId);
    if (audioElement) {
      let basePath = "audio/";
      let prefix = "";

      if (selectedVoice === "america") {
        basePath += "america/";
      } else if (selectedVoice === "europe") {
        basePath += "europe/";
        prefix = "e-";
      } else if (selectedVoice === "merica") {
        basePath += "merica/";
        prefix = "n-";
      }

      // Extract the base filename from the current src or a default
      let baseName = audioId.replace("Sound", "").toLowerCase();
      if (baseName.includes("-")) {
        baseName = baseName.replace("-", "-");
      } else if (audioId === "30-seconds") {
        baseName = "30-seconds";
      } else if (audioId.includes("minute")) {
        baseName = audioId.replace("-", "-");
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

// Add event listener for voice selection change (only if selector exists)
if (voiceSelect) {
  voiceSelect.addEventListener("change", updateAudioSources);
  // Initialize audio sources on page load based on default selection
  updateAudioSources();
}

// Check if the current page is nosteward.html
const isNoStewardPage = window.location.pathname.includes("nosteward.html");

// Function to update background color or pattern based on state
function updateBackgroundColor() {
  // Remove checkerboard class by default to ensure it's only applied when race ends
  document.body.classList.remove("checkerboard");

  // Set background based on state
  if (!isRunning && secondsLeft <= 0 && !isPracticeMode) {
    // Race has ended, apply checkerboard pattern
    document.body.classList.add("checkerboard");
  } else if (isRedFlag) {
    document.body.style.backgroundColor = "#e74c3c"; // Red for Red Flag
  } else if (isYellowFlag) {
    document.body.style.backgroundColor = "#f1c40f"; // Yellow for Yellow Flag
  } else if (isRunning) {
    document.body.style.backgroundColor = "#2ecc71"; // Green for Race Running
  } else {
    document.body.style.backgroundColor = "#f0f0f0"; // Default gray when not running
  }
}

// Function to reset flag counts (called on start and restart)
function resetFlagCounts() {
  yellowFlagCount = 0;
  redFlagCount = 0;
  // Update UI to hide or reset counts display if needed
  const flagCountDisplay = document.getElementById("flagCountDisplay");
  if (flagCountDisplay) {
    flagCountDisplay.style.display = "none"; // Hide counts at start
    flagCountDisplay.innerHTML = ""; // Clear any previous content
  }
  console.log("Flag counts reset to zero");
}

// Function to display flag counts at race end
function displayFlagCounts() {
  const flagCountDisplay = document.getElementById("flagCountDisplay");
  if (flagCountDisplay) {
    flagCountDisplay.style.display = "block"; // Show the display area
    flagCountDisplay.innerHTML = `
            <h3>Race Summary</h3>
            <p>Yellow Flags Thrown: ${yellowFlagCount}</p>
            <p>Red Flags Thrown: ${redFlagCount}</p>
        `;
    console.log(
      `Race ended. Yellow Flags: ${yellowFlagCount}, Red Flags: ${redFlagCount}`,
    );
  } else {
    // Fallback to alert if the display element is not found
    alert(
      `Race Ended!\nYellow Flags Thrown: ${yellowFlagCount}\nRed Flags Thrown: ${redFlagCount}`,
    );
    console.warn(
      "Flag count display element not found, using alert as fallback",
    );
  }
}

// Function to show visual notification for audio events (fallback for iOS/Safari)
function showVisualNotification(message, durationMs = 3000) {
  const notificationContainer = document.getElementById(
    "visualNotificationContainer",
  );
  if (notificationContainer) {
    const notification = document.createElement("div");
    notification.className = "visual-notification";
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
            animation: fadeInOut ${durationMs / 1000}s forwards;
        `;
    notificationContainer.appendChild(notification);
    console.log(`Showing visual notification: ${message}`);
    setTimeout(() => {
      notification.remove();
    }, durationMs);
  } else {
    console.warn(
      "Visual notification container not found, using console log as fallback",
    );
    console.log(`[Visual Notification]: ${message}`);
  }
}

// Function to show countdown numbers during start sequence
function showCountdown(text, isGo = false) {
  const countdown = document.createElement("div");
  countdown.className = isGo ? "countdown-display go" : "countdown-display";
  countdown.textContent = text;
  document.body.appendChild(countdown);

  // Remove after animation completes
  setTimeout(() => countdown.remove(), 1000);
}

// Practice mode toggle handler
function togglePracticeMode() {
  isPracticeMode = practiceModeCheckbox.checked;

  if (isPracticeMode) {
    // Disable race time selector
    raceTimeSelect.disabled = true;
    document.querySelector(".settings").classList.add("practice-mode");

    // Show practice mode indicator - insert it right after the practice mode section
    if (!document.querySelector(".practice-mode-indicator")) {
      const indicator = document.createElement("div");
      indicator.className = "practice-mode-indicator";
      indicator.textContent = "PRACTICE MODE - No Time Limit";

      // Insert after the practice mode section instead of before timer
      const practiceModeSection = document.querySelector(
        ".practice-mode-section",
      );
      practiceModeSection.parentNode.insertBefore(
        indicator,
        practiceModeSection.nextSibling,
      );
    }

    // Update timer display
    timerDisplay.textContent = "PRACTICE";
    timerDisplay.classList.add("practice");
  } else {
    // Re-enable race time selector
    raceTimeSelect.disabled = false;
    document.querySelector(".settings").classList.remove("practice-mode");

    // Remove practice mode indicator
    const indicator = document.querySelector(".practice-mode-indicator");
    if (indicator) indicator.remove();

    // Reset timer display
    timerDisplay.classList.remove("practice");
    updateTimerDisplay();
  }
}

// Add event listener for practice mode checkbox
if (practiceModeCheckbox) {
  practiceModeCheckbox.addEventListener("change", togglePracticeMode);
}

// Utility function to play audio with retry mechanism for Safari reliability
function playAudioWithRetry(audioId, retries = 2, delayMs = 500) {
  // Check and resume Audio Context before playback attempt
  if (audioContext && audioContext.state === "suspended") {
    try {
      audioContext.resume().then(() => {
        console.log("AudioContext resumed before playing audio");
      }).catch((e) => {
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
  }).catch((error) => {
    console.error(`Failed to play audio ${audioId}:`, error);
    if (retries > 0) {
      console.log(`Retrying playback for ${audioId}. Retries left: ${retries}`);
      return new Promise((resolve) => setTimeout(resolve, delayMs))
        .then(() => playAudioWithRetry(audioId, retries - 1, delayMs));
    } else {
      console.error(`All retries failed for ${audioId}`);
      throw error;
    }
  });
}

// Audio Unlock Modal Logic for Safari/Apple Devices
function initializeAudioUnlockModal() {
  const unlockModal = document.getElementById("audioUnlockModal");
  const unlockButton = document.getElementById("unlockAudioButton");

  if (unlockModal && unlockButton && (isAppleDevice || isSafari)) {
    console.log("Showing audio unlock modal for Safari/Apple device users");
    unlockModal.style.display = "flex"; // Show modal on page load for Safari users

    unlockButton.addEventListener("click", () => {
      console.log("User clicked to unlock audio");
      // Resume Audio Context if suspended
      if (audioContext && audioContext.state === "suspended") {
        try {
          audioContext.resume().then(() => {
            console.log("AudioContext resumed successfully");
          }).catch((e) => {
            console.error("Failed to resume AudioContext:", e);
          });
        } catch (e) {
          console.error("Error resuming AudioContext:", e);
        }
      }

      // Play a short audio to unlock permissions
      try {
        const startSound = document.getElementById("startEnginesSound") ||
          document.getElementById("beepSound");
        if (startSound) {
          startSound.play().then(() => {
            console.log("Audio permissions unlocked with initial sound");
            startSound.pause(); // Pause to avoid playing full sound
            startSound.currentTime = 0; // Reset to start
          }).catch((e) => {
            console.error(
              "Failed to unlock audio permissions with initial sound:",
              e,
            );
          });
        } else {
          console.warn("No audio element found for unlocking permissions");
        }
      } catch (e) {
        console.error("Error unlocking audio permissions:", e);
      }

      // Hide the modal after click
      unlockModal.style.display = "none";
    });
  } else if (unlockModal) {
    console.log("Not on Safari/Apple device, hiding audio unlock modal");
    unlockModal.style.display = "none"; // Hide modal for non-Safari users
  }
}

// Handle dismissal of Firefox recommendation message
function initializeFirefoxRecommendationDismissal() {
  const dismissButton = document.getElementById("dismissRecommendation");
  const firefoxRecommendation = document.getElementById(
    "firefoxRecommendation",
  );

  if (dismissButton && firefoxRecommendation) {
    dismissButton.addEventListener("click", () => {
      firefoxRecommendation.style.display = "none";
      console.log("Firefox recommendation dismissed by user");
    });
  }
}

// Call initialization on page load
window.addEventListener("load", initializeAudioUnlockModal);
window.addEventListener("load", initializeFirefoxRecommendationDismissal);

// Detect iOS Safari and show Firefox recommendation
if (isAppleDevice && isSafari) {
  console.log(
    "Running on iOS device with Safari. Recommending Firefox for best audio experience.",
  );
  window.addEventListener("load", () => {
    const firefoxRecommendation = document.getElementById(
      "firefoxRecommendation",
    );
    if (firefoxRecommendation) {
      firefoxRecommendation.style.display = "block"; // Show recommendation message
      console.log(
        "Firefox recommendation message displayed for iOS Safari users",
      );
    } else {
      console.warn(
        "Firefox recommendation element not found, using alert as fallback",
      );
      alert(
        "For the best audio experience on iOS, we recommend using Firefox. Download it from the App Store for full race sound support.",
      );
    }
  });
} else if (isAppleDevice) {
  console.log(
    "Running on iOS device but not Safari. No Firefox recommendation needed.",
  );
} else {
  console.log("Not on iOS device, no Firefox recommendation needed.");
}

// Start race with updated sequence
startRaceBtn.addEventListener("click", () => {
  console.log("Start Race button clicked - initializing audio if needed");

  // Set up timing based on mode
  if (isPracticeMode) {
    totalSeconds = 0; // Start from 0 for practice mode
    secondsLeft = 0;
    timerDisplay.textContent = "00:00"; // Show elapsed time starting from 0
  } else {
    totalSeconds = parseInt(raceTimeSelect.value) * 60;
    secondsLeft = totalSeconds;
    updateTimerDisplay();
  }

  // Disable controls
  raceTimeSelect.disabled = true;
  practiceModeCheckbox.disabled = true; // Disable practice mode toggle during race
  startRaceBtn.disabled = true;
  yellowFlagBtn.disabled = false;
  redFlagBtn.disabled = false;
  restartBtn.disabled = false;
  resetFlagCounts(); // Reset flag counts at race start

  // Enable NoSleep to keep screen awake during the race
  try {
    noSleep.enable();
    console.log("Screen wake lock enabled");
  } catch (e) {
    console.error("Failed to enable screen wake lock:", e);
  }

  // Resume Audio Context if still suspended (in case modal wasn't clicked)
  if (audioContext && audioContext.state === "suspended") {
    try {
      audioContext.resume().then(() => {
        console.log("AudioContext resumed successfully");
      }).catch((e) => {
        console.error("Failed to resume AudioContext:", e);
      });
    } catch (e) {
      console.error("Error resuming AudioContext:", e);
    }
  }

  // Attempt to play start-engines sound
  try {
    const startSound = document.getElementById("startEnginesSound");
    if (startSound) {
      console.log("Playing start-engines sound");
      playAudioWithRetry("startEnginesSound").catch((e) => {
        console.error("Failed to play start-engines sound after retries:", e);
      });
    } else {
      console.warn("startEnginesSound element not found");
    }

    // Preload critical audio files to ensure they are ready, without playing
    const criticalAudioIds = [
      "beepSound",
      "startBeepSound",
      "yellowOnSound",
      "redOnSound",
      "getReadySound",
    ];
    criticalAudioIds.forEach((id) => {
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
  } catch (e) {
    console.error("Error initializing audio:", e);
  }

  // Step 1: Wait 3 seconds before starting the beep sequence
  setTimeout(() => {
    // Step 2: Play beep.mp3 every 1.5 seconds for 4 times with countdown
    let beepCount = 0;
    const playNextBeep = () => {
      if (beepCount < 4) {
        try {
          console.log(`Playing beep ${beepCount + 1}/4`);

          // Show countdown number (4, 3, 2, 1)
          showCountdown(4 - beepCount);

          const beepSound = document.getElementById("beepSound");
          if (beepSound) {
            beepSound.play().then(() => {
              beepSound.onended = () => {
                beepCount++;
                setTimeout(playNextBeep, 1000); // Wait before next beep
              };
            }).catch((e) => {
              console.error("Audio play error for beep:", e);
              beepCount++;
              setTimeout(playNextBeep, 1000); // Continue even if error
            });
          } else {
            console.warn("beepSound element not found");
            beepCount++;
            setTimeout(playNextBeep, 1000);
          }
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

            // Show "GO!" message
            showCountdown("GO!", true);

            const startBeepSound = document.getElementById("startBeepSound");
            if (startBeepSound) {
              startBeepSound.play().catch((e) => {
                console.error("Audio play error for start-beep:", e);
                // Retry once if it fails
                setTimeout(() => {
                  console.log("Retrying start-beep playback");
                  startBeepSound.play().catch((retryError) =>
                    console.error("Retry failed for start-beep:", retryError)
                  );
                }, 500);
              });
            } else {
              console.warn("startBeepSound element not found");
            }
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
});

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
          checkTimeMarks(); // Check for minute and 30-second marks
        } else if (secondsLeft <= 0) {
          clearInterval(timerInterval);
          isRunning = false;
          try {
            console.log("Playing end sound");
            playAudioWithRetry("endSound", 3, 500).catch((e) => {
              console.error("Failed to play end sound after retries:", e);
              showVisualNotification("Race Ended!", 5000);
            });
          } catch (e) {
            console.error("End sound failed:", e);
            showVisualNotification("Race Ended!", 5000);
          }
          updateBackgroundColor();
          disableButtons();
          displayFlagCounts();
          // Disable NoSleep when race ends
          try {
            noSleep.disable();
            console.log("Screen wake lock disabled");
          } catch (e) {
            console.error("Failed to disable screen wake lock:", e);
          }
        }
      }
    }
  }, 1000);
}

function updateTimerDisplay() {
  if (isPracticeMode && !isRunning && secondsLeft === 0) {
    timerDisplay.textContent = "PRACTICE";
  } else {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, "0")}:${
      seconds.toString().padStart(2, "0")
    }`;
  }
}

function checkTimeMarks() {
  const currentMinute = Math.floor(secondsLeft / 60);
  const currentSecond = secondsLeft % 60;

  // Check for minute marks (play specific minute audio when seconds hit 0)
  if (
    currentMinute !== lastMinutePlayed && currentSecond === 0 &&
    currentMinute > 0
  ) {
    try {
      const audioId = `${currentMinute}-minute`;
      console.log(
        `Playing audio for ${currentMinute} minute(s) left: ${audioId}`,
      );
      playAudioWithRetry(audioId, 3, 500).catch((e) => {
        console.error(`Failed to play ${audioId} after retries:`, e);
        showVisualNotification(`${currentMinute} Minute(s) Left`, 3000);
      });
      lastMinutePlayed = currentMinute;
    } catch (e) {
      console.error(`Error playing ${currentMinute}-minute sound:`, e);
      showVisualNotification(`${currentMinute} Minute(s) Left`, 3000);
    }
  }

  // Check for 30-second mark
  if (secondsLeft === 30 && !hasPlayed30Seconds) {
    try {
      console.log("Playing audio for 30 seconds left");
      playAudioWithRetry("30-seconds", 3, 500).catch((e) => {
        console.error("Failed to play 30-seconds after retries:", e);
        showVisualNotification("30 Seconds Left", 3000);
      });
      hasPlayed30Seconds = true; // Mark as played to avoid repeats
    } catch (e) {
      console.error("30-seconds sound failed:", e);
      showVisualNotification("30 Seconds Left", 3000);
    }
  }
}

function disableButtons() {
  yellowFlagBtn.disabled = true;
  redFlagBtn.disabled = true;
  restartBtn.disabled = false;
}

// Yellow Flag logic with conditional delay for clearing, get-ready sound, and button disable
yellowFlagBtn.addEventListener("click", () => {
  isYellowFlag = !isYellowFlag;
  if (isYellowFlag) {
    try {
      console.log("Playing yellow-on sound");
      playAudioWithRetry("yellowOnSound").catch((e) => {
        console.error("Failed to play yellow-on sound after retries:", e);
        showVisualNotification("Yellow Flag Thrown", 2000);
      });
    } catch (e) {
      console.error("Yellow on sound failed:", e);
      showVisualNotification("Yellow Flag Thrown", 2000);
    }
    yellowFlagBtn.textContent = "Clear Yellow Flag";
    yellowFlagCount++; // Increment count when Yellow Flag is thrown
    console.log(`Yellow Flag thrown. Total count: ${yellowFlagCount}`);
    updateBackgroundColor(); // Update background immediately when Yellow Flag is set
  } else {
    const updateYellowFlagOff = () => {
      try {
        console.log("Playing yellow-off sound");
        playAudioWithRetry("yellowOffSound").catch((e) => {
          console.error("Failed to play yellow-off sound after retries:", e);
          showVisualNotification("Yellow Flag Cleared", 2000);
        });
      } catch (e) {
        console.error("Yellow off sound failed:", e);
        showVisualNotification("Yellow Flag Cleared", 2000);
      }
      yellowFlagBtn.textContent = "Yellow Flag";
      updateBackgroundColor(); // Update background when Yellow Flag is cleared
      console.log("Yellow Flag cleared after delay (if applied)");
      // Re-enable buttons after delay completes (only on nosteward.html)
      if (isNoStewardPage) {
        yellowFlagBtn.disabled = false;
        redFlagBtn.disabled = false;
        console.log("Buttons re-enabled after delay for Yellow Flag clear");
      }
    };

    if (isNoStewardPage) {
      try {
        console.log(
          "Playing get-ready sound before delay for Yellow Flag clear",
        );
        playAudioWithRetry("getReadySound").catch((e) => {
          console.error("Failed to play get-ready sound after retries:", e);
          showVisualNotification("Get Ready for Green Flag", 2000);
        });
      } catch (e) {
        console.error("Get-ready sound failed for Yellow Flag clear:", e);
        showVisualNotification("Get Ready for Green Flag", 2000);
      }
      // Disable both buttons during the delay to prevent re-clicking
      yellowFlagBtn.disabled = true;
      redFlagBtn.disabled = true;
      console.log("Buttons disabled during delay for Yellow Flag clear");
      const delay = getRandomDelay();
      console.log(
        `Applying random delay of ${delay}ms for Yellow Flag clear on nosteward.html`,
      );
      setTimeout(updateYellowFlagOff, delay);
    } else {
      console.log(
        "No delay applied for Yellow Flag clear (not on nosteward.html)",
      );
      updateYellowFlagOff();
    }
  }

  if (isYellowFlag) {
    updateBackgroundColor(); // Already updated if flag is set, but ensure consistency
  }
});

// Red Flag logic with conditional delay for clearing, get-ready sound, and button disable
redFlagBtn.addEventListener("click", () => {
  isRedFlag = !isRedFlag;
  if (isRedFlag) {
    try {
      console.log("Playing red-on sound");
      playAudioWithRetry("redOnSound").catch((e) => {
        console.error("Failed to play red-on sound after retries:", e);
        showVisualNotification("Red Flag Thrown", 2000);
      });
    } catch (e) {
      console.error("Red on sound failed:", e);
      showVisualNotification("Red Flag Thrown", 2000);
    }
    isRunning = false;
    clearInterval(timerInterval);
    redFlagBtn.textContent = "Clear Red Flag";
    redFlagCount++; // Increment count when Red Flag is thrown
    console.log(`Red Flag thrown. Total count: ${redFlagCount}`);
    updateBackgroundColor(); // Update background immediately when Red Flag is set
  } else {
    const updateRedFlagOff = () => {
      try {
        console.log("Playing red-off sound");
        playAudioWithRetry("redOffSound").catch((e) => {
          console.error("Failed to play red-off sound after retries:", e);
          showVisualNotification("Red Flag Cleared", 2000);
        });
      } catch (e) {
        console.error("Red off sound failed:", e);
        showVisualNotification("Red Flag Cleared", 2000);
      }
      isRunning = true;
      startTimer();
      redFlagBtn.textContent = "Red Flag";
      updateBackgroundColor(); // Update background when Red Flag is cleared
      console.log("Red Flag cleared after delay (if applied)");
      // Re-enable buttons after delay completes (only on nosteward.html)
      if (isNoStewardPage) {
        yellowFlagBtn.disabled = false;
        redFlagBtn.disabled = false;
        console.log("Buttons re-enabled after delay for Red Flag clear");
      }
    };

    if (isNoStewardPage) {
      try {
        console.log("Playing get-ready sound before delay for Red Flag clear");
        playAudioWithRetry("getReadySound").catch((e) => {
          console.error(
            "Failed to play get-ready sound after retries for Red Flag:",
            e,
          );
          showVisualNotification("Get Ready for Green Flag", 2000);
        });
      } catch (e) {
        console.error("Get-ready sound failed for Red Flag clear:", e);
        showVisualNotification("Get Ready for Green Flag", 2000);
      }
      // Disable both buttons during the delay to prevent re-clicking
      yellowFlagBtn.disabled = true;
      redFlagBtn.disabled = true;
      console.log("Buttons disabled during delay for Red Flag clear");
      const delay = getRandomDelay();
      console.log(
        `Applying random delay of ${delay}ms for Red Flag clear on nosteward.html`,
      );
      setTimeout(updateRedFlagOff, delay);
    } else {
      console.log(
        "No delay applied for Red Flag clear (not on nosteward.html)",
      );
      updateRedFlagOff();
    }
  }

  if (isRedFlag) {
    updateBackgroundColor(); // Already updated if flag is set, but ensure consistency
  }
});

// Restart logic
restartBtn.addEventListener("click", () => {
  console.log("Restart button clicked");
  clearInterval(timerInterval);
  isRunning = false;

  // Reset based on mode
  if (isPracticeMode) {
    secondsLeft = 0;
    timerDisplay.textContent = "PRACTICE";
  } else {
    secondsLeft = totalSeconds;
    updateTimerDisplay();
  }

  isYellowFlag = false;
  isRedFlag = false;
  yellowFlagBtn.textContent = "Yellow Flag";
  redFlagBtn.textContent = "Red Flag";
  raceTimeSelect.disabled = false; // Enable time selector on restart
  practiceModeCheckbox.disabled = false; // Re-enable practice mode checkbox
  startRaceBtn.disabled = false; // Enable start button
  yellowFlagBtn.disabled = true; // Disable flag buttons until race starts
  redFlagBtn.disabled = true;
  restartBtn.disabled = true; // Disable restart until race starts again
  lastMinutePlayed = -1;
  hasPlayed30Seconds = false; // Reset 30-second sound flag on restart
  resetFlagCounts(); // Reset flag counts on restart

  try {
    console.log("Playing restart sound");
    playAudioWithRetry("restartSound").catch((e) => {
      console.error("Failed to play restart sound after retries:", e);
      showVisualNotification("Race Restarted", 2000);
    });
  } catch (e) {
    console.error("Restart sound failed:", e);
    showVisualNotification("Race Restarted", 2000);
  }

  updateBackgroundColor(); // Update background when race is restarted (remove checkerboard)

  // Disable NoSleep when race is restarted
  try {
    noSleep.disable();
    console.log("Screen wake lock disabled on restart");
  } catch (e) {
    console.error("Failed to disable screen wake lock on restart:", e);
  }
});
