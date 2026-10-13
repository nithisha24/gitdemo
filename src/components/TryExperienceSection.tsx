import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  FileAudio,
  ShoppingBag,
  CalendarClock,
  CalendarCheck,
  Play,
  Pause,
  Square,
  Sparkles,
  Plus,
  Copy,
  Check,
  Trash2,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  ArrowRight,
  Bot,
  User,
} from 'lucide-react';
import { voiceAudioBridge, WaveformPlaybackStatus } from '../services/voiceAudioBridge';
import { WaveformVisualizer } from './WaveformVisualizer';

export type PlaygroundTabId = 'voice-agents' | 'text-to-speech' | 'speech-to-text';

/**
 * Exact 26 requested voice names — preserving exact spelling and capitalization.
 * No extra voices or fabricated gender/accent metadata.
 */
export const EMIQEN_TTS_VOICE_NAMES: readonly string[] = [
  'Aarav',
  'Amit',
  'Arushi',
  'Diya',
  'Gargi',
  'Kabir',
  'Kavita',
  'Neeraj',
  'Neha',
  'Nila',
  'Rahul',
  'Rehan',
  'Riya',
  'Rohan',
  'Sagar',
  'SagarM',
  'Samar',
  'Sana',
  'Seema',
  'Shailika',
  'Shreeraj',
  'Tarini',
  'Tripti',
  'Vikas',
  'Vikram',
  'Zara',
] as const;

export const DEFAULT_HINDI_SAMPLE =
  'भारत की सुबह का नज़ारा ही कुछ और होता है। चाय की चुस्की के साथ अखबार, बच्चों की किलकारियां, और मंदिर की घंटियों की आवाज़, सब मिलकर एक ऐसा माहौल बनाते हैं जो दिल को सुकून देता है। यही तो है अपने देश की खूबसूरती।';

interface LanguageOption {
  code: string;
  label: string;
  sampleText: string;
}

const TTS_LANGUAGES: LanguageOption[] = [
  {
    code: 'hi-IN',
    label: 'Hindi (हिन्दी)',
    sampleText: DEFAULT_HINDI_SAMPLE,
  },
  {
    code: 'en-IN',
    label: 'English (India)',
    sampleText:
      'Good morning! Kindly confirm if we can prepone the regional operations review to Thursday afternoon at 2:30 PM IST.',
  },
  {
    code: 'ta-IN',
    label: 'Tamil (தமிழ்)',
    sampleText:
      'வணக்கம், உங்கள் வங்கி கணக்கு மற்றும் மாதாந்திர தவணை குறித்த தகவல்களை இங்கே எளிதாகப் பெறலாம்.',
  },
  {
    code: 'te-IN',
    label: 'Telugu (తెలుగు)',
    sampleText:
      'నమస్కారం, మీ అపాయింట్‌మెంట్ రేపు ఉదయం పది గంటలకు ఖరారు చేయబడింది.',
  },
  {
    code: 'kn-IN',
    label: 'Kannada (ಕನ್ನಡ)',
    sampleText:
      'ನಮಸ್ಕಾರ, ವೈಟ್‌ಫೀಲ್ಡ್ ಹಬ್‌ನಲ್ಲಿ ನಿಮ್ಮ ಪಾರ್ಸೆಲ್ ವಿತರಣೆಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ದಾಖಲಿಸಲಾಗಿದೆ.',
  },
  {
    code: 'mr-IN',
    label: 'Marathi (मराठी)',
    sampleText:
      'नमस्कार, आपल्या शाखेच्या बैठकीची वेळ उद्या दुपारी दोन वाजता निश्चित करण्यात आली आहे.',
  },
];

interface TranscriptTurn {
  role: 'agent' | 'user';
  text: string;
}

interface VoiceAgentPreset {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  iconType: 'cart' | 'emi' | 'appointment' | 'custom';
  greeting: string;
  transcript: TranscriptTurn[];
}

const INITIAL_AGENTS: VoiceAgentPreset[] = [
  {
    id: 'cart-recovery',
    name: 'Cart Recovery Nudge',
    subtitle: 'E-Commerce & D2C Order Assistance',
    description:
      'Assists shoppers who left items in their cart by answering delivery timeline, COD availability, and size-exchange questions in natural Indian English.',
    iconType: 'cart',
    greeting:
      'Hello! I noticed you left the ergonomic office chair in your cart. Would you like me to check Pin Code delivery timelines or Cash-on-Delivery options for you?',
    transcript: [
      {
        role: 'agent',
        text: 'Hello! I noticed you left the ergonomic office chair in your cart. Would you like me to check Pin Code delivery timelines or Cash-on-Delivery options for you?',
      },
      {
        role: 'user',
        text: 'Yes, how soon can it reach Indiranagar, Bengaluru? And is installation included?',
      },
      {
        role: 'agent',
        text: 'Delivery to Indiranagar (560038) takes 2 business days, and complimentary technician assembly is scheduled the next day. Shall I send your checkout link on WhatsApp?',
      },
    ],
  },
  {
    id: 'emi-reminder',
    name: 'EMI Payment Reminder',
    subtitle: 'BFSI & Lending Collections Support',
    description:
      'Provides polite, context-aware reminders for upcoming monthly installments and helps borrowers verify auto-debit mandate status or request a callback.',
    iconType: 'emi',
    greeting:
      'Namaste! This is a courteous reminder regarding your two-wheeler loan EMI of ₹4,850 scheduled for auto-debit on the 5th of this month.',
    transcript: [
      {
        role: 'agent',
        text: 'Namaste! This is a courteous reminder regarding your two-wheeler loan EMI of ₹4,850 scheduled for auto-debit on the 5th of this month.',
      },
      {
        role: 'user',
        text: 'My salary credit is slightly delayed this week. Can I pay via UPI link on the 7th instead?',
      },
      {
        role: 'agent',
        text: 'Understood. I have noted your promise-to-pay for the 7th and generated an official UPI payment link so you can complete the installment without branch visit.',
      },
    ],
  },
  {
    id: 'appointment-booking',
    name: 'Appointment Booking',
    subtitle: 'Healthcare & Service Desk Scheduling',
    description:
      'Handles scheduling, preponing, and rescheduling requests across clinics and enterprise service centers while respecting regional phrasing.',
    iconType: 'appointment',
    greeting:
      'Welcome to Apollo Diagnostics scheduling desk. Would you like to book a morning home-sample collection or reschedule an existing slot?',
    transcript: [
      {
        role: 'agent',
        text: 'Welcome to the diagnostics scheduling desk. Would you like to book a morning home-sample collection or reschedule an existing slot?',
      },
      {
        role: 'user',
        text: 'Kindly prepone my Saturday 10 AM fasting blood test to Friday 7:30 AM.',
      },
      {
        role: 'agent',
        text: 'Done! Your fasting sample collection has been preponed to Friday at 7:30 AM. Our phlebotomist will call 15 minutes prior to arrival.',
      },
    ],
  },
];

