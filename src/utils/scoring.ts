import { Question, ExamPaper, StudentAnswer, QuestionEvaluation, GradingResult } from '../types';

/**
 * Validates that the sum of question marks matches the target total marks
 */
export function validateMarkingScheme(questions: Question[], targetTotalMarks: number): {
  isValid: boolean;
  currentTotal: number;
  discrepancy: number;
  message: string;
} {
  const currentTotal = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
  const discrepancy = targetTotalMarks - currentTotal;
  const isValid = Math.abs(discrepancy) < 0.001;

  let message = 'Marking scheme matches total exam marks perfectly.';
  if (!isValid) {
    if (discrepancy > 0) {
      message = `Questions sum to ${currentTotal} marks, which is ${discrepancy} marks below requested ${targetTotalMarks}. Please adjust question marks.`;
    } else {
      message = `Questions sum to ${currentTotal} marks, which exceeds requested ${targetTotalMarks} by ${Math.abs(discrepancy)} marks.`;
    }
  }

  return { isValid, currentTotal, discrepancy, message };
}

/**
 * Evaluates an MCQ question deterministically with negative marking support
 */
export function evaluateMCQ(
  question: Question,
  selectedOption?: number,
  negativeMarkRatio: number = 0
): { awardedMarks: number; status: 'correct' | 'incorrect' | 'unanswered'; penalty: number } {
  if (selectedOption === undefined || selectedOption === null) {
    return { awardedMarks: 0, status: 'unanswered', penalty: 0 };
  }

  if (selectedOption === question.correctOption) {
    return { awardedMarks: question.marks, status: 'correct', penalty: 0 };
  }

  const penalty = negativeMarkRatio > 0 ? Number((question.marks * negativeMarkRatio).toFixed(2)) : 0;
  return { awardedMarks: penalty > 0 ? -penalty : 0, status: 'incorrect', penalty };
}

/**
 * Evaluates numerical questions with strict tolerance checks
 */
export function evaluateNumerical(
  question: Question,
  studentText?: string
): { awardedMarks: number; status: 'correct' | 'incorrect' | 'unanswered'; delta: number } {
  if (!studentText || studentText.trim() === '') {
    return { awardedMarks: 0, status: 'unanswered', delta: NaN };
  }

  const studentVal = parseFloat(studentText.replace(/[^0-9.-]/g, ''));
  if (isNaN(studentVal)) {
    return { awardedMarks: 0, status: 'incorrect', delta: NaN };
  }

  const expected = question.expectedValue ?? 0;
  const tolerance = question.acceptableTolerance ?? 0.01;
  const delta = Math.abs(studentVal - expected);

  if (delta <= tolerance) {
    return { awardedMarks: question.marks, status: 'correct', delta };
  }

  // Partial credit if very close (within 2x tolerance)
  if (delta <= tolerance * 2) {
    const partial = Number((question.marks * 0.5).toFixed(2));
    return { awardedMarks: partial, status: 'incorrect', delta };
  }

  return { awardedMarks: 0, status: 'incorrect', delta };
}

/**
 * Evaluates multiple-select questions (e.g. MSQ in GATE or multi-option in USMLE)
 */
