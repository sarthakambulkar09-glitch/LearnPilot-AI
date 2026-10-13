import React from 'react';
import {
  TrendingUp,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  ArrowRight,
  Clock,
  Target,
  Brain,
  FileQuestion,
  ChevronRight,
  Activity,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Subject,
  ExamDeadline,
  StudySession,
  GradingResult,
  WeeklyForecast,
  RemedialLearningPath
} from '../types';
import { StorageService } from '../services/storage';

interface DashboardProps {
  subjects: Subject[];
  deadlines: ExamDeadline[];
  sessions: StudySession[];
  history: GradingResult[];
  forecast: WeeklyForecast;
  remedialPaths: RemedialLearningPath[];
  onNavigateTab: (tab: string) => void;
  onRefreshData: () => void;
  onLaunchTargetedMock: (topicName: string, subjectId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  subjects,
  deadlines,
  sessions,
  history,
  forecast,
  remedialPaths,
  onNavigateTab,
  onRefreshData,
  onLaunchTargetedMock
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = sessions.filter(s => s.scheduledDate === todayStr);
  const latestGrading = history[history.length - 1];

  // Calculate Overall Readiness Score (0-100)
  let readinessScore = 0;
  if (subjects.length > 0) {
    let totalMastery = 0;
    let topicCount = 0;
    subjects.forEach(s => {
      s.topics.forEach(t => {
        totalMastery += t.currentMastery;
        topicCount++;
      });
    });
    readinessScore = topicCount > 0 ? Math.round(totalMastery / topicCount) : 0;
  }

  // Nearest deadline
  const nearestDeadline = [...deadlines].sort(
    (a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()
  )[0];
  const daysToNearest = nearestDeadline
    ? Math.max(0, Math.ceil((new Date(nearestDeadline.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  // Toggle session checkbox
  const handleToggleSession = (sessionId: string) => {
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
    StorageService.saveStudySessions(updated);
    onRefreshData();
  };

  return (
    <div className="space-y-8">
      {/* ONBOARDING STATE BANNER (When fresh student with 0 tests) */}
      {!forecast.hasEnoughData && history.length === 0 && (
        <div className="glass-panel-glow rounded-3xl p-8 border border-indigo-500/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-2xl space-y-3 relative z-10">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-800 inline-block">
              Welcome to LearnPilot AI Workspace
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Calibrate Your Exam Intelligence Engine
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              To activate predictive growth forecasts and tailored study schedules, complete your initial 10-minute diagnostic quiz or configure your course deadlines.
            </p>
            <div className="pt-2 flex items-center gap-3 flex-wrap">
              <button
                onClick={() => onNavigateTab('generator')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 hover:scale-102 transition-transform cursor-pointer"
              >
                <FileQuestion className="w-4 h-4" />
                Take Baseline Diagnostic Quiz
              </button>
              <button
                onClick={() => onNavigateTab('planner')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-semibold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-cyan-400" />
                Set Exam Deadlines
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: Exam Readiness & Overall Learning Progress (Hero Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 perspective-container">
        
        {/* Card 1: Exam Readiness Index */}
        <div className="glass-panel rounded-2xl p-5 border border-indigo-500/20 tilt-3d relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Overall Exam Readiness</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {readinessScore}%
            </span>
            <span className="text-xs text-cyan-400 font-semibold">Composite Index</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-1">
            <div
              className={`h-full ${
                readinessScore >= 75 ? 'bg-emerald-500' : readinessScore >= 50 ? 'bg-cyan-500' : 'bg-amber-500'
              }`}
              style={{ width: `${readinessScore}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Across {subjects.reduce((sum, s) => sum + s.topics.length, 0)} course topics.
          </p>
        </div>

        {/* Card 2: Upcoming Deadline Countdown */}
        <div className="glass-panel rounded-2xl p-5 border border-indigo-500/20 tilt-3d">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Nearest Exam Countdown</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className={`text-3xl font-extrabold ${daysToNearest !== null && daysToNearest <= 7 ? 'text-amber-400' : 'text-white'}`}>
              {daysToNearest !== null ? `${daysToNearest} Days` : 'None Set'}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 font-medium line-clamp-1">
            {nearestDeadline ? nearestDeadline.examName : 'No deadlines added'}
          </p>
          <span className="text-[10px] text-slate-500 block">
            Target: {nearestDeadline ? `${nearestDeadline.targetMarks}%` : 'N/A'}
          </span>
        </div>

        {/* Card 3: Weekly Predicted Trajectory */}
        <div className="glass-panel rounded-2xl p-5 border border-indigo-500/20 tilt-3d">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Weekly Growth Forecast</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-extrabold text-white">
              {forecast.hasEnoughData ? `${forecast.predictedScoreNextWeek}%` : 'Calibrating'}
            </span>
            {forecast.hasEnoughData && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" />
                {(forecast.predictedScoreNextWeek - forecast.currentMeasuredScore).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            {forecast.hasEnoughData
              ? `Range: ${forecast.scoreRangeMin}% – ${forecast.scoreRangeMax}%`
              : 'Requires 2 completed tests'}
          </p>
        </div>

        {/* Card 4: Study Plan Adherence */}
        <div className="glass-panel rounded-2xl p-5 border border-indigo-500/20 tilt-3d">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Schedule Completion</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-white">
              {sessions.length > 0 ? Math.round((sessions.filter(s => s.completed).length / sessions.length) * 100) : 0}%
            </span>
            <span className="text-xs text-slate-400">
              ({sessions.filter(s => s.completed).length}/{sessions.length})
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-500 h-full"
              style={{
                width: `${sessions.length > 0 ? (sessions.filter(s => s.completed).length / sessions.length) * 100 : 0}%`
              }}
            />
          </div>
        </div>

      </div>

      {/* 2-COLUMN SECTION: Today's Study Plan & Weekly Forecast Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* SECTION 4: Today's Study Plan */}
        <div className="glass-panel-glow rounded-2xl p-6 border border-indigo-500/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4.5 h-4.5 text-cyan-400" />
                Today's Study Plan
              </h3>
              <button
                onClick={() => onNavigateTab('planner')}
                className="text-xs font-semibold text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                Full Planner <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todaySessions.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <p className="text-xs mb-3">No study sessions scheduled for today.</p>
                <button
                  onClick={() => onNavigateTab('planner')}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs hover:bg-slate-800"
                >
                  Generate or Replan Schedule
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {todaySessions.map(sess => (
                  <div
                    key={sess.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                      sess.completed
                        ? 'bg-slate-900/40 border-slate-800 opacity-60'
                        : 'bg-indigo-950/40 border-indigo-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleSession(sess.id)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                          sess.completed ? 'bg-emerald-600 text-white' : 'border border-slate-600 hover:border-cyan-400 text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>

                      <div>
                        <span className="text-xs font-bold text-white block">
                          {sess.title}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {sess.durationMinutes} mins • {sess.type.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs text-indigo-300 font-semibold shrink-0">
                      {sess.completed ? 'Done' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
            <span>Daily Allocation: {todaySessions.reduce((acc, s) => acc + s.durationMinutes, 0)} minutes</span>
            <span className="text-cyan-400">Strictly capped within daily limit</span>
          </div>
        </div>

        {/* SECTION 1: Weekly Learning Forecast Quick Widget */}
        <div className="glass-panel-glow rounded-2xl p-6 border border-indigo-500/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4.5 h-4.5 text-cyan-400" />
                Weekly Learning Forecast
              </h3>
              <button
                onClick={() => onNavigateTab('forecast')}
                className="text-xs font-semibold text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                Deep-Dive Forecast <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {forecast.hasEnoughData ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400 block">7-Day Projected Score</span>
                    <span className="text-2xl font-extrabold text-white">
                      {forecast.predictedScoreNextWeek}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Statistical Range</span>
                    <span className="text-sm font-bold text-indigo-300">
                      {forecast.scoreRangeMin}% – {forecast.scoreRangeMax}%
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <span className="font-semibold text-slate-200">Key Influencing Factors:</span>
                  <p className="text-slate-400 line-clamp-2">
                    {forecast.influencingFactors[0]}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Activity className="w-8 h-8 text-cyan-400 mx-auto animate-pulse" />
                <p className="text-xs">
                  Not enough test records yet. Complete 2 quizzes to calculate baseline standard deviation and trajectory.
                </p>
                <button
                  onClick={() => onNavigateTab('generator')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
                >
                  Start First Quiz
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
            <span>Confidence: {forecast.confidenceLevel}</span>
            <span className="text-slate-400">Empirical EMA Trend Model</span>
          </div>
        </div>

      </div>

      {/* SECTION 7 & 8: Strong/Weak Topics & Personalized Learning Paths */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Strong & Weak Topics */}
        <div className="glass-panel rounded-2xl p-6 border border-indigo-500/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Brain className="w-4.5 h-4.5 text-cyan-400" />
              Weak Topics Requiring Attention
            </h3>
            <button
              onClick={() => onNavigateTab('evaluation')}
              className="text-xs font-semibold text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              Evaluation Hub <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {latestGrading && latestGrading.weakTopics.length > 0 ? (
            <div className="space-y-2.5">
              {latestGrading.weakTopics.map((topic, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="font-semibold text-white">{topic}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onLaunchTargetedMock(topic, latestGrading.subjectId)}
                      className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold cursor-pointer"
                    >
                      Remedial Mock
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              No weak topics currently flagged. All assessed topics satisfy mastery thresholds (&gt;=75%).
            </div>
          )}
        </div>

        {/* SECTION 9: Recommended Mock Exam */}
        <div className="glass-panel rounded-2xl p-6 border border-indigo-500/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Target className="w-4.5 h-4.5 text-purple-400" />
                AI Recommended Mock Exam
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                Auto-Targeted
              </span>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2 mb-4">
              <h4 className="text-sm font-bold text-white">
                {nearestDeadline ? `${nearestDeadline.examName} Diagnostic Simulator` : 'Comprehensive Exam Simulation'}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automatically composed targeting previously missed concepts, weak topics, and upcoming exam weighting rules.
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-300 pt-1">
                <span>5 Questions</span>
                <span>•</span>
                <span>50 Total Marks</span>
                <span>•</span>
                <span>45 Mins</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('generator')}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-xs shadow-md shadow-purple-600/20 hover:scale-102 transition-transform cursor-pointer"
          >
            Launch Targeted Mock Exam
          </button>
        </div>

      </div>

      {/* SECTION 6: Recent Test Results (Full Width Table / List) */}
      <div className="glass-panel rounded-2xl p-6 border border-indigo-500/20 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Award className="w-4.5 h-4.5 text-cyan-400" />
            Recent Assessment History & Recorded Scores
          </h3>
          <span className="text-xs text-slate-400">
            All marks calculated from actual student submissions
          </span>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">
            No test records available. Your results will appear here as soon as you complete an exam.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Exam Title</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Marks Obtained</th>
                  <th className="p-3">Percentage</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.slice(-5).reverse().map(result => (
                  <tr key={result.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3 font-semibold text-white">{result.examTitle}</td>
                    <td className="p-3 text-slate-400">{new Date(result.timestamp).toLocaleDateString()}</td>
                    <td className="p-3 font-bold text-cyan-300">{result.totalMarksObtained} / {result.maxPossibleMarks}</td>
                    <td className="p-3 font-extrabold text-white">{result.percentage}%</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        result.passed ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {result.passed ? 'PASSED' : 'RETEST'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => onNavigateTab('evaluation')}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold cursor-pointer"
                      >
                        View Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
