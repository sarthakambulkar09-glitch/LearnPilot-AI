import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  RotateCw,
  Sparkles,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Volume2,
  VolumeX,
  Search,
  BookOpen,
  Filter,
  Plus,
  Trash2,
  ExternalLink,
  Flame,
  Award,
  Lightbulb,
  FileText,
  Upload,
  Globe
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Flashcard, Subject, RemedialLearningPath } from '../types';
import { StorageService } from '../services/storage';
import { ApiClient } from '../services/apiClient';

interface FlashcardsSectionProps {
  subjects: Subject[];
  remedialPaths?: RemedialLearningPath[];
  initialTopicFilter?: string;
  onNavigateToExam?: () => void;
}

export const FlashcardsSection: React.FC<FlashcardsSectionProps> = ({
  subjects,
  remedialPaths = [],
  initialTopicFilter,
  onNavigateToExam
}) => {
  const [cards, setCards] = useState<Flashcard[]>(() => StorageService.getFlashcards());
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  
  // Filtering & Search
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>(initialTopicFilter || 'all');
  const [filterMode, setFilterMode] = useState<'all' | 'unmastered' | 'mastered'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Audio / Speech State
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Search Grounding Modal / Panel
  const [searchGroundedResult, setSearchGroundedResult] = useState<{
    query: string;
    summary: string;
    sources: Array<{ title: string; uri: string }>;
  } | null>(null);
  const [isSearchingConcept, setIsSearchingConcept] = useState<boolean>(false);

  // AI Generator Modal State
  const [showGeneratorModal, setShowGeneratorModal] = useState<boolean>(false);
  const [genSubject, setGenSubject] = useState<string>(subjects[0]?.name || 'Computer Science');
  const [genTopic, setGenTopic] = useState<string>('');
  const [genCount, setGenCount] = useState<number>(6);
  const [genDifficulty, setGenDifficulty] = useState<string>('medium');
  const [genNotes, setGenNotes] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatorError, setGeneratorError] = useState<string | null>(null);

  // Filter cards
  const filteredCards = cards.filter(c => {
    if (selectedSubject !== 'all' && c.subjectName !== selectedSubject) return false;
    if (selectedTopic !== 'all' && c.topicName !== selectedTopic) return false;
    if (filterMode === 'mastered' && !c.mastered) return false;
    if (filterMode === 'unmastered' && c.mastered) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        c.front.toLowerCase().includes(q) ||
        c.back.toLowerCase().includes(q) ||
        c.topicName.toLowerCase().includes(q) ||
        (c.mnemonic && c.mnemonic.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const activeCard: Flashcard | undefined = filteredCards[currentIndex];

  // Reset index when filters change
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
  }, [selectedSubject, selectedTopic, filterMode, searchQuery]);

  // Keyboard Navigation: Space to flip, Arrows for Next/Prev, 1-4 for ratings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (isFlipped && activeCard) {
        if (e.key === '1') handleRateCard(false);
        if (e.key === '4') handleRateCard(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredCards.length, currentIndex, isFlipped, activeCard]);

  // Card Navigation
  const handleNext = () => {
    if (filteredCards.length === 0) return;
    setIsFlipped(false);
    setShowHint(false);
    stopSpeech();
    setCurrentIndex(prev => (prev + 1) % filteredCards.length);
  };

  const handlePrev = () => {
    if (filteredCards.length === 0) return;
    setIsFlipped(false);
    setShowHint(false);
    stopSpeech();
    setCurrentIndex(prev => (prev - 1 + filteredCards.length) % filteredCards.length);
  };

  // Shuffle Deck
  const handleShuffle = () => {
    setIsFlipped(false);
    setShowHint(false);
    stopSpeech();
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
  };

  // Spaced Repetition Rate Card
  const handleRateCard = (mastered: boolean) => {
    if (!activeCard) return;

    StorageService.updateFlashcardMastery(activeCard.id, mastered);
    
    // Update local state
    setCards(prev =>
      prev.map(c =>
        c.id === activeCard.id
          ? {
              ...c,
              mastered,
              reviewCount: (c.reviewCount || 0) + 1,
              lastReviewed: new Date().toISOString()
            }
          : c
      )
    );

    if (mastered) {
      confetti({
        particleCount: 28,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#10b981', '#06b6d4', '#6366f1']
      });
    }

    // Automatically transition to next card
    setTimeout(() => {
      handleNext();
    }, 280);
  };

  // Text to Speech
  const toggleSpeech = (text: string) => {
    if (isSpeaking) {
      stopSpeech();
      return;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Live Web Search Grounding for Concept
  const handleSearchConcept = async (conceptQuery: string, subject: string, topic: string) => {
    setIsSearchingConcept(true);
    try {
      const res = await ApiClient.searchConcept({
        query: conceptQuery,
        subject,
        topic
      });
      setSearchGroundedResult({
        query: conceptQuery,
        summary: res.summary,
        sources: res.sources
      });
    } catch (err) {
      console.error('Failed to search concept:', err);
    } finally {
      setIsSearchingConcept(false);
    }
  };

  // AI Flashcard Generation Handler
  const handleGenerateCards = async () => {
    if (!genSubject.trim() || !genTopic.trim()) {
      setGeneratorError('Please specify both a subject and a topic.');
      return;
    }

    setIsGenerating(true);
    setGeneratorError(null);

    try {
      const res = await ApiClient.generateFlashcards({
        subject: genSubject.trim(),
        topic: genTopic.trim(),
        count: genCount,
        difficulty: genDifficulty,
        sourceNotes: genNotes
      });

      if (res.flashcards && res.flashcards.length > 0) {
        StorageService.addFlashcards(res.flashcards);
        const refreshed = StorageService.getFlashcards();
        setCards(refreshed);
        setSelectedSubject(genSubject.trim());
        setSelectedTopic(genTopic.trim());
        setShowGeneratorModal(false);
        setGenTopic('');
        setGenNotes('');
      } else {
        setGeneratorError('No flashcards were generated. Please try again.');
      }
    } catch (err: any) {
      setGeneratorError(err.message || 'Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Metrics
  const totalMastered = cards.filter(c => c.mastered).length;
  const masteryPercentage = cards.length > 0 ? Math.round((totalMastered / cards.length) * 100) : 0;
  const uniqueTopics = Array.from(new Set(cards.map(c => c.topicName)));
  const uniqueSubjects = Array.from(new Set(cards.map(c => c.subjectName)));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* 1. Header Banner & Quick Action Bar */}
      <div className="glass-panel-glow rounded-3xl p-6 lg:p-7 border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-indigo-500/25">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white">
                Interactive Revision Flashcards
              </h2>
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                Spaced Recall
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              High-yield active recall with memory mnemonics, 3D flip inspection, and Google Search grounding.
            </p>
          </div>
        </div>

        {/* Global Stats & Generator Action */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-left">
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Overall Mastery</div>
            <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
              <Award className="w-4 h-4 text-emerald-400" />
              {masteryPercentage}% ({totalMastered}/{cards.length})
            </div>
          </div>

          <button
            onClick={() => setShowGeneratorModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 hover:scale-102 transition-transform cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Deck Generator
          </button>
        </div>
      </div>

      {/* 2. Deck Controls & Filter Toolbar */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Subject Filter */}
          <select
            value={selectedSubject}
            onChange={e => {
              setSelectedSubject(e.target.value);
              setSelectedTopic('all');
            }}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Subjects ({uniqueSubjects.length})</option>
            {uniqueSubjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Topic Filter */}
          <select
            value={selectedTopic}
            onChange={e => setSelectedTopic(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Topics ({uniqueTopics.length})</option>
            {uniqueTopics
              .filter(t => {
                if (selectedSubject === 'all') return true;
                const sample = cards.find(c => c.topicName === t);
                return sample?.subjectName === selectedSubject;
              })
              .map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
          </select>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterMode === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({cards.length})
            </button>
            <button
              onClick={() => setFilterMode('unmastered')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterMode === 'unmastered' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Review ({cards.filter(c => !c.mastered).length})
            </button>
            <button
              onClick={() => setFilterMode('mastered')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterMode === 'mastered' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Mastered ({totalMastered})
            </button>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search concepts..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={handleShuffle}
            title="Shuffle Deck"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
          >
            <Shuffle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Main 3D Interactive Card Stage */}
      {filteredCards.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center border border-slate-800 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-cyan-400 mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No Flashcards Match Your Filter</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Adjust your subject/topic filters or generate a new tailored revision deck with the AI Generator.
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedSubject('all');
              setSelectedTopic('all');
              setFilterMode('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : activeCard && (
        <div className="space-y-4">
          
          {/* Card Position & Deck Progress Bar */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white">
                Card {currentIndex + 1} of {filteredCards.length}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-indigo-300 font-medium">
                {activeCard.topicName}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Space to flip · Left/Right arrows to navigate
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                activeCard.mastered
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}>
                {activeCard.mastered ? 'Mastered' : 'Needs Review'}
              </span>
            </div>
          </div>

          {/* 3D Flip Container with CSS 3D Transforms */}
          <div
            className="relative min-h-[380px] w-full perspective-[1200px] cursor-pointer select-none"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div
              className={`w-full min-h-[380px] rounded-3xl transition-transform duration-500 transform-style-3d relative ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
              }}
            >
              
              {/* FRONT FACE: The Active Recall Prompt */}
              <div
                className="absolute inset-0 w-full h-full rounded-3xl glass-panel-glow p-8 border border-indigo-500/40 backface-hidden flex flex-col justify-between shadow-2xl"
                style={{ backfaceVisibility: 'hidden' }}
              >
                {/* Front Header */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
                      {activeCard.subjectName}
                    </span>
                    <span className="text-slate-600">/</span>
                    <span className="text-slate-300 font-medium">
                      {activeCard.topicName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => toggleSpeech(activeCard.front)}
                      title="Audio Pronunciation"
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {activeCard.difficulty}
                    </span>
                  </div>
                </div>

                {/* Question / Recall Prompt Center */}
                <div className="my-auto py-6 text-center space-y-4 max-w-2xl mx-auto">
                  <span className="text-[11px] text-indigo-400 font-bold uppercase tracking-widest block">
                    Active Recall Question
                  </span>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white leading-relaxed">
                    {activeCard.front}
                  </h3>

                  {showHint && activeCard.keyPoints && activeCard.keyPoints.length > 0 && (
                    <div
                      className="p-3 rounded-xl bg-indigo-950/70 border border-indigo-500/40 text-xs text-indigo-200 text-left animate-fadeIn"
                      onClick={e => e.stopPropagation()}
                    >
                      <strong className="text-cyan-300 block mb-1">Concept Clue:</strong>
                      {activeCard.keyPoints[0]}
                    </div>
                  )}
                </div>

                {/* Front Footer */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setShowHint(!showHint);
                    }}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-amber-300 font-medium cursor-pointer"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    {showHint ? 'Hide Clue' : 'Need Clue?'}
                  </button>

                  <div className="flex items-center gap-1 text-[11px] text-cyan-400 font-bold">
                    <RotateCw className="w-3.5 h-3.5 animate-spin-slow" />
                    Click or press Space to reveal answer
                  </div>
                </div>
              </div>

              {/* BACK FACE: The Comprehensive Model Solution */}
              <div
                className="absolute inset-0 w-full h-full rounded-3xl glass-panel-glow p-8 border border-emerald-500/40 backface-hidden flex flex-col justify-between shadow-2xl overflow-y-auto"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)'
                }}
              >
                {/* Back Header */}
                <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
                      Model Solution & Synthesis
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400">{activeCard.topicName}</span>
                  </div>

                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => toggleSpeech(`${activeCard.back}. ${activeCard.mnemonic || ''}`)}
                      title="Read Solution Aloud"
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                    {activeCard.groundedCitation && (
                      <span className="text-[10px] text-slate-400 italic">
                        {activeCard.groundedCitation}
                      </span>
                    )}
                  </div>
                </div>

                {/* Back Content Center */}
                <div className="space-y-4 py-4 text-left">
                  {/* Detailed Explanation */}
                  <p className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed whitespace-pre-line">
                    {activeCard.back}
                  </p>

                  {/* High Yield Key Points */}
                  {activeCard.keyPoints && activeCard.keyPoints.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">
                        High-Yield Exam Takeaways:
                      </span>
                      <ul className="space-y-1 text-xs text-slate-300">
                        {activeCard.keyPoints.map((point, pIdx) => (
                          <li key={pIdx} className="flex items-start gap-2">
                            <span className="text-emerald-400 font-bold">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Cognitive Memory Mnemonic Anchor */}
                  {activeCard.mnemonic && (
                    <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-600/40 text-xs">
                      <div className="flex items-center gap-2 font-bold text-amber-300 text-[11px] mb-0.5">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        Memory Mnemonic Anchor:
                      </div>
                      <p className="text-slate-200 font-mono text-[11px]">
                        {activeCard.mnemonic}
                      </p>
                    </div>
                  )}
                </div>

                {/* Back Footer: Google Search Grounding Deep Dive Action */}
                <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-800" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleSearchConcept(activeCard.front, activeCard.subjectName, activeCard.topicName)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-indigo-500/40 text-cyan-300 hover:text-white font-semibold text-[11px] transition-colors cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    Google Search Literature Deep Dive
                  </button>

                  <span className="text-[11px] text-slate-400 font-mono">
                    Reviewed {activeCard.reviewCount || 0} times
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* 4. Spaced Recall Self-Assessment Buttons */}
          <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">
                Rate your active recall to schedule spaced repetitions:
              </span>
              <span className="text-[11px] text-slate-500">
                Shortcut: 1 = Again, 4 = Mastered
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <button
                onClick={() => handleRateCard(false)}
                className="py-3 px-4 rounded-xl bg-rose-950/70 hover:bg-rose-900/80 border border-rose-600/60 text-rose-200 font-bold flex flex-col items-center gap-1 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>Again (1)</span>
                </div>
                <span className="text-[10px] text-rose-300/80 font-normal">Forgot / Needs Review</span>
              </button>

              <button
                onClick={() => handleRateCard(false)}
                className="py-3 px-4 rounded-xl bg-amber-950/70 hover:bg-amber-900/80 border border-amber-600/60 text-amber-200 font-bold flex flex-col items-center gap-1 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <span>Hard (2)</span>
                </div>
                <span className="text-[10px] text-amber-300/80 font-normal">Partial recall with effort</span>
              </button>

              <button
                onClick={() => handleRateCard(true)}
                className="py-3 px-4 rounded-xl bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-600/60 text-indigo-200 font-bold flex flex-col items-center gap-1 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <span>Good (3)</span>
                </div>
                <span className="text-[10px] text-indigo-300/80 font-normal">Recalled correctly</span>
              </button>

              <button
                onClick={() => handleRateCard(true)}
                className="py-3 px-4 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-600/60 text-emerald-200 font-bold flex flex-col items-center gap-1 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Mastered (4)</span>
                </div>
                <span className="text-[10px] text-emerald-300/80 font-normal">Effortless instant recall</span>
              </button>
            </div>
          </div>

          {/* 5. Bottom Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handlePrev}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous Card
            </button>

            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
            >
              {isFlipped ? 'Show Question (Front)' : 'Flip to Solution (Back)'}
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
            >
              Next Card
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* 4. Google Search Grounded Concept Deep Dive Modal */}
      {searchGroundedResult && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel-glow rounded-3xl p-7 border border-indigo-500/40 max-w-2xl w-full space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-400" />
                Live Academic Literature Grounding
              </h4>
              <button
                onClick={() => setSearchGroundedResult(null)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-indigo-300 font-semibold">
              Query: "{searchGroundedResult.query}"
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-line space-y-3">
              {searchGroundedResult.summary}
            </div>

            {searchGroundedResult.sources && searchGroundedResult.sources.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">
                  Grounding Citations & Verified Web References:
                </span>
                <div className="flex flex-col gap-1.5">
                  {searchGroundedResult.sources.map((src, sIdx) => (
                    <a
                      key={sIdx}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/40 text-xs text-indigo-300 flex items-center justify-between transition-colors"
                    >
                      <span className="truncate pr-2 font-medium">{src.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSearchGroundedResult(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. AI Flashcard Deck Generator Modal */}
      {showGeneratorModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel-glow rounded-3xl p-7 border border-indigo-500/40 max-w-lg w-full space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                AI Flashcard Deck Synthesizer
              </h4>
              <button
                onClick={() => setShowGeneratorModal(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {generatorError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs">
                {generatorError}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Subject</label>
                <input
                  type="text"
                  value={genSubject}
                  onChange={e => setGenSubject(e.target.value)}
                  placeholder="e.g. Pathology, Thermodynamics, Operating Systems..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Topic / Syllabus Concept</label>
                <input
                  type="text"
                  value={genTopic}
                  onChange={e => setGenTopic(e.target.value)}
                  placeholder="e.g. Myocardial Infarction, Carnot Efficiency, Graph Traversal..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Cards Count</label>
                  <select
                    value={genCount}
                    onChange={e => setGenCount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value={4}>4 Flashcards (Quick)</option>
                    <option value={6}>6 Flashcards (Standard)</option>
                    <option value={10}>10 Flashcards (Deep Revision)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Target Difficulty</label>
                  <select
                    value={genDifficulty}
                    onChange={e => setGenDifficulty(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value="easy">Easy (Definitions & Mnemonics)</option>
                    <option value="medium">Medium (College Standard)</option>
                    <option value="hard">Hard (Multi-Step & Traps)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Optional Grounding Notes / Excerpts
                </label>
                <textarea
                  value={genNotes}
                  onChange={e => setGenNotes(e.target.value)}
                  placeholder="Paste textbook definitions or lecture notes to ground the questions and mnemonics strictly on your syllabus..."
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs h-20 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowGeneratorModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateCards}
                disabled={isGenerating}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 hover:scale-102 transition-transform cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isGenerating ? 'Synthesizing Deck...' : 'Generate Flashcards'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
