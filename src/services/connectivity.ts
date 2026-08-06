import { API_CONFIG } from '../config';

type Listener = (online: boolean) => void;

/**
 * App↔server reachability — NOT a user/driver "online/offline" status.
 * Any HTTP response (including 404) means we can reach the API.
 */
class ConnectivityMonitor {
  private online = true;
  private failStreak = 0;
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;

  start() {
    if (this.timer) return;
    this.ping();
    this.timer = setInterval(() => this.ping(), 12000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this.online);
    return () => this.listeners.delete(fn);
  }

  isOnline() {
    return this.online;
  }

  /** Call when any request reaches the server (2xx/4xx/5xx). */
  noteReachable() {
    this.failStreak = 0;
    this.setOnline(true);
  }

  /** Call only when there is no response (timeout / network down). */
  noteUnreachable() {
    this.failStreak += 1;
    // Require consecutive failures so a single flaky ping doesn't flash the banner
    if (this.failStreak >= 2) {
      this.setOnline(false);
    }
  }

  private setOnline(next: boolean) {
    if (next === this.online) return;
    this.online = next;
    this.listeners.forEach((fn) => fn(next));
  }

  private async ping() {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(`${API_CONFIG.BASE_URL}/health`, { signal: ctrl.signal });
      clearTimeout(t);
      // Got a response → server is reachable regardless of status code
      if (res) this.noteReachable();
    } catch {
      this.noteUnreachable();
    }
  }
}

export const connectivity = new ConnectivityMonitor();
