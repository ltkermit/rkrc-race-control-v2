// server/server.ts
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { timingSafeEqual } from "https://deno.land/std@0.208.0/crypto/timing_safe_equal.ts";

interface Client {
  id: string;
  socket: WebSocket;
  isDirector: boolean;
  isAuthenticated: boolean;
  name?: string;
}

interface RaceState {
  isRunning: boolean;
  isPracticeMode: boolean;
  secondsLeft: number;
  totalSeconds: number;
  isYellowFlag: boolean;
  isRedFlag: boolean;
  yellowFlagCount: number;
  redFlagCount: number;
  voice: string;
  raceTimeMinutes: number;
  directorId?: string;
}

// Message types for WebSocket communication
interface BaseMessage {
  type: string;
}

interface StartRaceMessage extends BaseMessage {
  type: 'start-race';
  state: Partial<RaceState>;
}

interface TimerUpdateMessage extends BaseMessage {
  type: 'timer-update';
  secondsLeft: number;
}

interface FlagChangeMessage extends BaseMessage {
  type: 'flag-change';
  flag: 'yellow' | 'red';
  active: boolean;
  isRunning?: boolean;
}

interface RaceEndMessage extends BaseMessage {
  type: 'race-end';
  state: Partial<RaceState>;
}

interface RaceRestartMessage extends BaseMessage {
  type: 'race-restart';
  state: Partial<RaceState>;
}

interface VoiceChangeMessage extends BaseMessage {
  type: 'voice-change';
  voice: string;
}

interface PingMessage extends BaseMessage {
  type: 'ping';
}

interface AuthenticateMessage extends BaseMessage {
  type: 'authenticate';
  password: string;
}

// Union type for all possible messages
 type WebSocketMessage = StartRaceMessage | TimerUpdateMessage | FlagChangeMessage | RaceEndMessage | RaceRestartMessage | VoiceChangeMessage | PingMessage | AuthenticateMessage;

// Generic broadcast message type for outgoing messages
interface BroadcastMessage {
  type: string;
  [key: string]: unknown;
}

class RaceControlServer {
  private clients: Map<string, Client> = new Map();
  private authAttempts: Map<string, number> = new Map();
  private raceState: RaceState = {
    isRunning: false,
    isPracticeMode: false,
    secondsLeft: 0,
    totalSeconds: 0,
    isYellowFlag: false,
    isRedFlag: false,
    yellowFlagCount: 0,
    redFlagCount: 0,
    voice: "america",
    raceTimeMinutes: 5,
  };

  // Director password - in production, use environment variable
  private directorPassword: string;

  constructor() {
    // Get password from environment; no fallback to prevent security risks
    const password = Deno.env.get("DIRECTOR_PASSWORD");
    if (!password) {
      console.error(
        "ERROR: DIRECTOR_PASSWORD environment variable must be set. Server will not allow director authentication without a password.",
      );
      throw new Error(
        "DIRECTOR_PASSWORD environment variable is not set. Please configure it before starting the server.",
      );
    }
    this.directorPassword = password;
    console.log("Race Control Server initialized");
    console.log("Director password is set: Yes");
  }

  generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Secure password comparison
  private verifyPassword(attempt: string): boolean {
    const encoder = new TextEncoder();
    const attemptBytes = encoder.encode(attempt);
    const correctBytes = encoder.encode(this.directorPassword);

    // Use timing-safe comparison to prevent timing attacks
    if (attemptBytes.length !== correctBytes.length) {
      return false;
    }

    return timingSafeEqual(attemptBytes, correctBytes);
  }

  // Rate limiting for auth attempts
  private canAttemptAuth(clientId: string): boolean {
    const attempts = this.authAttempts.get(clientId) || 0;
    if (attempts >= 3) {
      return false; // Max 3 attempts
    }
    return true;
  }

  private recordAuthAttempt(clientId: string, success: boolean) {
    if (success) {
      this.authAttempts.delete(clientId);
    } else {
      const attempts = this.authAttempts.get(clientId) || 0;
      this.authAttempts.set(clientId, attempts + 1);
    }
  }

