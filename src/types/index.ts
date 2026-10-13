export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'mixed';

export type QuestionType = 'mcq' | 'multiple-select' | 'short-answer' | 'long-answer' | 'numerical';

export type ExamType = 'chapter' | 'revision' | 'practice' | 'mock';

export interface Topic {
  id: string;
  name: string;
  difficulty: DifficultyLevel;
  weightage: number; // percentage or marks weightage in exam (0-100)
  currentMastery: number; // 0-100 measured mastery
  prerequisites?: string[]; // IDs or names of prerequisite topics
  estimatedHoursNeeded: number;
  subtopics?: string[];
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  color: string;
  topics: Topic[];
  sourceMaterialNotes?: string;
  createdAt: string;
}

export interface ExamDeadline {
  id: string;
  subjectId: string;
  examName: string;
  examDate: string; // ISO date string e.g. "2026-10-25T09:00"
  targetMarks: number;
  totalExamMarks: number;
  targetPercentage: number;
  weightage: number;
  notes?: string;
}

export interface StudyPlannerConfig {
  availableHoursPerDay: number; // e.g. 3.5 hours
  preferredDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  maxDailyHours: number;
  unavailableDates: string[]; // ['2026-10-18', ...]
  revisionPreference: 'spaced' | 'intensive' | 'balanced';
  mockTestFrequencyDays: number;
  dailyReminderEnabled: boolean;
}

export interface StudySession {
  id: string;
  subjectId: string;
  topicId: string;
  title: string;
  scheduledDate: string; // YYYY-MM-DD
  durationMinutes: number;
  type: 'study' | 'revision' | 'practice' | 'mock' | 'buffer';
  completed: boolean;
  completedAt?: string;
  notes?: string;
  isOverdue?: boolean;
}

export interface ScheduleConflict {
  hasConflict: boolean;
  requiredHours: number;
  availableHours: number;
  deficitHours: number;
  explanation: string;
  recommendedAdjustments: string[];
}

export interface Question {
  id: string;
  topic: string;
  subtopic?: string;
  type: QuestionType;
  text: string;
  marks: number;
  negativeMarks?: number;
  options?: string[]; // For MCQ or multiple-select
  correctOption?: number; // 0-indexed for single MCQ
  correctOptions?: number[]; // indices for multiple-select
  expectedValue?: number; // For numerical
  acceptableTolerance?: number; // e.g. 0.05
  unit?: string;
  modelSolution: string;
  gradingRubric: string[];
  sourceCitation?: string;
}

export interface ExamPaper {
  id: string;
  subjectId: string;
  title: string;
  type: ExamType;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  targetMarks: number;
  negativeMarking: boolean;
  negativeMarkRatio: number; // e.g., 0.25 (1/4th penalty)
  instructions: string[];
  questions: Question[];
  createdAt: string;
}

export interface StudentAnswer {
  questionId: string;
  selectedOption?: number;
  selectedOptions?: number[];
  answerText?: string;
  recognizedHandwritingText?: string;
  isMarkedForReview?: boolean;
}

export interface QuestionEvaluation {
  questionId: string;
  status: 'correct' | 'partially_correct' | 'incorrect' | 'needs_review';
  maxMarks: number;
  awardedMarks: number;
  explanation: string;
  missingConcepts: string[];
  misconceptions?: string[];
  correctModelSolution: string;
  calculationDetails?: string;
  sourceCitation?: string;
  topic: string;
}

export interface GradingResult {
  id: string;
  examId: string;
  examTitle: string;
  subjectId: string;
  subjectName: string;
  timestamp: string;
  durationSpentSeconds: number;
  totalMarksObtained: number;
  maxPossibleMarks: number;
  percentage: number;
  passed: boolean;
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
  unansweredCount: number;
  needsReviewCount?: number;
  isProvisional?: boolean;
  questionEvaluations: QuestionEvaluation[];
  subjectWiseMarks: Record<string, { obtained: number; max: number; percentage: number }>;
  topicWiseMarks: Record<string, { obtained: number; max: number; percentage: number }>;
  strongTopics: string[];
  weakTopics: string[];
  repeatedMistakes: string[];
  missingConcepts: string[];
  recommendedRevisionPriorities: string[];
  evaluationMode: 'digital' | 'handwritten_ocr' | 'hybrid';
}

export interface TopicForecast {
  topicId: string;
  topicName: string;
  currentMastery: number;
  predictedGrowth: number;
  expectedScoreNextWeek: number;
  riskLevel: 'high_risk' | 'moderate' | 'on_track' | 'strong';
  trend: 'improving' | 'declining' | 'stable';
  questionsAttempted: number;
}

export interface WeeklyForecast {
  calculatedAt: string;
  hasEnoughData: boolean;
  dataPointsCount: number;
  currentMeasuredScore: number;
  predictedScoreNextWeek: number;
  scoreRangeMin: number;
  scoreRangeMax: number;
  confidenceLevel: 'Low' | 'Medium' | 'High';
  confidencePercentage: number;
  influencingFactors: string[];
  recommendedActions: string[];
  topicForecasts: TopicForecast[];
  timeline: Array<{
    dayLabel: string;
    date: string;
    measuredScore?: number;
    predictedScore?: number;
    upperBound?: number;
    lowerBound?: number;
  }>;
}

export interface RemedialLearningPath {
  id: string;
  subjectId: string;
  topicId: string;
  topicName: string;
  missingConcepts: string[];
  explanation: string;
  prerequisites: string[];
  practiceQuestions: Array<{
    id: string;
    text: string;
    difficulty: DifficultyLevel;
    correctAnswer: string;
  }>;
  miniTest: Array<{
    id: string;
    text: string;
    type: string;
    marks: number;
    answer: string;
  }>;
  masteryCriteria: string;
  completed: boolean;
  completedAt?: string;
  verifiedScore?: number;
}

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'session_due' | 'exam_countdown' | 'forecast_update' | 'replan_alert';
  read: boolean;
}

export interface StudentAcademicProfile {
  fieldOfStudy: string;
  currentRunningYear: string;
  targetExamType: string;
  institutionName?: string;
}

export interface Flashcard {
  id: string;
  subjectName: string;
  topicName: string;
  front: string; // The question / prompt / clinical vignette / theorem
  back: string; // The detailed answer / mechanism / explanation
  keyPoints: string[]; // High-yield takeaways / bullet points
  mnemonic?: string; // Memory aid / mnemonic
  difficulty: DifficultyLevel;
  mastered: boolean;
  reviewCount: number;
  lastReviewed?: string;
  groundedCitation?: string;
}

export interface PdfAnalysisResult {
  detectedSubject: string;
  detectedTopics: string[];
  summary: string;
  recommendedDifficulty: DifficultyLevel;
  recommendedExamTypes: QuestionType[];
  pageCountEstimate?: number;
}
