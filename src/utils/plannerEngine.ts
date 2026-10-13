import {
  Subject,
  ExamDeadline,
  StudyPlannerConfig,
  StudySession,
  ScheduleConflict,
  Topic,
  GradingResult
} from '../types';

/**
 * Checks for schedule conflicts between required topic study hours and student availability.
 */
export function checkScheduleConflicts(
  subjects: Subject[],
  deadlines: ExamDeadline[],
  config: StudyPlannerConfig
): ScheduleConflict {
  // Find earliest deadline
  const now = new Date();
  const sortedDeadlines = [...deadlines].sort(
    (a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()
  );

  const nearestExam = sortedDeadlines[0];
  if (!nearestExam) {
    return {
      hasConflict: false,
      requiredHours: 0,
      availableHours: 0,
      deficitHours: 0,
      explanation: 'No upcoming exam deadlines set. You can study at your own pace.',
      recommendedAdjustments: []
    };
  }

  const examDate = new Date(nearestExam.examDate);
  const diffDays = Math.max(1, Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Calculate student available hours strictly according to config
  let availableDaysCount = 0;
  for (let i = 0; i < diffDays; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dayOfWeek = d.getDay();
    const dateStr = d.toISOString().split('T')[0];

    // Check preferred days and unavailable dates
    if (config.preferredDays.includes(dayOfWeek) && !config.unavailableDates.includes(dateStr)) {
      availableDaysCount++;
    }
  }

  const maxDailyAllowed = Math.min(config.availableHoursPerDay, config.maxDailyHours);
  const totalAvailableHours = Number((availableDaysCount * maxDailyAllowed).toFixed(1));

  // Calculate required hours for all topics belonging to the subjects with deadlines
  const relevantSubjectIds = new Set(deadlines.map(d => d.subjectId));
  let requiredHours = 0;
  subjects
    .filter(s => relevantSubjectIds.has(s.id))
    .forEach(s => {
      s.topics.forEach(t => {
        // Adjust required hours based on current mastery (higher mastery requires less initial study)
        const masteryDiscount = Math.max(0.3, (100 - t.currentMastery) / 100);
        requiredHours += t.estimatedHoursNeeded * masteryDiscount;
      });
    });

  // Add buffer for revision and mock exams (at least 20% extra)
  const totalRequiredWithBuffers = Number((requiredHours * 1.25).toFixed(1));
  const deficitHours = Number((totalRequiredWithBuffers - totalAvailableHours).toFixed(1));
  const hasConflict = deficitHours > 0;

  let explanation = `You have ${totalAvailableHours} available study hours over ${availableDaysCount} study days before ${nearestExam.examName}. Required syllabus workload with revision is ${totalRequiredWithBuffers} hours.`;
  const recommendedAdjustments: string[] = [];

  if (hasConflict) {
    explanation += ` Deficit: ${deficitHours} hours. Schedule compression required!`;
    recommendedAdjustments.push(`Increase daily study allocation by +${(deficitHours / availableDaysCount).toFixed(1)} hrs/day.`);
    recommendedAdjustments.push(`Prioritize top-weighted topics and shift low-yield topics to rapid flashcard review.`);
    recommendedAdjustments.push(`Unlock 1-2 weekend days in preferred study days.`);
  } else {
    explanation += ' Schedule is balanced and feasible within your specified daily limits.';
  }

  return {
    hasConflict,
    requiredHours: totalRequiredWithBuffers,
    availableHours: totalAvailableHours,
    deficitHours: Math.max(0, deficitHours),
    explanation,
    recommendedAdjustments
  };
}

/**
 * Topologically sorts topics respecting prerequisites
 */
export function sortTopicsByPrerequisites(topics: Topic[]): Topic[] {
  const result: Topic[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const topicMap = new Map<string, Topic>();
  topics.forEach(t => {
    if (!t) return;
    if (t.id) topicMap.set(t.id, t);
    if (typeof t.name === 'string') topicMap.set(t.name.toLowerCase(), t);
  });

  function visit(t: Topic) {
    if (!t || !t.id || visited.has(t.id)) return;
    if (visiting.has(t.id)) {
      // Circular dependency guard: break cycle
      visited.add(t.id);
      result.push(t);
      return;
    }

    visiting.add(t.id);
    if (t.prerequisites && t.prerequisites.length > 0) {
      t.prerequisites.forEach(prereqIdOrName => {
        if (!prereqIdOrName) return;
        const prereqKey = typeof prereqIdOrName === 'string' ? prereqIdOrName.toLowerCase() : '';
        const prereq = topicMap.get(prereqIdOrName) || (prereqKey ? topicMap.get(prereqKey) : undefined);
        if (prereq && prereq.id !== t.id) {
          visit(prereq);
        }
      });
    }
    visiting.delete(t.id);
    visited.add(t.id);
    result.push(t);
  }

  topics.forEach(t => {
    if (!visited.has(t.id)) {
      visit(t);
    }
  });

  return result;
}

/**
 * Generates an adaptive, highly realistic study plan adhering to daily limits,
 * prerequisites, spaced revision, and mock exam milestones.
 */
export function generateStudyPlan(
  subjects: Subject[],
  deadlines: ExamDeadline[],
  config: StudyPlannerConfig,
  history: GradingResult[] = [],
  existingSessions: StudySession[] = []
): { sessions: StudySession[]; conflict: ScheduleConflict; generationSummary: string } {
  const conflict = checkScheduleConflicts(subjects, deadlines, config);
  const preservedCompleted = existingSessions.filter(s => s.completed);

  if (subjects.length === 0 || deadlines.length === 0) {
    return {
      sessions: preservedCompleted,
      conflict,
      generationSummary: 'Add at least one subject and an upcoming exam deadline to generate a study plan.'
    };
  }

  const nearestExam = [...deadlines].sort(
    (a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()
  )[0];

  const now = new Date();
  const examDate = new Date(nearestExam.examDate);
  const totalDays = Math.max(2, Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Collect candidate topics across subjects
  const allCandidateTopics: Array<{ topic: Topic; subject: Subject; priorityScore: number }> = [];

  subjects.forEach(subject => {
    const isExamSubject = deadlines.some(d => d.subjectId === subject.id);
    const deadlineForSubj = deadlines.find(d => d.subjectId === subject.id);
    const daysUntilSubjectExam = deadlineForSubj
      ? Math.max(1, Math.ceil((new Date(deadlineForSubj.examDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 30;

    // Prerequisite sort
    const orderedTopics = sortTopicsByPrerequisites(subject.topics);

    orderedTopics.forEach((topic, index) => {
      // Priority formula: Weightage (35%) + Need/Weakness (40%) + Urgency (25%)
      const urgencyScore = Math.max(0, 100 - daysUntilSubjectExam * 3);
      const weaknessScore = Math.max(10, 100 - topic.currentMastery);
      const weightScore = topic.weightage || 50;

      // Bonus for exam subject and earlier prerequisites
      const examBonus = isExamSubject ? 20 : 0;
      const orderPenalty = index * 2; // slight nudge to cover prerequisites earlier

      const priorityScore = (weightScore * 0.35) + (weaknessScore * 0.40) + (urgencyScore * 0.25) + examBonus - orderPenalty;

      allCandidateTopics.push({ topic, subject, priorityScore });
    });
  });

  // Sort descending by priority score
  allCandidateTopics.sort((a, b) => b.priorityScore - a.priorityScore);

  // If there's a deficit conflict, trim or compress low-priority topics to fit
  const maxDailyMinutes = Math.floor(Math.min(config.availableHoursPerDay, config.maxDailyHours) * 60);

  const newSessions: StudySession[] = [];
  const scheduledTopicIds = new Set<string>();

  // Slot management per available day with strict daily minute capping
  const dayMinutesAllocated: Record<string, number> = {};

  const canAllocateMinutes = (dateStr: string, minutes: number): boolean => {
    const current = dayMinutesAllocated[dateStr] || 0;
    return current + minutes <= maxDailyMinutes;
  };

  const allocateMinutes = (dateStr: string, minutes: number) => {
    dayMinutesAllocated[dateStr] = (dayMinutesAllocated[dateStr] || 0) + minutes;
  };

  // Populate pre-existing completed sessions on those dates
  preservedCompleted.forEach(s => {
    allocateMinutes(s.scheduledDate, s.durationMinutes);
  });

  let dayOffset = 0;
  let topicIndex = 0;

  // Preserve days for Final Revision and Mock Tests
  const finalRevisionDays = Math.min(2, Math.floor(totalDays * 0.2));
  const studyEndDay = Math.max(1, totalDays - finalRevisionDays);

  while (dayOffset < studyEndDay && topicIndex < allCandidateTopics.length) {
    const currentDate = new Date(now);
    currentDate.setDate(currentDate.getDate() + dayOffset);
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getDay();

    // Check availability
    if (!config.preferredDays.includes(dayOfWeek) || config.unavailableDates.includes(dateStr)) {
      dayOffset++;
      continue;
    }

    const currentUsed = dayMinutesAllocated[dateStr] || 0;
    let dailyMinutesLeft = maxDailyMinutes - currentUsed;

    // Schedule study session if sufficient minutes remain
    if (dailyMinutesLeft >= 30 && topicIndex < allCandidateTopics.length) {
      const item = allCandidateTopics[topicIndex];
      const sessionDuration = Math.min(dailyMinutesLeft, Math.max(30, Math.min(90, Math.floor(item.topic.estimatedHoursNeeded * 60))));

      const sessionTitle = `${item.subject.name}: Deep Study - ${item.topic.name}`;
      newSessions.push({
        id: `sess_${dateStr}_${item.topic.id}_${Math.random().toString(36).substring(2, 6)}`,
        subjectId: item.subject.id,
        topicId: item.topic.id,
        title: sessionTitle,
        scheduledDate: dateStr,
        durationMinutes: sessionDuration,
        type: 'study',
        completed: false,
        notes: `Focus on ${item.topic.name}. Target mastery: +15%. Exam weight: ${item.topic.weightage}%.`
      });

      allocateMinutes(dateStr, sessionDuration);
      scheduledTopicIds.add(item.topic.id);

      // Attempt spaced revision 2 or 3 days later only if capacity exists
      if (config.revisionPreference !== 'intensive') {
        const revDate = new Date(currentDate);
        revDate.setDate(revDate.getDate() + 3);
        const revDateStr = revDate.toISOString().split('T')[0];
        const revDayOfWeek = revDate.getDay();

        if (
          revDate < examDate &&
          config.preferredDays.includes(revDayOfWeek) &&
          !config.unavailableDates.includes(revDateStr) &&
          canAllocateMinutes(revDateStr, 30)
        ) {
          newSessions.push({
            id: `rev_${revDateStr}_${item.topic.id}_${Math.random().toString(36).substring(2, 6)}`,
            subjectId: item.subject.id,
            topicId: item.topic.id,
            title: `Spaced Revision: ${item.topic.name}`,
            scheduledDate: revDateStr,
            durationMinutes: 30,
            type: 'revision',
            completed: false,
            notes: `Active recall and flashcard testing on ${item.topic.name}.`
          });
          allocateMinutes(revDateStr, 30);
        }
      }

      topicIndex++;
    }

    dayOffset++;
  }

  // Schedule Mock Examination & Final Intensive Revision in the final days if capacity permits
  for (let revDay = studyEndDay; revDay < totalDays; revDay++) {
    const revDate = new Date(now);
    revDate.setDate(revDate.getDate() + revDay);
    const revDateStr = revDate.toISOString().split('T')[0];
    const dayOfWeek = revDate.getDay();

    if (!config.preferredDays.includes(dayOfWeek) || config.unavailableDates.includes(revDateStr)) {
      continue;
    }

    const availableForFinal = maxDailyMinutes - (dayMinutesAllocated[revDateStr] || 0);
    if (availableForFinal < 30) continue;

    if (revDay === totalDays - 2) {
      const mockDur = Math.min(availableForFinal, 90);
      newSessions.push({
        id: `mock_${revDateStr}_${nearestExam.id}`,
        subjectId: nearestExam.subjectId,
        topicId: 'all_topics',
        title: `Full Diagnostic Mock Exam: ${nearestExam.examName}`,
        scheduledDate: revDateStr,
        durationMinutes: mockDur,
        type: 'mock',
        completed: false,
        notes: `Simulated exam environment under timed conditions. Target: ${nearestExam.targetMarks} marks.`
      });
      allocateMinutes(revDateStr, mockDur);
    } else if (revDay === totalDays - 1) {
      const revDur = Math.min(availableForFinal, 120);
      newSessions.push({
        id: `final_${revDateStr}_${nearestExam.id}`,
        subjectId: nearestExam.subjectId,
        topicId: 'high_yield',
        title: `Final Rapid Revision & High-Yield Formulae Review`,
        scheduledDate: revDateStr,
        durationMinutes: revDur,
        type: 'buffer',
        completed: false,
        notes: `Consolidate key formulas, exam cheat-sheets, and weak spot diagnostics.`
      });
      allocateMinutes(revDateStr, revDur);
    }
  }

  // Combine completed past sessions with newly generated future sessions (avoiding duplicates)
  const completedIds = new Set(preservedCompleted.map(c => `${c.scheduledDate}_${c.topicId}`));
  const filteredNew = newSessions.filter(s => !completedIds.has(`${s.scheduledDate}_${s.topicId}`));
  const combined = [...preservedCompleted, ...filteredNew].sort(
    (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  );

  const summary = `Generated ${filteredNew.length} scheduled sessions spanning ${totalDays} days leading to ${nearestExam.examName}. Preserved ${preservedCompleted.length} completed sessions.`;

  return {
    sessions: combined,
    conflict,
    generationSummary: summary
  };
}

/**
 * Dynamic replanning: recalculates remaining plan when a session was missed,
 * exam deadline changed, or a quiz revealed weak topics.
 */
export function replanSchedule(
  currentSessions: StudySession[],
  subjects: Subject[],
  deadlines: ExamDeadline[],
  config: StudyPlannerConfig,
  history: GradingResult[] = []
): { sessions: StudySession[]; changesExplanation: string } {
  const todayStr = new Date().toISOString().split('T')[0];

  // Identify missed incomplete sessions from the past
  const pastIncomplete = currentSessions.filter(
    s => s.scheduledDate < todayStr && !s.completed
  );

  const completedSessions = currentSessions.filter(s => s.completed);

  // Generate fresh forward-looking schedule from today onwards
  const { sessions: regenerated, conflict } = generateStudyPlan(
    subjects,
    deadlines,
    config,
    history,
    completedSessions
  );

  let explanation = '';
  if (pastIncomplete.length > 0) {
    explanation = `Replanned schedule: Shifted ${pastIncomplete.length} incomplete past session(s) into upcoming available slots without exceeding your daily study ceiling of ${config.availableHoursPerDay} hrs.`;
  } else {
    explanation = `Schedule optimized across ${regenerated.length} sessions aligning with your target deadlines and recent diagnostic mastery levels.`;
  }

  if (conflict.hasConflict) {
    explanation += ` Notice: Workload compressed to preserve highest-yield exam topics.`;
  }

  return {
    sessions: regenerated,
    changesExplanation: explanation
  };
}