  handleWebSocket(request: Request): Response {
    const { socket, response } = Deno.upgradeWebSocket(request);
    const clientId = this.generateClientId();
    const url = new URL(request.url);
    const isDirector = url.searchParams.get("director") === "true";

    const client: Client = {
      id: clientId,
      socket,
      isDirector,
      isAuthenticated: !isDirector, // Spectators are always authenticated
      name: url.searchParams.get("name") || "Anonymous",
    };

    socket.onopen = () => {
      console.log(`Client connected: ${clientId} (Director: ${isDirector})`);
      this.clients.set(clientId, client);

      if (isDirector) {
        // Send authentication request
        this.sendToClient(client, {
          type: "auth-required",
          clientId,
        });
      } else {
        // Spectators get immediate access
        this.handleAuthenticatedConnection(client);
      }
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        // Handle authentication first
        if (
          message.type === "authenticate" && client.isDirector &&
          !client.isAuthenticated
        ) {
          this.handleAuthentication(client, message.password);
          return;
        }

        // All other messages require authentication
        if (client.isDirector && !client.isAuthenticated) {
          this.sendToClient(client, {
            type: "auth-failed",
            message: "Authentication required",
          });
          return;
        }

        this.handleMessage(client, message);
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    };

    socket.onclose = () => {
      console.log(`Client disconnected: ${clientId}`);
      this.clients.delete(clientId);

      // If director disconnected, clear director ID
      if (this.raceState.directorId === clientId) {
        this.raceState.directorId = undefined;
        this.broadcast({
          type: "director-disconnected",
          message: "Race director has disconnected",
        });
      }

      // Notify remaining clients
      this.broadcast({
        type: "client-update",
        clientCount: Array.from(this.clients.values()).filter((c) =>
          c.isAuthenticated
        ).length,
        clients: Array.from(this.clients.values())
          .filter((c) => c.isAuthenticated)
          .map((c) => ({
            id: c.id,
            name: c.name,
            isDirector: c.isDirector,
          })),
      });
    };

    socket.onerror = (error) => {
      console.error(`WebSocket error for ${clientId}:`, error);
    };

    return response;
  }

  private handleAuthentication(client: Client, password: string) {
    // Check rate limiting
    if (!this.canAttemptAuth(client.id)) {
      this.sendToClient(client, {
        type: "auth-failed",
        message: "Too many failed attempts. Please refresh and try again.",
      });
      return;
    }

    if (this.verifyPassword(password)) {
      client.isAuthenticated = true;
      this.recordAuthAttempt(client.id, true);
      console.log(`Director ${client.id} authenticated successfully`);

      this.sendToClient(client, {
        type: "auth-success",
      });

      this.handleAuthenticatedConnection(client);
    } else {
      this.recordAuthAttempt(client.id, false);
      console.log(`Director ${client.id} failed authentication`);

      this.sendToClient(client, {
        type: "auth-failed",
        message: "Invalid password",
      });
    }
  }

  private handleAuthenticatedConnection(client: Client) {
    // Send initial state to authenticated client
    this.sendToClient(client, {
      type: "connected",
      clientId: client.id,
      state: this.raceState,
      clientCount: Array.from(this.clients.values()).filter((c) =>
        c.isAuthenticated
      ).length,
    });

    // If director, set as current director
    if (client.isDirector && !this.raceState.directorId) {
      this.raceState.directorId = client.id;
    }

    // Notify all clients of new connection
    this.broadcast({
      type: "client-update",
      clientCount: Array.from(this.clients.values()).filter((c) =>
        c.isAuthenticated
      ).length,
      clients: Array.from(this.clients.values())
        .filter((c) => c.isAuthenticated)
        .map((c) => ({
          id: c.id,
          name: c.name,
          isDirector: c.isDirector,
        })),
    });
  }

