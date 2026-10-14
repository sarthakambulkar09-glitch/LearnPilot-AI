import { describe, it, expect } from 'vitest';
import { validateMarkingScheme, evaluateMCQ, evaluateNumerical, evaluateMultipleSelect, compileExamGradingResult } from '../scoring';
import { checkScheduleConflicts, sortTopicsByPrerequisites, generateStudyPlan } from '../plannerEngine';
import { calculateWeeklyForecast } from '../forecastEngine';
import { Question, ExamPaper, Subject, ExamDeadline, StudyPlannerConfig, Topic, GradingResult } from '../../types';

describe('Deterministic Scoring & Evaluation Engine', () => {
  const sampleQuestion: Question = {
    id: 'q1',
    topic: 'Algorithms',
    type: 'mcq',
    text: 'What is the time complexity of binary search?',
    marks: 4,
    options: ['O(log n)', 'O(n)', 'O(n^2)', 'O(1)'],
    correctOption: 0,
    modelSolution: 'O(log n)',
    gradingRubric: ['Correct option identified']
  };

  it('correctly awards full marks for a correct MCQ answer', () => {
    const result = evaluateMCQ(sampleQuestion, 0, 0.25);
    expect(result.awardedMarks).toBe(4);
    expect(result.status).toBe('correct');
    expect(result.penalty).toBe(0);
  });

  it('correctly applies negative marking penalty for an incorrect MCQ answer', () => {
    // 4 marks * 0.25 ratio = 1.0 penalty => awardedMarks = -1
    const result = evaluateMCQ(sampleQuestion, 1, 0.25);
    expect(result.awardedMarks).toBe(-1);
    expect(result.status).toBe('incorrect');
    expect(result.penalty).toBe(1);
  });

  it('awards 0 marks without penalty for an unanswered question', () => {
    const result = evaluateMCQ(sampleQuestion, undefined, 0.25);
    expect(result.awardedMarks).toBe(0);
    expect(result.status).toBe('unanswered');
    expect(result.penalty).toBe(0);
  });

  it('verifies numerical answer within acceptable tolerance', () => {
    const numQ: Question = {
      id: 'qn1',
      topic: 'Physics',
      type: 'numerical',
      text: 'Calculate acceleration due to gravity.',
      marks: 5,
      expectedValue: 9.81,
      acceptableTolerance: 0.05,
      unit: 'm/s^2',
      modelSolution: '9.81 m/s^2',
      gradingRubric: ['Within tolerance']
    };

    // Within tolerance (9.83 is within 9.81 +- 0.05)
    const exact = evaluateNumerical(numQ, '9.83');
    expect(exact.status).toBe('correct');
    expect(exact.awardedMarks).toBe(5);

    // Far off
    const incorrect = evaluateNumerical(numQ, '12.4');
    expect(incorrect.status).toBe('incorrect');
    expect(incorrect.awardedMarks).toBe(0);
  });

  it('validates marking scheme consistency against target total marks', () => {
    const q1: Question = { ...sampleQuestion, id: '1', marks: 20 };
    const q2: Question = { ...sampleQuestion, id: '2', marks: 30 };
    const valid = validateMarkingScheme([q1, q2], 50);
    expect(valid.isValid).toBe(true);
    expect(valid.currentTotal).toBe(50);
    expect(valid.discrepancy).toBe(0);

    const invalid = validateMarkingScheme([q1, q2], 60);
    expect(invalid.isValid).toBe(false);
    expect(invalid.discrepancy).toBe(10);
  });

  it('safely bounds total exam marks and never drops below zero even with excessive negative marking', () => {
    const paper: ExamPaper = {
      id: 'paper1',
      subjectId: 's1',
      title: 'Short Test',
      type: 'practice',
      durationMinutes: 15,
      totalMarks: 4,
      passingMarks: 2,
      targetMarks: 4,
      negativeMarking: true,
      negativeMarkRatio: 0.5,
      instructions: [],
      questions: [sampleQuestion],
      createdAt: new Date().toISOString()
    };

    // Answering incorrectly with 0.5 penalty = -2 marks, total score clamped at 0
    const grading = compileExamGradingResult(
      paper,
      { q1: { questionId: 'q1', selectedOption: 2 } },
      [],
      120
    );
    expect(grading.totalMarksObtained).toBe(0);
    expect(grading.passed).toBe(false);
    expect(grading.percentage).toBe(0);
  });

  it('correctly evaluates multiple-select questions with exact and partial credit', () => {
    const msqQuestion: Question = {
      id: 'q_msq',
      topic: 'Pathology',
      type: 'multiple-select',
      text: 'Which of the following are clinical hallmarks of acute inflammation?',
      marks: 4,
      options: ['Vasodilation', 'Neutrophil infiltration', 'Caseous necrosis', 'Increased vascular permeability'],
      correctOptions: [0, 1, 3],
      modelSolution: 'Vasodilation, Neutrophil infiltration, and Increased permeability',
      gradingRubric: ['Options 0, 1, 3 required']
    };

    // 1. Exact match
    const exact = evaluateMultipleSelect(msqQuestion, [0, 1, 3], 0.25);
    expect(exact.status).toBe('correct');
    expect(exact.awardedMarks).toBe(4);

    // 2. Partial correct subset without any wrong choices (e.g. selected 2 of 3 correct)
    const partial = evaluateMultipleSelect(msqQuestion, [0, 1], 0.25);
    expect(partial.status).toBe('partially_correct');
    expect(partial.awardedMarks).toBeGreaterThan(0);
    expect(partial.awardedMarks).toBeLessThan(4);

    // 3. Includes wrong choice (e.g. selected 2 - Caseous necrosis) with negative marking
    const wrong = evaluateMultipleSelect(msqQuestion, [0, 2], 0.25);
    expect(wrong.status).toBe('incorrect');
    expect(wrong.awardedMarks).toBe(-1); // -25% penalty = -1 mark

    // 4. Includes wrong choice with negative marking disabled
    const wrongNoNeg = evaluateMultipleSelect(msqQuestion, [0, 2], 0);
    expect(wrongNoNeg.status).toBe('incorrect');
    expect(wrongNoNeg.awardedMarks).toBe(0);
  });
});

