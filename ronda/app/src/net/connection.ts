import { PROTOCOL_VERSION, type ClientMessage, type ServerMessage } from '@ronda/core';
import { isNative, platform } from '../platform/native';
import { useSettings } from '../store/settings';

export type ConnStatus = 'idle' | 'connecting' | 'online' | 'offline';

type Listener = (msg: ServerMessage) => void;
type StatusListener = (status: ConnStatus) => void;

const TOKEN_KEY = 'ronda:token';

/** Adresse du serveur : variable de build, réglage manuel ou, sur le web, le site lui-même. */
export function serverUrl(): string {
  const manual = useSettings.getState().serverUrl.trim();
  if (manual) return manual;
  const env = (import.meta.env.VITE_SERVER_URL as string | undefined)?.trim();
  if (env) return env;
  if (isNative) return '';
  const { protocol, host } = window.location;
  return `${protocol === 'https:' ? 'wss' : 'ws'}://${host}/ws`;
}

export function httpBase(): string {
  const ws = serverUrl();
  if (!ws) return '';
  return ws.replace(/^ws/, 'http').replace(/\/ws$/, '');
}

function readToken(): string | undefined {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* stockage indisponible */
  }
}

/**
 * Connexion WebSocket au serveur de jeu : reconnexion automatique avec attente croissante,
 * ping régulier (mesure du décalage d'horloge) et reprise immédiate au retour au premier plan.
 */
class Connection {
  status: ConnStatus = 'idle';
  /** Décalage horloge serveur - horloge locale (ms). */
  clockOffset = 0;
  latency = 0;
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<StatusListener>();
  private retries = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private wanted = false;

  start(): void {
    this.wanted = true;
    if (!this.ws) this.open();
  }

  stop(): void {
    this.wanted = false;
    this.clearTimers();
    this.ws?.close();
    this.ws = null;
    this.setStatus('idle');
  }

  /** À appeler au retour au premier plan : reconnecte tout de suite si besoin. */
  wake(): void {
    if (!this.wanted) return;
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
      this.retries = 0;
      this.clearTimers();
      this.ws = null;
      this.open();
    } else if (this.ws.readyState === WebSocket.OPEN) {
      this.ping();
    }
  }

  /** Change d'adresse (réglages) et se reconnecte. */
  restart(): void {
    this.stop();
    this.start();
  }

  send(msg: ClientMessage): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(msg));
    return true;
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  serverNow(): number {
    return Date.now() + this.clockOffset;
  }

  private setStatus(status: ConnStatus): void {
    if (this.status === status) return;
    this.status = status;
    for (const l of this.statusListeners) l(status);
  }

  private clearTimers(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.retryTimer = null;
    this.pingTimer = null;
  }

  private open(): void {
    const url = serverUrl();
    if (!url) {
      this.setStatus('offline');
      return;
    }
    this.setStatus('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      this.scheduleRetry();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      const { name, avatar, lang } = useSettings.getState();
      ws.send(
        JSON.stringify({
          t: 'hello',
          v: PROTOCOL_VERSION,
          token: readToken(),
          name: name || undefined,
          avatar,
          lang,
          platform,
        } satisfies ClientMessage),
      );
    };
    ws.onmessage = (ev) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(String(ev.data)) as ServerMessage;
      } catch {
        return;
      }
      if (msg.t === 'welcome') {
        saveToken(msg.token);
        this.clockOffset = msg.serverTime - Date.now();
        this.retries = 0;
        this.setStatus('online');
        this.pingTimer = setInterval(() => this.ping(), 20_000);
      } else if (msg.t === 'pong') {
        const now = Date.now();
        this.latency = now - msg.ts;
        this.clockOffset = msg.serverTime + this.latency / 2 - now;
      }
      for (const l of this.listeners) l(msg);
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.clearTimers();
      if (this.wanted) this.scheduleRetry();
      else this.setStatus('idle');
    };
    ws.onerror = () => ws.close();
  }

  private ping(): void {
    this.send({ t: 'ping', ts: Date.now() });
  }

  private scheduleRetry(): void {
    this.setStatus(this.retries >= 2 ? 'offline' : 'connecting');
    const delay = Math.min(15_000, 800 * 2 ** this.retries) + Math.random() * 400;
    this.retries += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (this.wanted) this.open();
    }, delay);
  }
}

export const connection = new Connection();
