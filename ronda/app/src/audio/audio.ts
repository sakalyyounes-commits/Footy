import { useSettings } from '../store/settings';

/**
 * Sons et musique entièrement synthétisés (Web Audio) : aucun fichier audio à charger,
 * aucune licence à gérer. La musique est une boucle générative : darbouka au rythme maqsum
 * et luth (oud) en mode hijaz, joué par synthèse Karplus-Strong.
 */
export type SfxName =
  | 'card'
  | 'deal'
  | 'capture'
  | 'darba'
  | 'escalate'
  | 'missa'
  | 'bell'
  | 'coin'
  | 'win'
  | 'lose'
  | 'tick'
  | 'tap'
  | 'turn'
  | 'pop';

// Mode hijaz sur ré : ré, mi♭, fa♯, sol, la, si♭, do, ré.
const HIJAZ = [146.83, 293.66, 311.13, 369.99, 392.0, 440.0, 466.16, 523.25, 587.33];

class AudioEngine {
  private ctx: AudioContext | null = null;
  private sfxGain!: GainNode;
  private musicGain!: GainNode;
  private noise!: AudioBuffer;
  private plucks: AudioBuffer[] = [];
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private nextBeat = 0;
  private beat = 0;
  private melodyIdx = 4;

  /** À appeler lors d'un geste de l'utilisateur (politique des navigateurs). */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.9;
      this.sfxGain.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    this.syncMusic();
  }

  suspend(): void {
    if (this.ctx?.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  play(name: SfxName): void {
    if (!useSettings.getState().sound) return;
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.005;
    switch (name) {
      case 'card':
        this.flick(t, 0.5);
        break;
      case 'deal':
        for (let i = 0; i < 6; i++) this.flick(t + i * 0.07, 0.3 + Math.random() * 0.15);
        break;
      case 'capture':
        this.flick(t, 0.45);
        this.swoosh(t + 0.05, 0.35);
        break;
      case 'darba':
        this.thump(t, 150, 45, 0.9);
        this.flick(t, 0.9);
        this.noiseBurst(t, 0.12, 1200, 0.5);
        break;
      case 'escalate':
        this.thump(t, 170, 50, 1);
        this.flick(t, 1);
        this.chord(t + 0.05, [293.66, 369.99, 440], 0.6, 'sawtooth', 0.12);
        break;
      case 'missa':
        [587.33, 739.99, 880, 1174.66].forEach((f, i) => this.tone(t + i * 0.07, f, 0.5, 'triangle', 0.16));
        break;
      case 'bell':
        this.bell(t, 880);
        break;
      case 'coin':
        this.tone(t, 1567.98, 0.12, 'sine', 0.18);
        this.tone(t + 0.07, 2093, 0.25, 'sine', 0.16);
        break;
      case 'win':
        [293.66, 369.99, 440, 587.33, 739.99, 880].forEach((f, i) => this.tone(t + i * 0.1, f, 0.6, 'triangle', 0.15));
        this.chord(t + 0.65, [587.33, 739.99, 880], 1.2, 'triangle', 0.1);
        break;
      case 'lose':
        [440, 415.3, 369.99, 311.13].forEach((f, i) => this.tone(t + i * 0.16, f, 0.5, 'triangle', 0.13));
        break;
      case 'tick':
        this.tone(t, 1200, 0.05, 'square', 0.05);
        break;
      case 'tap':
        this.tone(t, 660, 0.04, 'sine', 0.08);
        break;
      case 'turn':
        this.tone(t, 783.99, 0.18, 'sine', 0.12);
        this.tone(t + 0.09, 1174.66, 0.3, 'sine', 0.1);
        break;
      case 'pop':
        this.tone(t, 520, 0.08, 'sine', 0.12, 900);
        break;
    }
  }

  /** Démarre ou arrête la musique selon les réglages. */
  syncMusic(): void {
    const on = useSettings.getState().music;
    if (on && this.ctx && !this.musicTimer) this.startMusic();
    if (!on && this.musicTimer) this.stopMusic();
  }

  private startMusic(): void {
    const ctx = this.ctx!;
    if (!this.plucks.length) this.plucks = HIJAZ.map((f) => this.renderPluck(f));
    this.nextBeat = ctx.currentTime + 0.2;
    this.beat = 0;
    this.musicGain.gain.setTargetAtTime(0.16, ctx.currentTime, 0.5);
    this.musicTimer = setInterval(() => this.scheduleMusic(), 120);
  }

  private stopMusic(): void {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  private scheduleMusic(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const eighth = 60 / 96 / 2;
    // Rythme maqsum sur 8 croches : Dum Tek . Tek Dum . Tek .
    const pattern = ['D', 'T', '', 'T', 'D', '', 'T', ''];
    while (this.nextBeat < ctx.currentTime + 0.35) {
      const step = this.beat % 8;
      const bar = Math.floor(this.beat / 8);
      const hit = pattern[step];
      if (hit === 'D') this.thump(this.nextBeat, 95, 55, 0.35, this.musicGain);
      if (hit === 'T') this.noiseBurst(this.nextBeat, 0.05, 3000, 0.1, this.musicGain);
      if (step === 0 && bar % 2 === 0) this.pluck(this.nextBeat, 0, 0.35);
      if (step % 2 === 0 && Math.random() < 0.62) {
        this.melodyIdx = Math.max(1, Math.min(8, this.melodyIdx + Math.round((Math.random() - 0.5) * 3)));
        this.pluck(this.nextBeat, this.melodyIdx, 0.22);
      } else if (Math.random() < 0.18) {
        this.pluck(this.nextBeat, this.melodyIdx, 0.12);
      }
      this.nextBeat += eighth;
      this.beat += 1;
    }
  }

  private renderPluck(freq: number): AudioBuffer {
    const ctx = this.ctx!;
    const rate = ctx.sampleRate;
    const period = Math.round(rate / freq);
    const out = ctx.createBuffer(1, Math.round(rate * 1.4), rate);
    const data = out.getChannelData(0);
    const ring = new Float32Array(period);
    for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
    let idx = 0;
    for (let i = 0; i < data.length; i++) {
      const next = (idx + 1) % period;
      data[i] = ring[idx];
      ring[idx] = 0.4985 * (ring[idx] + ring[next]);
      idx = next;
    }
    return out;
  }

  private pluck(t: number, index: number, gain: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.plucks[index];
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
    src.connect(lp).connect(g).connect(this.musicGain);
    src.start(t);
    src.stop(t + 1.4);
  }

  private flick(t: number, gain: number): void {
    this.noiseBurst(t, 0.045, 1800, gain * 0.7);
    this.thump(t, 220, 90, gain * 0.35);
  }

  private swoosh(t: number, gain: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(600, t);
    bp.frequency.exponentialRampToValueAtTime(3500, t + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    src.connect(bp).connect(g).connect(this.sfxGain);
    src.start(t, Math.random() * 0.5);
    src.stop(t + 0.3);
  }

  private noiseBurst(t: number, dur: number, freq: number, gain: number, dest: AudioNode = this.sfxGain): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  private thump(t: number, from: number, to: number, gain: number, dest: AudioNode = this.sfxGain): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.3);
  }

  private tone(t: number, freq: number, dur: number, type: OscillatorType, gain: number, glideTo?: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private chord(t: number, freqs: number[], dur: number, type: OscillatorType, gain: number): void {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;
    lp.connect(this.sfxGain);
    for (const f of freqs) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(lp);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  private bell(t: number, base: number): void {
    [1, 2.4, 3.9].forEach((m, i) => this.tone(t, base * m, 1.1 - i * 0.3, 'sine', 0.14 / (i + 1)));
  }
}

export const audio = new AudioEngine();

export function sfx(name: SfxName): void {
  audio.play(name);
}
