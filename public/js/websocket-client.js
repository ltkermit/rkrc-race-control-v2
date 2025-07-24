// WebSocket client for real-time race synchronization
class RaceWebSocket {
  constructor() {
    this.ws = null;
    this.isDirector = false;
    this.isConnected = false;
    this.clientId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.pingInterval = null;
  }

  async connect(isDirector = false, name = 'Anonymous') {
    this.isDirector = isDirector;
    
    // Determine WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}?director=${isDirector}&name=${encodeURIComponent(name)}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to connect:', error);
      this.scheduleReconnect();
    }
  }

  setupEventHandlers() {
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.startPing();
      
      if (typeof this.onConnected === 'function') {
        this.onConnected();
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.isConnected = false;
      this.stopPing();
      
      if (typeof this.onDisconnected === 'function') {
        this.onDisconnected();
      }
      
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (typeof this.onError === 'function') {
        this.onError(error);
      }
    };
  }

  handleMessage(data) {
    console.log('Received:', data.type);
    
    switch (data.type) {
      case 'connected':
        this.clientId = data.clientId;
        if (typeof this.onInitialState === 'function') {
          this.onInitialState(data.state, data.clientCount);
        }
        break;
        
      case 'client-update':
        if (typeof this.onClientUpdate === 'function') {
          this.onClientUpdate(data.clientCount, data.clients);
        }
        break;
        
      case 'race-started':
        if (!this.isDirector && typeof this.onRaceStarted === 'function') {
          this.onRaceStarted(data.state);
        }
        break;
        
      case 'timer-sync':
        if (!this.isDirector && typeof this.onTimerSync === 'function') {
          this.onTimerSync(data.secondsLeft);
        }
        break;
        
      case 'flag-update':
        if (!this.isDirector && typeof this.onFlagUpdate === 'function') {
          this.onFlagUpdate(data.flag, data.active, data.state);
        }
        break;
        
      case 'race-ended':
        if (!this.isDirector && typeof this.onRaceEnded === 'function') {
          this.onRaceEnded(data.state);
        }
        break;
        
      case 'race-restarted':
        if (!this.isDirector && typeof this.onRaceRestarted === 'function') {
          this.onRaceRestarted(data.state);
        }
        break;
        
      case 'voice-changed':
        if (!this.isDirector && typeof this.onVoiceChanged === 'function') {
          this.onVoiceChanged(data.voice);
        }
        break;
        
      case 'director-disconnected':
        if (typeof this.onDirectorDisconnected === 'function') {
          this.onDirectorDisconnected();
        }
        break;
    }
  }

  send(message) {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, unable to send:', message);
    }
  }

  startPing() {
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000); // Ping every 30 seconds
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
      console.log(`Reconnecting in ${this.reconnectDelay / 1000} seconds... (Attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(this.isDirector);
      }, this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached');
      if (typeof this.onReconnectFailed === 'function') {
        this.onReconnectFailed();
      }
    }
  }

  disconnect() {
    this.stopPing();
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Create global instance
const raceWebSocket = new RaceWebSocket();