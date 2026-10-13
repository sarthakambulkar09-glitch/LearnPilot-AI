import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Sparkles,
  ChevronRight,
  BookOpen,
  Target,
  Sliders,
  Check,
  CalendarCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Subject,
  ExamDeadline,
  StudyPlannerConfig,
  StudySession,
  ScheduleConflict,
  Topic
} from '../types';
import { generateStudyPlan, replanSchedule, checkScheduleConflicts } from '../utils/plannerEngine';
import { StorageService } from '../services/storage';

interface StudyPlannerSectionProps {
  subjects: Subject[];
  deadlines: ExamDeadline[];
  config: StudyPlannerConfig;
  sessions: StudySession[];
  onUpdateSubjects: (subjects: Subject[]) => void;
  onUpdateDeadlines: (deadlines: ExamDeadline[]) => void;
  onUpdateConfig: (config: StudyPlannerConfig) => void;
  onUpdateSessions: (sessions: StudySession[]) => void;
}

export const StudyPlannerSection: React.FC<StudyPlannerSectionProps> = ({
  subjects,
  deadlines,
  config,
  sessions,
  onUpdateSubjects,
  onUpdateDeadlines,
  onUpdateConfig,
  onUpdateSessions
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'agenda' | 'subjects' | 'deadlines' | 'settings'>('agenda');
  const [selectedFilterDate, setSelectedFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationNotice, setGenerationNotice] = useState<string | null>(null);

  // New Subject Modal State
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjCode, setNewSubjCode] = useState('');
  const [newSubjNotes, setNewSubjNotes] = useState('');

  // New Topic Modal State
  const [targetSubjectIdForTopic, setTargetSubjectIdForTopic] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicHours, setNewTopicHours] = useState(5);
  const [newTopicWeight, setNewTopicWeight] = useState(25);
  const [newTopicDifficulty, setNewTopicDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // New Deadline Modal State
  const [isAddingDeadline, setIsAddingDeadline] = useState(false);
  const [newExamName, setNewExamName] = useState('');
  const [newExamSubjId, setNewExamSubjId] = useState(subjects[0]?.id || '');
  const [newExamDate, setNewExamDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [newExamTargetMarks, setNewExamTargetMarks] = useState(85);

  const conflict: ScheduleConflict = checkScheduleConflicts(subjects, deadlines, config);

  // Handlers
  const handleToggleSessionComplete = (sessionId: string) => {
    const updated = sessions.map(s => {
      if (s.id === sessionId) {
        const next = !s.completed;
        if (next) {
          try {
            confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
          } catch {}
        }
        return {
          ...s,
          completed: next,
          completedAt: next ? new Date().toISOString() : undefined
        };
      }
      return s;
    });
    onUpdateSessions(updated);
    StorageService.saveStudySessions(updated);
  };

  const handleGeneratePlan = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const history = StorageService.getGradingHistory();
      const plan = generateStudyPlan(subjects, deadlines, config, history, sessions);
      onUpdateSessions(plan.sessions);
      StorageService.saveStudySessions(plan.sessions);
      setIsGenerating(false);
      setGenerationNotice(plan.generationSummary);
      setTimeout(() => setGenerationNotice(null), 6000);
    }, 400);
  };

  const handleReplanSchedule = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const history = StorageService.getGradingHistory();
      const replanned = replanSchedule(sessions, subjects, deadlines, config, history);
      onUpdateSessions(replanned.sessions);
      StorageService.saveStudySessions(replanned.sessions);
      setIsGenerating(false);
      setGenerationNotice(replanned.changesExplanation);
      setTimeout(() => setGenerationNotice(null), 6000);
    }, 400);
  };

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjName.trim()) return;

    const newSubj: Subject = {
      id: `subj_${Date.now()}`,
      name: newSubjName.trim(),
      code: newSubjCode.trim() || 'SUBJ-101',
      color: '#6366f1',
      sourceMaterialNotes: newSubjNotes.trim(),
      createdAt: new Date().toISOString(),
      topics: [
        {
          id: `top_${Date.now()}_1`,
          name: `${newSubjName} Fundamentals`,
          difficulty: 'easy',
          weightage: 30,
          currentMastery: 50,
          estimatedHoursNeeded: 4,
          subtopics: ['Core Definitions', 'Baseline Axioms']
        }
      ]
    };

    const updated = [...subjects, newSubj];
    onUpdateSubjects(updated);
    StorageService.saveSubjects(updated);
    setNewSubjName('');
    setNewSubjCode('');
    setNewSubjNotes('');
    setIsAddingSubject(false);
  };

  const handleAddTopicToSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSubjectIdForTopic || !newTopicName.trim()) return;

    const newTopic: Topic = {
      id: `top_${Date.now()}`,
      name: newTopicName.trim(),
      difficulty: newTopicDifficulty,
      weightage: Number(newTopicWeight),
      currentMastery: 40,
      estimatedHoursNeeded: Number(newTopicHours)
    };

    const updated = subjects.map(s => {
      if (s.id === targetSubjectIdForTopic) {
        return { ...s, topics: [...s.topics, newTopic] };
      }
      return s;
    });

    onUpdateSubjects(updated);
    StorageService.saveSubjects(updated);
    setNewTopicName('');
    setTargetSubjectIdForTopic(null);
  };

  const handleDeleteSubject = (subjId: string) => {
    if (confirm('Delete this subject and all associated topics?')) {
      const updated = subjects.filter(s => s.id !== subjId);
      onUpdateSubjects(updated);
      StorageService.saveSubjects(updated);
    }
  };

  const handleDeleteTopic = (subjId: string, topicId: string) => {
    const updated = subjects.map(s => {
      if (s.id === subjId) {
        return { ...s, topics: s.topics.filter(t => t.id !== topicId) };
      }
      return s;
    });
    onUpdateSubjects(updated);
    StorageService.saveSubjects(updated);
  };

  const handleCreateDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamName.trim()) return;

    const deadline: ExamDeadline = {
      id: `dl_${Date.now()}`,
      subjectId: newExamSubjId || subjects[0]?.id || 'subj_1',
      examName: newExamName.trim(),
      examDate: newExamDate,
      targetMarks: Number(newExamTargetMarks),
      totalExamMarks: 100,
      targetPercentage: Number(newExamTargetMarks),
      weightage: 30
    };

    const updated = [...deadlines, deadline];
    onUpdateDeadlines(updated);
    StorageService.saveDeadlines(updated);
    setNewExamName('');
    setIsAddingDeadline(false);
  };

  const handleDeleteDeadline = (dlId: string) => {
    const updated = deadlines.filter(d => d.id !== dlId);
    onUpdateDeadlines(updated);
    StorageService.saveDeadlines(updated);
  };

  // Compute metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = sessions.filter(s => s.scheduledDate === todayStr);
  const overdueSessions = sessions.filter(s => s.scheduledDate < todayStr && !s.completed);
  const completedCount = sessions.filter(s => s.completed).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Generation Toolbar */}
      <div className="glass-panel rounded-2xl p-6 border border-indigo-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-cyan-400" />
            AI Adaptive Study Planner
          </h2>
          <p className="text-xs text-slate-400">
            Dynamically optimizes study sessions, prerequisites, spaced recall, and mock tests around your deadlines.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleGeneratePlan}
            disabled={isGenerating || subjects.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 hover:scale-102 transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            Generate My Study Plan
          </button>

          <button
            onClick={handleReplanSchedule}
            disabled={isGenerating || sessions.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-500/50 text-slate-200 text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            title="Recalculates schedule shifting missed sessions forward"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isGenerating ? 'animate-spin' : ''}`} />
            Replan My Schedule
          </button>
        </div>
      </div>

      {/* Generation Toast Notice */}
      {generationNotice && (
        <div className="p-3.5 rounded-xl bg-indigo-950/70 border border-indigo-500/40 text-xs text-indigo-200 flex items-center justify-between">
          <span>{generationNotice}</span>
          <button onClick={() => setGenerationNotice(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Schedule Conflict Warning Banner */}
      {conflict.hasConflict && (
        <div className="glass-panel rounded-2xl p-5 border border-amber-500/40 bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-200">
                Workload Schedule Conflict Detected
              </h4>
              <p className="text-xs text-slate-300">
                {conflict.explanation}
              </p>
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-amber-300 block mb-1">
                  Recommended Adjustments:
                </span>
                <ul className="space-y-1 text-xs text-slate-300">
                  {conflict.recommendedAdjustments.map((adj, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-amber-400" />
                      <span>{adj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('agenda')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'agenda'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Today's Agenda & Calendar ({sessions.length})
        </button>

        <button
          onClick={() => setActiveSubTab('subjects')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'subjects'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          My Subjects & Topics ({subjects.length})
        </button>

        <button
          onClick={() => setActiveSubTab('deadlines')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'deadlines'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Exam Deadlines ({deadlines.length})
        </button>

        <button
          onClick={() => setActiveSubTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'settings'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Planner Configuration
        </button>
      </div>

      {/* TAB 1: Agenda & Calendar */}
      {activeSubTab === 'agenda' && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel rounded-xl p-4 border border-indigo-500/20">
              <span className="text-xs text-slate-400 block mb-1">Today's Study Load</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">
                  {todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0)} mins
                </span>
                <span className="text-xs text-cyan-400 font-semibold">
                  {todaySessions.filter(s => s.completed).length}/{todaySessions.length} done
                </span>
              </div>
            </div>

            <div className="glass-panel rounded-xl p-4 border border-indigo-500/20">
              <span className="text-xs text-slate-400 block mb-1">Total Sessions Completed</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{completedCount}</span>
                <span className="text-xs text-slate-400">of {sessions.length} scheduled</span>
              </div>
            </div>

            <div className="glass-panel rounded-xl p-4 border border-indigo-500/20">
              <span className="text-xs text-slate-400 block mb-1">Overdue Catch-up Queue</span>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${overdueSessions.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {overdueSessions.length}
                </span>
                <span className="text-xs text-slate-400">
                  {overdueSessions.length > 0 ? 'Click Replan to auto-shift' : 'All up to date'}
                </span>
              </div>
            </div>
          </div>

          {/* Session List */}
          <div className="glass-panel-glow rounded-2xl p-6 border border-indigo-500/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Scheduled Learning & Revision Sessions
              </h3>
              <span className="text-xs text-slate-400">
                Sorted chronologically by date
              </span>
            </div>

            {sessions.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-sm mb-3">No study sessions currently scheduled.</p>
                <button
                  onClick={handleGeneratePlan}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors"
                >
                  Generate Initial Study Plan
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sessions.map(s => {
                  const isToday = s.scheduledDate === todayStr;
                  const isPast = s.scheduledDate < todayStr;
                  const subj = subjects.find(sub => sub.id === s.subjectId);

                  return (
                    <div
                      key={s.id}
                      className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                        s.completed
                          ? 'bg-slate-900/40 border-slate-800 opacity-70'
                          : isToday
                          ? 'bg-indigo-950/40 border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                          : isPast
                          ? 'bg-amber-950/20 border-amber-500/30'
                          : 'bg-slate-900/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleSessionComplete(s.id)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                            s.completed
                              ? 'bg-emerald-600 text-white'
                              : 'border border-slate-600 hover:border-cyan-400 text-transparent hover:text-cyan-400'
                          }`}
                          title={s.completed ? 'Mark incomplete' : 'Mark completed'}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>

                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold text-white line-clamp-1">
                              {s.title}
                            </span>
                            <span className={`px-2 py-0.2 rounded text-[10px] font-semibold uppercase ${
                              s.type === 'mock'
                                ? 'bg-purple-950 text-purple-300 border border-purple-700'
                                : s.type === 'revision'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                                : s.type === 'buffer'
                                ? 'bg-amber-950 text-amber-300 border border-amber-700'
                                : 'bg-indigo-950 text-indigo-300 border border-indigo-700'
                            }`}>
                              {s.type}
                            </span>
                            {isToday && (
                              <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                                Today
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {s.notes || `${s.durationMinutes} minutes planned`}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-semibold text-slate-300 block">
                          {s.scheduledDate}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {s.durationMinutes} mins
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Subjects & Topics */}
      {activeSubTab === 'subjects' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">
              Course Subjects & Topic Mastery
            </h3>
            <button
              onClick={() => setIsAddingSubject(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Subject
            </button>
          </div>

          {/* Add Subject Modal */}
          {isAddingSubject && (
            <form onSubmit={handleCreateSubject} className="glass-panel rounded-2xl p-5 border border-indigo-500/40 space-y-4">
              <h4 className="text-sm font-bold text-white">Add New Subject</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Subject Name</label>
                  <input
                    type="text"
                    value={newSubjName}
                    onChange={e => setNewSubjName(e.target.value)}
                    placeholder="e.g. Distributed Operating Systems"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Course Code</label>
                  <input
                    type="text"
                    value={newSubjCode}
                    onChange={e => setNewSubjCode(e.target.value)}
                    placeholder="e.g. CS-450"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Source Syllabus / Course Notes</label>
                <textarea
                  value={newSubjNotes}
                  onChange={e => setNewSubjNotes(e.target.value)}
                  placeholder="Paste syllabus summary, textbook chapters, or focus areas to ground AI exam generator..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs h-20"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingSubject(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                >
                  Save Subject
                </button>
              </div>
            </form>
          )}

          {/* Add Topic Modal */}
          {targetSubjectIdForTopic && (
            <form onSubmit={handleAddTopicToSubject} className="glass-panel rounded-2xl p-5 border border-cyan-500/40 space-y-4">
              <h4 className="text-sm font-bold text-white">
                Add Topic to {subjects.find(s => s.id === targetSubjectIdForTopic)?.name}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs text-slate-400 block mb-1">Topic Name</label>
                  <input
                    type="text"
                    value={newTopicName}
                    onChange={e => setNewTopicName(e.target.value)}
                    placeholder="e.g. Raft Consensus Algorithm"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Difficulty</label>
                  <select
                    value={newTopicDifficulty}
                    onChange={e => setNewTopicDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Exam Weightage (%)</label>
                  <input
                    type="number"
                    value={newTopicWeight}
                    onChange={e => setNewTopicWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Estimated Hours Needed</label>
                  <input
                    type="number"
                    value={newTopicHours}
                    onChange={e => setNewTopicHours(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTargetSubjectIdForTopic(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-semibold"
                >
                  Add Topic
                </button>
              </div>
            </form>
          )}

          {/* Subject Cards */}
          <div className="space-y-4">
            {subjects.map(subj => (
              <div key={subj.id} className="glass-panel rounded-2xl p-5 border border-indigo-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">{subj.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                        {subj.code}
                      </span>
                    </div>
                    {subj.sourceMaterialNotes && (
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        Syllabus: {subj.sourceMaterialNotes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTargetSubjectIdForTopic(subj.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium"
                    >
                      + Topic
                    </button>
                    <button
                      onClick={() => handleDeleteSubject(subj.id)}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Topics in this subject */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {subj.topics.map(t => (
                    <div key={t.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs relative group">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`px-2 py-0.2 rounded text-[10px] font-semibold uppercase ${
                          t.difficulty === 'hard'
                            ? 'bg-rose-950 text-rose-300'
                            : t.difficulty === 'medium'
                            ? 'bg-amber-950 text-amber-300'
                            : 'bg-emerald-950 text-emerald-300'
                        }`}>
                          {t.difficulty}
                        </span>
                        <button
                          onClick={() => handleDeleteTopic(subj.id, t.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <h5 className="font-semibold text-white mb-2 line-clamp-1">{t.name}</h5>
                      <div className="space-y-1 text-[11px] text-slate-400">
                        <div className="flex justify-between">
                          <span>Mastery:</span>
                          <span className="font-bold text-white">{t.currentMastery}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1">
                          <div
                            className="bg-indigo-500 h-full rounded-full"
                            style={{ width: `${t.currentMastery}%` }}
                          />
                        </div>
                        <div className="flex justify-between pt-1">
                          <span>Weightage: {t.weightage}%</span>
                          <span>Est: {t.estimatedHoursNeeded}h</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Exam Deadlines */}
      {activeSubTab === 'deadlines' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">
              Upcoming Exam Deadlines & Target Marks
            </h3>
            <button
              onClick={() => setIsAddingDeadline(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Exam Deadline
            </button>
          </div>

          {/* Add Deadline Modal */}
          {isAddingDeadline && (
            <form onSubmit={handleCreateDeadline} className="glass-panel rounded-2xl p-5 border border-indigo-500/40 space-y-4">
              <h4 className="text-sm font-bold text-white">Add Exam Deadline</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Exam Name</label>
                  <input
                    type="text"
                    value={newExamName}
                    onChange={e => setNewExamName(e.target.value)}
                    placeholder="e.g. CS-401 Final Exam"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Subject</label>
                  <select
                    value={newExamSubjId}
                    onChange={e => setNewExamSubjId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Exam Date</label>
                  <input
                    type="date"
                    value={newExamDate}
                    onChange={e => setNewExamDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Target Marks (%)</label>
                  <input
                    type="number"
                    value={newExamTargetMarks}
                    onChange={e => setNewExamTargetMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingDeadline(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                >
                  Save Deadline
                </button>
              </div>
            </form>
          )}

          {/* Deadlines List */}
          <div className="space-y-3">
            {deadlines.map(d => {
              const daysLeft = Math.ceil((new Date(d.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const subj = subjects.find(s => s.id === d.subjectId);

              return (
                <div key={d.id} className="glass-panel rounded-2xl p-5 border border-indigo-500/20 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-bold text-white">{d.examName}</span>
                      <span className="text-xs text-cyan-400 font-semibold">({subj?.name || 'Subject'})</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Date: {new Date(d.examDate).toLocaleDateString()} • Target Score: {d.targetMarks}%
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className={`text-xl font-extrabold ${daysLeft <= 7 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
                        {daysLeft > 0 ? `${daysLeft} Days` : 'Due Today'}
                      </span>
                      <span className="text-[10px] text-slate-500 block uppercase">Countdown</span>
                    </div>

                    <button
                      onClick={() => handleDeleteDeadline(d.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: Planner Configuration */}
      {activeSubTab === 'settings' && (
        <div className="glass-panel rounded-2xl p-6 border border-indigo-500/20 max-w-xl space-y-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Study Time Limits & Preferences
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Available Study Hours Per Day: {config.availableHoursPerDay} hrs
              </label>
              <input
                type="range"
                min="1"
                max="8"
                step="0.5"
                value={config.availableHoursPerDay}
                onChange={e => {
                  const updated = { ...config, availableHoursPerDay: Number(e.target.value) };
                  onUpdateConfig(updated);
                  StorageService.savePlannerConfig(updated);
                }}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Hard Daily Study Ceiling: {config.maxDailyHours} hrs
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={config.maxDailyHours}
                onChange={e => {
                  const updated = { ...config, maxDailyHours: Number(e.target.value) };
                  onUpdateConfig(updated);
                  StorageService.savePlannerConfig(updated);
                }}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1.5">
                Preferred Study Days of the Week
              </label>
              <div className="flex gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
                  const isSelected = config.preferredDays.includes(idx);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const nextDays = isSelected
                          ? config.preferredDays.filter(d => d !== idx)
                          : [...config.preferredDays, idx];
                        const updated = { ...config, preferredDays: nextDays };
                        onUpdateConfig(updated);
                        StorageService.savePlannerConfig(updated);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Revision Strategy
              </label>
              <select
                value={config.revisionPreference}
                onChange={e => {
                  const updated = { ...config, revisionPreference: e.target.value as any };
                  onUpdateConfig(updated);
                  StorageService.savePlannerConfig(updated);
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
              >
                <option value="spaced">Spaced Repetition (Recommended: Days 1, 4, 7)</option>
                <option value="balanced">Balanced Weekly Revision</option>
                <option value="intensive">Intensive End-of-Syllabus Cram Mode</option>
              </select>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
