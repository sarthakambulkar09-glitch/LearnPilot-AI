import React, { useState, useEffect, useRef } from 'react';
import {
  FileQuestion,
  Clock,
  CheckCircle,
  AlertCircle,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Send,
  Sparkles,
  ShieldAlert,
  Play,
  RotateCcw,
  Check,
  Award,
  GraduationCap,
  BookOpen,
  Sliders,
  Plus,
  Trash2,
  Info,
  CheckSquare,
  Square,
  HelpCircle,
  RefreshCw,
  ExternalLink,
  Target,
  Upload,
  FileUp,
  FileText,
  CheckCircle2
} from 'lucide-react';
import {
  Subject,
  ExamPaper,
  Question,
  StudentAnswer,
  GradingResult,
  StudentAcademicProfile,
  PdfAnalysisResult
} from '../types';
import { ApiClient } from '../services/apiClient';
import { StorageService, DEFAULT_STUDENT_PROFILE } from '../services/storage';
import {
  compileExamGradingResult,
  validateMarkingScheme,
  evaluateMultipleSelect
} from '../utils/scoring';

interface ExamGeneratorSectionProps {
  subjects: Subject[];
  onExamCompleted: (result: GradingResult) => void;
}

export const ExamGeneratorSection: React.FC<ExamGeneratorSectionProps> = ({
  subjects,
  onExamCompleted
}) => {
  // Mode: 'creator' | 'taking' | 'submitted'
  const [mode, setMode] = useState<'creator' | 'taking' | 'submitted'>('creator');

  // Student Academic Profile State
  const [profile, setProfile] = useState<StudentAcademicProfile>(() => StorageService.getProfile());
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);

  // Exam Creator Parameters
  const [selectedSubjectMode, setSelectedSubjectMode] = useState<'existing' | 'custom'>('existing');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [customSubjectName, setCustomSubjectName] = useState<string>('');
  
  // Custom Topic tags
  const [topicList, setTopicList] = useState<string[]>([]);
  const [newTopicInput, setNewTopicInput] = useState<string>('');

  const [examType, setExamType] = useState<'chapter' | 'revision' | 'practice' | 'mock'>('practice');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [totalQuestions, setTotalQuestions] = useState<number>(5);
  const [totalMarks, setTotalMarks] = useState<number>(50);
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [enableNegativeMarking, setEnableNegativeMarking] = useState<boolean>(true);
  const [negativeRatio, setNegativeRatio] = useState<number>(0.25);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>([
    'mcq',
    'multiple-select',
    'numerical',
    'short-answer'
  ]);
  const [sourceNotes, setSourceNotes] = useState<string>('');

  // PDF Upload & Extraction State
  const [uploadedPdfBase64, setUploadedPdfBase64] = useState<string | null>(null);
  const [uploadedPdfName, setUploadedPdfName] = useState<string | null>(null);
  const [uploadedPdfSize, setUploadedPdfSize] = useState<string | null>(null);
  const [isAnalyzingPdf, setIsAnalyzingPdf] = useState<boolean>(false);
  const [pdfAnalysisResult, setPdfAnalysisResult] = useState<PdfAnalysisResult | null>(null);
  const [groundOnPdf, setGroundOnPdf] = useState<boolean>(true);
  const [isDraggingPdf, setIsDraggingPdf] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Exam Taking State
  const [activePaper, setActivePaper] = useState<ExamPaper | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, StudentAnswer>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState<boolean>(false);
  const [lastGradingResult, setLastGradingResult] = useState<GradingResult | null>(null);

  // Check for restored in-progress exam on component mount
  useEffect(() => {
    const savedSession = StorageService.getActiveExamSession();
    if (savedSession && savedSession.paper && savedSession.secondsRemaining > 0) {
      setActivePaper(savedSession.paper);
      setStudentAnswers(savedSession.answers || {});
      setSecondsRemaining(savedSession.secondsRemaining);
      setCurrentQIndex(savedSession.currentQIndex || 0);
      setMode('taking');
    }
  }, []);

  // Update topic list when subject changes in 'existing' mode
  const currentSubj = subjects.find(s => s.id === selectedSubjectId);
  useEffect(() => {
    if (selectedSubjectMode === 'existing' && currentSubj) {
      setTopicList(currentSubj.topics.map(t => t.name));
      if (currentSubj.sourceMaterialNotes) {
        setSourceNotes(currentSubj.sourceMaterialNotes);
      }
    }
  }, [selectedSubjectId, selectedSubjectMode]);

  // Autosave active exam session to localStorage whenever answers or timer update
  useEffect(() => {
    if (mode === 'taking' && activePaper && secondsRemaining > 0) {
      StorageService.saveActiveExamSession({
        paper: activePaper,
        answers: studentAnswers,
        secondsRemaining,
        currentQIndex
      });
    }
  }, [studentAnswers, secondsRemaining, currentQIndex, mode, activePaper]);

  // Countdown Timer Effect
  useEffect(() => {
    if (mode !== 'taking' || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [mode, secondsRemaining]);

  // Save Academic Profile
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveProfile(profile);
    setIsEditingProfile(false);
  };

  // Add custom topic tag
  const handleAddTopic = () => {
    if (!newTopicInput.trim()) return;
    if (!topicList.includes(newTopicInput.trim())) {
      setTopicList([...topicList, newTopicInput.trim()]);
    }
    setNewTopicInput('');
  };

  const handleRemoveTopic = (topicToRemove: string) => {
    setTopicList(topicList.filter(t => t !== topicToRemove));
  };

  // PDF Upload & Extraction Handlers
  const handleFileUpload = (file: File) => {
    if (!file) return;
    const sizeStr = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    setUploadedPdfName(file.name);
    setUploadedPdfSize(sizeStr);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setUploadedPdfBase64(result);
      // Automatically trigger AI extraction
      triggerPdfAnalysis(result, file.name);
    };
    reader.readAsDataURL(file);
  };

  const triggerPdfAnalysis = async (base64Data: string, fileName: string) => {
    setIsAnalyzingPdf(true);
    setErrorMessage(null);
    try {
      const analysis = await ApiClient.extractPdfTopics({
        pdfBase64: base64Data,
        fileName
      });
      setPdfAnalysisResult(analysis);
      setSelectedSubjectMode('custom');
      setCustomSubjectName(analysis.detectedSubject);
      setTopicList(analysis.detectedTopics);
      if (analysis.recommendedDifficulty) {
        setDifficulty(analysis.recommendedDifficulty);
      }
      if (analysis.summary) {
        setSourceNotes(`[Syllabus Extracted from ${fileName}]\n${analysis.summary}`);
      }
    } catch (err: any) {
      console.error('PDF Analysis failed:', err);
      setErrorMessage('Could not analyze PDF syllabus. You can still enter topics manually.');
    } finally {
      setIsAnalyzingPdf(false);
    }
  };

  // Sample Demo PDF loader for quick 1-click test generation
  const handleLoadSamplePdf = (sampleType: 'pathology' | 'thermo' | 'algo') => {
    let name = '';
    let subject = '';
    let topics: string[] = [];
    let summary = '';

    if (sampleType === 'pathology') {
      name = 'USMLE_Cardiovascular_Pathology_Handout.pdf';
      subject = 'Cardiovascular Pathology';
      topics = [
        'Atherosclerosis Pathogenesis',
        'Myocardial Infarction Transmural vs Subendocardial',
        'Infective Endocarditis Duke Criteria',
        'Arrhythmia Electrophysiology',
        'Heart Failure Neurohumoral Mechanisms'
      ];
      summary = 'High-yield cardiovascular pathology syllabus covering coronary artery disease, ischemia biomarkers, structural valvular defects, and hemodynamic compensations.';
    } else if (sampleType === 'thermo') {
      name = 'Applied_Engineering_Thermodynamics_LectureNotes.pdf';
      subject = 'Engineering Thermodynamics';
      topics = [
        'First Law & Closed System Energy Balance',
        'Second Law & Entropy Generation',
        'Carnot Cycle Invariants',
        'Rankine & Brayton Power Cycles',
        'Transient Thermal Conduction'
      ];
      summary = 'Mechanical engineering thermodynamics syllabus focusing on macroscopic energy transformation, thermodynamic potentials, and efficiency limits.';
    } else {
      name = 'CS_Algorithms_Computational_Complexity_Syllabus.pdf';
      subject = 'Algorithms & Computational Complexity';
      topics = [
        'Dynamic Programming & Optimal Substructure',
        'Shortest Paths Dijkstra vs Bellman-Ford',
        'Max Flow Min Cut Invariants',
        'NP-Completeness Reductions',
        'Amortized Analysis of Disjoint Sets'
      ];
      summary = 'Core computer science algorithms curriculum including graph theoretical invariants, optimal substructure dynamic programming, and complexity bounds.';
    }

    setUploadedPdfName(name);
    setUploadedPdfSize('380 KB');
    setUploadedPdfBase64('data:application/pdf;base64,JVBERi0xLjQKJcTl8uXr...');
    setSelectedSubjectMode('custom');
    setCustomSubjectName(subject);
    setTopicList(topics);
    setSourceNotes(`[Grounding Document: ${name}]\n${summary}`);
    setPdfAnalysisResult({
      detectedSubject: subject,
      detectedTopics: topics,
      summary,
      recommendedDifficulty: 'medium',
      recommendedExamTypes: ['mcq', 'multiple-select', 'numerical', 'short-answer']
    });
  };

  // Generate Exam Paper
  const handleGeneratePaper = async () => {
    const subjectTitle = selectedSubjectMode === 'existing'
      ? (currentSubj?.name || 'Curriculum Subject')
      : (customSubjectName.trim() || 'Custom Subject');

    if (selectedSubjectMode === 'custom' && !customSubjectName.trim()) {
      setErrorMessage('Please provide a subject title for your custom exam.');
      return;
    }
    if (topicList.length === 0) {
      setErrorMessage('Please select or enter at least one topic for this examination.');
      return;
    }
    if (totalQuestions <= 0 || totalMarks <= 0 || durationMinutes <= 0) {
      setErrorMessage('Questions count, total marks, and duration must be greater than zero.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const resp = await ApiClient.generateExam({
        subject: subjectTitle,
        topics: topicList,
        questionTypes: selectedQuestionTypes,
        totalQuestions,
        difficulty,
        totalMarks,
        durationMinutes,
        examType,
        sourceMaterial: sourceNotes,
        pdfBase64: groundOnPdf && uploadedPdfBase64 ? uploadedPdfBase64 : undefined,
        studentProfile: profile
      });

      const questions: Question[] = resp.questions;

      // Validate marking scheme consistency
      const validation = validateMarkingScheme(questions, totalMarks);
      if (!validation.isValid && questions.length > 0) {
        const diff = totalMarks - validation.currentTotal;
        questions[questions.length - 1].marks += diff;
      }

      const paper: ExamPaper = {
        id: `paper_${Date.now()}`,
        subjectId: selectedSubjectMode === 'existing' ? (currentSubj?.id || 'subj_1') : `custom_${Date.now()}`,
        title: `${subjectTitle} — ${examType.toUpperCase()} Exam`,
        type: examType,
        durationMinutes,
        totalMarks,
        passingMarks: Math.round(totalMarks * 0.5),
        targetMarks: Math.round(totalMarks * 0.8),
        negativeMarking: enableNegativeMarking,
        negativeMarkRatio: negativeRatio,
        instructions: [
          `Candidate Profile: ${profile.fieldOfStudy} (${profile.currentRunningYear}).`,
          `Total Duration: ${durationMinutes} minutes. Total Marks: ${totalMarks}. Passing: ${Math.round(totalMarks * 0.5)} marks.`,
          enableNegativeMarking
            ? `Negative marking active: -${(negativeRatio * 100).toFixed(0)}% penalty applied for incorrect objective responses.`
            : `No negative marking penalty for incorrect responses.`,
          `Numerical problems require calculation within stated tolerances with correct units.`,
          `All answers are continuously autosaved to prevent loss upon refresh or disconnection.`
        ],
        questions,
        createdAt: new Date().toISOString()
      };

      setActivePaper(paper);
      setStudentAnswers({});
      setCurrentQIndex(0);
      setSecondsRemaining(durationMinutes * 60);
      setMode('taking');
      StorageService.saveActiveExamSession({
        paper,
        answers: {},
        secondsRemaining: durationMinutes * 60,
        currentQIndex: 0
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate exam.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Submit and Grade Exam
  const handleConfirmSubmit = async () => {
    if (!activePaper) return;
    setShowSubmitConfirmModal(false);
    setIsSubmitting(true);

    try {
      // Evaluate paper using Gemini or deterministic rubric engine
      const evalResp = await ApiClient.evaluatePaper({
        questions: activePaper.questions,
        studentAnswers
      });

      const durationSpent = (activePaper.durationMinutes * 60) - secondsRemaining;
      const gradingResult = compileExamGradingResult(
        activePaper,
        studentAnswers,
        evalResp.evaluations,
        Math.max(1, durationSpent)
      );

      // Save to persistent database
      StorageService.saveGradingResult(gradingResult);
      // Clear in-progress session
      StorageService.clearActiveExamSession();

      setLastGradingResult(gradingResult);
      onExamCompleted(gradingResult);
      setMode('submitted');
    } catch (err) {
      console.error('Error submitting exam:', err);
      // Deterministic fallback
      const durationSpent = (activePaper.durationMinutes * 60) - secondsRemaining;
      const gradingResult = compileExamGradingResult(
        activePaper,
        studentAnswers,
        [],
        Math.max(1, durationSpent)
      );
      StorageService.saveGradingResult(gradingResult);
      StorageService.clearActiveExamSession();
      setLastGradingResult(gradingResult);
      onExamCompleted(gradingResult);
      setMode('submitted');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoSubmit = () => {
    handleConfirmSubmit();
  };

  const handleRetakeOrNew = () => {
    StorageService.clearActiveExamSession();
    setActivePaper(null);
    setStudentAnswers({});
    setMode('creator');
  };

  // Format Time Display
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const currentQ = activePaper?.questions[currentQIndex];

  // Calculate answered count
  const answeredCount = activePaper
    ? activePaper.questions.filter(q => {
        const a = studentAnswers[q.id];
        if (!a) return false;
        if (q.type === 'multiple-select') {
          return a.selectedOptions && a.selectedOptions.length > 0;
        }
        if (q.type === 'mcq') {
          return a.selectedOption !== undefined && a.selectedOption !== null;
        }
        return (a.answerText || '').trim().length > 0;
      }).length
    : 0;

  return (
    <div className="space-y-6">
      
      {/* 1. CREATOR & CONFIGURATION VIEW */}
      {mode === 'creator' && (
        <div className="space-y-6 max-w-5xl mx-auto">
          
          {/* Header with Student Academic Persona Bar */}
          <div className="glass-panel-glow rounded-3xl p-6 border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-indigo-500/25">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Custom Exam & Mock Test Generator
                  </h2>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-800">
                    Syllabus Grounded
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Targeted for: <strong className="text-indigo-300">{profile.fieldOfStudy}</strong> • {profile.currentRunningYear} • {profile.targetExamType}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-500/50 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              {isEditingProfile ? 'Close Persona Profile' : 'Edit Academic Field & Year'}
            </button>
          </div>

          {/* Student Academic Profile Form */}
          {isEditingProfile && (
            <form onSubmit={handleSaveProfile} className="glass-panel rounded-2xl p-6 border border-indigo-500/35 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-cyan-400" />
                Customize Student Academic Profile
              </h3>
              <p className="text-xs text-slate-400">
                LearnPilot AI tailors question terminology, difficulty benchmarks, and clinical or technical rigor based on your field and running year.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Discipline / Field of Study</label>
                  <select
                    value={profile.fieldOfStudy}
                    onChange={e => setProfile({ ...profile, fieldOfStudy: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value="Engineering (Computer Science)">Engineering (Computer Science & AI)</option>
                    <option value="Engineering (Electrical & Electronics)">Engineering (Electrical & Electronics)</option>
                    <option value="Engineering (Mechanical & Aerospace)">Engineering (Mechanical & Aerospace)</option>
                    <option value="Engineering (Civil & Structural)">Engineering (Civil & Structural)</option>
                    <option value="Medicine & Healthcare (MBBS / MD)">Medicine & Healthcare (MBBS / MD)</option>
                    <option value="Dentistry & Dental Sciences">Dentistry & Dental Sciences</option>
                    <option value="Law & Jurisprudence (LLB / LLM)">Law & Jurisprudence (LLB / LLM)</option>
                    <option value="Business, Economics & Finance (MBA / CFA)">Business, Economics & Finance (MBA / CFA)</option>
                    <option value="Pure Sciences (Physics, Chemistry, Math)">Pure Sciences (Physics, Chemistry, Math)</option>
                    <option value="Humanities & Social Sciences">Humanities & Social Sciences</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Current Running Year</label>
                  <select
                    value={profile.currentRunningYear}
                    onChange={e => setProfile({ ...profile, currentRunningYear: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value="1st Year (Freshman / Foundational)">1st Year (Freshman / Foundational)</option>
                    <option value="2nd Year (Sophomore / Core Theory)">2nd Year (Sophomore / Core Theory)</option>
                    <option value="3rd Year (Junior / Advanced)">3rd Year (Junior / Advanced)</option>
                    <option value="4th Year (Senior / Final Year)">4th Year (Senior / Final Year)</option>
                    <option value="Post-Graduate / Medical Residency / Master's">Post-Graduate / Medical Residency / Master's</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Target Examination Goal</label>
                  <input
                    type="text"
                    value={profile.targetExamType}
                    onChange={e => setProfile({ ...profile, targetExamType: e.target.value })}
                    placeholder="e.g. University Finals, USMLE Step 1, GATE 2027"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 cursor-pointer"
                >
                  Save Profile Settings
                </button>
              </div>
            </form>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Main Exam Configuration Form */}
          <div className="glass-panel-glow rounded-3xl p-7 border border-indigo-500/30 space-y-6">
            
            {/* Subject Selection (Existing Course OR Any Custom Subject) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-200 font-bold uppercase tracking-wider">
                  1. Subject Selection
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedSubjectMode('existing')}
                    className={`px-3 py-1 rounded-lg font-semibold cursor-pointer transition-colors ${
                      selectedSubjectMode === 'existing'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    From Saved Courses ({subjects.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSubjectMode('custom')}
                    className={`px-3 py-1 rounded-lg font-semibold cursor-pointer transition-colors ${
                      selectedSubjectMode === 'custom'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    Enter Any Custom Subject
                  </button>
                </div>
              </div>

              {selectedSubjectMode === 'existing' ? (
                <div>
                  <select
                    value={selectedSubjectId}
                    onChange={e => setSelectedSubjectId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    value={customSubjectName}
                    onChange={e => setCustomSubjectName(e.target.value)}
                    placeholder="Enter any subject (e.g. Pathology, Internal Medicine, Thermodynamics, Quantum Physics, Corporate Law)..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                  />
                </div>
              )}
            </div>

            {/* Topics & Subtopics Tag Selector */}
            <div className="space-y-3">
              <label className="text-xs text-slate-200 font-bold uppercase tracking-wider block">
                2. Topics & Subtopics to Test ({topicList.length} Active)
              </label>

              {/* Tag Badges */}
              <div className="flex flex-wrap gap-2 min-h-[44px] p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                {topicList.length === 0 ? (
                  <span className="text-xs text-slate-500 italic">No topics added yet. Type below to add topics.</span>
                ) : (
                  topicList.map((t, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-950/70 text-indigo-200 border border-indigo-700/60 text-xs font-semibold"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTopic(t)}
                        className="text-slate-400 hover:text-rose-400 cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Add Custom Topic Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTopicInput}
                  onChange={e => setNewTopicInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTopic(); } }}
                  placeholder="Type a topic or subtopic name and press Add..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddTopic}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Topic
                </button>
              </div>
            </div>

            {/* Test Specifications Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              
              {/* Exam Format */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Exam Format</label>
                <select
                  value={examType}
                  onChange={e => setExamType(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                >
                  <option value="practice">Practice Paper (Self-Paced)</option>
                  <option value="chapter">Chapter Test (Targeted Focus)</option>
                  <option value="revision">Revision Test (Spaced Recall)</option>
                  <option value="mock">Full Mock Exam (Strict Simulation)</option>
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Difficulty Distribution</label>
                <select
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                >
                  <option value="easy">Easy (Foundations & Definitions)</option>
                  <option value="medium">Medium (College Standard)</option>
                  <option value="hard">Hard (Advanced Multi-Step Analysis)</option>
                  <option value="mixed">Mixed (Adaptive Distribution)</option>
                </select>
              </div>

              {/* Question Count */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Number of Questions</label>
                <input
                  type="number"
                  min="2"
                  max="25"
                  value={totalQuestions}
                  onChange={e => setTotalQuestions(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              {/* Total Marks */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Total Exam Marks</label>
                <input
                  type="number"
                  min="10"
                  max="200"
                  step="5"
                  value={totalMarks}
                  onChange={e => setTotalMarks(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              {/* Passing Marks */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Passing Marks</label>
                <div className="px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300">
                  {Math.round(totalMarks * 0.5)} Marks (50%)
                </div>
              </div>

              {/* Target Score */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Target Score Goal</label>
                <div className="px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-cyan-300 font-semibold">
                  {Math.round(totalMarks * 0.8)} Marks (80%)
                </div>
              </div>

              {/* Negative Marking */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Negative Marking Rule</label>
                <button
                  type="button"
                  onClick={() => setEnableNegativeMarking(!enableNegativeMarking)}
                  className={`w-full py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    enableNegativeMarking
                      ? 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {enableNegativeMarking ? `Active (-${(negativeRatio * 100).toFixed(0)}% Penalty)` : 'Disabled (No Penalty)'}
                </button>
              </div>

            </div>

            {/* Allowed Question Types */}
            <div>
              <label className="text-xs text-slate-200 font-bold uppercase tracking-wider block mb-2">
                3. Allowed Question Types
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                {[
                  { id: 'mcq', label: 'Single-Choice MCQ' },
                  { id: 'multiple-select', label: 'Multiple-Select (MSQ)' },
                  { id: 'numerical', label: 'Numerical (Tolerance & Units)' },
                  { id: 'short-answer', label: 'Subjective (Rubric Graded)' },
                ].map(qt => {
                  const isChecked = selectedQuestionTypes.includes(qt.id);
                  return (
                    <button
                      key={qt.id}
                      type="button"
                      onClick={() => {
                        if (isChecked && selectedQuestionTypes.length === 1) return;
                        setSelectedQuestionTypes(
                          isChecked
                            ? selectedQuestionTypes.filter(t => t !== qt.id)
                            : [...selectedQuestionTypes, qt.id]
                        );
                      }}
                      className={`p-3 rounded-xl border flex items-center gap-2 text-left transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-indigo-950/60 border-indigo-500/60 text-white shadow-md'
                          : 'bg-slate-900/50 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                        isChecked ? 'bg-indigo-600 border-indigo-400 text-white' : 'border-slate-700'
                      }`}>
                        {isChecked && <Check className="w-3 h-3" />}
                      </span>
                      <span className="font-semibold">{qt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. PDF Syllabus & Course Materials Upload */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-200 font-bold uppercase tracking-wider flex items-center gap-2">
                  <FileUp className="w-4 h-4 text-cyan-400" />
                  4. Upload PDF Syllabus / Topic Material & Auto-Extract Test (Optional)
                </label>
                {uploadedPdfName && (
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedPdfName(null);
                      setUploadedPdfBase64(null);
                      setUploadedPdfSize(null);
                      setPdfAnalysisResult(null);
                    }}
                    className="text-[11px] text-slate-400 hover:text-rose-400 cursor-pointer"
                  >
                    Remove PDF
                  </button>
                )}
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.txt,.docx,.md"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
              />

              {/* Dropzone Container */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDraggingPdf(true); }}
                onDragLeave={() => setIsDraggingPdf(false)}
                onDrop={e => {
                  e.preventDefault();
                  setIsDraggingPdf(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                onClick={() => {
                  if (!uploadedPdfName) fileInputRef.current?.click();
                }}
                className={`p-5 rounded-2xl border-2 border-dashed transition-all ${
                  isDraggingPdf
                    ? 'border-cyan-400 bg-cyan-950/30'
                    : uploadedPdfName
                    ? 'border-emerald-500/50 bg-emerald-950/20'
                    : 'border-slate-800 bg-slate-900/40 hover:border-indigo-500/50 hover:bg-slate-900/60 cursor-pointer'
                }`}
              >
                {!uploadedPdfName ? (
                  <div className="flex flex-col items-center justify-center text-center space-y-2 py-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-cyan-400 shadow-md">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">
                        Click to upload or drag & drop syllabus PDF
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Accepts course outlines, lecture handouts, textbook chapters, or medical vignettes (.pdf, .txt, .docx)
                      </p>
                    </div>

                    {/* 1-Click Demo PDF presets */}
                    <div className="pt-2 flex flex-wrap justify-center gap-2" onClick={e => e.stopPropagation()}>
                      <span className="text-[10px] text-slate-500 block w-full">Quick Preloaded Syllabus Demos:</span>
                      <button
                        type="button"
                        onClick={() => handleLoadSamplePdf('pathology')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-indigo-900/60 border border-slate-700 hover:border-indigo-500 text-[11px] text-indigo-300 font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <FileText className="w-3 h-3 text-cyan-400" />
                        USMLE Pathology.pdf
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadSamplePdf('thermo')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-indigo-900/60 border border-slate-700 hover:border-indigo-500 text-[11px] text-cyan-300 font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <FileText className="w-3 h-3 text-cyan-400" />
                        Thermodynamics.pdf
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadSamplePdf('algo')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-indigo-900/60 border border-slate-700 hover:border-indigo-500 text-[11px] text-purple-300 font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <FileText className="w-3 h-3 text-cyan-400" />
                        Algorithms Syllabus.pdf
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-2">
                            {uploadedPdfName}
                            <span className="text-[10px] text-emerald-400 font-medium px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800">
                              Attached ({uploadedPdfSize})
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {isAnalyzingPdf
                              ? 'Gemini Multimodal Engine analyzing syllabus pages...'
                              : pdfAnalysisResult
                              ? `Detected Subject: ${pdfAnalysisResult.detectedSubject} • ${pdfAnalysisResult.detectedTopics.length} Topics Extracted`
                              : 'Ready for AI topic extraction'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (uploadedPdfBase64 && uploadedPdfName) {
                              triggerPdfAnalysis(uploadedPdfBase64, uploadedPdfName);
                            }
                          }}
                          disabled={isAnalyzingPdf}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {isAnalyzingPdf ? 'Analyzing PDF...' : 'Re-Analyze with Gemini'}
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                        >
                          Change File
                        </button>
                      </div>
                    </div>

                    {/* Extracted syllabus preview banner */}
                    {pdfAnalysisResult && (
                      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-indigo-500/30 text-xs space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-cyan-300">
                            Syllabus Summary:
                          </span>
                          <span className="text-slate-400">
                            Recommended: {pdfAnalysisResult.recommendedDifficulty.toUpperCase()} • {pdfAnalysisResult.recommendedExamTypes.join(', ')}
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-relaxed">
                          {pdfAnalysisResult.summary}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <label className="flex items-center gap-2 text-[11px] text-cyan-300 font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={groundOnPdf}
                              onChange={e => setGroundOnPdf(e.target.checked)}
                              className="rounded border-slate-700 bg-slate-800 text-indigo-600"
                            />
                            Ground exam questions and solutions strictly on this PDF document
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Additional Study Notes Excerpts */}
            <div>
              <label className="text-xs text-slate-200 font-bold uppercase tracking-wider block mb-1.5">
                5. Supplementary Notes / Specific Excerpts (Optional)
              </label>
              <textarea
                value={sourceNotes}
                onChange={e => setSourceNotes(e.target.value)}
                placeholder="Paste clinical case vignettes, engineering theorem definitions, lecture slide summaries, or textbook sections to strictly ground questions and citations..."
                className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs h-20 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Launch Action */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleGeneratePaper}
                disabled={isGenerating || isAnalyzingPdf}
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 hover:scale-102 transition-transform cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-white" />
                {isGenerating ? 'Synthesizing Psychometric Question Paper...' : 'Generate & Begin Examination'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. TIMED EXAM TAKING VIEW */}
      {mode === 'taking' && activePaper && currentQ && (
        <div className="glass-panel-glow rounded-3xl p-6 lg:p-8 border border-indigo-500/40 max-w-5xl mx-auto space-y-6">
          
          {/* Header Bar: Status & Timer */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 flex-wrap gap-4">
            <div>
              <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider block">
                {activePaper.title}
              </span>
              <h3 className="text-lg font-extrabold text-white">
                Question {currentQIndex + 1} of {activePaper.questions.length}
              </h3>
            </div>

            <div className="flex items-center gap-3">
              {/* Visible Live Timer */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
                secondsRemaining <= 300
                  ? 'bg-rose-950/70 border-rose-500/70 text-rose-300 animate-pulse'
                  : 'bg-slate-900 border-slate-700 text-white'
              }`}>
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-mono font-bold">
                  {formatTime(secondsRemaining)}
                </span>
              </div>

              {/* Submit Button */}
              <button
                onClick={() => setShowSubmitConfirmModal(true)}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold text-xs shadow-md shadow-emerald-600/25 hover:scale-102 transition-transform cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Finish & Submit
              </button>
            </div>
          </div>

          {/* Progress Bar & Indicators */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Progress: {answeredCount} of {activePaper.questions.length} Questions Answered</span>
              <span className="text-cyan-400 font-bold">Autosave Active</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full transition-all duration-300"
                style={{ width: `${(answeredCount / activePaper.questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Navigation Palette */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none flex-1">
              {activePaper.questions.map((q, idx) => {
                const ans = studentAnswers[q.id];
                const isAnswered = ans && (
                  ans.selectedOption !== undefined ||
                  (ans.selectedOptions && ans.selectedOptions.length > 0) ||
                  (ans.answerText && ans.answerText.trim().length > 0)
                );
                const isReview = ans?.isMarkedForReview;
                const isCurrent = idx === currentQIndex;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQIndex(idx)}
                    className={`w-9 h-9 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
                      isCurrent
                        ? 'ring-2 ring-cyan-400 bg-indigo-600 text-white shadow-lg'
                        : isReview
                        ? 'bg-amber-950 text-amber-300 border border-amber-600'
                        : isAnswered
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                    title={`Question ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Quick Submit Exam from Palette */}
            <button
              onClick={() => setShowSubmitConfirmModal(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/25 shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Submit Exam ({answeredCount}/{activePaper.questions.length})
            </button>
          </div>

          {/* Active Question Container */}
          <div className="bg-slate-900/70 rounded-2xl p-6 lg:p-7 border border-slate-800 space-y-5 shadow-inner">
            <div className="flex items-center justify-between text-xs flex-wrap gap-2">
              <span className="font-bold text-indigo-300">
                Topic: {currentQ.topic} {currentQ.subtopic ? `• ${currentQ.subtopic}` : ''}
              </span>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-extrabold">
                  {currentQ.marks} Marks
                </span>
                {activePaper.negativeMarking && (
                  <span className="text-rose-400 font-medium">
                    Penalty: -{(currentQ.marks * activePaper.negativeMarkRatio).toFixed(1)} marks
                  </span>
                )}
                <span className="uppercase text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                  {currentQ.type}
                </span>
              </div>
            </div>

            <p className="text-base font-medium text-slate-100 leading-relaxed">
              {currentQ.text}
            </p>

            {/* 1. MCQ Single Choice Options */}
            {currentQ.type === 'mcq' && currentQ.options && (
              <div className="space-y-2.5 pt-2">
                {currentQ.options.map((opt, optIdx) => {
                  const isSelected = studentAnswers[currentQ.id]?.selectedOption === optIdx;
                  return (
                    <div
                      key={optIdx}
                      onClick={() => {
                        setStudentAnswers({
                          ...studentAnswers,
                          [currentQ.id]: {
                            ...studentAnswers[currentQ.id],
                            questionId: currentQ.id,
                            selectedOption: optIdx
                          }
                        });
                      }}
                      className={`p-4 rounded-xl border text-xs cursor-pointer flex items-center gap-3.5 transition-colors ${
                        isSelected
                          ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-md'
                          : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="font-medium">{opt}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. Multiple-Select (MSQ) Options */}
            {currentQ.type === 'multiple-select' && currentQ.options && (
              <div className="space-y-2.5 pt-2">
                <span className="text-[11px] text-cyan-400 font-semibold block">
                  Select one or more correct options:
                </span>
                {currentQ.options.map((opt, optIdx) => {
                  const currentSelected = studentAnswers[currentQ.id]?.selectedOptions || [];
                  const isChecked = currentSelected.includes(optIdx);
                  return (
                    <div
                      key={optIdx}
                      onClick={() => {
                        const nextSelected = isChecked
                          ? currentSelected.filter(i => i !== optIdx)
                          : [...currentSelected, optIdx];
                        setStudentAnswers({
                          ...studentAnswers,
                          [currentQ.id]: {
                            ...studentAnswers[currentQ.id],
                            questionId: currentQ.id,
                            selectedOptions: nextSelected
                          }
                        });
                      }}
                      className={`p-4 rounded-xl border text-xs cursor-pointer flex items-center gap-3.5 transition-colors ${
                        isChecked
                          ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-md'
                          : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded flex items-center justify-center border ${
                        isChecked ? 'bg-cyan-600 border-cyan-400 text-white' : 'border-slate-700 bg-slate-800'
                      }`}>
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </span>
                      <span className="font-medium">{opt}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. Numerical Calculation Input */}
            {currentQ.type === 'numerical' && (
              <div className="space-y-2 pt-2">
                <label className="text-xs text-slate-300 block font-semibold">
                  Enter Computed Numerical Value {currentQ.unit ? `(${currentQ.unit})` : ''}:
                </label>
                <div className="flex items-center gap-3 max-w-sm">
                  <input
                    type="number"
                    step="any"
                    value={studentAnswers[currentQ.id]?.answerText || ''}
                    onChange={e => {
                      setStudentAnswers({
                        ...studentAnswers,
                        [currentQ.id]: {
                          ...studentAnswers[currentQ.id],
                          questionId: currentQ.id,
                          answerText: e.target.value
                        }
                      });
                    }}
                    placeholder="e.g. 14.5"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
                  />
                  {currentQ.unit && <span className="text-xs text-slate-400 font-mono">{currentQ.unit}</span>}
                </div>
              </div>
            )}

            {/* 4. Subjective Short / Long Answer */}
            {(currentQ.type === 'short-answer' || currentQ.type === 'long-answer') && (
              <div className="space-y-2 pt-2">
                <label className="text-xs text-slate-300 block font-semibold">
                  Detailed Academic Response (Evaluated against conceptual marking rubric):
                </label>
                <textarea
                  value={studentAnswers[currentQ.id]?.answerText || ''}
                  onChange={e => {
                    setStudentAnswers({
                      ...studentAnswers,
                      [currentQ.id]: {
                        ...studentAnswers[currentQ.id],
                        questionId: currentQ.id,
                        answerText: e.target.value
                      }
                    });
                  }}
                  placeholder="State assumptions, step-by-step logic, mechanism of action, or theoretical derivations clearly..."
                  className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs h-36 font-sans leading-relaxed focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Bottom Bar: Mark for Review & Question Step */}
          <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
            <button
              onClick={() => {
                const currentStatus = studentAnswers[currentQ.id]?.isMarkedForReview;
                setStudentAnswers({
                  ...studentAnswers,
                  [currentQ.id]: {
                    ...studentAnswers[currentQ.id],
                    questionId: currentQ.id,
                    isMarkedForReview: !currentStatus
                  }
                });
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                studentAnswers[currentQ.id]?.isMarkedForReview
                  ? 'bg-amber-950 border-amber-600 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              {studentAnswers[currentQ.id]?.isMarkedForReview ? 'Marked for Review' : 'Mark for Review'}
            </button>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => setCurrentQIndex(Math.max(0, currentQIndex - 1))}
                disabled={currentQIndex === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              {/* Primary Exam Submit Button */}
              <button
                onClick={() => setShowSubmitConfirmModal(true)}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 hover:scale-102 transition-transform cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Exam ({answeredCount}/{activePaper.questions.length})
              </button>

              {currentQIndex < activePaper.questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQIndex(currentQIndex + 1)}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 cursor-pointer"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setShowSubmitConfirmModal(true)}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 shadow-md shadow-emerald-600/30 cursor-pointer animate-pulse"
                >
                  <CheckCircle className="w-4 h-4" />
                  Finish Exam
                </button>
              )}
            </div>
          </div>

          {/* Submission Confirmation Modal */}
          {showSubmitConfirmModal && (
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="glass-panel-glow rounded-3xl p-7 border border-indigo-500/40 max-w-lg w-full space-y-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold text-white flex items-center gap-2.5">
                    <Send className="w-5 h-5 text-cyan-400" />
                    Submit Exam for AI Evaluation
                  </h4>
                  <button
                    onClick={() => setShowSubmitConfirmModal(false)}
                    className="text-slate-400 hover:text-white text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Status Breakdown Grid */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-600/50">
                    <div className="text-xl font-mono font-extrabold text-emerald-400">
                      {answeredCount}
                    </div>
                    <div className="text-[11px] text-emerald-200 font-semibold mt-0.5">Answered</div>
                  </div>

                  <div className={`p-3 rounded-xl border ${
                    activePaper.questions.length - answeredCount > 0
                      ? 'bg-rose-950/70 border-rose-500/60'
                      : 'bg-slate-900 border-slate-800'
                  }`}>
                    <div className={`text-xl font-mono font-extrabold ${
                      activePaper.questions.length - answeredCount > 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      {activePaper.questions.length - answeredCount}
                    </div>
                    <div className="text-[11px] text-slate-300 font-semibold mt-0.5">Unanswered</div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-950/70 border border-amber-600/50">
                    <div className="text-xl font-mono font-extrabold text-amber-400">
                      {activePaper.questions.filter(q => studentAnswers[q.id]?.isMarkedForReview).length}
                    </div>
                    <div className="text-[11px] text-amber-200 font-semibold mt-0.5">Review Flagged</div>
                  </div>
                </div>

                {activePaper.questions.length - answeredCount > 0 && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-between gap-3">
                    <span className="text-xs text-rose-200">
                      You have {activePaper.questions.length - answeredCount} questions without responses.
                    </span>
                    <button
                      onClick={() => {
                        const firstUnanswered = activePaper.questions.findIndex(q => {
                          const ans = studentAnswers[q.id];
                          if (!ans) return true;
                          if (q.type === 'multiple-select') return !ans.selectedOptions || ans.selectedOptions.length === 0;
                          if (q.type === 'mcq') return ans.selectedOption === undefined;
                          return !(ans.answerText || '').trim();
                        });
                        if (firstUnanswered !== -1) {
                          setCurrentQIndex(firstUnanswered);
                        }
                        setShowSubmitConfirmModal(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shrink-0 cursor-pointer"
                    >
                      Jump to First Unanswered
                    </button>
                  </div>
                )}

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Upon submission, your responses will be evaluated using deterministic marking rubrics and Gemini AI analysis. Your scores, topic masteries, and growth forecasts will update immediately.
                </p>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowSubmitConfirmModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                  >
                    Return to Exam
                  </button>
                  <button
                    onClick={handleConfirmSubmit}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white text-xs font-bold shadow-lg shadow-emerald-600/35 hover:scale-102 transition-transform cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {isSubmitting ? 'Evaluating Submission...' : 'Confirm & Submit Paper'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 3. POST-EXAM RESULTS & COMPREHENSIVE ANSWER REVIEW */}
      {mode === 'submitted' && lastGradingResult && (
        <div className="space-y-6 max-w-5xl mx-auto">
          
          {/* Hero Score Card */}
          <div className="glass-panel-glow rounded-3xl p-8 border border-emerald-500/40 text-center space-y-4 relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-500/40 mx-auto flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-600/20">
              <Award className="w-8 h-8" />
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-block ${
              lastGradingResult.passed
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                : 'bg-rose-950 text-rose-300 border border-rose-700'
            }`}>
              {lastGradingResult.passed ? '✓ Passing Threshold Satisfied' : 'Retest Recommended'}
            </span>

            <h3 className="text-2xl font-extrabold text-white">
              {lastGradingResult.examTitle}
            </h3>

            <div className="flex justify-center items-baseline gap-2">
              <span className="text-5xl font-black text-white tracking-tight">
                {lastGradingResult.totalMarksObtained}
              </span>
              <span className="text-2xl text-slate-400 font-semibold">
                / {lastGradingResult.maxPossibleMarks} ({lastGradingResult.percentage}%)
              </span>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs font-semibold pt-1">
              <span className="text-emerald-400">{lastGradingResult.correctCount} Correct</span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400">{lastGradingResult.partialCount} Partial Credit</span>
              <span className="text-slate-600">•</span>
              <span className="text-rose-400">{lastGradingResult.incorrectCount} Incorrect</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-500">{lastGradingResult.unansweredCount} Unanswered</span>
            </div>

            <p className="text-xs text-slate-300 max-w-md mx-auto pt-2">
              Your test record has been calibrated into your longitudinal history. Weekly growth forecasts and topic masteries updated automatically.
            </p>

            <div className="pt-3 flex justify-center gap-3">
              <button
                onClick={handleRetakeOrNew}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs font-bold shadow-md hover:scale-102 transition-transform cursor-pointer"
              >
                Create Another Custom Exam
              </button>
            </div>
          </div>

          {/* Topic-Wise Breakdown */}
          <div className="glass-panel rounded-2xl p-6 border border-indigo-500/20">
            <h4 className="text-sm font-bold text-white mb-3">Topic-Wise Performance</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(lastGradingResult.topicWiseMarks).map(([tName, stat]) => (
                <div key={tName} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                  <span className="font-semibold text-white block mb-1.5 line-clamp-1">{tName}</span>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Score: {stat.obtained}/{stat.max}</span>
                    <span className="font-bold text-white">{stat.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full ${stat.percentage >= 75 ? 'bg-emerald-500' : stat.percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Full Question Review with Unlocked Model Solutions & Rubrics */}
          <div className="glass-panel rounded-2xl p-6 border border-indigo-500/20 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              Full Question Review & Rubric Model Solutions
            </h4>

            <div className="space-y-4">
              {lastGradingResult.questionEvaluations.map((evalItem, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                    evalItem.status === 'correct'
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : evalItem.status === 'partially_correct'
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-rose-950/20 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">
                      Question {idx + 1} ({evalItem.topic})
                    </span>
                    <span className="font-bold text-cyan-300">
                      {evalItem.awardedMarks} / {evalItem.maxMarks} Marks
                    </span>
                  </div>

                  <p className="text-slate-300 leading-relaxed">
                    <strong className="text-slate-200">Evaluation Analysis:</strong> {evalItem.explanation}
                  </p>

                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300">
                    <strong className="text-cyan-400 block mb-0.5">Model Solution & Expected Answer:</strong>
                    {evalItem.correctModelSolution}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
