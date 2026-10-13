/**
 * Lightweight bridge connecting the IllustrativeVoiceDemo playback control
 * with the 3D Speaking-Heads waveform visualizer using the Web Audio API.
 */

type AudioListener = (state: { isPlaying: boolean; level: number }) => void;

class VoiceAudioBridge {
  private listeners = new Set<AudioListener>();
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private rafId: number | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private isPlaying = false;
  private currentLevel = 0;

  subscribe(listener: AudioListener): () => void {
    this.listeners.add(listener);
    listener({ isPlaying: this.isPlaying, level: this.currentLevel });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    for (const listener of this.listeners) {
      listener({ isPlaying: this.isPlaying, level: this.currentLevel });
    }
  }

  /**
   * Starts a gentle, pleasant Web Audio voice-cadence harmonic signal
   * analyzed in real time by an AnalyserNode so the 3D waveform reacts
   * to actual Web Audio output when triggered by the user.
   */
  startSamplePlayback(durationMs = 3600, onEnded?: () => void) {
    if (this.isPlaying) {
      this.stopPlayback();
      return;
    }

    try {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;
      const durationSec = durationMs / 1000;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.75;
      this.analyser = analyser;
      this.dataArray = new Uint8Array(analyser.frequencyBinCount);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, now);

      // Syllabic speech-like amplitude envelope (gentle volume so it's pleasant)
      const syllables = [0.15, 0.45, 0.85, 1.25, 1.65, 2.1, 2.55, 2.95, 3.25];
      for (const t of syllables) {
        if (t < durationSec - 0.2) {
          masterGain.gain.linearRampToValueAtTime(0.06, now + t);
          masterGain.gain.linearRampToValueAtTime(0.012, now + t + 0.18);
        }
      }
      masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec);

      // Formant-filtered warm vocal chord frequencies
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(520, now);
      filter.Q.setValueAtTime(2.5, now);

      const freqs = [165, 247.5, 330];
      this.activeOscillators = freqs.map((f, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(f, now);
        // Subtle pitch inflection across the sentence
        osc.frequency.linearRampToValueAtTime(f * 1.08, now + durationSec * 0.45);
        osc.frequency.linearRampToValueAtTime(f * 0.96, now + durationSec * 0.95);
        osc.connect(filter);
        osc.start(now);
        osc.stop(now + durationSec);
        return osc;
      });

      filter.connect(masterGain);
      masterGain.connect(analyser);
      analyser.connect(ctx.destination);

      this.isPlaying = true;
      this.emit();

      const startTime = performance.now();
      const tick = () => {
        if (!this.isPlaying || !this.analyser || !this.dataArray) return;
        const elapsed = performance.now() - startTime;
        if (elapsed >= durationMs) {
          this.stopPlayback();
          if (onEnded) onEnded();
          return;
        }
        this.analyser.getByteTimeDomainData(this.dataArray);
        let sumSq = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
          const norm = (this.dataArray[i] - 128) / 128;
          sumSq += norm * norm;
        }
        const rms = Math.sqrt(sumSq / this.dataArray.length);
        // Normalize RMS into a responsive 0.25..1.0 level
        this.currentLevel = Math.min(1, Math.max(0.25, rms * 18));
        this.emit();
        this.rafId = requestAnimationFrame(tick);
      };
      this.rafId = requestAnimationFrame(tick);
    } catch {
      // Fallback if browser blocks AudioContext
      this.isPlaying = true;
      this.currentLevel = 0.75;
      this.emit();
      setTimeout(() => {
        this.stopPlayback();
        if (onEnded) onEnded();
      }, durationMs);
    }
  }

  stopPlayback() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    for (const osc of this.activeOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Ignore already stopped oscillators
      }
    }
    this.activeOscillators = [];
    this.isPlaying = false;
    this.currentLevel = 0;
    this.emit();
  }
}

export const voiceAudioBridge = new VoiceAudioBridge();

