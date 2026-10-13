/**
 * EMIQEN Voice & Audio Playback Service
 *
 * Manages audio playback state across the Hero demonstration, Text-to-Speech
 * playground, Voice Agent previews, and 3D Speaking-Heads waveform visualizer.
 *
 * Supports explicit states:
 * - 'idle'
 * - 'processing'
 * - 'playing'
 * - 'paused'
 * - 'completed'
 * - 'error'
 */

export type WaveformPlaybackStatus =
  | 'idle'
  | 'processing'
  | 'playing'
  | 'paused'
  | 'completed'
  | 'error';

export interface VoiceAudioState {
  status: WaveformPlaybackStatus;
  isPlaying: boolean;
  level: number;
  activeId: string | null;
  elapsedSec: number;
  durationSec: number;
  errorMessage: string | null;
}

type AudioListener = (state: VoiceAudioState) => void;

export interface PlayOptions {
  id: string;
  text?: string;
  lang?: string;
  durationMs?: number;
  pitchFactor?: number;
  onEnded?: () => void;
}

class VoiceAudioBridge {
  private listeners = new Set<AudioListener>();
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private rafId: number | null = null;
  private processingTimerId: number | null = null;
  private completedTimerId: number | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private masterGain: GainNode | null = null;

  private status: WaveformPlaybackStatus = 'idle';
  private activeId: string | null = null;
  private currentLevel = 0;
  private elapsedSec = 0;
  private durationSec = 0;
  private startPerfTime = 0;
  private pausedElapsedMs = 0;
  private targetDurationMs = 3600;
  private currentOptions: PlayOptions | null = null;
  private errorMessage: string | null = null;

  getState(): VoiceAudioState {
    return {
      status: this.status,
      isPlaying: this.status === 'playing',
      level: this.currentLevel,
      activeId: this.activeId,
      elapsedSec: this.elapsedSec,
      durationSec: this.durationSec,
      errorMessage: this.errorMessage,
    };
  }