export function evaluateMultipleSelect(
  question: Question,
  selectedOptions?: number[],
  negativeMarkRatio: number = 0
): { awardedMarks: number; status: 'correct' | 'partially_correct' | 'incorrect' | 'unanswered'; penalty: number } {
  if (!selectedOptions || selectedOptions.length === 0) {
    return { awardedMarks: 0, status: 'unanswered', penalty: 0 };
  }

  const correctSet = new Set(question.correctOptions || (question.correctOption !== undefined ? [question.correctOption] : []));
  const studentSet = new Set(selectedOptions);

  let matches = 0;
  let wrongSelections = 0;

  studentSet.forEach(opt => {
    if (correctSet.has(opt)) {
      matches++;
    } else {
      wrongSelections++;
    }
  });

  const isExact = matches === correctSet.size && wrongSelections === 0;
  if (isExact) {
    return { awardedMarks: question.marks, status: 'correct', penalty: 0 };
  }

  // Partial credit for partial correct selection without wrong options selected
  if (wrongSelections === 0 && matches > 0) {
    const partial = Number(((matches / correctSet.size) * question.marks * 0.75).toFixed(2));
    return { awardedMarks: partial, status: 'partially_correct', penalty: 0 };
  }

  const penalty = negativeMarkRatio > 0 ? Number((question.marks * negativeMarkRatio).toFixed(2)) : 0;
  return { awardedMarks: penalty > 0 ? -penalty : 0, status: 'incorrect', penalty };
}

/**
 * Compiles total exam grading result deterministically
 */
