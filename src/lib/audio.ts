/**
 * Original synthesized game audio (Web Audio API) — no third-party samples,
 * therefore fully royalty free. All sounds are generated procedurally.
 */

export type AudioPrefs = {
  musicEnabled: boolean;
  effectsEnabled: boolean;
  musicVolume: number;
  effectsVolume: number;
  masterMute: boolean;
};

type Ctx = AudioContext & { _sd?: boolean };

class GameAudio {
  private ctx: Ctx | null = null;
  private fxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private step = 0;
  prefs: AudioPrefs = {
    musicEnabled: false,
    effectsEnabled: true,
    musicVolume: 0.4,
    effectsVolume: 0.7,
    masterMute: false,
  };

  private ensure(): Ctx | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC() as Ctx;
      this.fxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.fxGain.connect(this.ctx.destination);
      this.musicGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.applyGains();
    return this.ctx;
  }

  private applyGains() {
    if (!this.fxGain || !this.musicGain) return;
    const mute = this.prefs.masterMute;
    this.fxGain.gain.value = mute || !this.prefs.effectsEnabled ? 0 : this.prefs.effectsVolume * 0.8;
    this.musicGain.gain.value = mute || !this.prefs.musicEnabled ? 0 : this.prefs.musicVolume * 0.28;
  }

  setPrefs(p: Partial<AudioPrefs>) {
    this.prefs = { ...this.prefs, ...p };
    this.applyGains();
    if (this.prefs.musicEnabled && !this.prefs.masterMute) this.startMusic();
    else this.stopMusic();
  }

  private tone(
    freq: number,
    dur: number,
    opts: { type?: OscillatorType; at?: number; gain?: number; to?: number; dest?: GainNode | null } = {},
  ) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + (opts.at ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? "triangle";
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(40, opts.to), t0 + dur);
    const peak = opts.gain ?? 0.3;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.04, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(opts.dest ?? this.fxGain!);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, at = 0, gain = 0.25, filterFrom = 900, filterTo = 300) {
    const ctx = this.ensure();
    if (!ctx || !this.fxGain) return;
    const t0 = ctx.currentTime + at;
    const frames = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(filterFrom, t0);
    bp.frequency.exponentialRampToValueAtTime(filterTo, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(bp).connect(g).connect(this.fxGain);
    src.start(t0);
  }

  click() {
    this.tone(520, 0.08, { type: "square", gain: 0.18, to: 300 });
  }

  /** Full 1.6s dice sequence, synced with the visual animation timeline. */
  diceRoll() {
    this.click();
    // rattling wood/plastic dice
    for (let i = 0; i < 12; i++) {
      this.noise(0.09, 0.15 + i * 0.09, 0.16, 1400 - i * 60, 320);
      this.tone(180 + Math.random() * 260, 0.06, { at: 0.16 + i * 0.09, gain: 0.09, type: "square" });
    }
    // rising suspense
    this.tone(220, 1.0, { at: 0.35, gain: 0.12, type: "sawtooth", to: 660 });
    // slow down + land
    this.noise(0.18, 1.32, 0.3, 700, 160);
    this.tone(120, 0.24, { at: 1.4, gain: 0.32, type: "sine", to: 70 });
  }

  diceReveal() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      this.tone(f, 0.42, { at: i * 0.07, gain: 0.22, type: "triangle" }),
    );
  }

  taskComplete() {
    [659.25, 880].forEach((f, i) => this.tone(f, 0.3, { at: i * 0.09, gain: 0.24 }));
    this.noise(0.2, 0.02, 0.1, 2600, 900);
  }

  unlock() {
    [392, 523.25, 698.46].forEach((f, i) => this.tone(f, 0.26, { at: i * 0.08, gain: 0.2, type: "sine" }));
  }

  victory() {
    const melody = [523.25, 659.25, 783.99, 1046.5, 987.77, 1174.66, 1567.98];
    melody.forEach((f, i) => this.tone(f, 0.5, { at: i * 0.13, gain: 0.26 }));
    this.tone(261.63, 1.6, { at: 0.1, gain: 0.14, type: "sine" });
  }

  error() {
    this.tone(220, 0.18, { type: "sawtooth", gain: 0.16, to: 130 });
  }

  startMusic() {
    const ctx = this.ensure();
    if (!ctx || this.musicTimer !== null) return;
    const scale = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];
    const tick = () => {
      if (!this.prefs.musicEnabled || this.prefs.masterMute) return;
      const note = scale[Math.floor(Math.random() * scale.length)]!;
      this.tone(note, 1.5, { gain: 0.2, type: "sine", dest: this.musicGain });
      if (this.step % 4 === 0)
        this.tone(note / 2, 2.4, { gain: 0.16, type: "triangle", dest: this.musicGain });
      this.step++;
    };
    tick();
    this.musicTimer = window.setInterval(tick, 900);
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const gameAudio = new GameAudio();
