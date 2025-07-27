// Director mode WebSocket integration with authentication
(function () {
  console.log("Initializing director mode");
  const directorName = "Race Director";

  // Show password modal first
  const passwordModal = document.getElementById("passwordModal");
  const passwordForm = document.getElementById("passwordForm");
  const passwordInput = document.getElementById("passwordInput");
  const authError = document.getElementById("authError");

  if (!passwordModal || !passwordForm || !passwordInput || !authError) {
    console.error("Authentication modal elements not found in DOM");
  } else {
    console.log("Authentication modal elements found");
  }

  // Disable all controls initially
  function disableAllControls() {
    const startRaceBtn = document.getElementById("startRace");
    const yellowFlagBtn = document.getElementById("yellowFlag");
    const redFlagBtn = document.getElementById("redFlag");
    const restartBtn = document.getElementById("restart");
    const raceTimeSelect = document.getElementById("raceTime");
    const practiceModeCheckbox = document.getElementById("practiceMode");
    const voiceSelect = document.getElementById("voiceSelect");

    if (startRaceBtn) startRaceBtn.disabled = true;
    if (yellowFlagBtn) yellowFlagBtn.disabled = true;
    if (redFlagBtn) redFlagBtn.disabled = true;
    if (restartBtn) restartBtn.disabled = true;
    if (raceTimeSelect) raceTimeSelect.disabled = true;
    if (practiceModeCheckbox) practiceModeCheckbox.disabled = true;
    if (voiceSelect) voiceSelect.disabled = true;
    console.log("All controls disabled until authentication");
  }

  // Enable controls after authentication
  function enableControls() {
    const startRaceBtn = document.getElementById("startRace");
    const raceTimeSelect = document.getElementById("raceTime");
    const practiceModeCheckbox = document.getElementById("practiceMode");
    const voiceSelect = document.getElementById("voiceSelect");

    if (startRaceBtn) startRaceBtn.disabled = false;
    if (raceTimeSelect) raceTimeSelect.disabled = false;
    if (practiceModeCheckbox) practiceModeCheckbox.disabled = false;
    if (voiceSelect) voiceSelect.disabled = false;
    // Flag buttons remain disabled until race starts
    console.log("Controls enabled after successful authentication");
  }

  disableAllControls();

  // Authentication handlers
  raceWebSocket.onAuthRequired = function () {
    console.log("Authentication required, showing password modal");
    if (passwordModal) {
      passwordModal.style.display = "flex";
      if (passwordInput) passwordInput.focus();
    } else {
      console.error("Password modal not found, cannot display");
    }
  };

  raceWebSocket.onAuthSuccess = function () {
    console.log("Authentication successful");
    if (passwordModal) passwordModal.style.display = "none";
    if (passwordForm) passwordForm.reset();
    if (authError) authError.style.display = "none";
    enableControls();
    showVisualNotification("Authentication Successful", 2000);
  };

  raceWebSocket.onAuthFailed = function (message) {
    console.log("Authentication failed:", message);
    if (authError) {
      authError.textContent = message || "Invalid password";
      authError.style.display = "block";
    }
    if (passwordInput) {
      passwordInput.classList.add("shake");
      passwordInput.focus();
      passwordInput.select();

      // Remove shake animation after completion
      setTimeout(() => {
        passwordInput.classList.remove("shake");
      }, 500);
    }
  };

  // Handle password form submission
  if (passwordForm) {
    passwordForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const password = passwordInput ? passwordInput.value : '';

      if (password) {
        if (authError) authError.style.display = "none";
        console.log("Submitting password for authentication");
        raceWebSocket.authenticate(password);
      } else {
        console.log("No password entered");
      }
    });
  }

  // Initialize WebSocket connection
  console.log("Initiating WebSocket connection for director");
  raceWebSocket.connect(true, directorName);

  // Connection status handlers
  function updateConnectionStatus(connected) {
    const statusElement = document.getElementById("connectionStatus");
    const textElement = document.getElementById("connectionText");

    if (statusElement && textElement) {
      if (connected && raceWebSocket.isAuthenticated) {
        statusElement.style.color = "#2ecc71";
        textElement.textContent = "Connected & Authenticated";
        console.log("Connection status: Connected & Authenticated");
      } else if (connected) {
        statusElement.style.color = "#f39c12";
        textElement.textContent = "Connected - Auth Required";
        console.log("Connection status: Connected - Auth Required");
      } else {
        statusElement.style.color = "#e74c3c";
        textElement.textContent = "Disconnected";
        console.log("Connection status: Disconnected");
      }
    } else {
      console.error("Connection status elements not found in DOM");
    }
  }

  // WebSocket event handlers
  raceWebSocket.onConnected = function () {
    console.log("Director WebSocket connected successfully");
    updateConnectionStatus(true);
  };

  raceWebSocket.onDisconnected = function () {
    console.log("Director WebSocket disconnected");
    updateConnectionStatus(false);
    showVisualNotification("Connection Lost - Attempting to Reconnect", 3000);
    disableAllControls();
  };

  raceWebSocket.onReconnectFailed = function () {
    console.log("Failed to reconnect Director WebSocket");
    showVisualNotification(
      "Failed to reconnect. Please refresh the page.",
      5000,
    );
    // Show password modal again for re-authentication
    if (passwordModal) {
      passwordModal.style.display = "flex";
    }
  };

  raceWebSocket.onInitialState = function (state, clientCount) {
    const clientCountElement = document.getElementById("clientCount");
    if (clientCountElement) {
      clientCountElement.textContent =
        `${clientCount} device${clientCount !== 1 ? "s" : ""}`;
    }
    updateConnectionStatus(true);
    console.log("Received initial state for director:", state, "Client count:", clientCount);

    // Sync with current state if rejoining
    if (state.isRunning) {
      console.log("Race is already running, syncing state on director page");
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
      yellowFlagBtn.textContent = isYellowFlag
        ? "Clear Yellow Flag"
        : "Yellow Flag";
      redFlagBtn.textContent = isRedFlag ? "Clear Red Flag" : "Red Flag";

      // Start timer if race is running
      if (isRunning) {
        startTimer();
        console.log("Timer started on director page for running race");
      }
    } else {
      console.log("No active race on initial load for director");
    }
  };

  raceWebSocket.onClientUpdate = function (clientCount, clients) {
    const clientCountElement = document.getElementById("clientCount");
    if (clientCountElement) {
      clientCountElement.textContent =
        `${clientCount} device${clientCount !== 1 ? "s" : ""}`;
    }
    console.log("Client update received for director:", clientCount, "clients", clients);

    // Update connected clients list
    const clientsList = document.getElementById("clientsList");
    const connectedClientsDiv = document.getElementById("connectedClients");

    if (clientsList && clients.length > 0) {
      connectedClientsDiv.style.display = "block";
      clientsList.innerHTML = clients.map((client) => `
                <div class="client-item">
                    <span class="${
        client.isDirector ? "director-badge" : "spectator-badge"
      }">
                        ${client.isDirector ? "👑" : "👁️"}
                    </span>
                    ${client.name} ${
        client.id === raceWebSocket.clientId ? "(You)" : ""
      }
                </div>
            `).join("");
      console.log("Updated client list UI with", clients.length, "clients");
    } else if (connectedClientsDiv) {
      connectedClientsDiv.style.display = "none";
      console.log("No clients to display, hiding client list");
    } else {
      console.warn("Client list elements not found in DOM");
    }
  };

  // Override start race to broadcast
  const startRaceBtn = document.getElementById("startRace");
  if (startRaceBtn) {
    startRaceBtn.addEventListener("click", function () {
      console.log("Start Race clicked, waiting for race to start for broadcast");
      // Wait for the race to actually start (after countdown)
      let attemptCount = 0;
      const maxAttempts = 100; // Prevent infinite loop, roughly 10 seconds
      const checkRaceStart = setInterval(() => {
        attemptCount++;
        // Check if timer display indicates race is running (as a proxy for isRunning)
        const timerText = document.getElementById("timer").textContent;
        if (timerText !== "00:00" && timerText !== "PRACTICE" && raceWebSocket.isReady()) {
          clearInterval(checkRaceStart);
          raceWebSocket.send({
            type: "start-race",
            state: {
              isRunning: true,
              isPracticeMode: document.getElementById("practiceMode").checked,
              totalSeconds: parseInt(document.getElementById("raceTime").value) * 60,
              secondsLeft: parseInt(timerText.split(":")[0]) * 60 + parseInt(timerText.split(":")[1]),
              voice: document.getElementById("voiceSelect").value,
              raceTimeMinutes: parseInt(document.getElementById("raceTime").value),
              yellowFlagCount: 0,
              redFlagCount: 0,
              isYellowFlag: false,
              isRedFlag: false,
            },
          });
          console.log("Race started, broadcasted state to clients");
        } else if (attemptCount >= maxAttempts) {
          clearInterval(checkRaceStart);
          console.error("Timeout: Race start not detected after maximum attempts");
        }
      }, 100);
    });
  }

  // Timer sync - send updates every second when running
  let lastSyncedSecond = -1;
  const originalUpdateTimer = updateTimerDisplay;
  globalThis.updateTimerDisplay = function () {
    originalUpdateTimer();

    // Sync timer every second
    if (
      isRunning && secondsLeft !== lastSyncedSecond && raceWebSocket.isReady()
    ) {
      lastSyncedSecond = secondsLeft;
      raceWebSocket.send({
        type: "timer-update",
        secondsLeft: secondsLeft,
      });
      console.log("Timer updated, sync sent:", secondsLeft);
    }
  };

  // Flag controls broadcasting
  const yellowFlagBtn = document.getElementById("yellowFlag");
  if (yellowFlagBtn) {
    yellowFlagBtn.addEventListener("click", function () {
      // Wait for flag state to update
      setTimeout(() => {
        if (raceWebSocket.isReady()) {
          raceWebSocket.send({
            type: "flag-change",
            flag: "yellow",
            active: isYellowFlag,
          });
          console.log("Yellow flag state broadcasted:", isYellowFlag);
        }
      }, 100);
    });
  }

  const redFlagBtn = document.getElementById("redFlag");
  if (redFlagBtn) {
    redFlagBtn.addEventListener("click", function () {
      // Wait for flag state to update
      setTimeout(() => {
        if (raceWebSocket.isReady()) {
          raceWebSocket.send({
            type: "flag-change",
            flag: "red",
            active: isRedFlag,
            isRunning: isRunning,
          });
          console.log("Red flag state broadcasted:", isRedFlag, "Running:", isRunning);
        }
      }, 100);
    });
  }

  // Voice change broadcasting
  const voiceSelect = document.getElementById("voiceSelect");
  if (voiceSelect) {
    voiceSelect.addEventListener("change", function () {
      if (raceWebSocket.isReady()) {
        raceWebSocket.send({
          type: "voice-change",
          voice: voiceSelect.value,
        });
        console.log("Voice changed broadcasted:", voiceSelect.value);
      }
    });
  }

  // Race end broadcasting
  const originalCheckTimeMarks = checkTimeMarks;
  globalThis.checkTimeMarks = function () {
    originalCheckTimeMarks();

    // Check if race just ended
    if (secondsLeft === 0 && !isPracticeMode && raceWebSocket.isReady()) {
      raceWebSocket.send({
        type: "race-end",
        state: {
          yellowFlagCount: yellowFlagCount,
          redFlagCount: redFlagCount,
        },
      });
      console.log("Race ended, broadcasted flag counts");
    }
  };

  // Restart broadcasting
  const restartBtn = document.getElementById("restart");
  if (restartBtn) {
    restartBtn.addEventListener("click", function () {
      setTimeout(() => {
        if (raceWebSocket.isReady()) {
          raceWebSocket.send({
            type: "race-restart",
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
              raceTimeMinutes: parseInt(raceTimeSelect.value),
            },
          });
          console.log("Race restart broadcasted");
        }
      }, 100);
    });
  }

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // Escape key handling
    if (e.key === "Escape") {
      if (passwordModal && passwordModal.style.display === "flex") {
        globalThis.location.href = "index.html";
      }
    }

    // Enter key in password field
    if (e.key === "Enter" && passwordInput && document.activeElement === passwordInput) {
      e.preventDefault();
      if (passwordForm) passwordForm.dispatchEvent(new Event("submit"));
    }
  });

  // Prevent closing the page accidentally during a race
  globalThis.addEventListener("beforeunload", (e) => {
    if (isRunning && raceWebSocket.isAuthenticated) {
      e.preventDefault();
      e.returnValue =
        "A race is currently in progress. Are you sure you want to leave?";
    }
  });

  // Clean up on page unload
  globalThis.addEventListener("unload", () => {
    raceWebSocket.disconnect();
  });
  // Periodic timer sync for spectators
function startTimerSyncForSpectators() {
  if (raceWebSocket.isReady()) {
    const syncInterval = setInterval(() => {
      if (isRunning) {
        raceWebSocket.send({
          type: "timer-sync",
          secondsLeft: secondsLeft
        });
        console.log("Sent timer sync to spectators:", secondsLeft, "seconds left");
      } else {
        clearInterval(syncInterval);
        console.log("Stopped timer sync as race is no longer running");
      }
    }, 5000); // Sync every 5 seconds
    console.log("Started periodic timer sync for spectators");
  } else {
    console.warn("WebSocket not ready, timer sync not started");
  }
}

// Ensure start race button triggers timer sync
if (document.getElementById("startRace")) {
  document.getElementById("startRace").addEventListener('click', () => {
    setTimeout(startTimerSyncForSpectators, 3000); // Delay slightly to ensure race starts
    console.log("Timer sync scheduled to start after race begins");
  });
}
})();
