export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Sound generators
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private boostNoise: AudioBufferSourceNode | null = null;
  private boostGain: GainNode | null = null;
  private crowdNoise: AudioBufferSourceNode | null = null;
  private crowdGain: GainNode | null = null;

  private currentSpeed = 0;
  private isBoosting = false;
  private muted = false;
  private initialized = false;

  private engineRunning = false;

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch {
      console.warn('[Audio] Web Audio API not available');
    }
  }

  private ensureContext() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // ─── Engine Sound ───
  startEngine() {
    if (!this.ctx || !this.masterGain || this.engineRunning) return;
    this.ensureContext();

    this.engineRunning = true;

    // Main engine tone
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;

    // Sub oscillator for rumble
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.value = 30;

    // Noise component
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 200;

    // Envelope
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    const subGain = this.ctx.createGain();
    subGain.gain.value = 0;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0;

    // Connect main engine
    this.engineOsc.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    // Connect sub
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    // Connect noise
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    // Store for updates
    (this.engineOsc as any)._subOsc = subOsc;
    (this.engineOsc as any)._subGain = subGain;
    (this.engineOsc as any)._noiseGain = noiseGain;
    (this.engineOsc as any)._noiseFilter = noiseFilter;
    (this.engineOsc as any)._noiseSource = noiseSource;

    this.engineOsc.start();
    subOsc.start();
    noiseSource.start();

    // Fade in
    this.engineGain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.5);
    subGain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 0.5);
    noiseGain.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 0.5);
  }

  updateEngine(speed: number, boosting: boolean) {
    if (!this.ctx || !this.engineOsc || !this.engineGain) return;
    this.ensureContext();

    this.currentSpeed = speed;
    this.isBoosting = boosting;

    const normalizedSpeed = Math.min(1, speed / 35);
    const targetFreq = 55 + normalizedSpeed * 80 + (boosting ? 40 : 0);

    this.engineOsc.frequency.linearRampToValueAtTime(targetFreq, this.ctx.currentTime + 0.1);
    if ((this.engineOsc as any)._subOsc) {
      (this.engineOsc as any)._subOsc.frequency.linearRampToValueAtTime(
        30 + normalizedSpeed * 30 + (boosting ? 15 : 0),
        this.ctx.currentTime + 0.1
      );
    }

    // Filter follows speed
    if ((this.engineOsc as any)._noiseFilter) {
      (this.engineOsc as any)._noiseFilter.frequency.linearRampToValueAtTime(
        200 + normalizedSpeed * 800,
        this.ctx.currentTime + 0.1
      );
    }

    // Volume modulation
    const targetVol = 0.04 + normalizedSpeed * 0.08 + (boosting ? 0.06 : 0);
    this.engineGain.gain.linearRampToValueAtTime(targetVol, this.ctx.currentTime + 0.1);

    if ((this.engineOsc as any)._subGain) {
      (this.engineOsc as any)._subGain.gain.linearRampToValueAtTime(
        0.03 + normalizedSpeed * 0.05,
        this.ctx.currentTime + 0.1
      );
    }

    if ((this.engineOsc as any)._noiseGain) {
      (this.engineOsc as any)._noiseGain.gain.linearRampToValueAtTime(
        0.02 + normalizedSpeed * 0.04 + (boosting ? 0.05 : 0),
        this.ctx.currentTime + 0.1
      );
    }

    // Boost sound
    this.updateBoost(boosting);
  }

  private boostGainNode: GainNode | null = null;
  private boostOsc: OscillatorNode | null = null;

  private updateBoost(active: boolean) {
    if (!this.ctx || !this.masterGain) return;

    if (active && !this.boostOsc) {
      // Start boost sound
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 200;

      const gain = this.ctx.createGain();
      gain.gain.value = 0;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1000;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start();

      gain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 0.1);

      this.boostOsc = osc;
      this.boostGainNode = gain;

      // Sweep frequency
      osc.frequency.linearRampToValueAtTime(400, this.ctx.currentTime + 0.3);
    } else if (!active && this.boostOsc) {
      // Stop boost sound
      if (this.boostGainNode) {
        this.boostGainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);
      }
      setTimeout(() => {
        try { this.boostOsc?.stop(); } catch {}
        this.boostOsc = null;
        this.boostGainNode = null;
      }, 200);
    }
  }

  stopEngine() {
    if (!this.engineOsc || !this.engineRunning) return;

    if (this.engineGain) {
      this.engineGain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 0.3);
    }
    if ((this.engineOsc as any)._subGain) {
      (this.engineOsc as any)._subGain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 0.3);
    }
    if ((this.engineOsc as any)._noiseGain) {
      (this.engineOsc as any)._noiseGain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 0.3);
    }

    setTimeout(() => {
      try {
        this.engineOsc?.stop();
        (this.engineOsc as any)?._subOsc?.stop();
        (this.engineOsc as any)?._noiseSource?.stop();
      } catch {}
      this.engineOsc = null;
      this.engineGain = null;
      this.engineRunning = false;
    }, 500);
  }

  // ─── One-shot Sounds ───
  playJump() {
    if (!this.ctx || !this.masterGain) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.15);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playBallHit(power: number) {
    if (!this.ctx || !this.masterGain) return;
    this.ensureContext();

    const vol = Math.min(0.15, 0.04 + power * 0.003);

    // Thump
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playGoalHorn() {
    if (!this.ctx || !this.masterGain) return;
    this.ensureContext();

    // Long horn sound
    const duration = 1.5;

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(330, this.ctx.currentTime + duration * 0.3);
    osc1.frequency.linearRampToValueAtTime(440, this.ctx.currentTime + duration * 0.6);

    const gain1 = this.ctx.createGain();
    gain1.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.2);
    gain1.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + duration);

    const filter1 = this.ctx.createBiquadFilter();
    filter1.type = 'lowpass';
    filter1.frequency.value = 800;

    osc1.connect(filter1);
    filter1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start();
    osc1.stop(this.ctx.currentTime + duration);

    // Second layer (brassier)
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(330, this.ctx.currentTime);
    osc2.frequency.linearRampToValueAtTime(440, this.ctx.currentTime + duration * 0.4);
    osc2.frequency.linearRampToValueAtTime(554, this.ctx.currentTime + duration * 0.7);

    const gain2 = this.ctx.createGain();
    gain2.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain2.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.2);
    gain2.gain.linearRampToValueAtTime(0.02, this.ctx.currentTime + duration);

    const filter2 = this.ctx.createBiquadFilter();
    filter2.type = 'lowpass';
    filter2.frequency.value = 600;

    osc2.connect(filter2);
    filter2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start();
    osc2.stop(this.ctx.currentTime + duration);
  }

  playCrowdRoar(intensity: number = 0.5) {
    if (!this.ctx || !this.masterGain) return;
    this.ensureContext();

    const duration = 1.0 + intensity;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Simulate crowd noise
      const t = i / this.ctx.sampleRate;
      const envelope = Math.sin(Math.PI * t / duration) * intensity;
      data[i] = (Math.random() * 2 - 1) * 0.5 * envelope;
      // Add some rhythmic clapping
      if (Math.sin(t * 2 * Math.PI * 2) > 0.7) {
        data[i] += (Math.random() * 2 - 1) * 0.3 * envelope;
      }
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000 + intensity * 1000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15 * intensity, this.ctx.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration - 0.3);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start();
    source.stop(this.ctx.currentTime + duration);
  }

  playWhistle() {
    if (!this.ctx || !this.masterGain) return;
    this.ensureContext();

    const duration = 0.6;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1000, this.ctx.currentTime + 0.1);
    osc.frequency.linearRampToValueAtTime(1200, this.ctx.currentTime + 0.2);
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime + 0.3);
    osc.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 0.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime + 0.25);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 600;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playCountdownBeep() {
    if (!this.ctx || !this.masterGain) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 600;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playCountdownGo() {
    if (!this.ctx || !this.masterGain) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, this.ctx.currentTime + 0.3);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  playMenuClick() {
    if (!this.ctx || !this.masterGain) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.08);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  // ─── Crowd Ambient ───
  startCrowdAmbient() {
    if (!this.ctx || !this.masterGain || this.crowdNoise) return;
    this.ensureContext();

    const bufferSize = Math.floor(this.ctx.sampleRate * 2);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }

    this.crowdNoise = this.ctx.createBufferSource();
    this.crowdNoise.buffer = buffer;
    this.crowdNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.5;

    this.crowdGain = this.ctx.createGain();
    this.crowdGain.gain.value = 0;

    this.crowdNoise.connect(filter);
    filter.connect(this.crowdGain);
    this.crowdGain.connect(this.masterGain);
    this.crowdNoise.start();

    this.crowdGain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 2);

    // Modulate crowd intensity with LFO
    if (this.ctx) {
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.1;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain);
      lfoGain.connect(this.crowdGain.gain);
      lfo.start();
      (this.crowdNoise as any)._lfo = lfo;
    }
  }

  setCrowdIntensity(intensity: number) {
    if (!this.crowdGain) return;
    this.crowdGain.gain.linearRampToValueAtTime(
      0.02 + intensity * 0.08,
      this.ctx!.currentTime + 0.5
    );
  }

  stopCrowdAmbient() {
    if (!this.crowdNoise) return;
    if (this.crowdGain) {
      this.crowdGain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 1);
    }
    setTimeout(() => {
      try {
        this.crowdNoise?.stop();
        (this.crowdNoise as any)?._lfo?.stop();
      } catch {}
      this.crowdNoise = null;
      this.crowdGain = null;
    }, 1200);
  }

  // ─── Match events ───
  playMatchStart() {
    this.playWhistle();
    this.playCrowdRoar(0.7);
  }

  playGoalScored() {
    this.playGoalHorn();
    setTimeout(() => this.playCrowdRoar(1.0), 200);
  }

  playMatchEnd() {
    setTimeout(() => this.playWhistle(), 500);
    this.playCrowdRoar(0.5);
  }

  // ─── Master control ───
  setMasterVolume(vol: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, vol));
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 0.3;
    }
    return this.muted;
  }

  dispose() {
    this.stopEngine();
    this.stopCrowdAmbient();
    this.updateBoost(false);
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.initialized = false;
  }
}
