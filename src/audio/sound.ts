/**
 * Moteur audio 100% procédural (Web Audio API). Aucun fichier audio :
 * tous les sons sont synthétisés à la volée. Argument commercial fort —
 * pas de licence de samples, bundle léger, son entièrement "white-label".
 */

const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16] as const;
const MUSIC_SCALE = [0, 3, 5, 7, 10, 12] as const;
const BASE_FREQ = 261.63; // Do central

function noteToFreq(semitones: number): number {
  return BASE_FREQ * Math.pow(2, semitones / 12);
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;

  private sfxEnabled = true;
  private musicEnabled = true;
  private musicRunning = false;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private nextNoteTime = 0;
  private musicNodes: AudioNode[] = [];

  /** À appeler depuis un geste utilisateur (politique d'autoplay des navigateurs). */
  init(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) {
      return;
    }
    const ctx = new AudioCtor();
    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    const sfxBus = ctx.createGain();
    sfxBus.gain.value = this.sfxEnabled ? 1 : 0;
    sfxBus.connect(master);

    const musicBus = ctx.createGain();
    musicBus.gain.value = this.musicEnabled ? 0.5 : 0;
    musicBus.connect(master);

    this.ctx = ctx;
    this.sfxBus = sfxBus;
    this.musicBus = musicBus;
  }

  setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
    if (this.sfxBus && this.ctx) {
      this.sfxBus.gain.setTargetAtTime(enabled ? 1 : 0, this.ctx.currentTime, 0.05);
    }
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (this.musicBus && this.ctx) {
      this.musicBus.gain.setTargetAtTime(enabled ? 0.5 : 0, this.ctx.currentTime, 0.1);
    }
  }

  private ping(
    freq: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    bus: GainNode,
  ): void {
    if (!this.ctx) {
      return;
    }
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(gain, now + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(env);
    env.connect(bus);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /** Bonus commun : blip dont la hauteur monte avec le combo. */
  pickup(comboStep: number): void {
    if (!this.ctx || !this.sfxBus) {
      return;
    }
    const index = Math.min(comboStep, PENTATONIC.length - 1);
    const freq = noteToFreq(PENTATONIC[index]);
    this.ping(freq, 0.16, "triangle", 0.35, this.sfxBus);
    this.ping(freq * 2, 0.1, "sine", 0.12, this.sfxBus);
  }

  /** Bonus rare : petit arpège brillant. */
  rarePickup(): void {
    if (!this.ctx || !this.sfxBus) {
      return;
    }
    const root = noteToFreq(12);
    const arp = [root, root * 1.25, root * 1.5, root * 2];
    arp.forEach((freq, i) => {
      window.setTimeout(() => this.ping(freq, 0.18, "sine", 0.3, this.sfxBus as GainNode), i * 45);
    });
  }

  /** Malus : impact bruité + chute de hauteur. */
  malus(): void {
    if (!this.ctx || !this.sfxBus) {
      return;
    }
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.3);
    env.gain.setValueAtTime(0.4, now);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    osc.connect(env);
    env.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + 0.36);

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.18);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = this.ctx.createBufferSource();
    const noiseGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 800;
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    noise.buffer = buffer;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxBus);
    noise.start(now);
  }

  uiClick(): void {
    if (!this.ctx || !this.sfxBus) {
      return;
    }
    this.ping(noteToFreq(7), 0.06, "square", 0.12, this.sfxBus);
  }

  countdownBeep(isFinal: boolean): void {
    if (!this.ctx || !this.sfxBus) {
      return;
    }
    this.ping(noteToFreq(isFinal ? 12 : 0), isFinal ? 0.3 : 0.14, "triangle", 0.3, this.sfxBus);
  }

  gameOver(): void {
    if (!this.ctx || !this.sfxBus) {
      return;
    }
    const seq = [12, 7, 3, -2];
    seq.forEach((semi, i) => {
      window.setTimeout(
        () => this.ping(noteToFreq(semi), 0.3, "sine", 0.28, this.sfxBus as GainNode),
        i * 130,
      );
    });
  }

  /** Ramassage d'un power-up : montée brillante. */
  powerup(): void {
    if (!this.ctx || !this.sfxBus) {
      return;
    }
    const seq = [0, 4, 7, 12, 16];
    seq.forEach((semi, i) => {
      window.setTimeout(
        () => this.ping(noteToFreq(semi), 0.16, "sine", 0.26, this.sfxBus as GainNode),
        i * 40,
      );
    });
  }

  /** Bouclier qui absorbe un malus : déflexion métallique. */
  shieldBlock(): void {
    if (!this.ctx || !this.sfxBus) {
      return;
    }
    this.ping(noteToFreq(19), 0.18, "square", 0.22, this.sfxBus);
    this.ping(noteToFreq(24), 0.12, "sine", 0.16, this.sfxBus);
  }

  /** Pad d'ambiance entretenu (drone filtré) + arpège séquencé en lookahead. */
  startMusic(): void {
    if (!this.ctx || !this.musicBus || this.musicRunning) {
      return;
    }
    this.musicRunning = true;
    this.musicStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;

    const padFilter = this.ctx.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 700;
    padFilter.Q.value = 0.6;
    padFilter.connect(this.musicBus);

    const padGain = this.ctx.createGain();
    padGain.gain.value = 0.18;
    padGain.connect(padFilter);

    const padFreqs = [noteToFreq(-12), noteToFreq(-5), noteToFreq(-8)];
    for (const freq of padFreqs) {
      const osc = this.ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 12;
      osc.connect(padGain);
      osc.start();
      this.musicNodes.push(osc);
    }

    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 350;
    lfo.connect(lfoGain);
    lfoGain.connect(padFilter.frequency);
    lfo.start();
    this.musicNodes.push(lfo, padFilter, padGain, lfoGain);

    this.scheduleArp();
  }

  private scheduleArp = (): void => {
    if (!this.ctx || !this.musicBus || !this.musicRunning) {
      return;
    }
    const secondsPerStep = 0.28;
    while (this.nextNoteTime < this.ctx.currentTime + 0.2) {
      const semi = MUSIC_SCALE[this.musicStep % MUSIC_SCALE.length] + 12;
      const freq = noteToFreq(semi);
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0.0001, this.nextNoteTime);
      env.gain.exponentialRampToValueAtTime(0.12, this.nextNoteTime + 0.02);
      env.gain.exponentialRampToValueAtTime(0.0001, this.nextNoteTime + 0.26);
      osc.connect(env);
      env.connect(this.musicBus);
      osc.start(this.nextNoteTime);
      osc.stop(this.nextNoteTime + 0.3);
      this.musicStep += 1;
      this.nextNoteTime += secondsPerStep;
    }
    this.musicTimer = window.setTimeout(this.scheduleArp, 60);
  };

  stopMusic(): void {
    this.musicRunning = false;
    if (this.musicTimer !== null) {
      window.clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    for (const node of this.musicNodes) {
      const stoppable = node as AudioScheduledSourceNode;
      if (typeof stoppable.stop === "function") {
        try {
          stoppable.stop();
        } catch {
          // Déjà arrêté.
        }
      }
      node.disconnect();
    }
    this.musicNodes = [];
  }
}

export const sound = new SoundEngine();