  subscribe(listener: AudioListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  private clearTimers() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.processingTimerId !== null) {
      window.clearTimeout(this.processingTimerId);
      this.processingTimerId = null;
    }
    if (this.completedTimerId !== null) {
      window.clearTimeout(this.completedTimerId);
      this.completedTimerId = null;
    }
  }

  private cleanupOscillators() {
    for (const osc of this.activeOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Ignore already stopped oscillators
      }
    }
    this.activeOscillators = [];
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // Ignore
      }
      this.masterGain = null;
    }
  }

  /**
   * Starts or toggles playback for a given control ID.
   */
  play(options: PlayOptions) {
    // Validate non-empty text if text is explicitly provided as empty string
    if (options.text !== undefined && options.text.trim().length === 0) {
      this.stopPlayback();
      this.activeId = options.id;
      this.status = 'error';
      this.errorMessage = 'Please enter text before starting speech playback.';
      this.emit();
      return;
    }

    // If same ID is currently playing, pause it
    if (this.activeId === options.id && this.status === 'playing') {
      this.pausePlayback();
      return;
    }

    // If same ID is currently paused, resume it
    if (this.activeId === options.id && this.status === 'paused') {
      this.resumePlayback();
      return;
    }

    // Prevent overlapping playback: stop any existing session first
    this.stopPlayback(true);

    const durationMs =
      options.durationMs ??
      Math.min(12000, Math.max(2800, (options.text?.length || 60) * 55));

    this.activeId = options.id;
    this.currentOptions = options;
    this.targetDurationMs = durationMs;
    this.durationSec = Math.max(1, Math.round(durationMs / 1000));
    this.elapsedSec = 0;
    this.pausedElapsedMs = 0;
    this.errorMessage = null;
    this.status = 'processing';
    this.currentLevel = 0.15;
    this.emit();

    // Brief processing stage (220ms) so UI shows distinct processing feedback
    this.processingTimerId = window.setTimeout(() => {
      this.processingTimerId = null;
      this.beginAudioOutput(options, durationMs);
    }, 220);
  }

  private beginAudioOutput(options: PlayOptions, durationMs: number) {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) {
        throw new Error('Web Audio API is not supported in this browser.');
      }

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      // Optionally trigger native speechSynthesis if text is provided and supported
      if (options.text && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(options.text);
          utterance.lang = options.lang || 'en-IN';
          utterance.rate = 1.0;
          utterance.pitch = options.pitchFactor ?? 1.0;
          utterance.volume = 0.85;
          window.speechSynthesis.speak(utterance);
        } catch {
          // Continue with Web Audio harmonic synthesis if speechSynthesis fails
        }
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;
      const durationSec = durationMs / 1000;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.72;
      this.analyser = analyser;
      this.dataArray = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, now);
      this.masterGain = masterGain;

      // Natural syllabic speech-cadence envelope
      const stepCount = Math.max(5, Math.floor(durationSec * 3.2));
      for (let i = 0; i < stepCount; i++) {
        const t = (i / stepCount) * (durationSec - 0.25) + 0.08;
        const peak = 0.045 + ((i * 7) % 5) * 0.008;
        masterGain.gain.linearRampToValueAtTime(peak, now + t);
        masterGain.gain.linearRampToValueAtTime(0.009, now + t + 0.14);
      }
      masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec);

      const pitchFactor = options.pitchFactor ?? 1.0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(510 * pitchFactor, now);
      filter.Q.setValueAtTime(2.4, now);

      const baseFreqs = [160 * pitchFactor, 240 * pitchFactor, 320 * pitchFactor];
      this.activeOscillators = baseFreqs.map((f, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.linearRampToValueAtTime(f * 1.07, now + durationSec * 0.45);
        osc.frequency.linearRampToValueAtTime(f * 0.95, now + durationSec * 0.95);
        osc.connect(filter);
        osc.start(now);
        osc.stop(now + durationSec + 0.05);
        return osc;
      });

      filter.connect(masterGain);
      masterGain.connect(analyser);
      analyser.connect(ctx.destination);

      this.status = 'playing';
      this.startPerfTime = performance.now();
      this.emit();
      this.startMonitorLoop(options.onEnded);
    } catch (err) {
      this.status = 'error';
      this.currentLevel = 0;
      this.errorMessage =
        err instanceof Error ? err.message : 'Unable to initialize audio playback.';
      this.emit();
    }
  }

  private startMonitorLoop(onEnded?: () => void) {
    const tick = () => {
      if (this.status !== 'playing') return;

      const elapsedMs = this.pausedElapsedMs + (performance.now() - this.startPerfTime);
      this.elapsedSec = Math.min(this.durationSec, Math.floor(elapsedMs / 1000));

      if (elapsedMs >= this.targetDurationMs) {
        this.completePlayback(onEnded);
        return;
      }

      if (this.analyser && this.dataArray) {
        this.analyser.getByteTimeDomainData(this.dataArray);
        let sumSq = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
          const norm = (this.dataArray[i] - 128) / 128;
          sumSq += norm * norm;
        }
        const rms = Math.sqrt(sumSq / this.dataArray.length);
        const t = elapsedMs / 1000;
        const organicMod =
          0.38 + 0.25 * Math.sin(t * 9.5) + 0.18 * Math.cos(t * 14.2);
        this.currentLevel = Math.min(1, Math.max(0.22, rms * 16, organicMod));
      } else {
        const t = elapsedMs / 1000;
        this.currentLevel = 0.45 + 0.35 * Math.abs(Math.sin(t * 8.5));
      }

      this.emit();
      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  pausePlayback() {
    if (this.status !== 'playing') return;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pausedElapsedMs += performance.now() - this.startPerfTime;
    if (this.audioCtx && this.audioCtx.state === 'running') {
      this.audioCtx.suspend();
    }
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      try {
        window.speechSynthesis.pause();
      } catch {
        // Ignore
      }
    }
    this.status = 'paused';
    this.currentLevel = 0.08;
    this.emit();
  }

  resumePlayback() {
    if (this.status !== 'paused') return;
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    if ('speechSynthesis' in window && window.speechSynthesis.paused) {
      try {
        window.speechSynthesis.resume();
      } catch {
        // Ignore
      }
    }
    this.status = 'playing';
    this.startPerfTime = performance.now();
    this.emit();
    this.startMonitorLoop(this.currentOptions?.onEnded);
  }

  private completePlayback(onEnded?: () => void) {
    this.clearTimers();
    this.cleanupOscillators();
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    this.status = 'completed';
    this.currentLevel = 0;
    this.elapsedSec = this.durationSec;
    this.emit();
    if (onEnded) onEnded();

    this.completedTimerId = window.setTimeout(() => {
      if (this.status === 'completed') {
        this.status = 'idle';
        this.activeId = null;
        this.elapsedSec = 0;
        this.emit();
      }
    }, 900);
  }

  /**
   * Backwards-compatible helper used by IllustrativeVoiceDemo.
   */
  startSamplePlayback(durationMs = 3600, onEnded?: () => void, id = 'hero-demo-sample', text?: string) {
    this.play({ id, durationMs, text, onEnded });
  }

  stopPlayback(silent = false) {
    this.clearTimers();
    this.cleanupOscillators();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    this.status = 'idle';
    this.activeId = null;
    this.currentLevel = 0;
    this.elapsedSec = 0;
    this.pausedElapsedMs = 0;
    this.errorMessage = null;
    if (!silent) {
      this.emit();
    }
  }
}

export const voiceAudioBridge = new VoiceAudioBridge();