  handleMessage(client: Client, message: WebSocketMessage) {
    console.log(`Message from ${client.id}:`, message.type);

    // Only authenticated directors can control the race
    if (!client.isDirector && message.type !== "ping") {
      return;
    }

    switch (message.type) {
      case "start-race":
        this.raceState = { ...this.raceState, ...message.state };
        this.broadcast({
          type: "race-started",
          state: this.raceState,
        }, client.id);
        console.log(`Race started by director ${client.id}`);
        break;

      case "timer-sync":
      case "timer-update":
        this.raceState.secondsLeft = message.secondsLeft;
        this.broadcast({
          type: "timer-sync",
          secondsLeft: message.secondsLeft,
        }, client.id);
        console.log(`Timer sync broadcasted by director ${client.id}: ${message.secondsLeft} seconds left`);
        break;

      case "flag-update":
      case "flag-change":
        if (message.flag === "yellow") {
          this.raceState.isYellowFlag = message.active;
          if (message.active) this.raceState.yellowFlagCount++;
        } else if (message.flag === "red") {
          this.raceState.isRedFlag = message.active;
          if (message.active) this.raceState.redFlagCount++;
          // Check for isRunning in message.state if available, otherwise use existing
          this.raceState.isRunning = (message.state && message.state.isRunning !== undefined) ? message.state.isRunning : message.isRunning ?? this.raceState.isRunning;
        }
        this.broadcast({
          type: "flag-update",
          flag: message.flag,
          active: message.active,
          state: this.raceState,
        }, client.id);
        console.log(`Flag update broadcasted by director ${client.id}: ${message.flag} is ${message.active}`);
        break;

      case "race-end":
        this.raceState.isRunning = false;
        this.broadcast({
          type: "race-ended",
          state: this.raceState,
        }, client.id);
        console.log(`Race ended by director ${client.id}`);
        break;

      case "race-restart":
        this.raceState = { ...this.raceState, ...message.state };
        this.broadcast({
          type: "race-restarted",
          state: this.raceState,
        }, client.id);
        console.log(`Race restarted by director ${client.id}`);
        break;

      case "voice-change":
        this.raceState.voice = message.voice;
        this.broadcast({
          type: "voice-changed",
          voice: message.voice,
        }, client.id);
        console.log(`Voice changed to ${message.voice} by director ${client.id}`);
        break;

      case "ping":
        this.sendToClient(client, { type: "pong" });
        break;

      default:
        console.log(`Unhandled message type: ${message.type}`);
        // Broadcast unhandled messages to spectators if from director
        if (client.isDirector) {
          this.broadcast(message, client.id);
          console.log(`Broadcasted unhandled message type ${message.type} from director ${client.id}`);
        }
    }
  }

  sendToClient(client: Client, message: BroadcastMessage) {
    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(message));
    }
  }

  broadcast(message: BroadcastMessage, excludeId?: string) {
    const messageStr = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (
        client.id !== excludeId &&
        client.socket.readyState === WebSocket.OPEN &&
        client.isAuthenticated
      ) {
        client.socket.send(messageStr);
      }
    });
  }
}

// Static file serving
async function serveStaticFile(pathname: string): Promise<Response> {
  try {
    // Remove leading slash and handle root
    if (pathname === "/" || pathname === "") {
      pathname = "/index.html";
    }

    const filePath = `./public${pathname}`;
    const file = await Deno.readFile(filePath);

    // Determine content type
    const ext = pathname.split(".").pop() || "";
    const contentTypes: Record<string, string> = {
      "html": "text/html",
      "js": "application/javascript",
      "css": "text/css",
      "png": "image/png",
      "jpg": "image/jpeg",
      "jpeg": "image/jpeg",
      "ico": "image/x-icon",
      "mp3": "audio/mpeg",
      "wav": "audio/wav",
    };

    const contentType = contentTypes[ext] || "application/octet-stream";

    return new Response(file, {
      headers: { "Content-Type": contentType },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}

// Main server
const server = new RaceControlServer();

serve(async (request: Request) => {
  const url = new URL(request.url);

  // Handle WebSocket upgrade
  if (request.headers.get("upgrade") === "websocket") {
    return server.handleWebSocket(request);
  }

  // Serve static files
  return await serveStaticFile(url.pathname);
}, { port: 8000 });

console.log("Server running on http://localhost:8000");
