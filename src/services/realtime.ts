import { API_CONFIG } from '../config';

type EventHandler = (event: string, data: any) => void;

function toWsUrl(httpBase: string): string {
  const base = httpBase.replace(/\/$/, '');
  if (base.startsWith('https://')) return base.replace('https://', 'wss://');
  if (base.startsWith('http://')) return base.replace('http://', 'ws://');
  return `ws://${base}`;
}

/**
 * Lightweight authenticated WebSocket client for ride/location events.
 * Falls back is handled by callers (polling) when disconnected.
 */
export class RideRealtimeClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private rideId: string | null = null;
  private handlers: Set<EventHandler> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldRun = false;
  private reconnectAttempt = 0;

  onEvent(handler: EventHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private emit(event: string, data: any) {
    this.handlers.forEach((h) => {
      try {
        h(event, data);
      } catch {
        // ignore handler errors
      }
    });
  }

  connect(token: string, rideId?: string | null) {
    this.token = token;
    this.rideId = rideId || null;
    this.shouldRun = true;
    this.open();
  }

  subscribeRide(rideId: string) {
    this.rideId = rideId;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe_ride', ride_id: rideId }));
    }
  }

  disconnect() {
    this.shouldRun = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }

  private open() {
    if (!this.token || !this.shouldRun) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const params = new URLSearchParams({ token: this.token });
    if (this.rideId) params.set('ride_id', this.rideId);
    const url = `${toWsUrl(API_CONFIG.BASE_URL)}/api/realtime/ws?${params.toString()}`;

    try {
      this.ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.emit('socket_open', {});
    };

    this.ws.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(typeof msg.data === 'string' ? msg.data : '');
        if (parsed?.event) this.emit(parsed.event, parsed.data || {});
      } catch {
        // ignore bad frames
      }
    };

    this.ws.onerror = () => {
      this.emit('socket_error', {});
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.emit('socket_close', {});
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (!this.shouldRun) return;
    if (this.reconnectTimer) return;
    const delay = Math.min(15000, 1000 * Math.pow(2, this.reconnectAttempt));
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, delay);
  }
}

export const rideRealtime = new RideRealtimeClient();