describe('Adaptive Study Planner & Conflict Engine', () => {
  const mockSubject: Subject = {
    id: 's_math',
    name: 'Calculus',
    code: 'MATH-101',
    color: '#3b82f6',
    createdAt: new Date().toISOString(),
    topics: [
      {
        id: 't_limits',
        name: 'Limits & Continuity',
        difficulty: 'easy',
        weightage: 20,
        currentMastery: 90,
        estimatedHoursNeeded: 3
      },
      {
        id: 't_derivatives',
        name: 'Derivatives & Chain Rule',
        difficulty: 'medium',
        weightage: 30,
        currentMastery: 70,
        prerequisites: ['t_limits'],
        estimatedHoursNeeded: 6
      },
      {
        id: 't_integrals',
        name: 'Integration & Fundamental Theorem',
        difficulty: 'hard',
        weightage: 50,
        currentMastery: 40,
        prerequisites: ['t_derivatives'],
        estimatedHoursNeeded: 12
      }
    ]
  };

  const deadlineIn5Days: ExamDeadline = {
    id: 'dl_math',
    subjectId: 's_math',
    examName: 'Midterm',
    examDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    targetMarks: 80,
    totalExamMarks: 100,
    targetPercentage: 80,
    weightage: 30
  };

  const strictConfig: StudyPlannerConfig = {
    availableHoursPerDay: 1, // Only 1 hour per day = 5 hours total available
    preferredDays: [0, 1, 2, 3, 4, 5, 6],
    maxDailyHours: 1,
    unavailableDates: [],
    revisionPreference: 'spaced',
    mockTestFrequencyDays: 3,
    dailyReminderEnabled: true
  };

  it('detects schedule conflicts when required study hours exceed student availability', () => {
    const conflict = checkScheduleConflicts([mockSubject], [deadlineIn5Days], strictConfig);
    expect(conflict.hasConflict).toBe(true);
    expect(conflict.deficitHours).toBeGreaterThan(0);
    expect(conflict.recommendedAdjustments.length).toBeGreaterThan(0);
  });

  it('correctly sorts topics topologically respecting prerequisite constraints', () => {
    const unordered: Topic[] = [
      mockSubject.topics[2], // Integrals (requires Derivatives)
      mockSubject.topics[1], // Derivatives (requires Limits)
      mockSubject.topics[0]  // Limits (no prereq)
    ];

    const sorted = sortTopicsByPrerequisites(unordered);
    const names = sorted.map(t => t.name);
    expect(names.indexOf('Limits & Continuity')).toBeLessThan(names.indexOf('Derivatives & Chain Rule'));
    expect(names.indexOf('Derivatives & Chain Rule')).toBeLessThan(names.indexOf('Integration & Fundamental Theorem'));
  });

  it('never schedules more daily study time than the student declared as available', () => {
    const plan = generateStudyPlan([mockSubject], [deadlineIn5Days], strictConfig);
    expect(plan.sessions.length).toBeGreaterThan(0);

    // Group sessions by day
    const dayTotals: Record<string, number> = {};
    plan.sessions.forEach(s => {
      dayTotals[s.scheduledDate] = (dayTotals[s.scheduledDate] || 0) + s.durationMinutes;
    });

    const maxAllowedMinutes = strictConfig.availableHoursPerDay * 60;
    Object.values(dayTotals).forEach(totalMinutes => {
      // Must not exceed max daily limit
      expect(totalMinutes).toBeLessThanOrEqual(maxAllowedMinutes + 1); // allow 1 min rounding
    });
  });
});

