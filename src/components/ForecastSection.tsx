import React, { useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  Info,
  Calendar,
  Play,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sliders,
  Award,
  Zap
} from 'lucide-react';
import { WeeklyForecast } from '../types';

interface ForecastSectionProps {
  forecast: WeeklyForecast;
  onNavigateToGenerator: () => void;
  onActionClick?: (action: string) => void;
}

export const ForecastSection: React.FC<ForecastSectionProps> = ({
  forecast,
  onNavigateToGenerator,
  onActionClick
}) => {
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);
  const [showAssumptions, setShowAssumptions] = useState<boolean>(false);
  const [chartLayerFilter, setChartLayerFilter] = useState<'all' | 'actual' | 'predicted'>('all');

  // Formatted forecast calculation date
  const forecastDate = forecast.calculatedAt
    ? new Date(forecast.calculatedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleDateString();

  if (!forecast.hasEnoughData) {
    return (
      <div className="space-y-6">
        <div className="glass-panel-glow rounded-3xl p-8 lg:p-12 border border-indigo-500/30 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="w-20 h-20 rounded-2xl bg-indigo-950/70 border border-indigo-500/40 mx-auto flex items-center justify-center mb-5 text-cyan-400 shadow-xl shadow-indigo-500/25">
            <Activity className="w-10 h-10 animate-pulse" />
          </div>

          <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-950/70 text-amber-300 border border-amber-500/40 inline-block mb-3">
            Awaiting Assessment Data
          </span>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
            Not Enough Assessment Data Yet
          </h2>

          <p className="text-sm text-slate-300 max-w-xl mx-auto mb-6 leading-relaxed">
            In accordance with educational psychometrics, LearnPilot AI strictly uses <strong className="text-white">actual student performance records</strong> rather than language model hallucinations. A minimum of <strong className="text-cyan-400">2 recorded test attempts</strong> is required to calibrate historical variance, trend slope, and statistical confidence intervals.
          </p>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 max-w-md mx-auto text-left mb-8 space-y-3 shadow-inner">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-medium">Recorded Assessments Completed:</span>
              <span className="font-bold text-cyan-400">{forecast.dataPointsCount} of 2 Required</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full transition-all duration-700"
                style={{ width: `${Math.min(100, (forecast.dataPointsCount / 2) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Current measured baseline score: {forecast.currentMeasuredScore > 0 ? `${forecast.currentMeasuredScore}%` : 'Pending initial assessment'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={onNavigateToGenerator}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/35 hover:scale-102 transition-transform cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              Take a 10-Minute Diagnostic Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate SVG chart coordinates for timeline
  const chartHeight = 240;
  const chartWidth = 720;
  const paddingX = 45;
  const paddingY = 32;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  const points = forecast.timeline;
  const getX = (index: number) => paddingX + (index / Math.max(1, points.length - 1)) * usableWidth;
  const getY = (score: number) => paddingY + (1 - score / 100) * usableHeight;

  // Build SVG path strings
  let measuredPath = '';
  let predictedPath = '';
  let upperBandPath = '';

  const measuredPoints = points.filter(p => p.measuredScore !== undefined);
  const futurePoints = points.filter(p => p.predictedScore !== undefined);

  if (measuredPoints.length > 0 && chartLayerFilter !== 'predicted') {
    measuredPath = points
      .map((p, idx) => p.measuredScore !== undefined ? `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(p.measuredScore)}` : '')
      .filter(Boolean)
      .join(' ');
  }

  if (futurePoints.length > 0 && chartLayerFilter !== 'actual') {
    const todayIndex = points.findIndex(p => p.dayLabel.includes('Today') || p.dayLabel.includes('Baseline'));
    const startIdx = todayIndex >= 0 ? todayIndex : 0;
    
    predictedPath = points
      .slice(startIdx)
      .map((p, idx) => {
        const actualIdx = startIdx + idx;
        const score = p.predictedScore ?? p.measuredScore ?? 0;
        return `${idx === 0 ? 'M' : 'L'} ${getX(actualIdx)} ${getY(score)}`;
      })
      .join(' ');

    // Area band path (Upper bound down to Lower bound reversed)
    const upperPts = points
      .slice(startIdx)
      .map((p, idx) => `${getX(startIdx + idx)},${getY(p.upperBound ?? p.predictedScore ?? 0)}`);

    const lowerPts = points
      .slice(startIdx)
      .map((p, idx) => `${getX(startIdx + idx)},${getY(p.lowerBound ?? p.predictedScore ?? 0)}`)
      .reverse();

    if (upperPts.length > 0 && lowerPts.length > 0) {
      upperBandPath = `M ${upperPts.join(' L ')} L ${lowerPts.join(' L ')} Z`;
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Notice with Snapshot Timestamp */}
      <div className="flex items-center justify-between flex-wrap gap-4 glass-panel rounded-2xl p-5 border border-indigo-500/25">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-cyan-400 shadow-md shadow-indigo-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Weekly Learning Forecast
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                Empirical Model
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Latest Forecast Snapshot: {forecastDate}
              </span>
              <span>•</span>
              <span>Evaluated over {forecast.dataPointsCount} recorded tests</span>
            </div>
          </div>
        </div>

        {/* Disclaimer Pill */}
        <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/90 px-3.5 py-2 rounded-xl border border-slate-800">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Forecasts are statistical estimates, not guaranteed exam results.</span>
        </div>
      </div>

      {/* 4 Core Quantitative Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 perspective-container">
        
        {/* Metric 1: Current Measured Score */}
        <div className="glass-panel rounded-2xl p-5 border border-indigo-500/20 tilt-3d relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Current Measured Score</span>
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {forecast.currentMeasuredScore}%
            </span>
            <span className="text-xs text-cyan-400 font-semibold">Weighted Baseline</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Calculated using Exponential Moving Average (EMA) weighting recent attempts higher.
          </p>
        </div>

        {/* Metric 2: 7-Day Estimated Performance & Prediction Interval */}
        <div className="glass-panel-glow rounded-2xl p-5 border border-indigo-500/40 tilt-3d relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-indigo-200 mb-2">
            <span>7-Day Expected Score</span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {forecast.predictedScoreNextWeek}%
            </span>
            <span className={`text-xs font-bold flex items-center ${
              forecast.predictedScoreNextWeek >= forecast.currentMeasuredScore ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {forecast.predictedScoreNextWeek >= forecast.currentMeasuredScore ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {forecast.predictedScoreNextWeek >= forecast.currentMeasuredScore ? '+' : ''}
              {(forecast.predictedScoreNextWeek - forecast.currentMeasuredScore).toFixed(1)}%
            </span>
          </div>
          <div className="text-[11px] text-indigo-300 font-medium flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Range: {forecast.scoreRangeMin}% – {forecast.scoreRangeMax}%</span>
          </div>
        </div>

        {/* Metric 3: Confidence Reliability */}
        <div className="glass-panel rounded-2xl p-5 border border-indigo-500/20 tilt-3d">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Forecast Confidence</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              forecast.confidenceLevel === 'High'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : forecast.confidenceLevel === 'Medium'
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-rose-950 text-rose-300 border border-rose-800'
            }`}>
              {forecast.confidenceLevel} Confidence
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-white">
              {forecast.confidencePercentage}%
            </span>
            <span className="text-xs text-slate-400">Statistical Consistency</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full ${
                forecast.confidencePercentage > 70
                  ? 'bg-emerald-500'
                  : forecast.confidencePercentage > 40
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${forecast.confidencePercentage}%` }}
            />
          </div>
        </div>

        {/* Metric 4: High-Risk Attention Topics */}
        <div className="glass-panel rounded-2xl p-5 border border-indigo-500/20 tilt-3d">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Topic Risk Status</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-extrabold text-white">
              {forecast.topicForecasts.filter(t => t.riskLevel === 'high_risk').length}
            </span>
            <span className="text-xs text-rose-400 font-semibold">High Risk Topics</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {forecast.topicForecasts.filter(t => t.riskLevel === 'on_track' || t.riskLevel === 'strong').length} topics currently on track or strong.
          </p>
        </div>

      </div>

      {/* Main Interactive Forecast Graph */}
      <div className="glass-panel-glow rounded-3xl p-6 lg:p-7 border border-indigo-500/30">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4.5 h-4.5 text-cyan-400" />
              Actual Measured Performance vs. Seven-Day Forecast Trajectory
            </h3>
            <p className="text-xs text-slate-400">
              Clear distinction between verified actual exam scores, calibrated baseline mastery, and prospective prediction intervals.
            </p>
          </div>

          {/* Interactive Layer Filter & Legend */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setChartLayerFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                chartLayerFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              All Layers
            </button>
            <button
              onClick={() => setChartLayerFilter('actual')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                chartLayerFilter === 'actual'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Actual Only
            </button>
            <button
              onClick={() => setChartLayerFilter('predicted')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                chartLayerFilter === 'predicted'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Forecast Only
            </button>
          </div>
        </div>

        {/* Legend Indicator */}
        <div className="flex items-center gap-5 text-xs pb-3 border-b border-slate-800 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-cyan-400 rounded-full" />
            <span className="text-slate-300 font-medium">Actual Measured Marks</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 bg-indigo-400 border-dashed border-b-2" />
            <span className="text-slate-300 font-medium">Predicted Future Performance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3 bg-indigo-500/20 border border-indigo-500/40 rounded-sm" />
            <span className="text-slate-300 font-medium">Confidence Range (Min - Max)</span>
          </div>
        </div>

        {/* SVG Visualization */}
        <div className="relative w-full overflow-x-auto pt-4">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-64 overflow-visible font-sans"
          >
            {/* Horizontal Grid lines */}
            {[0, 25, 50, 75, 100].map(val => (
              <g key={val}>
                <line
                  x1={paddingX}
                  y1={getY(val)}
                  x2={chartWidth - paddingX}
                  y2={getY(val)}
                  stroke="#1e293b"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 12}
                  y={getY(val) + 4}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="end"
                >
                  {val}%
                </text>
              </g>
            ))}

            {/* Confidence Band Polygon */}
            {upperBandPath && (
              <path
                d={upperBandPath}
                fill="rgba(99, 102, 241, 0.16)"
                stroke="rgba(99, 102, 241, 0.35)"
                strokeDasharray="2 2"
              />
            )}

            {/* Measured Marks Line (Solid Cyan) */}
            {measuredPath && (
              <path
                d={measuredPath}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}

            {/* Predicted Future Line (Dashed Indigo) */}
            {predictedPath && (
              <path
                d={predictedPath}
                fill="none"
                stroke="#818cf8"
                strokeWidth="2.5"
                strokeDasharray="5 5"
                strokeLinecap="round"
              />
            )}

            {/* Data Points */}
            {points.map((pt, idx) => {
              const cx = getX(idx);
              const cy = pt.measuredScore !== undefined ? getY(pt.measuredScore) : getY(pt.predictedScore || 0);
              const isToday = pt.dayLabel.includes('Today') || pt.dayLabel.includes('Baseline');
              const isFuture = pt.predictedScore !== undefined && !isToday;

              return (
                <g
                  key={idx}
                  className="cursor-pointer group"
                  onMouseEnter={() => setActiveTooltip(idx)}
                  onMouseLeave={() => setActiveTooltip(null)}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isToday ? 6.5 : 4.5}
                    fill={isToday ? '#22d3ee' : isFuture ? '#818cf8' : '#06b6d4'}
                    stroke="#0f172a"
                    strokeWidth="2"
                    className="transition-all duration-200 group-hover:r-7"
                  />
                  {isToday && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r="10"
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="1.5"
                      className="animate-ping opacity-60"
                    />
                  )}
                  {/* X-axis labels */}
                  <text
                    x={cx}
                    y={chartHeight - 8}
                    fill={isToday ? '#22d3ee' : '#94a3b8'}
                    fontSize="10"
                    fontWeight={isToday ? 'bold' : 'normal'}
                    textAnchor="middle"
                  >
                    {pt.dayLabel}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Active Hover Tooltip */}
          {activeTooltip !== null && points[activeTooltip] && (
            <div
              className="absolute z-20 pointer-events-none glass-panel-glow px-3.5 py-2.5 rounded-xl border border-indigo-400 text-xs shadow-2xl"
              style={{
                left: `${(getX(activeTooltip) / chartWidth) * 100}%`,
                top: '20px',
                transform: 'translateX(-50%)'
              }}
            >
              <div className="font-bold text-white mb-0.5">
                {points[activeTooltip].dayLabel} ({points[activeTooltip].date})
              </div>
              {points[activeTooltip].measuredScore !== undefined && (
                <div className="text-cyan-300">
                  Actual Measured: <span className="font-bold">{points[activeTooltip].measuredScore}%</span>
                </div>
              )}
              {points[activeTooltip].predictedScore !== undefined && (
                <div className="text-indigo-300">
                  Predicted Score: <span className="font-bold">{points[activeTooltip].predictedScore}%</span>
                </div>
              )}
              {points[activeTooltip].upperBound !== undefined && (
                <div className="text-slate-400 text-[10px]">
                  Uncertainty Range: {points[activeTooltip].lowerBound}% – {points[activeTooltip].upperBound}%
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Factors Influencing Forecast vs. Action Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Factors */}
        <div className="glass-panel rounded-2xl p-6 border border-indigo-500/20">
          <h4 className="text-sm font-bold text-white mb-3.5 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Factors Influencing Your Forecast
          </h4>
          <ul className="space-y-3">
            {forecast.influencingFactors.map((factor, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                <span className="w-2 h-2 rounded-full bg-cyan-400 mt-1 shrink-0 shadow-sm shadow-cyan-400/50" />
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recommended Actions */}
        <div className="glass-panel rounded-2xl p-6 border border-indigo-500/20">
          <h4 className="text-sm font-bold text-white mb-3.5 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Recommended Actions to Improve Preparation
          </h4>
          <ul className="space-y-3">
            {forecast.recommendedActions.map((action, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0 shadow-sm shadow-emerald-400/50" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* Topic-Wise Expected Improvement / Risk Breakdown */}
      <div className="glass-panel rounded-2xl p-6 border border-indigo-500/20">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h4 className="text-base font-bold text-white">
              Topic-Wise Trajectory & Risk Indicators
            </h4>
            <p className="text-xs text-slate-400">
              Classified into improving, stable, or declining based on question accuracy and longitudinal attempts.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {forecast.topicForecasts.map((tf) => {
            const isHighRisk = tf.riskLevel === 'high_risk';
            const isStrong = tf.riskLevel === 'strong';

            return (
              <div
                key={tf.topicId}
                className={`p-4 rounded-xl border transition-all ${
                  isHighRisk
                    ? 'bg-rose-950/20 border-rose-500/35 shadow-sm shadow-rose-950/40'
                    : isStrong
                    ? 'bg-emerald-950/20 border-emerald-500/35 shadow-sm shadow-emerald-950/40'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isHighRisk
                      ? 'bg-rose-950 text-rose-300 border border-rose-700'
                      : isStrong
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-amber-950 text-amber-300 border border-amber-700'
                  }`}>
                    {tf.riskLevel.replace('_', ' ')}
                  </span>

                  <span className={`text-xs font-bold flex items-center gap-1 uppercase ${
                    tf.trend === 'improving' ? 'text-emerald-400' : tf.trend === 'declining' ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    {tf.trend === 'improving' && <ArrowUpRight className="w-3.5 h-3.5" />}
                    {tf.trend === 'declining' && <ArrowDownRight className="w-3.5 h-3.5" />}
                    {tf.trend === 'stable' && <Minus className="w-3.5 h-3.5" />}
                    {tf.trend}
                  </span>
                </div>

                <h5 className="text-sm font-semibold text-white mb-2 line-clamp-1" title={tf.topicName}>
                  {tf.topicName}
                </h5>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Measured Accuracy:</span>
                    <span className="font-bold text-white">{tf.currentMastery}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full ${isHighRisk ? 'bg-rose-500' : isStrong ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${tf.currentMastery}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-slate-400 pt-1">
                    <span>Expected Trajectory:</span>
                    <span className="font-bold text-cyan-300">{tf.expectedScoreNextWeek}%</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Questions Attempted: {tf.questionsAttempted}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transparent Methodology & Assumptions Accordion */}
      <div className="glass-panel rounded-2xl p-5 border border-indigo-500/20">
        <button
          onClick={() => setShowAssumptions(!showAssumptions)}
          className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Transparent Methodology & Prediction Engine Assumptions
          </span>
          {showAssumptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAssumptions && (
          <div className="pt-4 mt-3 border-t border-slate-800 text-xs text-slate-400 space-y-2.5 leading-relaxed">
            <p>
              • <strong className="text-slate-200">Baseline Weighting:</strong> Historical performance is evaluated using an Exponential Weighted Moving Average (EMA) with $\alpha = 0.45$, placing higher empirical weight on recent attempts while dampening single-test noise.
            </p>
            <p>
              • <strong className="text-slate-200">Bounded Extrapolation:</strong> Projected changes over the 7-day period are capped at $[-4.5\%, +5.0\%]$ to prevent unrealistic runaway growth or crash estimates.
            </p>
            <p>
              • <strong className="text-slate-200">Prediction Intervals:</strong> Uncertainty ranges are derived from sample standard deviation and adjusted for small-sample degrees of freedom to represent a 90% probabilistic interval.
            </p>
            <p>
              • <strong className="text-slate-200">Ethical AI Standards:</strong> Numerical forecasts and grades are calculated exclusively via mathematical models and never fabricated by a generative model.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
