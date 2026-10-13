import React, { useEffect, useState } from 'react';
import { siteContent } from '../data/siteContent';
import { voiceAudioBridge, VoiceAudioState } from '../services/voiceAudioBridge';
import { WaveformVisualizer } from './WaveformVisualizer';
import {
  Users,
  FileCheck,
  Briefcase,
  Headphones,
  Info,
  Mic,
  AlignLeft,
  Volume2,
  Square,
  ArrowRight,
} from 'lucide-react';

const USE_CASE_ICONS = {
  'customer-interaction': Users,
  'knowledge-workflows': FileCheck,
  'internal-assistants': Briefcase,
  'voice-services': Headphones,
};

export const UseCasesSection: React.FC = () => {
  const { useCases } = siteContent;
  const [audioSnap, setAudioSnap] = useState<VoiceAudioState>(voiceAudioBridge.getState());

  useEffect(() => {
    return voiceAudioBridge.subscribe(setAudioSnap);
  }, []);

  const handleToggleSample = (itemId: string, sampleInput: string) => {
    const playId = `usecase-${itemId}`;
    const isThisActive =
      audioSnap.activeId === playId &&
      (audioSnap.status === 'playing' || audioSnap.status === 'processing' || audioSnap.status === 'paused');

    if (isThisActive) {
      voiceAudioBridge.stopPlayback();
    } else {
      const cleanText = sampleInput.replace(/^["“]|["”]$/g, '');
      voiceAudioBridge.play({
        id: playId,
        text: cleanText,
        lang: 'en-IN',
      });
    }
  };

  const scrollToPlayground = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.querySelector('#try-experience');
    if (target) {
      const navOffset = 80;
      const pos = target.getBoundingClientRect().top + window.scrollY - navOffset;
      window.scrollTo({ top: pos, behavior: 'smooth' });
    }
  };

  return (
    <section id="use-cases" className="py-20 md:py-28 bg-emiqen-soft-bg/50 border-t border-slate-200/80 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100/80 text-xs font-semibold text-emiqen-violet uppercase tracking-wider">
            <span>{useCases.badge}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-emiqen-navy tracking-tight">
            {useCases.heading}
          </h2>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            {useCases.intro}
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {useCases.items.map((item) => {
            const Icon =
              USE_CASE_ICONS[item.id as keyof typeof USE_CASE_ICONS] || Users;
            const playId = `usecase-${item.id}`;
            const isActive = audioSnap.activeId === playId;
            const cardWaveState = isActive ? audioSnap.status : 'idle';
            const isPlaying = isActive && (audioSnap.status === 'playing' || audioSnap.status === 'processing');

            return (
              <div
                key={item.id}
                className="card-emiqen-interactive rounded-2xl border border-emiqen-soft-border bg-white p-7 sm:p-8 shadow-subtle flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-emiqen-soft-bg border border-slate-100 flex items-center justify-center text-emiqen-blue group-hover:bg-emiqen-blue group-hover:text-white transition-colors duration-300">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 flex items-center gap-1">
                        {item.inputMode.includes('Voice') && (
                          <Mic className="w-3 h-3 text-emiqen-blue" />
                        )}
                        {item.inputMode.includes('Text') && (
                          <AlignLeft className="w-3 h-3 text-emiqen-violet" />
                        )}
                        <span>{item.inputMode}</span>
                      </span>
                    </div>
                  </div>

                  {/* Title & Domain */}
                  <div className="space-y-1 mb-3">
                    <span className="text-xs font-semibold text-emiqen-blue uppercase tracking-wider">
                      {item.scenario}
                    </span>
                    <h3 className="text-xl font-bold text-emiqen-navy">
                      {item.title}
                    </h3>
                  </div>

                  {/* Summary */}
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6">
                    {item.summary}
                  </p>
                </div>

                {/* Illustrative Query Block */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                    <span>Illustrative Sample Query</span>
                    <span className="text-slate-500 font-normal">
                      Focus: {item.focusArea}
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3.5 text-xs text-slate-700 italic font-mono leading-relaxed">
                    {item.sampleInput}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleSample(item.id, item.sampleInput)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emiqen-blue ${
                          isPlaying
                            ? 'bg-emiqen-navy text-white'
                            : 'bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-emiqen-blue'
                        }`}
                        aria-label={isPlaying ? `Stop sample query for ${item.title}` : `Listen to sample query for ${item.title}`}
                      >
                        {isPlaying ? (
                          <>
                            <Square className="w-3 h-3 fill-current text-emiqen-cyan" />
                            <span>Stop Sample</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-emiqen-blue" />
                            <span>Hear Sample</span>
                          </>
                        )}
                      </button>
                      <WaveformVisualizer
                        status={cardWaveState}
                        level={isActive ? audioSnap.level : 0}
                        barCount={7}
                        size="sm"
                      />
                    </div>

                    <a
                      href="#try-experience"
                      onClick={scrollToPlayground}
                      className="btn-emiqen-ghost inline-flex items-center gap-1 text-xs font-semibold text-emiqen-blue hover:text-emiqen-blue-hover"
                    >
                      <span>Test in Playground</span>
                      <ArrowRight className="w-3.5 h-3.5 btn-arrow-icon" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mandatory Note */}
        <div className="mt-12 max-w-2xl mx-auto text-center p-4 rounded-xl bg-white/80 border border-slate-200/80 shadow-xs flex items-center justify-center gap-2.5 text-xs text-slate-500">
          <Info className="w-4 h-4 text-emiqen-violet shrink-0" />
          <p className="italic">{useCases.note}</p>
        </div>
      </div>
    </section>
  );
};