describe('Weekly Learning Growth Prediction Engine', () => {
  it('returns "Not enough data yet" for a brand new student with 0 or 1 test', () => {
    const emptyForecast = calculateWeeklyForecast([], []);
    expect(emptyForecast.hasEnoughData).toBe(false);
    expect(emptyForecast.confidenceLevel).toBe('Low');
    expect(emptyForecast.predictedScoreNextWeek).toBe(0);

    const singleTestForecast = calculateWeeklyForecast([
      {
        id: '1',
        examId: 'e1',
        examTitle: 'Quiz 1',
        subjectId: 's1',
        subjectName: 'Test',
        timestamp: new Date().toISOString(),
        durationSpentSeconds: 300,
        totalMarksObtained: 40,
        maxPossibleMarks: 50,
        percentage: 80,
        passed: true,
        correctCount: 4,
        partialCount: 0,
        incorrectCount: 1,
        unansweredCount: 0,
        questionEvaluations: [],
        subjectWiseMarks: {},
        topicWiseMarks: {},
        strongTopics: [],
        weakTopics: [],
        repeatedMistakes: [],
        missingConcepts: [],
        recommendedRevisionPriorities: [],
        evaluationMode: 'digital'
      }
    ], []);
    expect(singleTestForecast.hasEnoughData).toBe(false);
  });

  it('calculates a bounded prediction interval when student has at least 2 real tests', () => {
    const test1: GradingResult = {
      id: '1',
      examId: 'e1',
      examTitle: 'Test 1',
      subjectId: 's1',
      subjectName: 'Algo',
      timestamp: '2026-10-05T10:00:00Z',
      durationSpentSeconds: 600,
      totalMarksObtained: 35,
      maxPossibleMarks: 50,
      percentage: 70,
      passed: true,
      correctCount: 7,
      partialCount: 0,
      incorrectCount: 3,
      unansweredCount: 0,
      questionEvaluations: [
        {
          questionId: 'q1',
          topic: 'Graphs',
          status: 'correct',
          maxMarks: 10,
          awardedMarks: 7,
          explanation: '',
          missingConcepts: [],
          correctModelSolution: ''
        }
      ],
      subjectWiseMarks: {},
      topicWiseMarks: { 'Graphs': { obtained: 7, max: 10, percentage: 70 } },
      strongTopics: [],
      weakTopics: ['Graphs'],
      repeatedMistakes: [],
      missingConcepts: [],
      recommendedRevisionPriorities: [],
      evaluationMode: 'digital'
    };

    const test2: GradingResult = {
      ...test1,
      id: '2',
      examTitle: 'Test 2',
      timestamp: '2026-10-10T10:00:00Z',
      percentage: 78,
      totalMarksObtained: 39,
      topicWiseMarks: { 'Graphs': { obtained: 8, max: 10, percentage: 80 } }
    };

    const forecast = calculateWeeklyForecast([test1, test2], []);
    expect(forecast.hasEnoughData).toBe(true);
    expect(forecast.currentMeasuredScore).toBeGreaterThanOrEqual(70);
    expect(forecast.currentMeasuredScore).toBeLessThanOrEqual(80);
    expect(forecast.predictedScoreNextWeek).toBeGreaterThanOrEqual(0);
    expect(forecast.predictedScoreNextWeek).toBeLessThanOrEqual(100);
    // Score range min <= predicted <= score range max
    expect(forecast.scoreRangeMin).toBeLessThanOrEqual(forecast.predictedScoreNextWeek);
    expect(forecast.scoreRangeMax).toBeGreaterThanOrEqual(forecast.predictedScoreNextWeek);
    expect(forecast.timeline.length).toBeGreaterThan(0);
  });
});

