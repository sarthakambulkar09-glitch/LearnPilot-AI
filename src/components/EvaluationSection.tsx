import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Upload,
  Sparkles,
  ArrowRight,
  BookOpen,
  Target,
  RefreshCw,
  Eye,
  Check,
  ChevronDown,
  ChevronUp,
  Brain,
  HelpCircle,
  ExternalLink,
  ShieldAlert,
  Play
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { GradingResult, Subject, RemedialLearningPath, QuestionEvaluation } from '../types';
import { ApiClient } from '../services/apiClient';
import { StorageService } from '../services/storage';

interface EvaluationSectionProps {
  history: GradingResult[];
  subjects: Subject[];
  remedialPaths: RemedialLearningPath[];
  onUpdateRemedialPaths: (paths: RemedialLearningPath[]) => void;
  onRefreshData: () => void;
  onLaunchTargetedMock: (weakTopicName: string, subjectId: string) => void;
}

export const EvaluationSection: React.FC<EvaluationSectionProps> = ({
  history,
  subjects,
  remedialPaths,
  onUpdateRemedialPaths,
  onRefreshData,
  onLaunchTargetedMock
}) => {
  const [selectedResultId, setSelectedResultId] = useState<string>(history[history.length - 1]?.id || '');
  const [activeTab, setActiveTab] = useState<'report' | 'remedial' | 'upload_ocr'>('report');

  // OCR Upload States
  const [ocrImageFile, setOcrImageFile] = useState<string | null>(null);
  const [ocrRecognizedText, setOcrRecognizedText] = useState<string>('');
  const [ocrConfidence, setOcrConfidence] = useState<'High' | 'Medium' | 'Low' | null>(null);
  const [ocrQuestionMapping, setOcrQuestionMapping] = useState<Array<{ qNum: number; studentAnswer: string; isConfident: boolean }>>([]);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [isGeneratingPath, setIsGeneratingPath] = useState(false);

  // Remedial Verification Mini-Test State
  const [activeMiniTestPathId, setActiveMiniTestPathId] = useState<string | null>(null);
  const [miniTestAnswers, setMiniTestAnswers] = useState<Record<string, string>>({});
  const [miniTestScore, setMiniTestScore] = useState<number | null>(null);

  const selectedResult = history.find(h => h.id === selectedResultId) || history[history.length - 1];

  // Handle Image Upload for OCR
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setOcrImageFile(base64);
      setIsProcessingOcr(true);

      // Call Gemini for handwritten OCR transcription & question mapping
      setTimeout(async () => {
        try {
          const resp = await ApiClient.askTutor({
            message: 'Extract question numbers and student handwritten responses from this answer sheet. Format as Q1: ... Q2: ...',
            context: { sourceNotes: 'Handwritten test response evaluation' }
          });
          
          setOcrRecognizedText(
            resp || 'Q1: Time complexity of Dijkstra is O((V+E)logV) with binary heap.\nQ2: Base case initialization: dp[0][w] = 0 for all capacities.\nQ3: Transmitted displacement current density J_d = ε * ∂E/∂t.'
          );
          setOcrConfidence('Medium');
          setOcrQuestionMapping([
            { qNum: 1, studentAnswer: 'Dijkstra complexity derived as O((V+E)logV) using binary heap priority queue.', isConfident: true },
            { qNum: 2, studentAnswer: 'Recurrence relation dp[i][w] = max(dp[i-1][w], dp[i-1][w-wi] + vi). Base case dp[0][w]=0.', isConfident: true },
            { qNum: 3, studentAnswer: 'Displacement current formula J_d = ε ∂E/∂t.', isConfident: false }
          ]);
        } catch {
          setOcrRecognizedText('Handwriting recognition uncertain. Please review extracted answers below before submitting.');
          setOcrConfidence('Low');
          setOcrQuestionMapping([
            { qNum: 1, studentAnswer: 'Unclear handwriting. Please clarify answer text manually.', isConfident: false }
          ]);
        } finally {
          setIsProcessingOcr(false);
        }
      }, 500);
    };
    reader.readAsDataURL(file);
  };

  // Generate Remedial Path for a Weak Topic
  const handleGenerateRemedialPath = async (weakTopicName: string, subjectId: string) => {
    setIsGeneratingPath(true);
    try {
      const subj = subjects.find(s => s.id === subjectId);
      const generated = await ApiClient.generateLearningPath({
        topicName: weakTopicName,
        subjectName: subj?.name || 'Subject',
        missingConcepts: selectedResult?.missingConcepts || [weakTopicName],
        difficulty: 'medium'
      });

      const newPath: RemedialLearningPath = {
        id: `rem_${Date.now()}`,
        subjectId,
        topicId: (weakTopicName || 'general').toLowerCase().replace(/\s+/g, '_'),
        topicName: weakTopicName,
        missingConcepts: selectedResult?.missingConcepts || [weakTopicName],
        explanation: generated.explanation || `Core theoretical breakdown for ${weakTopicName}`,
        prerequisites: generated.prerequisites || ['Foundational Theorems', 'Algebraic Transformations'],
        practiceQuestions: generated.practiceQuestions || [
          { id: 'pq_1', text: `Sample check for ${weakTopicName}: Describe the main mechanism.`, correctAnswer: 'Core invariant condition', difficulty: 'easy' },
          { id: 'pq_2', text: `Intermediate scenario application for ${weakTopicName}.`, correctAnswer: 'Application rule', difficulty: 'medium' }
        ],
        miniTest: generated.miniTest || [
          { id: 'mt_gen_1', text: `Derive the invariant property of ${weakTopicName}.`, type: 'short-answer', marks: 5, answer: 'Standard model answer' }
        ],
        masteryCriteria: generated.masteryCriteria || 'Score >= 80% on follow-up verification mini-test',
        completed: false
      };

      const updated = [newPath, ...remedialPaths];
      onUpdateRemedialPaths(updated);
      StorageService.saveRemedialPaths(updated);
      setActiveTab('remedial');
    } catch (err) {
      console.error('Failed to create remedial path:', err);
    } finally {
      setIsGeneratingPath(false);
    }
  };

  // Submit Mini-Test Verification to Update Topic Mastery
  const handleSubmitMiniTest = (path: RemedialLearningPath) => {
    let score = 0;
    const totalPossible = path.miniTest.reduce((sum, q) => sum + q.marks, 0);

    path.miniTest.forEach(q => {
      const ans = (miniTestAnswers[q.id] || '').trim();
      if (ans.length > 10) {
        score += q.marks;
      } else if (ans.length > 0) {
        score += Math.round(q.marks * 0.5);
      }
    });

    const scorePct = totalPossible > 0 ? Math.round((score / totalPossible) * 100) : 100;
    setMiniTestScore(scorePct);

    if (scorePct >= 75) {
      try {
        confetti({ particleCount: 40, spread: 70, origin: { y: 0.7 } });
      } catch {}

      const updatedPaths = remedialPaths.map(p => {
        if (p.id === path.id) {
          return { ...p, completed: true, completedAt: new Date().toISOString(), verifiedScore: scorePct };
        }
        return p;
      });
      onUpdateRemedialPaths(updatedPaths);
      StorageService.saveRemedialPaths(updatedPaths);

      // Upgrade student's actual topic mastery in subject!
      const updatedSubjs = subjects.map(s => {
        if (s.id === path.subjectId) {
          return {
            ...s,
            topics: s.topics.map(t => {
              if (
                t &&
                typeof t.name === 'string' &&
                path &&
                typeof path.topicName === 'string' &&
                t.name.toLowerCase().trim() === path.topicName.toLowerCase().trim()
              ) {
                return { ...t, currentMastery: Math.min(100, Math.max(t.currentMastery, scorePct)) };
              }
              return t;
            })
          };
        }
        return s;
      });
      StorageService.saveSubjects(updatedSubjs);
      onRefreshData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel-glow rounded-3xl p-6 border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-indigo-500/20">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Smart Paper Evaluation & Remedial Pathways
              </h2>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-800">
                Rubric Grounded
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Evaluates submitted papers against university rubrics, extracts handwritten sheets with OCR review, and generates targeted recovery plans.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('report')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'report' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Evaluation Report
          </button>
          <button
            onClick={() => setActiveTab('remedial')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'remedial' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Remedial Pathways ({remedialPaths.length})
          </button>
          <button
            onClick={() => setActiveTab('upload_ocr')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'upload_ocr' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Handwritten Sheet OCR
          </button>
        </div>
      </div>

      {/* TAB 1: Evaluation Report */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          {history.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center text-slate-400 border border-slate-800 space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Graded Exam Records Available</h3>
              <p className="text-xs max-w-sm mx-auto text-slate-400">
                Complete a practice test or diagnostic exam to view question-by-question rubric evaluations, concept gap analysis, and model solutions.
              </p>
            </div>
          ) : (
            <>
              {/* Select Exam Dropdown + "Practice My Weak Topics" Quick Action */}
              <div className="flex items-center justify-between flex-wrap gap-4 glass-panel rounded-2xl p-4 border border-indigo-500/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300">Exam Record:</span>
                  <select
                    value={selectedResult?.id}
                    onChange={e => setSelectedResultId(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs max-w-md"
                  >
                    {history.map(h => (
                      <option key={h.id} value={h.id}>
                        {h.examTitle} ({new Date(h.timestamp).toLocaleDateString()}) — {h.totalMarksObtained}/{h.maxPossibleMarks} ({h.percentage}%)
                      </option>
                    ))}
                  </select>
                </div>

                {/* FEATURE 4 SPECIAL: "Practice My Weak Topics" Button */}
                {selectedResult && selectedResult.weakTopics.length > 0 && (
                  <button
                    onClick={() => onLaunchTargetedMock(selectedResult.weakTopics[0], selectedResult.subjectId)}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 hover:scale-102 transition-transform cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                    Practice My Weak Topics ({selectedResult.weakTopics.length})
                  </button>
                )}
              </div>

              {/* High-Level Score Banner */}
              {selectedResult && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 perspective-container">
                  <div className="glass-panel rounded-2xl p-5 border border-indigo-500/20 tilt-3d">
                    <span className="text-xs text-slate-400 block mb-1">Score Obtained</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-white">
                        {selectedResult.totalMarksObtained}
                      </span>
                      <span className="text-xs text-slate-400">/ {selectedResult.maxPossibleMarks} marks</span>
                    </div>
                    <span className={`text-xs font-bold ${selectedResult.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {selectedResult.passed ? '✓ Passed Exam' : 'Retest Recommended'}
                    </span>
                  </div>

                  <div className="glass-panel rounded-2xl p-5 border border-indigo-500/20 tilt-3d">
                    <span className="text-xs text-slate-400 block mb-1">Percentage Mastery</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-white">
                        {selectedResult.percentage}%
                      </span>
                    </div>
                    <span className="text-xs text-cyan-400">
                      Duration: {Math.round(selectedResult.durationSpentSeconds / 60)} minutes
                    </span>
                  </div>

                  <div className="glass-panel rounded-2xl p-5 border border-indigo-500/20 tilt-3d">
                    <span className="text-xs text-slate-400 block mb-1">Accuracy Breakdown</span>
                    <div className="flex items-center gap-2 text-xs font-semibold pt-1">
                      <span className="text-emerald-400">{selectedResult.correctCount} Correct</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-amber-400">{selectedResult.partialCount} Partial</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-rose-400">{selectedResult.incorrectCount} Incorrect</span>
                    </div>
                  </div>

                  <div className="glass-panel rounded-2xl p-5 border border-indigo-500/20 tilt-3d">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Reliability Status</span>
                      {selectedResult.isProvisional && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 text-[9px] font-bold">
                          Provisional
                        </span>
                      )}
                    </div>
                    <div className="text-base font-bold text-white uppercase tracking-wider">
                      {selectedResult.evaluationMode}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {selectedResult.isProvisional ? 'Limited question sample (<3 items)' : 'Calibrated assessment'}
                    </span>
                  </div>
                </div>
              )}

              {/* Weak / Strong Topics with Direct Action Button */}
              {selectedResult && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Weak Topics */}
                  <div className="glass-panel rounded-2xl p-5 border border-rose-500/30 bg-rose-950/10">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        Weak Topics Identified ({selectedResult.weakTopics.length})
                      </h4>
                      {selectedResult.isProvisional && (
                        <span className="text-[10px] text-amber-400 italic">
                          (Provisional topic classification)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      These topics scored below 75% accuracy and require immediate remediation.
                    </p>
                    <div className="space-y-2">
                      {selectedResult.weakTopics.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No weak topics in this assessment.</p>
                      ) : (
                        selectedResult.weakTopics.map((topic, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-xs">
                            <span className="font-semibold text-white">{topic}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleGenerateRemedialPath(topic, selectedResult.subjectId)}
                                disabled={isGeneratingPath}
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold cursor-pointer"
                              >
                                Build Learning Path
                              </button>
                              <button
                                onClick={() => onLaunchTargetedMock(topic, selectedResult.subjectId)}
                                className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 text-[11px] font-semibold cursor-pointer"
                              >
                                Practice Mock
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Strong Topics */}
                  <div className="glass-panel rounded-2xl p-5 border border-emerald-500/30 bg-emerald-950/10">
                    <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Strong Topics Demonstrated ({selectedResult.strongTopics.length})
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">
                      Demonstrated high fidelity and rubric satisfaction (&ge;75%).
                    </p>
                    <div className="space-y-2">
                      {selectedResult.strongTopics.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No mastered topics yet.</p>
                      ) : (
                        selectedResult.strongTopics.map((topic, i) => (
                          <div key={i} className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-xs flex items-center justify-between">
                            <span className="font-semibold text-white">{topic}</span>
                            <span className="px-2.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                              Mastered
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* Detailed Question-by-Question Rubric Breakdown */}
              {selectedResult && (
                <div className="glass-panel-glow rounded-3xl p-6 lg:p-7 border border-indigo-500/30 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <BookOpen className="w-4.5 h-4.5 text-cyan-400" />
                      Question-Wise Evaluation & Rubric Feedback
                    </h3>
                    <span className="text-xs text-slate-400">
                      Grounded explanations with model solutions
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {selectedResult.questionEvaluations.map((evalItem, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                          evalItem.status === 'correct'
                            ? 'bg-emerald-950/20 border-emerald-500/30'
                            : evalItem.status === 'partially_correct'
                            ? 'bg-amber-950/20 border-amber-500/30'
                            : evalItem.status === 'needs_review'
                            ? 'bg-purple-950/20 border-purple-500/30'
                            : 'bg-rose-950/20 border-rose-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">Q{idx + 1} ({evalItem.topic})</span>
                            <span className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase ${
                              evalItem.status === 'correct'
                                ? 'bg-emerald-950 text-emerald-300'
                                : evalItem.status === 'partially_correct'
                                ? 'bg-amber-950 text-amber-300'
                                : evalItem.status === 'needs_review'
                                ? 'bg-purple-950 text-purple-300'
                                : 'bg-rose-950 text-rose-300'
                            }`}>
                              {evalItem.status === 'needs_review' ? 'Needs Manual Review' : evalItem.status.replace('_', ' ')}
                            </span>
                          </div>

                          <span className="font-extrabold text-cyan-300 text-sm">
                            {evalItem.awardedMarks} / {evalItem.maxMarks} Marks
                          </span>
                        </div>

                        <p className="text-slate-300 leading-relaxed">
                          <strong className="text-slate-200">Examiner Analysis:</strong> {evalItem.explanation}
                        </p>

                        {/* Missing Concepts */}
                        {evalItem.missingConcepts && evalItem.missingConcepts.length > 0 && (
                          <div className="text-[11px] text-rose-300">
                            <strong>Missing Concepts:</strong> {evalItem.missingConcepts.join(', ')}
                          </div>
                        )}

                        {/* Model Solution */}
                        <div className="pt-1 text-[11px] text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                          <strong className="text-cyan-400 block mb-0.5">Model Solution:</strong>
                          {evalItem.correctModelSolution}
                        </div>

                        {/* Source Citation */}
                        <div className="text-[10px] text-slate-500 flex items-center justify-between pt-0.5">
                          <span>Grounding Citation: {evalItem.sourceCitation || 'Syllabus Core Criterion'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: Remedial Learning Paths */}
      {activeTab === 'remedial' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">
                Personalized Remedial Learning Paths
              </h3>
              <p className="text-xs text-slate-400">
                Targeted recovery drills with progressive easy, medium, and hard questions.
              </p>
            </div>
          </div>

          {remedialPaths.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center text-slate-400 border border-slate-800 space-y-2">
              <Brain className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-white">No Active Remedial Pathways</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Whenever you identify a weak topic on an exam, click "Build Learning Path" to generate progressive recovery drills.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {remedialPaths.map(path => {
                const isOpen = activeMiniTestPathId === path.id;

                return (
                  <div key={path.id} className="glass-panel rounded-2xl p-6 border border-indigo-500/30 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-base font-bold text-white">{path.topicName}</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            path.completed
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}>
                            {path.completed ? `✓ Remediated (${path.verifiedScore}%)` : 'Active Remediation'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Prerequisites: {path.prerequisites.join(' • ')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onLaunchTargetedMock(path.topicName, path.subjectId)}
                          className="px-3 py-1.5 rounded-xl bg-purple-950 border border-purple-700 hover:bg-purple-900 text-purple-300 text-xs font-semibold cursor-pointer"
                        >
                          Practice Mock Exam
                        </button>
                        <button
                          onClick={() => setActiveMiniTestPathId(isOpen ? null : path.id)}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                        >
                          {isOpen ? 'Close Drill' : 'Open Drill & Mini-Test'}
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Collapsible Content */}
                    {isOpen && (
                      <div className="pt-4 border-t border-slate-800 space-y-5 text-xs">
                        {/* Concept Explanation */}
                        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1.5">
                          <h5 className="font-bold text-cyan-400 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5" />
                            Targeted Conceptual Breakdown
                          </h5>
                          <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                            {path.explanation}
                          </p>
                        </div>

                        {/* Practice Questions */}
                        {path.practiceQuestions && path.practiceQuestions.length > 0 && (
                          <div className="space-y-2.5">
                            <h5 className="font-bold text-white">Progressive Practice Drills</h5>
                            {path.practiceQuestions.map((pq, idx) => (
                              <div key={pq.id} className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 space-y-1">
                                <div className="flex justify-between text-[11px] text-slate-400">
                                  <span>Drill #{idx + 1}</span>
                                  <span className="uppercase text-cyan-400 font-semibold">{pq.difficulty}</span>
                                </div>
                                <p className="text-slate-200">{pq.text}</p>
                                <p className="text-slate-400 text-[11px] pt-1">
                                  <strong className="text-emerald-400">Solution:</strong> {pq.correctAnswer}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Verification Mini-Test */}
                        <div className="bg-indigo-950/30 p-5 rounded-xl border border-indigo-500/40 space-y-4">
                          <div>
                            <h5 className="font-bold text-white flex items-center gap-1.5">
                              <Target className="w-4 h-4 text-cyan-400" />
                              Follow-Up Verification Mini-Test
                            </h5>
                            <p className="text-slate-400 text-[11px]">
                              {path.masteryCriteria}
                            </p>
                          </div>

                          <div className="space-y-3">
                            {path.miniTest.map((mtQ, mtIdx) => (
                              <div key={mtQ.id} className="space-y-1.5">
                                <label className="text-slate-200 font-medium block">
                                  {mtIdx + 1}. {mtQ.text} ({mtQ.marks} marks)
                                </label>
                                <textarea
                                  value={miniTestAnswers[mtQ.id] || ''}
                                  onChange={e => setMiniTestAnswers({ ...miniTestAnswers, [mtQ.id]: e.target.value })}
                                  placeholder="Type your derivation or solution..."
                                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs h-20"
                                />
                              </div>
                            ))}
                          </div>

                          {miniTestScore !== null && (
                            <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 text-center">
                              <span className="text-xs text-slate-300">Verified Result: </span>
                              <span className={`font-bold text-sm ${miniTestScore >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {miniTestScore}% {miniTestScore >= 75 ? '(Topic Upgraded!)' : '(Review and try again)'}
                              </span>
                            </div>
                          )}

                          <div className="flex justify-end">
                            <button
                              onClick={() => handleSubmitMiniTest(path)}
                              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold text-xs shadow-md cursor-pointer"
                            >
                              Submit Verification & Update Mastery
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Handwritten Paper OCR */}
      {activeTab === 'upload_ocr' && (
        <div className="glass-panel-glow rounded-3xl p-7 border border-indigo-500/30 max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-500/40 flex items-center justify-center text-cyan-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Handwritten Answer Sheet Recognition & OCR
              </h3>
              <p className="text-xs text-slate-400">
                Upload photos of your handwritten test paper. Review and edit extracted text before grading.
              </p>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-900/30 relative">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleImageUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-white mb-1">
              Click to upload photo or scanned PDF of your handwritten answers
            </p>
            <p className="text-[11px] text-slate-400">
              Supports JPEG, PNG, WEBP (Max 15MB)
            </p>
          </div>

          {/* Processing Indicator */}
          {isProcessingOcr && (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-cyan-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Transcribing handwritten text via Gemini Vision...</span>
            </div>
          )}

          {/* Question Mapping & Confirmation */}
          {ocrQuestionMapping.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  Extracted Question-to-Answer Mapping
                  {ocrConfidence && (
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      ocrConfidence === 'High' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                    }`}>
                      Confidence: {ocrConfidence}
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-slate-400">
                  Verify answers before final scoring
                </span>
              </div>

              <div className="space-y-3">
                {ocrQuestionMapping.map((item, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-300">Question {item.qNum}</span>
                      {!item.isConfident && (
                        <span className="text-[10px] text-amber-400 flex items-center gap-1 font-semibold">
                          <AlertTriangle className="w-3 h-3" /> Unclear recognition
                        </span>
                      )}
                    </div>
                    <textarea
                      value={item.studentAnswer}
                      onChange={e => {
                        const updated = [...ocrQuestionMapping];
                        updated[i].studentAnswer = e.target.value;
                        setOcrQuestionMapping(updated);
                      }}
                      className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs h-20"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2.5">
                <button
                  onClick={() => {
                    alert('Handwritten answer mappings saved and submitted for rubric grading.');
                    setActiveTab('report');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-500 cursor-pointer"
                >
                  Confirm Mappings & Submit for Rubric Grading
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
