import React, { useState } from 'react';
import {
  Compass,
  TrendingUp,
  Calendar,
  FileQuestion,
  Award,
  Bot,
  Bell,
  Sparkles,
  RotateCcw,
  UserCheck,
  UserX,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Users
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { InAppNotification } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications: InAppNotification[];
  onRefreshData: () => void;
  isDemoMode: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  notifications,
  onRefreshData,
  isDemoMode
}) => {
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleToggleDemoMode = () => {
    if (isDemoMode) {
      if (confirm('Switch to Fresh Student Mode? This will clear demo mock data so you can enter your real courses and exams.')) {
        StorageService.resetToFreshUser();
        onRefreshData();
      }
    } else {
      StorageService.loadDemoStudentData();
      onRefreshData();
    }
  };

  const handleResetData = () => {
    if (confirm('Reset all student workspace data?')) {
      StorageService.resetToFreshUser();
      onRefreshData();
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Intelligence Center', icon: Compass },
    { id: 'forecast', label: 'Weekly Forecast', icon: TrendingUp },
    { id: 'planner', label: 'Study Planner', icon: Calendar },
    { id: 'generator', label: 'Exam Generator & Taking', icon: FileQuestion },
    { id: 'flashcards', label: 'Flashcards Revision', icon: Layers },
    { id: 'friends', label: 'Study Friends', icon: Users },
    { id: 'evaluation', label: 'Evaluation & Pathways', icon: Award },
    { id: 'tutor', label: 'Source-Grounded Tutor', icon: Bot },
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-indigo-500/20 px-4 lg:px-8 py-3 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand & Badge */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[2px] transition-transform duration-300 group-hover:scale-105 shadow-lg shadow-indigo-500/30">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  LearnPilot<span className="text-cyan-400">AI</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                  Exam Intelligence
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Predictive Forecasting • Adaptive Planner • AI Evaluator
              </p>
            </div>
          </div>

          {/* Quick controls on mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto w-full md:w-auto py-1 scrollbar-none justify-start md:justify-center">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-300' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Action Toolbar */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* Demo / Fresh Student Toggle */}
          <button
            onClick={handleToggleDemoMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              isDemoMode
                ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-300 hover:bg-emerald-900/40'
                : 'bg-amber-950/40 border-amber-600/40 text-amber-300 hover:bg-amber-900/40'
            }`}
            title={isDemoMode ? 'Currently showing Sample Pre-loaded Exam Data. Click to switch to Fresh Student Mode.' : 'Currently in Clean Fresh Student Mode. Click to load sample exam data.'}
          >
            {isDemoMode ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
            {isDemoMode ? 'Sample Data Active' : 'Fresh Student Mode'}
          </button>

          {/* Reset Workspace */}
          <button
            onClick={handleResetData}
            className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Reset All Data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="relative p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4 text-slate-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white ring-2 ring-slate-950 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl glass-panel-glow p-3 border border-indigo-500/30 shadow-2xl z-50">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-cyan-400" />
                    Live Study Reminders
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {unreadCount} unread
                  </span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No notifications yet.</p>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => {
                          StorageService.markNotificationRead(n.id);
                          onRefreshData();
                        }}
                        className={`p-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                          n.read
                            ? 'bg-slate-900/40 text-slate-400'
                            : 'bg-indigo-950/40 border border-indigo-500/20 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-semibold text-indigo-300 flex items-center gap-1">
                            {n.type === 'exam_countdown' ? (
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                            )}
                            {n.title}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};