export function compileExamGradingResult(
  paper: ExamPaper,
  answers: Record<string, StudentAnswer>,
  evaluations: QuestionEvaluation[],
  durationSpentSeconds: number
): GradingResult {
  let totalRawMarks = 0;
  let correctCount = 0;
  let partialCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  const topicMarks: Record<string, { obtained: number; max: number }> = {};
  const missingConceptsSet = new Set<string>();

  for (const q of paper.questions) {
    const ans = answers[q.id];
    let evaluation = evaluations.find(e => e.questionId === q.id);

    // If deterministic evaluation is required
    if (!evaluation) {
      if (q.type === 'mcq') {
        const res = evaluateMCQ(q, ans?.selectedOption, paper.negativeMarking ? paper.negativeMarkRatio : 0);
        evaluation = {
          questionId: q.id,
          status: res.status === 'correct' ? 'correct' : 'incorrect',
          maxMarks: q.marks,
          awardedMarks: res.awardedMarks,
          explanation: res.status === 'correct'
            ? 'Correct option selected.'
            : res.status === 'unanswered'
            ? 'Question was not answered.'
            : `Incorrect option selected. Option ${String.fromCharCode(65 + (q.correctOption || 0))} is correct. Penalty: -${res.penalty} marks.`,
          missingConcepts: res.status === 'correct' ? [] : [q.topic],
          correctModelSolution: q.modelSolution,
          topic: q.topic
        };
      } else if (q.type === 'multiple-select') {
        const res = evaluateMultipleSelect(q, ans?.selectedOptions, paper.negativeMarking ? paper.negativeMarkRatio : 0);
        evaluation = {
          questionId: q.id,
          status: res.status === 'correct' ? 'correct' : res.status === 'partially_correct' ? 'partially_correct' : 'incorrect',
          maxMarks: q.marks,
          awardedMarks: res.awardedMarks,
          explanation: res.status === 'correct'
            ? 'All correct options selected.'
            : res.status === 'partially_correct'
            ? `Partial credit awarded (${res.awardedMarks}/${q.marks}) for valid subset selection.`
            : `Incorrect combination. Penalty: -${res.penalty} marks.`,
          missingConcepts: res.status === 'correct' ? [] : [q.topic],
          correctModelSolution: q.modelSolution,
          topic: q.topic
        };
      } else if (q.type === 'numerical') {
        const res = evaluateNumerical(q, ans?.answerText);
        evaluation = {
          questionId: q.id,
          status: res.status === 'correct' ? 'correct' : 'incorrect',
          maxMarks: q.marks,
          awardedMarks: res.awardedMarks,
          explanation: res.status === 'correct'
            ? `Accurate calculation (${ans?.answerText}).`
            : `Calculated value outside tolerance ±${q.acceptableTolerance || 0.05}. Expected ${q.expectedValue} ${q.unit || ''}.`,
          missingConcepts: res.status === 'correct' ? [] : [`Numerical precision in ${q.topic}`],
          correctModelSolution: q.modelSolution,
          topic: q.topic
        };
      } else {
        const text = (ans?.answerText || ans?.recognizedHandwritingText || '').trim();
        const isAnswered = text.length > 0;
        evaluation = {
          questionId: q.id,
          status: isAnswered ? 'partially_correct' : 'incorrect',
          maxMarks: q.marks,
          awardedMarks: isAnswered ? Math.round(q.marks * 0.5) : 0,
          explanation: isAnswered ? 'Subjective response recorded.' : 'Unanswered.',
          missingConcepts: isAnswered ? [] : [q.topic],
          correctModelSolution: q.modelSolution,
          topic: q.topic
        };
      }
    }

    // Safety: Awarded marks cannot exceed max marks
    const awarded = Math.min(q.marks, evaluation.awardedMarks);
    totalRawMarks += awarded;

    // Track statuses
    const isUnanswered = !ans || (!ans.answerText && ans.selectedOption === undefined && (!ans.selectedOptions || ans.selectedOptions.length === 0) && !ans.recognizedHandwritingText);
    if (evaluation.status === 'needs_review') {
      // Manual review required
    } else if (isUnanswered) {
      unansweredCount++;
    } else if (evaluation.status === 'correct') {
      correctCount++;
    } else if (evaluation.status === 'partially_correct') {
      partialCount++;
    } else {
      incorrectCount++;
    }

    // Accumulate topic metrics
    if (!topicMarks[q.topic]) {
      topicMarks[q.topic] = { obtained: 0, max: 0 };
    }
    topicMarks[q.topic].obtained += Math.max(0, awarded);
    topicMarks[q.topic].max += q.marks;

    if (evaluation.missingConcepts) {
      evaluation.missingConcepts.forEach(c => missingConceptsSet.add(c));
    }
  }

  // Final score cannot fall below 0
  const finalTotalMarks = Math.max(0, Number(totalRawMarks.toFixed(2)));
  const percentage = paper.totalMarks > 0 ? Number(((finalTotalMarks / paper.totalMarks) * 100).toFixed(1)) : 0;
  const passed = finalTotalMarks >= paper.passingMarks;
  const needsReviewCount = evaluations.filter(e => e.status === 'needs_review').length;
  const isProvisional = paper.questions.length < 3;

  const topicWiseMarks: Record<string, { obtained: number; max: number; percentage: number }> = {};
  const strongTopics: string[] = [];
  const weakTopics: string[] = [];

  Object.entries(topicMarks).forEach(([topic, stat]) => {
    const pct = stat.max > 0 ? Math.round((stat.obtained / stat.max) * 100) : 0;
    topicWiseMarks[topic] = {
      obtained: Number(stat.obtained.toFixed(2)),
      max: stat.max,
      percentage: pct
    };
    if (pct >= 75) {
      strongTopics.push(topic);
    } else {
      weakTopics.push(topic);
    }
  });

  return {
    id: `eval_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    examId: paper.id,
    examTitle: paper.title,
    subjectId: paper.subjectId,
    subjectName: paper.title.split('-')[0]?.trim() || 'Subject',
    timestamp: new Date().toISOString(),
    durationSpentSeconds,
    totalMarksObtained: finalTotalMarks,
    maxPossibleMarks: paper.totalMarks,
    percentage,
    passed,
    correctCount,
    partialCount,
    incorrectCount,
    unansweredCount,
    needsReviewCount,
    isProvisional,
    questionEvaluations: evaluations,
    subjectWiseMarks: {
      [paper.subjectId]: { obtained: finalTotalMarks, max: paper.totalMarks, percentage }
    },
    topicWiseMarks,
    strongTopics,
    weakTopics,
    repeatedMistakes: Array.from(missingConceptsSet).slice(0, 5),
    missingConcepts: Array.from(missingConceptsSet),
    recommendedRevisionPriorities: weakTopics.slice(0, 3),
    evaluationMode: evaluations.some(e => e.status === 'needs_review') ? 'hybrid' : 'digital'
  };
}
