// WebSocket client for real-time race synchronization
class RaceWebSocket {
  constructor() {
    this.ws = null;
    this.isDirector = false;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.clientId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.pingInterval = null;
    this.savedPassword = null; // Store password for reconnection
    this.savedName = null; // Store name for reconnection
  }

  connect(isDirector = false, name = "Anonymous", password = null) {
    this.isDirector = isDirector;
    this.savedPassword = password;
    this.savedName = name;

    // Determine WebSocket URL
    const protocol = globalThis.location.protocol === "https:" ? "wss:" : "ws:";
    const host = globalThis.location.host;
    const wsUrl = `${protocol}//${host}?director=${isDirector}&name=${
      encodeURIComponent(name)
    }`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error("Failed to connect:", error);
      this.scheduleReconnect();
    }
  }

  setupEventHandlers() {
    this.ws.onopen = () => {
      console.log("WebSocket connected");
      this.isConnected = true;
      this.reconnectAttempts = 0;

      if (typeof this.onConnected === "function") {
        this.onConnected();
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    };

    this.ws.onclose = () => {
      console.log("WebSocket disconnected");
      this.isConnected = false;
      this.isAuthenticated = false;
      this.stopPing();

      if (typeof this.onDisconnected === "function") {
        this.onDisconnected();
      }

      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      if (typeof this.onError === "function") {
        this.onError(error);
      }
    };
  }

  handleMessage(data) {
    console.log("Received:", data.type);

    switch (data.type) {
      case "auth-required":
        this.clientId = data.clientId;
        if (typeof this.onAuthRequired === "function") {
          this.onAuthRequired();
        }
        // Auto-authenticate if we have a saved password (for reconnection)
        if (this.savedPassword) {
          this.authenticate(this.savedPassword);
        }
        break;

      case "auth-success":
        this.isAuthenticated = true;
        this.startPing();
        if (typeof this.onAuthSuccess === "function") {
          this.onAuthSuccess();
        }
        break;

      case "auth-failed":
        this.isAuthenticated = false;
        // Only clear saved password if it's not a rate limit error
        if (
          !data.message || !data.message.includes("Too many failed attempts")
        ) {
          this.savedPassword = null;
        }
        if (typeof this.onAuthFailed === "function") {
          this.onAuthFailed(data.message);
        }
        break;

      case "connected":
        this.clientId = data.clientId;
        this.isAuthenticated = true;
        this.startPing();
        if (typeof this.onInitialState === "function") {
          this.onInitialState(data.state, data.clientCount);
        }
        break;

      case "client-update":
        if (typeof this.onClientUpdate === "function") {
          this.onClientUpdate(data.clientCount, data.clients);
        }
        break;

      case "race-started":
        if (!this.isDirector && typeof this.onRaceStarted === "function") {
          this.onRaceStarted(data.state);
        }
        break;

      case "timer-sync":
        if (!this.isDirector && typeof this.onTimerSync === "function") {
          this.onTimerSync(data.secondsLeft);
        }
        break;

      case "flag-update":
        if (!this.isDirector && typeof this.onFlagUpdate === "function") {
          this.onFlagUpdate(data.flag, data.active, data.state);
        }
        break;

      case "race-ended":
        if (!this.isDirector && typeof this.onRaceEnded === "function") {
          this.onRaceEnded(data.state);
        }
        break;

      case "race-restarted":
        if (!this.isDirector && typeof this.onRaceRestarted === "function") {
          this.onRaceRestarted(data.state);
        }
        break;

      case "voice-changed":
        if (!this.isDirector && typeof this.onVoiceChanged === "function") {
          this.onVoiceChanged(data.voice);
        }
        break;

      case "director-disconnected":
        if (typeof this.onDirectorDisconnected === "function") {
          this.onDirectorDisconnected();
        }
        break;

      case "pong":
        // Server responded to ping
        console.log("Received pong");
        break;
    }
  }

  authenticate(password) {
    this.savedPassword = password; // Save for reconnection
    this.send({
      type: "authenticate",
      password: password,
    });
  }

  send(message) {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not connected, unable to send:", message);
    }
  }

  startPing() {
    // Clear any existing ping interval
    this.stopPing();

    // Ping every 30 seconds to keep connection alive
    this.pingInterval = setInterval(() => {
      this.send({ type: "ping" });
    }, 30000);
  }

  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Reconnecting in ${
          this.reconnectDelay / 1000
        } seconds... (Attempt ${this.reconnectAttempts})`,
      );

      setTimeout(() => {
        // Reconnect with saved credentials
        this.connect(
          this.isDirector,
          this.savedName || "Anonymous",
          this.savedPassword,
        );
      }, this.reconnectDelay);
    } else {
      console.error("Max reconnection attempts reached");
      if (typeof this.onReconnectFailed === "function") {
        this.onReconnectFailed();
      }
    }
  }

  disconnect() {
    this.stopPing();
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
    if (this.ws) {
      this.ws.close();
    }
  }

  // Utility method to check if ready to send
  isReady() {
    return this.isConnected && this.isAuthenticated;
  }
}

// Create global instance and expose it to globalThis for inline script access
console.log("Creating global raceWebSocket instance");
const raceWebSocket = new RaceWebSocket();
globalThis.raceWebSocket = raceWebSocket;
console.log("raceWebSocket exposed to globalThis");

// Event handler placeholders (to be overridden by implementing pages)
// These provide documentation of available events:
/*
raceWebSocket.onConnected = function() {
  // Called when WebSocket connection is established
};

raceWebSocket.onDisconnected = function() {
  // Called when WebSocket connection is lost
};

raceWebSocket.onError = function(error) {
  // Called when WebSocket encounters an error
};

raceWebSocket.onAuthRequired = function() {
  // Called when director authentication is required
};

raceWebSocket.onAuthSuccess = function() {
  // Called when authentication is successful
};

raceWebSocket.onAuthFailed = function(message) {
  // Called when authentication fails
  // message: Error message from server
};

raceWebSocket.onInitialState = function(state, clientCount) {
  // Called when initial race state is received
  // state: Current race state object
  // clientCount: Number of connected clients
};

raceWebSocket.onClientUpdate = function(clientCount, clients) {
  // Called when client list changes
  // clientCount: Number of connected clients
  // clients: Array of client objects
};

raceWebSocket.onRaceStarted = function(state) {
  // Called when race starts (spectators only)
  // state: Race state object
};

raceWebSocket.onTimerSync = function(secondsLeft) {
  // Called for timer synchronization (spectators only)
  // secondsLeft: Current timer value
};

raceWebSocket.onFlagUpdate = function(flag, active, state) {
  // Called when flag status changes (spectators only)
  // flag: 'yellow' or 'red'
  // active: true/false
  // state: Current race state
};

raceWebSocket.onRaceEnded = function(state) {
  // Called when race ends (spectators only)
  // state: Final race state with flag counts
};

raceWebSocket.onRaceRestarted = function(state) {
  // Called when race is restarted (spectators only)
  // state: Reset race state
};

raceWebSocket.onVoiceChanged = function(voice) {
  // Called when voice announcer changes (spectators only)
  // voice: 'america', 'europe', or 'merica'
};

raceWebSocket.onDirectorDisconnected = function() {
  // Called when the race director disconnects
};

raceWebSocket.onReconnectFailed = function() {
  // Called when max reconnection attempts reached
};
*/
