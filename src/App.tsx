/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ForecastSection } from './components/ForecastSection';
import { StudyPlannerSection } from './components/StudyPlannerSection';
import { ExamGeneratorSection } from './components/ExamGeneratorSection';
import { FlashcardsSection } from './components/FlashcardsSection';
import { EvaluationSection } from './components/EvaluationSection';
import { AITutorSection } from './components/AITutorSection';
import { StorageService } from './services/storage';
import { ApiClient } from './services/apiClient';
import { calculateWeeklyForecast } from './utils/forecastEngine';
import {
  Subject,
  ExamDeadline,
  StudyPlannerConfig,
  StudySession,
  GradingResult,
  RemedialLearningPath,
  InAppNotification,
  WeeklyForecast
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Core Data States
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [deadlines, setDeadlines] = useState<ExamDeadline[]>([]);
  const [config, setConfig] = useState<StudyPlannerConfig>(StorageService.getPlannerConfig());
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [history, setHistory] = useState<GradingResult[]>([]);
  const [remedialPaths, setRemedialPaths] = useState<RemedialLearningPath[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

  // Reload data from persistent storage
  const loadWorkspaceData = () => {
    StorageService.initDefaultsIfEmpty();
    const subjs = StorageService.getSubjects();
    const dls = StorageService.getDeadlines();
    const conf = StorageService.getPlannerConfig();
    const sess = StorageService.getStudySessions();
    const hist = StorageService.getGradingHistory();
    const rem = StorageService.getRemedialPaths();
    const notifs = StorageService.getNotifications();

    setSubjects(subjs);
    setDeadlines(dls);
    setConfig(conf);
    setSessions(sess);
    setHistory(hist);
    setRemedialPaths(rem);
    setNotifications(notifs);

    const initMode = localStorage.getItem('learnpilot_initialized_v2');
    setIsDemoMode(initMode !== 'fresh');
  };

  useEffect(() => {
    loadWorkspaceData();
  }, []);

  const [forecast, setForecast] = useState<WeeklyForecast>(() => calculateWeeklyForecast([], []));

  // Compute Weekly Forecast using Python data science engine with local fallback
  useEffect(() => {
    // Immediate calculation
    const local = calculateWeeklyForecast(history, subjects, sessions);
    setForecast(local);

    // Call backend Python forecast service
    if (history.length >= 2) {
      ApiClient.getWeeklyForecast({ history, subjects, sessions })
        .then(res => {
          if (res && res.hasEnoughData) {
            setForecast(res);
          }
        })
        .catch(() => {});
    }
  }, [history, subjects, sessions]);

  // When an exam is completed and graded
  const handleExamCompleted = (result: GradingResult) => {
    loadWorkspaceData();
    StorageService.addNotification({
      title: 'Exam Graded & Recorded',
      message: `Scored ${result.totalMarksObtained}/${result.maxPossibleMarks} (${result.percentage}%). Weekly forecast updated.`,
      type: 'forecast_update'
    });
    // Switch to evaluation view so student can inspect rubrics
    setActiveTab('evaluation');
  };

  // Launch targeted mock from weak topic
  const handleLaunchTargetedMock = (topicName: string, subjectId: string) => {
    setActiveTab('generator');
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* 3D Glowing Ambient Lights */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed top-1/3 right-1/4 w-[450px] h-[450px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-10 left-1/3 w-[600px] h-[400px] bg-purple-600/8 rounded-full blur-[140px] pointer-events-none" />

      {/* Persistent Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        notifications={notifications}
        onRefreshData={loadWorkspaceData}
        isDemoMode={isDemoMode}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 relative z-10">
        {activeTab === 'dashboard' && (
          <Dashboard
            subjects={subjects}
            deadlines={deadlines}
            sessions={sessions}
            history={history}
            forecast={forecast}
            remedialPaths={remedialPaths}
            onNavigateTab={setActiveTab}
            onRefreshData={loadWorkspaceData}
            onLaunchTargetedMock={handleLaunchTargetedMock}
          />
        )}

        {activeTab === 'forecast' && (
          <ForecastSection
            forecast={forecast}
            onNavigateToGenerator={() => setActiveTab('generator')}
          />
        )}

        {activeTab === 'planner' && (
          <StudyPlannerSection
            subjects={subjects}
            deadlines={deadlines}
            config={config}
            sessions={sessions}
            onUpdateSubjects={subjs => setSubjects(subjs)}
            onUpdateDeadlines={dls => setDeadlines(dls)}
            onUpdateConfig={conf => setConfig(conf)}
            onUpdateSessions={sess => setSessions(sess)}
          />
        )}

        {activeTab === 'generator' && (
          <ExamGeneratorSection
            subjects={subjects}
            onExamCompleted={handleExamCompleted}
          />
        )}

        {activeTab === 'evaluation' && (
          <EvaluationSection
            history={history}
            subjects={subjects}
            remedialPaths={remedialPaths}
            onUpdateRemedialPaths={rem => setRemedialPaths(rem)}
            onRefreshData={loadWorkspaceData}
            onLaunchTargetedMock={handleLaunchTargetedMock}
          />
        )}

        {activeTab === 'tutor' && (
          <AITutorSection
            subjects={subjects}
            history={history}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 relative z-10 glass-panel">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>LearnPilot AI • Advanced Personalized Exam Intelligence Platform</span>
          <span className="text-slate-400">
            Real Student Data • Deterministic Scoring • Gemini 3.8 Intelligence
          </span>
        </div>
      </footer>
    </div>
  );
}
