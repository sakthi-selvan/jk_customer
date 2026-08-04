import { API_CONFIG } from '../config';

type Listener = (online: boolean) => void;

class ConnectivityMonitor {
  private online = true;
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;

  start() {
    if (this.timer) return;
    this.ping();
    this.timer = setInterval(() => this.ping(), 8000);
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
      this.setOnline(res.ok);
    } catch {
      this.setOnline(false);
    }
  }
}

export const connectivity = new ConnectivityMonitor();