export const TryExperienceSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PlaygroundTabId>('voice-agents');

  // Shared audio state from voiceAudioBridge
  const [audioState, setAudioState] = useState(() => voiceAudioBridge.getState());

  // ── Tab 1: Voice Agents State ──
  const [agents, setAgents] = useState<VoiceAgentPreset[]>(INITIAL_AGENTS);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(INITIAL_AGENTS[0].id);
  const [agentSessionMode, setAgentSessionMode] = useState<
    'idle' | 'requesting-mic' | 'listening' | 'speaking'
  >('idle');
  const [agentStatusNotice, setAgentStatusNotice] = useState<string | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState<number>(0);
  const micRafRef = useRef<number | null>(null);
  const micAudioCtxRef = useRef<AudioContext | null>(null);

  // Build Your Own Agent Modal State
  const [buildModalOpen, setBuildModalOpen] = useState<boolean>(false);
  const [customAgentForm, setCustomAgentForm] = useState({
    name: '',
    purpose: '',
    greeting: '',
  });
  const [customAgentErrors, setCustomAgentErrors] = useState<{
    name?: string;
    purpose?: string;
    greeting?: string;
  }>({});
  const [customAgentSavedBanner, setCustomAgentSavedBanner] = useState<string | null>(null);

  // ── Tab 2: Text to Speech State ──
  const [selectedLang, setSelectedLang] = useState<string>('hi-IN');
  const [ttsText, setTtsText] = useState<string>(DEFAULT_HINDI_SAMPLE);
  const [ttsInputError, setTtsInputError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>(EMIQEN_TTS_VOICE_NAMES[0]);
  const [exploreAllVoices, setExploreAllVoices] = useState<boolean>(false);
  const MAX_TTS_CHARS = 500;

  // ── Tab 3: Speech to Text State ──
  const [sttStatus, setSttStatus] = useState<
    'idle' | 'requesting-permission' | 'listening' | 'stopped' | 'error'
  >('idle');
  const [sttTranscript, setSttTranscript] = useState<string>('');
  const [sttInterim, setSttInterim] = useState<string>('');
  const [sttError, setSttError] = useState<string | null>(null);
  const [sttCopied, setSttCopied] = useState<boolean>(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const selectedAgent =
    agents.find((a) => a.id === selectedAgentId) || agents[0];

  useEffect(() => {
    const unsubscribe = voiceAudioBridge.subscribe((state) => {
      setAudioState(state);
      if (
        state.activeId?.startsWith('agent-session-') &&
        (state.status === 'completed' || state.status === 'idle')
      ) {
        setAgentSessionMode((prev) => (prev === 'speaking' ? 'idle' : prev));
      }
    });
    return () => {
      unsubscribe();
      stopMicrophoneCapture();
      stopSttRecognition();
    };
  }, []);

  const stopMicrophoneCapture = () => {
    if (micRafRef.current !== null) {
      cancelAnimationFrame(micRafRef.current);
      micRafRef.current = null;
    }
    if (micStream) {
      micStream.getTracks().forEach((track) => track.stop());
      setMicStream(null);
    }
    if (micAudioCtxRef.current) {
      micAudioCtxRef.current.close().catch(() => {});
      micAudioCtxRef.current = null;
    }
    setMicLevel(0);
  };

  const stopSttRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }
    stopMicrophoneCapture();
  };

  const handleTabSwitch = (nextTab: PlaygroundTabId) => {
    if (nextTab === activeTab) return;
    voiceAudioBridge.stopPlayback();
    stopMicrophoneCapture();
    stopSttRecognition();
    setAgentSessionMode('idle');
    if (sttStatus === 'listening') {
      setSttStatus('stopped');
    }
    setActiveTab(nextTab);
  };

  // ── Voice Agents Handlers ──
  const handleSelectAgent = (agent: VoiceAgentPreset) => {
    voiceAudioBridge.stopPlayback();
    stopMicrophoneCapture();
    setSelectedAgentId(agent.id);
    setAgentSessionMode('idle');
    setAgentStatusNotice(null);
  };

  const handleStartAgentSpeaking = async () => {
    if (agentSessionMode !== 'idle') {
      handleStopAgentSession();
      return;
    }

    setAgentStatusNotice(null);
    setAgentSessionMode('requesting-mic');

    // Attempt honest microphone access first; if unavailable or denied, run clearly labeled demo greeting
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicStream(stream);
        setAgentSessionMode('listening');
        setAgentStatusNotice(
          'Microphone connected (browser local capture). Speak a phrase — after 3 seconds the agent will play its illustrative greeting.'
        );

        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioContextClass();
        micAudioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        const buf = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

        const startListen = performance.now();
        const monitorMic = () => {
          if (performance.now() - startListen > 3200) {
            stopMicrophoneCapture();
            playAgentGreetingSimulation();
            return;
          }
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128;
            sum += v * v;
          }
          setMicLevel(Math.min(1, Math.max(0.25, Math.sqrt(sum / buf.length) * 14)));
          micRafRef.current = requestAnimationFrame(monitorMic);
        };
        micRafRef.current = requestAnimationFrame(monitorMic);
        return;
      }
    } catch {
      // Microphone permission declined or unavailable in environment — fall back to clearly labeled agent greeting demo
    }

    setAgentStatusNotice(
      'Microphone access unavailable or declined — playing illustrative agent voice greeting in demo mode.'
    );
    playAgentGreetingSimulation();
  };

  const playAgentGreetingSimulation = () => {
    setAgentSessionMode('speaking');
    voiceAudioBridge.play({
      id: `agent-session-${selectedAgent.id}`,
      text: selectedAgent.greeting,
      lang: 'en-IN',
      durationMs: 4800,
      onEnded: () => {
        setAgentSessionMode('idle');
      },
    });
  };

  const handleStopAgentSession = () => {
    stopMicrophoneCapture();
    voiceAudioBridge.stopPlayback();
    setAgentSessionMode('idle');
    setAgentStatusNotice('Voice session ended.');
  };

  const handleSaveCustomAgent = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { name?: string; purpose?: string; greeting?: string } = {};
    if (!customAgentForm.name.trim()) {
      errs.name = 'Agent name is required';
    }
    if (!customAgentForm.purpose.trim()) {
      errs.purpose = 'Agent purpose / workflow is required';
    }
    if (!customAgentForm.greeting.trim()) {
      errs.greeting = 'Opening greeting is required';
    } else if (customAgentForm.greeting.trim().length < 10) {
      errs.greeting = 'Greeting must be at least 10 characters';
    }

    setCustomAgentErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const newId = `custom-${Date.now()}`;
    const newAgent: VoiceAgentPreset = {
      id: newId,
      name: customAgentForm.name.trim(),
      subtitle: customAgentForm.purpose.trim(),
      description: `Custom local agent prototype configured for ${customAgentForm.purpose.trim()}.`,
      iconType: 'custom',
      greeting: customAgentForm.greeting.trim(),
      transcript: [
        {
          role: 'agent',
          text: customAgentForm.greeting.trim(),
        },
        {
          role: 'user',
          text: 'Can you share the next steps for this workflow?',
        },
        {
          role: 'agent',
          text: `Certainly! This is a local prototype preview for "${customAgentForm.name.trim()}". Connect a live telephony/LLM backend to deploy in production.`,
        },
      ],
    };

    setAgents((prev) => [...prev, newAgent]);
    setSelectedAgentId(newId);
    setBuildModalOpen(false);
    setCustomAgentForm({ name: '', purpose: '', greeting: '' });
    setCustomAgentSavedBanner(
      `Saved "${newAgent.name}" to your local workspace. Note: This configuration is stored locally for evaluation and is not connected to a live calling backend.`
    );
  };

  // ── Text to Speech Handlers ──
  const handleLanguageChange = (langCode: string) => {
    voiceAudioBridge.stopPlayback();
    setSelectedLang(langCode);
    const langObj = TTS_LANGUAGES.find((l) => l.code === langCode);
    if (langObj) {
      setTtsText(langObj.sampleText);
      setTtsInputError(null);
    }
  };

  const handlePlayMainTts = () => {
    const trimmed = ttsText.trim();
    if (!trimmed) {
      setTtsInputError('Please enter some text before playing speech output.');
      return;
    }
    if (trimmed.length > MAX_TTS_CHARS) {
      setTtsInputError(`Text exceeds the ${MAX_TTS_CHARS}-character limit.`);
      return;
    }
    setTtsInputError(null);
    const voiceIdx = EMIQEN_TTS_VOICE_NAMES.indexOf(selectedVoice);
    const pitchFactor = 0.88 + ((Math.max(0, voiceIdx) * 7) % 10) * 0.028;

    voiceAudioBridge.play({
      id: `tts-main-${selectedVoice}`,
      text: trimmed,
      lang: selectedLang,
      pitchFactor,
    });
  };

  const handleSelectVoice = (voiceName: string) => {
    if (selectedVoice !== voiceName) {
      if (audioState.activeId?.startsWith('tts-')) {
        voiceAudioBridge.stopPlayback();
      }
      setSelectedVoice(voiceName);
    }
  };

  const handlePreviewVoice = (e: React.MouseEvent, voiceName: string, idx: number) => {
    e.stopPropagation();
    setSelectedVoice(voiceName);
    const previewId = `tts-preview-${voiceName}`;
    const pitchFactor = 0.88 + ((idx * 7) % 10) * 0.028;

    voiceAudioBridge.play({
      id: previewId,
      text: `Namaste, this is the ${voiceName} voice profile preview on EMIQEN.`,
      lang: 'en-IN',
      durationMs: 2800,
      pitchFactor,
    });
  };

  // ── Speech to Text Handlers ──
  const handleStartSttRecording = async () => {
    if (sttStatus === 'listening') {
      handleStopSttRecording();
      return;
    }

    voiceAudioBridge.stopPlayback();
    setSttError(null);
    setSttInterim('');
    setSttStatus('requesting-permission');

    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: new () => unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown })
        .webkitSpeechRecognition;

    // Request microphone stream for live waveform visualization only after user clicks Start Speaking
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicStream(stream);
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioContextClass();
        micAudioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        const buf = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

        const updateLevel = () => {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128;
            sum += v * v;
          }
          setMicLevel(Math.min(1, Math.max(0.22, Math.sqrt(sum / buf.length) * 15)));
          micRafRef.current = requestAnimationFrame(updateLevel);
        };
        micRafRef.current = requestAnimationFrame(updateLevel);
      }
    } catch {
      setSttStatus('error');
      setSttError(
        'Microphone permission was denied or no microphone device was found. Please allow microphone access in your browser settings to record live speech.'
      );
      return;
    }

    if (!SpeechRecognitionAPI) {
      stopMicrophoneCapture();
      setSttStatus('error');
      setSttError(
        'Your browser does not support the Web Speech Recognition API, and no backend STT endpoint is currently configured. Try Microsoft Edge or Google Chrome, or use the sample utterance control below.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI() as {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: ((ev: unknown) => void) | null;
        onerror: ((ev: { error?: string }) => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      };

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onresult = (event: unknown) => {
        const ev = event as {
          resultIndex: number;
          results: {
            length: number;
            [index: number]: { isFinal: boolean; 0: { transcript: string } };
          };
        };
        let finalChunk = '';
        let interimChunk = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i];
          if (res.isFinal) {
            finalChunk += res[0].transcript + ' ';
          } else {
            interimChunk += res[0].transcript;
          }
        }
        if (finalChunk) {
          setSttTranscript((prev) => (prev ? `${prev.trim()} ${finalChunk.trim()}` : finalChunk.trim()));
        }
        setSttInterim(interimChunk);
      };

      recognition.onerror = (ev) => {
        stopMicrophoneCapture();
        setSttStatus('error');
        setSttError(
          ev.error === 'not-allowed'
            ? 'Microphone permission was denied by the browser.'
            : `Speech recognition encountered an issue (${ev.error || 'network/audio'}).`
        );
      };

      recognition.onend = () => {
        stopMicrophoneCapture();
        setSttInterim('');
        setSttStatus((prev) => (prev === 'listening' ? 'stopped' : prev));
      };

      recognitionRef.current = recognition;
      recognition.start();
      setSttStatus('listening');
    } catch {
      stopMicrophoneCapture();
      setSttStatus('error');
      setSttError('Could not start browser speech recognition.');
    }
  };

  const handleStopSttRecording = () => {
    stopSttRecognition();
    setSttInterim('');
    setSttStatus('stopped');
  };

  const handleCopyTranscript = async () => {
    const fullText = `${sttTranscript} ${sttInterim}`.trim();
    if (!fullText) return;
    try {
      await navigator.clipboard.writeText(fullText);
      setSttCopied(true);
      setTimeout(() => setSttCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleClearTranscript = () => {
    setSttTranscript('');
    setSttInterim('');
    setSttError(null);
    if (sttStatus !== 'listening') {
      setSttStatus('idle');
    }
  };

  const scrollToContactWithTopic = (topic: string) => {
    const el = document.querySelector('#contact');
    if (el) {
      const selectEl = document.querySelector('#interest') as HTMLSelectElement | null;
      if (selectEl) {
        selectEl.value = topic;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const navOffset = 80;
      const offsetPosition = el.getBoundingClientRect().top + window.pageYOffset - navOffset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  // Determine main TTS button status
  const mainTtsId = `tts-main-${selectedVoice}`;
  const mainTtsStatus: WaveformPlaybackStatus =
    audioState.activeId === mainTtsId
      ? audioState.status
      : ttsInputError
      ? 'error'
      : 'idle';

  // Determine Voice Agent waveform status
  const currentAgentAudioId = `agent-session-${selectedAgent.id}`;
  const agentWaveformStatus: WaveformPlaybackStatus =
    agentSessionMode === 'requesting-mic'
      ? 'processing'
      : agentSessionMode === 'listening'
      ? 'playing'
      : audioState.activeId === currentAgentAudioId
      ? audioState.status
      : 'idle';

  const visibleVoices = exploreAllVoices
    ? EMIQEN_TTS_VOICE_NAMES
    : EMIQEN_TTS_VOICE_NAMES; // All 26 voices rendered in the scrollable container, with Explore Voices expanding container height

  return (
    <section
      id="try-experience"
      className="py-20 md:py-28 bg-gradient-to-b from-white via-emiqen-soft-bg/50 to-white border-t border-slate-100 scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-3.5 mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emiqen-soft-bg border border-emiqen-soft-border text-xs font-semibold text-emiqen-blue uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emiqen-cyan" />
            <span>Interactive AI Playground</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-emiqen-navy tracking-tight">
            Try the EMIQEN Experience
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Explore our three core voice and language modalities designed for Indian business workflows.
          </p>
        </div>

        {/* ── Top Horizontal Navigation Bar: Strictly 3 AI Experiences ── */}
        <div className="flex justify-center mb-8">
          <div
            role="tablist"
            aria-label="EMIQEN AI Playground Experiences"
            className="inline-flex items-center p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/90 shadow-subtle overflow-x-auto max-w-full gap-1.5"
          >
            <button
              type="button"
              role="tab"
              id="tab-voice-agents"
              aria-selected={activeTab === 'voice-agents'}
              aria-controls="panel-voice-agents"
              onClick={() => handleTabSwitch('voice-agents')}
              className={`inline-flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emiqen-blue ${
                activeTab === 'voice-agents'
                  ? 'bg-white text-emiqen-navy shadow-elevated border border-emiqen-blue/25'
                  : 'text-slate-600 hover:text-emiqen-navy hover:bg-white/60 active:scale-[0.98]'
              }`}
            >
              <Bot
                className={`w-4 h-4 transition-colors ${
                  activeTab === 'voice-agents' ? 'text-emiqen-blue' : 'text-slate-400'
                }`}
              />
              <span>Voice Agents</span>
              {activeTab === 'voice-agents' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emiqen-blue" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              role="tab"
              id="tab-text-to-speech"
              aria-selected={activeTab === 'text-to-speech'}
              aria-controls="panel-text-to-speech"
              onClick={() => handleTabSwitch('text-to-speech')}
              className={`inline-flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emiqen-blue ${
                activeTab === 'text-to-speech'
                  ? 'bg-white text-emiqen-navy shadow-elevated border border-emiqen-blue/25'
                  : 'text-slate-600 hover:text-emiqen-navy hover:bg-white/60 active:scale-[0.98]'
              }`}
            >
              <Volume2
                className={`w-4 h-4 transition-colors ${
                  activeTab === 'text-to-speech' ? 'text-emiqen-blue' : 'text-slate-400'
                }`}
              />
              <span>Text to Speech</span>
              {activeTab === 'text-to-speech' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emiqen-blue" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              role="tab"
              id="tab-speech-to-text"
              aria-selected={activeTab === 'speech-to-text'}
              aria-controls="panel-speech-to-text"
              onClick={() => handleTabSwitch('speech-to-text')}
              className={`inline-flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emiqen-blue ${
                activeTab === 'speech-to-text'
                  ? 'bg-white text-emiqen-navy shadow-elevated border border-emiqen-blue/25'
                  : 'text-slate-600 hover:text-emiqen-navy hover:bg-white/60 active:scale-[0.98]'
              }`}
            >
              <FileAudio
                className={`w-4 h-4 transition-colors ${
                  activeTab === 'speech-to-text' ? 'text-emiqen-blue' : 'text-slate-400'
                }`}
              />
              <span>Speech to Text</span>
              {activeTab === 'speech-to-text' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emiqen-blue" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            TAB 1: VOICE AGENTS (Three-Column Workspace on Desktop)
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'voice-agents' && (
          <div
            id="panel-voice-agents"
            role="tabpanel"
            aria-labelledby="tab-voice-agents"
            className="rounded-3xl border border-emiqen-soft-border bg-white shadow-elevated overflow-hidden"
          >
            {customAgentSavedBanner && (
              <div className="bg-blue-50/90 border-b border-blue-200 px-6 py-3 flex items-center justify-between gap-3 text-xs text-emiqen-navy">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-emiqen-blue shrink-0" />
                  <span>{customAgentSavedBanner}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomAgentSavedBanner(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/80">
              {/* Left Panel: Choose an Agent */}
              <div className="lg:col-span-3 p-6 bg-slate-50/50 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Step 1
                    </span>
                    <h3 className="text-base font-bold text-emiqen-navy mt-0.5">
                      Choose an Agent
                    </h3>
                  </div>

                  <div className="space-y-2.5" role="listbox" aria-label="Selectable Voice Agents">
                    {agents.map((agent) => {
                      const isSelected = agent.id === selectedAgent.id;
                      const IconComponent =
                        agent.iconType === 'cart'
                          ? ShoppingBag
                          : agent.iconType === 'emi'
                          ? CalendarClock
                          : agent.iconType === 'appointment'
                          ? CalendarCheck
                          : Bot;

                      return (
                        <button
                          key={agent.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelectAgent(agent)}
                          className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emiqen-blue ${
                            isSelected
                              ? 'bg-white border-emiqen-blue shadow-sm ring-1 ring-emiqen-blue/20 -translate-y-0.5'
                              : 'bg-white/70 border-slate-200/80 hover:bg-white hover:border-emiqen-blue/40 hover:-translate-y-0.5'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-emiqen-blue text-white shadow-xs'
                                : 'bg-emiqen-soft-bg text-emiqen-blue'
                            }`}
                          >
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-emiqen-navy truncate">
                              {agent.name}
                            </div>
                            <div className="text-xs text-slate-500 truncate mt-0.5">
                              {agent.subtitle}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-500 space-y-1">
                  <span className="font-semibold text-emiqen-navy block">
                    Interactive Prototype
                  </span>
                  <p className="leading-relaxed">
                    Select an enterprise agent scenario to inspect its workflow context and test voice interaction.
                  </p>
                </div>
              </div>

              {/* Center Panel: Voice Interaction */}
              <div className="lg:col-span-5 p-6 sm:p-8 bg-gradient-to-b from-white via-emiqen-soft-bg/40 to-indigo-50/40 flex flex-col items-center justify-between text-center min-h-[440px]">
                <div className="space-y-1.5 max-w-md">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emiqen-blue bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                    {selectedAgent.subtitle}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-emiqen-navy">
                    {selectedAgent.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {selectedAgent.description}
                  </p>
                </div>

                {/* Large Softly Glowing Circular Voice Indicator */}
                <div className="my-6 flex flex-col items-center gap-4">
                  <div className="relative flex items-center justify-center">
                    {/* Outer glowing rings */}
                    <div
                      className={`w-44 h-44 rounded-full transition-all duration-500 flex items-center justify-center ${
                        agentSessionMode !== 'idle'
                          ? 'bg-gradient-to-tr from-emiqen-blue/20 via-emiqen-cyan/25 to-emiqen-violet/20 scale-105 shadow-[0_0_45px_-5px_rgba(0,212,232,0.45)]'
                          : 'bg-gradient-to-tr from-emiqen-blue/10 via-emiqen-cyan/10 to-emiqen-violet/10'
                      }`}
                    >
                      <div
                        className={`w-32 h-32 rounded-full border transition-all duration-300 flex flex-col items-center justify-center gap-2 bg-white shadow-elevated ${
                          agentSessionMode !== 'idle'
                            ? 'border-emiqen-cyan ring-4 ring-emiqen-blue/15'
                            : 'border-emiqen-soft-border'
                        }`}
                      >
                        <WaveformVisualizer
                          status={agentWaveformStatus}
                          level={
                            agentSessionMode === 'listening'
                              ? micLevel
                              : audioState.level
                          }
                          barCount={6}
                          size="md"
                          className="border-none bg-transparent shadow-none px-0"
                          ariaLabel="Voice agent activity indicator"
                        />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emiqen-navy">
                          {agentSessionMode === 'requesting-mic'
                            ? 'Connecting Mic…'
                            : agentSessionMode === 'listening'
                            ? 'Listening…'
                            : agentSessionMode === 'speaking'
                            ? 'Agent Speaking'
                            : 'Ready'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Controls & Honest Status */}
                <div className="w-full max-w-sm space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    {agentSessionMode === 'idle' ? (
                      <button
                        type="button"
                        onClick={handleStartAgentSpeaking}
                        className="btn-emiqen-primary px-7 py-3.5 text-sm w-full sm:w-auto"
                      >
                        <Mic className="w-4 h-4 text-emiqen-cyan" />
                        <span>Start Speaking</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStopAgentSession}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all shadow-sm"
                      >
                        <Square className="w-4 h-4 fill-current" />
                        <span>End Session</span>
                      </button>
                    )}
                  </div>

                  {agentStatusNotice && (
                    <p className="text-xs text-slate-600 bg-white/90 border border-slate-200/80 rounded-xl px-3.5 py-2 leading-relaxed">
                      {agentStatusNotice}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Panel: Illustrative Transcript & Build Your Own Agent */}
              <div className="lg:col-span-4 p-6 bg-slate-50/40 flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emiqen-violet block">
                        Illustrative Example
                      </span>
                      <h4 className="text-base font-bold text-emiqen-navy">
                        Conversation Transcript
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-600">
                      Sample Dialogue
                    </span>
                  </div>

                  {/* Chat Bubbles */}
                  <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
                    {selectedAgent.transcript.map((turn, idx) => {
                      const isAgent = turn.role === 'agent';
                      return (
                        <div
                          key={idx}
                          className={`flex items-start gap-2.5 ${
                            isAgent ? 'justify-start' : 'justify-end'
                          }`}
                        >
                          {isAgent && (
                            <div className="w-7 h-7 rounded-full bg-emiqen-navy text-emiqen-cyan flex items-center justify-center shrink-0 mt-0.5">
                              <Bot className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div
                            className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed max-w-[85%] ${
                              isAgent
                                ? 'bg-white border border-slate-200/90 text-slate-700 shadow-2xs rounded-tl-sm'
                                : 'bg-emiqen-blue text-white shadow-xs rounded-tr-sm'
                            }`}
                          >
                            <span
                              className={`block text-[10px] font-bold uppercase tracking-wider mb-0.5 ${
                                isAgent ? 'text-emiqen-blue' : 'text-cyan-100'
                              }`}
                            >
                              {isAgent ? selectedAgent.name : 'Customer / User'}
                            </span>
                            {turn.text}
                          </div>
                          {!isAgent && (
                            <div className="w-7 h-7 rounded-full bg-emiqen-blue/15 text-emiqen-blue flex items-center justify-center shrink-0 mt-0.5">
                              <User className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Build Your Own Agent CTA */}
                <div className="pt-4 border-t border-slate-200/80 space-y-2">
                  <button
                    type="button"
                    onClick={() => setBuildModalOpen(true)}
                    className="btn-emiqen-secondary w-full py-3 px-4 text-xs sm:text-sm group"
                  >
                    <Plus className="w-4 h-4 text-emiqen-blue transition-transform duration-200 group-hover:rotate-90" />
                    <span>Build Your Own Agent</span>
                  </button>
                  <p className="text-[11px] text-slate-400 text-center">
                    Configure a custom agent greeting and workflow for local evaluation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 2: TEXT TO SPEECH (Two-Column Interface on Desktop)
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'text-to-speech' && (
          <div
            id="panel-text-to-speech"
            role="tabpanel"
            aria-labelledby="tab-text-to-speech"
            className="rounded-3xl border border-emiqen-soft-border bg-white shadow-elevated overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/80">
              {/* Left Panel: Language Selector + Text Input + Play Control */}
              <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6 bg-gradient-to-b from-white to-emiqen-soft-bg/30">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emiqen-blue block">
                        Speech Synthesis Input
                      </span>
                      <h3 className="text-xl font-extrabold text-emiqen-navy">
                        Indian-Context Text to Speech
                      </h3>
                    </div>

                    {/* Language Selector */}
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="tts-language-select"
                        className="text-xs font-semibold text-slate-600 whitespace-nowrap"
                      >
                        Language:
                      </label>
                      <select
                        id="tts-language-select"
                        value={selectedLang}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-emiqen-navy focus:outline-none focus:border-emiqen-blue focus:ring-2 focus:ring-emiqen-blue/25 transition-all cursor-pointer"
                      >
                        {TTS_LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Editable Textarea with Character Counter */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <label htmlFor="tts-textarea" className="font-semibold text-slate-700">
                        Enter or edit text to synthesize
                      </label>
                      <span
                        className={`font-mono text-[11px] ${
                          ttsText.length > MAX_TTS_CHARS
                            ? 'text-rose-600 font-bold'
                            : 'text-slate-400'
                        }`}
                      >
                        {ttsText.length} / {MAX_TTS_CHARS} characters
                      </span>
                    </div>

                    <textarea
                      id="tts-textarea"
                      rows={6}
                      maxLength={MAX_TTS_CHARS}
                      value={ttsText}
                      onChange={(e) => {
                        setTtsText(e.target.value);
                        if (ttsInputError) setTtsInputError(null);
                      }}
                      placeholder="Type or paste Hindi or Indian English text here..."
                      className={`w-full p-4 rounded-2xl border text-sm sm:text-base text-slate-800 leading-relaxed bg-white focus:outline-none focus:ring-2 focus:ring-emiqen-blue/30 transition-all resize-none ${
                        ttsInputError
                          ? 'border-rose-400 bg-rose-50/20'
                          : 'border-slate-200 focus:border-emiqen-blue'
                      }`}
                    />

                    {ttsInputError && (
                      <p className="text-xs text-rose-600 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{ttsInputError}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Playback Bar & Try TTS CTA */}
                <div className="pt-4 border-t border-slate-200/80 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handlePlayMainTts}
                        disabled={mainTtsStatus === 'processing'}
                        className="btn-emiqen-primary px-6 py-3 text-sm"
                      >
                        {mainTtsStatus === 'playing' ? (
                          <>
                            <Pause className="w-4 h-4 text-emiqen-cyan" />
                            <span>Pause ({selectedVoice})</span>
                          </>
                        ) : mainTtsStatus === 'paused' ? (
                          <>
                            <Play className="w-4 h-4 text-emiqen-cyan fill-current" />
                            <span>Resume ({selectedVoice})</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 text-emiqen-cyan fill-current" />
                            <span>Play with {selectedVoice}</span>
                          </>
                        )}
                      </button>

                      {(mainTtsStatus === 'playing' || mainTtsStatus === 'paused') && (
                        <button
                          type="button"
                          onClick={() => voiceAudioBridge.stopPlayback()}
                          aria-label="Stop speech synthesis"
                          className="p-3 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors"
                        >
                          <Square className="w-4 h-4 fill-current" />
                        </button>
                      )}
                    </div>

                    <WaveformVisualizer
                      status={mainTtsStatus}
                      level={audioState.activeId === mainTtsId ? audioState.level : 0}
                      barCount={8}
                      size="md"
                      showStatusBadge
                      ariaLabel="Text to speech output waveform"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <span>
                      Selected Voice Profile: <strong className="text-emiqen-navy">{selectedVoice}</strong> · Browser & Web Audio synthesis preview
                    </span>
                    <button
                      type="button"
                      onClick={() => scrollToContactWithTopic('Customer Interaction & Voice')}
                      className="group text-emiqen-blue hover:text-emiqen-blue-hover font-semibold inline-flex items-center gap-1 transition-colors"
                    >
                      <span>Try Text to Speech Integration</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Panel: Scrollable List of 26 Selectable Voice Cards */}
              <div className="lg:col-span-5 p-6 sm:p-8 bg-slate-50/50 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Voice Catalog ({EMIQEN_TTS_VOICE_NAMES.length} Voices)
                    </span>
                    <h4 className="text-base font-bold text-emiqen-navy">
                      Select a Voice Profile
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExploreAllVoices((prev) => !prev)}
                    className="btn-emiqen-secondary px-3 py-1.5 text-xs"
                  >
                    <span>{exploreAllVoices ? 'Compact View' : 'Explore Voices'}</span>
                    {exploreAllVoices ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* 26 Voice Cards Container */}
                <div
                  role="listbox"
                  aria-label="EMIQEN 26 Voice Catalog"
                  className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto pr-1 transition-all duration-300 ${
                    exploreAllVoices ? 'max-h-[540px]' : 'max-h-[320px]'
                  }`}
                >
                  {visibleVoices.map((voiceName, idx) => {
                    const isSelected = selectedVoice === voiceName;
                    const previewId = `tts-preview-${voiceName}`;
                    const isPreviewPlaying =
                      audioState.activeId === previewId &&
                      (audioState.status === 'playing' || audioState.status === 'processing');

                    return (
                      <div
                        key={voiceName}
                        role="option"
                        tabIndex={0}
                        aria-selected={isSelected}
                        onClick={() => handleSelectVoice(voiceName)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectVoice(voiceName);
                          }
                        }}
                        className={`p-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emiqen-blue ${
                          isPreviewPlaying
                            ? 'bg-emiqen-soft-bg border-emiqen-cyan shadow-sm ring-1 ring-emiqen-cyan/40'
                            : isSelected
                            ? 'bg-white border-emiqen-blue shadow-xs ring-1 ring-emiqen-blue/25'
                            : 'bg-white/80 border-slate-200/80 hover:bg-white hover:border-emiqen-blue/40 hover:-translate-y-0.5'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isPreviewPlaying
                                ? 'bg-emiqen-cyan animate-ping'
                                : isSelected
                                ? 'bg-emiqen-blue'
                                : 'bg-slate-300'
                            }`}
                          />
                          <div className="truncate">
                            <span className="text-sm font-bold text-emiqen-navy block truncate">
                              {voiceName}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {isPreviewPlaying
                                ? 'Playing preview…'
                                : isSelected
                                ? 'Selected'
                                : 'Catalog Voice'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handlePreviewVoice(e, voiceName, idx)}
                          aria-label={`Preview ${voiceName} voice`}
                          title={`Preview ${voiceName} voice`}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emiqen-blue ${
                            isPreviewPlaying
                              ? 'bg-emiqen-blue text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-emiqen-blue hover:text-white'
                          }`}
                        >
                          {isPreviewPlaying ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200/80 text-[11px] text-slate-500 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-emiqen-blue shrink-0 mt-0.5" />
                  <span>
                    All 26 voices represent the EMIQEN UI voice catalog. Dedicated neural voice weights are in active development; previews use local acoustic synthesis.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 3: SPEECH TO TEXT (Spacious Centered Transcription Workspace)
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'speech-to-text' && (
          <div
            id="panel-speech-to-text"
            role="tabpanel"
            aria-labelledby="tab-speech-to-text"
            className="rounded-3xl border border-emiqen-soft-border bg-gradient-to-b from-white via-emiqen-soft-bg/40 to-indigo-50/50 shadow-elevated p-6 sm:p-12"
          >
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emiqen-blue bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  Live Speech Recognition Workspace
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-emiqen-navy">
                  Speak to See Live Captions
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
                  Click <strong>Start Speaking</strong> to grant microphone access and transcribe spoken Indian English or regional phrasing in real time.
                </p>
              </div>

              {/* Primary Microphone Control + Live Waveform */}
              <div className="flex flex-col items-center justify-center gap-4 py-2">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {sttStatus !== 'listening' ? (
                    <button
                      type="button"
                      onClick={handleStartSttRecording}
                      disabled={sttStatus === 'requesting-permission'}
                      className="btn-emiqen-primary px-8 py-4 text-sm sm:text-base"
                    >
                      <Mic className="w-5 h-5 text-emiqen-cyan" />
                      <span>
                        {sttStatus === 'requesting-permission'
                          ? 'Requesting Microphone…'
                          : 'Start Speaking'}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopSttRecording}
                      className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl text-sm sm:text-base font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all shadow-elevated"
                    >
                      <MicOff className="w-5 h-5" />
                      <span>Stop Recording</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSttTranscript(
                        'Kindly prepone the Whitefield hub dispatch audit to Thursday at 2:30 PM IST and circulate the summary note.'
                      );
                      setSttError(null);
                      setSttStatus('stopped');
                    }}
                    className="btn-emiqen-secondary px-4 py-4 text-xs sm:text-sm"
                  >
                    <span>Insert Sample Utterance (Demo)</span>
                  </button>
                </div>

                <WaveformVisualizer
                  status={
                    sttStatus === 'requesting-permission'
                      ? 'processing'
                      : sttStatus === 'listening'
                      ? 'playing'
                      : sttStatus === 'error'
                      ? 'error'
                      : 'idle'
                  }
                  level={sttStatus === 'listening' ? micLevel : 0}
                  barCount={12}
                  size="md"
                  showStatusBadge
                  ariaLabel="Speech to text microphone waveform"
                />
              </div>

              {/* Error or Permission Feedback */}
              {sttError && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs sm:text-sm text-rose-700 flex items-start gap-2.5 text-left max-w-2xl mx-auto">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{sttError}</span>
                </div>
              )}

              {/* Live Captions Display Box */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 text-left shadow-subtle min-h-[160px] flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emiqen-navy">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        sttStatus === 'listening'
                          ? 'bg-emerald-500 animate-ping'
                          : 'bg-slate-300'
                      }`}
                    />
                    <span>
                      {sttStatus === 'listening'
                        ? 'Listening for speech…'
                        : sttTranscript
                        ? 'Captured Transcript'
                        : 'Waiting for audio input'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyTranscript}
                      disabled={!sttTranscript && !sttInterim}
                      className="btn-emiqen-secondary px-3 py-1.5 text-xs disabled:opacity-40"
                      aria-label="Copy transcript to clipboard"
                    >
                      {sttCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Transcript</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleClearTranscript}
                      disabled={!sttTranscript && !sttInterim}
                      className="btn-emiqen-secondary px-3 py-1.5 text-xs hover:text-rose-600 hover:border-rose-200 disabled:opacity-40"
                      aria-label="Clear transcript"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Transcript</span>
                    </button>
                  </div>
                </div>

                <div className="py-2">
                  {sttTranscript || sttInterim ? (
                    <p className="text-base sm:text-lg text-emiqen-navy leading-relaxed font-medium">
                      {sttTranscript}{' '}
                      {sttInterim && (
                        <span className="text-emiqen-blue/70 italic">{sttInterim}</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">
                      Your live captions will appear here as you speak, or click &ldquo;Insert Sample Utterance (Demo)&rdquo; to inspect transcript formatting.
                    </p>
                  )}
                </div>
              </div>

              {/* Bottom CTA */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 border-t border-slate-200/60">
                <span>
                  Uses browser SpeechRecognition when supported · Enterprise STT API in development
                </span>
                <button
                  type="button"
                  onClick={() => scrollToContactWithTopic('Field Services & Hands-free Operations')}
                  className="group text-emiqen-blue hover:text-emiqen-blue-hover font-semibold inline-flex items-center gap-1 transition-colors"
                >
                  <span>Try Speech to Text Integration</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Build Your Own Agent Configuration Modal ── */}
      {buildModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="build-agent-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emiqen-navy/60 backdrop-blur-sm"
        >
          <div className="bg-white rounded-2xl border border-emiqen-soft-border shadow-elevated max-w-lg w-full overflow-hidden">
            <div className="bg-gradient-to-r from-emiqen-navy via-emiqen-navy-light to-emiqen-navy px-6 py-4 flex items-center justify-between text-white">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emiqen-cyan block">
                  Agent Prototype Builder
                </span>
                <h3 id="build-agent-modal-title" className="text-lg font-bold">
                  Build Your Own Agent
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBuildModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomAgent} noValidate className="p-6 space-y-4">
              <div className="space-y-1">
                <label htmlFor="agent-name" className="block text-xs font-semibold text-emiqen-navy">
                  Agent Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="agent-name"
                  type="text"
                  value={customAgentForm.name}
                  onChange={(e) => {
                    setCustomAgentForm({ ...customAgentForm, name: e.target.value });
                    if (customAgentErrors.name)
                      setCustomAgentErrors({ ...customAgentErrors, name: undefined });
                  }}
                  placeholder="e.g. Logistics Dispatch Coordinator"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emiqen-blue focus:outline-none focus:ring-2 focus:ring-emiqen-blue/25 text-sm"
                />
                {customAgentErrors.name && (
                  <p className="text-xs text-rose-600">{customAgentErrors.name}</p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="agent-purpose"
                  className="block text-xs font-semibold text-emiqen-navy"
                >
                  Workflow Purpose / Domain <span className="text-rose-500">*</span>
                </label>
                <input
                  id="agent-purpose"
                  type="text"
                  value={customAgentForm.purpose}
                  onChange={(e) => {
                    setCustomAgentForm({ ...customAgentForm, purpose: e.target.value });
                    if (customAgentErrors.purpose)
                      setCustomAgentErrors({ ...customAgentErrors, purpose: undefined });
                  }}
                  placeholder="e.g. Hub Consignment Verification"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emiqen-blue focus:outline-none focus:ring-2 focus:ring-emiqen-blue/25 text-sm"
                />
                {customAgentErrors.purpose && (
                  <p className="text-xs text-rose-600">{customAgentErrors.purpose}</p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="agent-greeting"
                  className="block text-xs font-semibold text-emiqen-navy"
                >
                  Opening Greeting <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="agent-greeting"
                  rows={3}
                  value={customAgentForm.greeting}
                  onChange={(e) => {
                    setCustomAgentForm({ ...customAgentForm, greeting: e.target.value });
                    if (customAgentErrors.greeting)
                      setCustomAgentErrors({ ...customAgentErrors, greeting: undefined });
                  }}
                  placeholder="e.g. Namaste! Please share your consignment number to verify gate handover status."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emiqen-blue focus:outline-none focus:ring-2 focus:ring-emiqen-blue/25 text-sm resize-none"
                />
                {customAgentErrors.greeting && (
                  <p className="text-xs text-rose-600">{customAgentErrors.greeting}</p>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
                <Info className="w-4 h-4 text-emiqen-blue shrink-0 mt-0.5" />
                <span>
                  Saved agents are added to your local browser playground for testing and are not deployed to live telephony infrastructure.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setBuildModalOpen(false)}
                  className="btn-emiqen-secondary px-4 py-2.5 text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-emiqen-primary px-5 py-2.5 text-xs">
                  Save & Select Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

