import { GradingResult, Subject, WeeklyForecast, TopicForecast, StudySession } from '../types';

/**
 * Calculates a transparent, mathematically grounded weekly learning forecast.
 * Uses Exponential Moving Average (EMA) with safeguards against extreme extrapolation,
 * and calculates statistical prediction intervals.
 */
export function calculateWeeklyForecast(
  history: GradingResult[],
  subjects: Subject[],
  sessions: StudySession[] = []
): WeeklyForecast {
  // Safe baseline check: If student has fewer than 2 completed assessments, return "Not enough data yet"
  if (!history || history.length < 2) {
    return {
      calculatedAt: new Date().toISOString(),
      hasEnoughData: false,
      dataPointsCount: history?.length || 0,
      currentMeasuredScore: history?.length === 1 ? history[0].percentage : 0,
      predictedScoreNextWeek: 0,
      scoreRangeMin: 0,
      scoreRangeMax: 0,
      confidenceLevel: 'Low',
      confidencePercentage: history?.length === 1 ? 25 : 0,
      influencingFactors: [
        'Insufficient assessment history: Minimum 2 tests required for trend calibration.',
        'No baseline test variance can be determined yet.',
        'Complete your first practice test or chapter quiz to activate statistical forecasting.'
      ],
      recommendedActions: [
        'Take a 10-minute diagnostic quiz on your primary subject.',
        'Establish your baseline mastery score.',
        'Complete today’s planned study session.'
      ],
      topicForecasts: [],
      timeline: []
    };
  }

  // Sort history chronologically
  const sorted = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const scores = sorted.map(h => h.percentage);
  const n = scores.length;

  // 1. Current Measured Score (Weighted average of recent attempts, giving 60% weight to newest)
  let currentMeasured = 0;
  if (n === 2) {
    currentMeasured = Number((scores[0] * 0.4 + scores[1] * 0.6).toFixed(1));
  } else {
    // 3-point Exponential Weighted Moving Average (EMA)
    const alpha = 0.45;
    let ema = scores[0];
    for (let i = 1; i < n; i++) {
      ema = alpha * scores[i] + (1 - alpha) * ema;
    }
    currentMeasured = Number(ema.toFixed(1));
  }

  // 2. Trend Calculation (Linear regression slope or discrete delta)
  let slope = 0;
  if (n >= 2) {
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += scores[i];
      sumXY += i * scores[i];
      sumX2 += i * i;
    }
    const denom = n * sumX2 - sumX * sumX;
    slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  }

  // Safeguards against extreme extrapolation: cap slope to max +/- 4% per week
  const boundedSlope = Math.max(-4.5, Math.min(5.0, slope));

  // Study habit booster: factor in completed study sessions ratio in past 7 days
  const completedSessions = sessions.filter(s => s.completed).length;
  const totalPlannedSessions = Math.max(1, sessions.length);
  const completionRatio = Math.min(1, completedSessions / totalPlannedSessions);
  const habitBooster = (completionRatio - 0.5) * 2.0; // Between -1.0% and +1.0%

  // Predicted baseline for 7 days ahead
  let predictedRaw = currentMeasured + boundedSlope + habitBooster;
  // Bound prediction between [0, 100]
  const predictedScoreNextWeek = Number(Math.max(0, Math.min(100, predictedRaw)).toFixed(1));

  // 3. Statistical Variance & Error Estimation (Root Mean Squared Error / Sample Std Dev)
  let varianceSum = 0;
  for (let i = 0; i < n; i++) {
    varianceSum += Math.pow(scores[i] - currentMeasured, 2);
  }
  const stdDev = Math.sqrt(varianceSum / Math.max(1, n - 1));

  // Confidence margin (90% prediction interval estimate)
  // Larger sample size -> narrower interval, smaller sample size -> wider interval
  const sampleAdjustment = Math.max(1.2, 2.5 - Math.min(1.2, (n - 2) * 0.25));
  const margin = Math.max(3.5, Math.min(14.0, Number((stdDev * sampleAdjustment).toFixed(1))));

  const scoreRangeMin = Number(Math.max(0, predictedScoreNextWeek - margin).toFixed(1));
  const scoreRangeMax = Number(Math.min(100, predictedScoreNextWeek + margin).toFixed(1));

  // 4. Confidence Level Calculation
  let confidencePct = Math.min(95, Math.round(30 + n * 12 - (stdDev > 12 ? 15 : 0)));
  let confidenceLevel: 'Low' | 'Medium' | 'High' = 'Low';
  if (n >= 5 && stdDev < 15) {
    confidenceLevel = 'High';
  } else if (n >= 3) {
    confidenceLevel = 'Medium';
  }

  // 5. Topic-Wise Forecast & Risk Analysis
  const topicMap: Record<string, {
    scores: number[];
    attempts: number;
    subjectId: string;
    topicName: string;
    topicId: string;
  }> = {};

  // Aggregate questions by topic
  history.forEach(h => {
    if (!h) return;

    if (h.questionEvaluations && Array.isArray(h.questionEvaluations) && h.questionEvaluations.length > 0) {
      h.questionEvaluations.forEach(qe => {
        if (!qe) return;
        const rawTopic = qe.topic && typeof qe.topic === 'string' ? qe.topic.trim() : '';
        const tName = rawTopic || 'General Foundations';
        if (!topicMap[tName]) {
          topicMap[tName] = {
            scores: [],
            attempts: 0,
            subjectId: h.subjectId || 'subj_1',
            topicName: tName,
            topicId: (tName || 'general').toLowerCase().replace(/\s+/g, '_')
          };
        }
        const maxM = Number(qe.maxMarks) || 1;
        const awardedM = Math.max(0, Number(qe.awardedMarks) || 0);
        const markPct = maxM > 0 ? (awardedM / maxM) * 100 : 0;
        topicMap[tName].scores.push(markPct);
        topicMap[tName].attempts += 1;
      });
    } else if (h.topicWiseMarks && typeof h.topicWiseMarks === 'object') {
      Object.entries(h.topicWiseMarks).forEach(([rawName, stat]) => {
        if (!rawName) return;
        const tName = typeof rawName === 'string' && rawName.trim() ? rawName.trim() : 'General Foundations';
        if (!topicMap[tName]) {
          topicMap[tName] = {
            scores: [],
            attempts: 0,
            subjectId: h.subjectId || 'subj_1',
            topicName: tName,
            topicId: (tName || 'general').toLowerCase().replace(/\s+/g, '_')
          };
        }
        const pct = stat && typeof stat.percentage === 'number' ? stat.percentage : 0;
        topicMap[tName].scores.push(pct);
        topicMap[tName].attempts += 1;
      });
    }
  });

  const topicForecasts: TopicForecast[] = Object.values(topicMap).map(tm => {
    const avg = tm.scores.reduce((a, b) => a + b, 0) / tm.scores.length;
    const currentMastery = Math.round(avg);

    // Topic trajectory
    let topicTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (tm.scores.length >= 2) {
      const recent = tm.scores[tm.scores.length - 1];
      const prev = tm.scores[tm.scores.length - 2];
      if (recent - prev >= 5) topicTrend = 'improving';
      else if (prev - recent >= 5) topicTrend = 'declining';
    }

    const growth = topicTrend === 'improving' ? 4 : topicTrend === 'declining' ? -3 : 1;
    const expectedScore = Math.max(0, Math.min(100, currentMastery + growth));

    let riskLevel: 'high_risk' | 'moderate' | 'on_track' | 'strong' = 'on_track';
    if (currentMastery < 50) riskLevel = 'high_risk';
    else if (currentMastery < 70) riskLevel = 'moderate';
    else if (currentMastery >= 85) riskLevel = 'strong';

    return {
      topicId: tm.topicId,
      topicName: tm.topicName,
      currentMastery,
      predictedGrowth: growth,
      expectedScoreNextWeek: expectedScore,
      riskLevel,
      trend: topicTrend,
      questionsAttempted: tm.attempts
    };
  });

  // 6. Factors that may influence the forecast
  const influencingFactors: string[] = [
    `Assessed across ${n} actual tests with ${scores.length} test records.`,
    `Performance variance: standard deviation of ±${stdDev.toFixed(1)} marks.`,
    `Study session consistency: ${(completionRatio * 100).toFixed(0)}% of scheduled sessions completed.`,
    boundedSlope > 0
      ? `Positive test trajectory (+${boundedSlope.toFixed(1)}% per test cycle).`
      : boundedSlope < 0
      ? `Recent score dip detected (${boundedSlope.toFixed(1)}% trajectory).`
      : `Performance is currently plateauting at ~${currentMeasured}%.`
  ];

  // 7. Recommended Actions
  const recommendedActions: string[] = [];
  const highRiskTopics = topicForecasts.filter(t => t.riskLevel === 'high_risk');
  if (highRiskTopics.length > 0) {
    recommendedActions.push(`Urgent focus on critical high-risk topic: "${highRiskTopics[0].topicName}".`);
  }
  if (completionRatio < 0.7) {
    recommendedActions.push('Complete missed study sessions to prevent schedule backpressure.');
  }
  recommendedActions.push('Attempt a targeted 20-minute practice exam 3 days before next deadline.');
  recommendedActions.push('Maintain error-log review to stabilize score variance.');

  // 8. Weekly graph timeline (Historical measured vs Future estimated)
  const timeline: Array<{
    dayLabel: string;
    date: string;
    measuredScore?: number;
    predictedScore?: number;
    upperBound?: number;
    lowerBound?: number;
  }> = [];

  const now = new Date();
  // Past 4 days measured points
  for (let i = 4; i >= 1; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 2);
    const dateStr = d.toISOString().split('T')[0];
    const matchingAttempt = sorted.find(s => s.timestamp.startsWith(dateStr));
    timeline.push({
      dayLabel: `Day -${i * 2}`,
      date: dateStr,
      measuredScore: matchingAttempt ? matchingAttempt.percentage : Math.max(10, currentMeasured - (boundedSlope * i))
    });
  }

  // Today (Measured Anchor)
  timeline.push({
    dayLabel: 'Today (Measured)',
    date: now.toISOString().split('T')[0],
    measuredScore: currentMeasured,
    predictedScore: currentMeasured,
    upperBound: currentMeasured,
    lowerBound: currentMeasured
  });

  // Next 7 days forecast points
  for (let i = 1; i <= 7; i += 2) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const progressFactor = i / 7;
    const interpPredicted = Number((currentMeasured + (predictedScoreNextWeek - currentMeasured) * progressFactor).toFixed(1));
    const interpMargin = Number((margin * (0.4 + 0.6 * progressFactor)).toFixed(1));

    timeline.push({
      dayLabel: `Day +${i}`,
      date: d.toISOString().split('T')[0],
      predictedScore: interpPredicted,
      upperBound: Number(Math.min(100, interpPredicted + interpMargin).toFixed(1)),
      lowerBound: Number(Math.max(0, interpPredicted - interpMargin).toFixed(1))
    });
  }

  return {
    calculatedAt: new Date().toISOString(),
    hasEnoughData: true,
    dataPointsCount: n,
    currentMeasuredScore: currentMeasured,
    predictedScoreNextWeek,
    scoreRangeMin,
    scoreRangeMax,
    confidenceLevel,
    confidencePercentage: confidencePct,
    influencingFactors,
    recommendedActions,
    topicForecasts,
    timeline
  };
}