describe('Smart Paper Evaluation & Remediation Feedback Loop', () => {
  it('correctly tracks needs_review status without fabricating scores for ambiguous handwriting', () => {
    const paper: ExamPaper = {
      id: 'paper_ocr',
      subjectId: 's1',
      title: 'Handwritten Check',
      type: 'practice',
      durationMinutes: 30,
      totalMarks: 20,
      passingMarks: 10,
      targetMarks: 16,
      negativeMarking: false,
      negativeMarkRatio: 0,
      instructions: [],
      questions: [
        {
          id: 'q1',
          topic: 'Pathology',
          type: 'short-answer',
          text: 'Describe granuloma formation.',
          marks: 10,
          modelSolution: 'Macrophage aggregation surrounded by lymphocytes.',
          gradingRubric: ['Macrophages (5m)', 'Lymphocytes (5m)']
        },
        {
          id: 'q2',
          topic: 'Pathology',
          type: 'short-answer',
          text: 'List 3 causes of caseous necrosis.',
          marks: 10,
          modelSolution: 'Tuberculosis, histoplasmosis, coccidioidomycosis.',
          gradingRubric: ['Pathogens listed (10m)']
        }
      ],
      createdAt: new Date().toISOString()
    };

    const uncertainEval = [
      {
        questionId: 'q1',
        status: 'needs_review' as const,
        maxMarks: 10,
        awardedMarks: 0,
        explanation: 'Handwriting text recognized with high uncertainty. Requires manual confirmation.',
        missingConcepts: [],
        correctModelSolution: 'Macrophage aggregation surrounded by lymphocytes.',
        topic: 'Pathology'
      },
      {
        questionId: 'q2',
        status: 'correct' as const,
        maxMarks: 10,
        awardedMarks: 10,
        explanation: 'All 3 pathogens identified accurately.',
        missingConcepts: [],
        correctModelSolution: 'Tuberculosis, histoplasmosis.',
        topic: 'Pathology'
      }
    ];

    const result = compileExamGradingResult(
      paper,
      {
        q1: { questionId: 'q1', recognizedHandwritingText: '...' },
        q2: { questionId: 'q2', answerText: 'TB, Histoplasmosis, Coccidioidomycosis' }
      },
      uncertainEval,
      600
    );

    expect(result.needsReviewCount).toBe(1);
    expect(result.evaluationMode).toBe('hybrid');
    expect(result.totalMarksObtained).toBe(10);
    // Is provisional because only 2 questions were tested (< 3)
    expect(result.isProvisional).toBe(true);
  });
});
